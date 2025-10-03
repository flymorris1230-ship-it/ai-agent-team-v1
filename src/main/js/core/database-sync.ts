/**
 * Database Synchronization Service
 * Syncs data between Cloudflare D1 and PostgreSQL
 */

import { createUnifiedDatabase, UnifiedDatabase } from '../database/unified-db';
import { Logger } from '../utils/logger';
import { databaseConfig } from '../config/database';
import type { Env } from '../types';

export interface SyncResult {
  table: string;
  direction: 'to-postgres' | 'to-d1' | 'bidirectional';
  recordsSynced: number;
  errors: string[];
  duration: number;
  timestamp: number;
}

export interface SyncJobResult {
  success: boolean;
  totalRecords: number;
  results: SyncResult[];
  duration: number;
  timestamp: number;
}

export class DatabaseSyncService {
  private logger: Logger;
  private db: UnifiedDatabase;

  constructor(private env: Env) {
    this.logger = new Logger(env, 'DatabaseSync');
    this.db = createUnifiedDatabase(env);
  }

  /**
   * Execute full synchronization
   */
  async syncAll(): Promise<SyncJobResult> {
    const startTime = Date.now();
    await this.logger.info('Starting database synchronization');

    const results: SyncResult[] = [];
    let totalRecords = 0;

    try {
      // Sync all configured tables
      for (const table of databaseConfig.sync.tables) {
        const result = await this.syncTable(table, databaseConfig.sync.direction);
        results.push(result);
        totalRecords += result.recordsSynced;
      }

      const duration = Date.now() - startTime;

      await this.logger.info('Database synchronization completed', {
        totalRecords,
        duration,
        tables: results.length
      });

      return {
        success: true,
        totalRecords,
        results,
        duration,
        timestamp: Date.now()
      };
    } catch (error) {
      await this.logger.error('Database synchronization failed', { error });

      return {
        success: false,
        totalRecords,
        results,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Sync a single table
   */
  async syncTable(
    table: string,
    direction: 'to-postgres' | 'to-d1' | 'bidirectional' = 'bidirectional'
  ): Promise<SyncResult> {
    const startTime = Date.now();
    await this.logger.info(`Syncing table: ${table}`, { direction });

    const errors: string[] = [];
    let recordsSynced = 0;

    try {
      // D1 → PostgreSQL
      if (direction === 'to-postgres' || direction === 'bidirectional') {
        const d1Records = await this.getD1Records(table);

        for (const record of d1Records) {
          try {
            await this.upsertToPostgres(table, record);
            recordsSynced++;
          } catch (error) {
            errors.push(`Failed to sync record ${record.id}: ${error}`);
          }
        }
      }

      // PostgreSQL → D1
      if (direction === 'to-d1' || direction === 'bidirectional') {
        const pgRecords = await this.getPostgresRecords(table);

        for (const record of pgRecords) {
          try {
            await this.upsertToD1(table, record);
            recordsSynced++;
          } catch (error) {
            errors.push(`Failed to sync record ${record.id}: ${error}`);
          }
        }
      }

      await this.logger.info(`Table sync completed: ${table}`, {
        recordsSynced,
        errors: errors.length
      });

      return {
        table,
        direction,
        recordsSynced,
        errors,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    } catch (error) {
      errors.push(`Table sync failed: ${error}`);

      return {
        table,
        direction,
        recordsSynced,
        errors,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get records from D1
   */
  private async getD1Records(table: string): Promise<any[]> {
    const result = await this.env.DB.prepare(`SELECT * FROM ${table}`).all();
    return result.results || [];
  }

  /**
   * Get records from PostgreSQL
   */
  private async getPostgresRecords(table: string): Promise<any[]> {
    const result = await this.db.query(`SELECT * FROM ${table}`, [], {
      forceDb: 'postgres'
    });
    return result.rows || [];
  }

  /**
   * Upsert record to PostgreSQL
   */
  private async upsertToPostgres(table: string, record: any): Promise<void> {
    const columns = Object.keys(record);
    const values = Object.values(record);

    // Build conflict handling based on table
    const conflictColumn = 'id';
    const updateColumns = columns.filter(c => c !== conflictColumn);
    const updateSet = updateColumns.map(c => `${c} = EXCLUDED.${c}`).join(', ');

    const sql = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')})
      ON CONFLICT (${conflictColumn})
      DO UPDATE SET ${updateSet}
    `;

    await this.db.query(sql, values, { forceDb: 'postgres' });
  }

  /**
   * Upsert record to D1
   */
  private async upsertToD1(table: string, record: any): Promise<void> {
    const columns = Object.keys(record);
    const values = Object.values(record);
    const placeholders = columns.map(() => '?').join(', ');

    const sql = `
      INSERT OR REPLACE INTO ${table} (${columns.join(', ')})
      VALUES (${placeholders})
    `;

    await this.env.DB.prepare(sql).bind(...values).run();
  }

  /**
   * Sync specific records by IDs
   */
  async syncRecords(table: string, ids: string[]): Promise<SyncResult> {
    const startTime = Date.now();
    await this.logger.info(`Syncing specific records from ${table}`, {
      count: ids.length
    });

    const errors: string[] = [];
    let recordsSynced = 0;

    try {
      for (const id of ids) {
        try {
          // Get from D1
          const d1Record = await this.env.DB
            .prepare(`SELECT * FROM ${table} WHERE id = ?`)
            .bind(id)
            .first();

          if (d1Record) {
            await this.upsertToPostgres(table, d1Record);
            recordsSynced++;
          }
        } catch (error) {
          errors.push(`Failed to sync record ${id}: ${error}`);
        }
      }

      return {
        table,
        direction: 'to-postgres',
        recordsSynced,
        errors,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    } catch (error) {
      errors.push(`Record sync failed: ${error}`);

      return {
        table,
        direction: 'to-postgres',
        recordsSynced,
        errors,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Check sync status
   */
  async checkSyncStatus(): Promise<{
    lastSync?: number;
    nextSync?: number;
    isEnabled: boolean;
    interval: number;
  }> {
    // Get last sync time from D1
    const lastSyncRecord = await this.env.DB
      .prepare('SELECT MAX(created_at) as last_sync FROM backup_logs WHERE backup_type = ?')
      .bind('db_sync')
      .first();

    const lastSync = lastSyncRecord?.last_sync as number | undefined;
    const interval = databaseConfig.sync.interval * 1000; // Convert to ms
    const nextSync = lastSync ? lastSync + interval : Date.now();

    return {
      lastSync,
      nextSync,
      isEnabled: databaseConfig.sync.enabled,
      interval: databaseConfig.sync.interval
    };
  }

  /**
   * Log sync result
   */
  async logSyncResult(result: SyncJobResult): Promise<void> {
    await this.env.DB.prepare(`
      INSERT INTO backup_logs (
        id, backup_type, status, file_count, destination,
        started_at, completed_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      `sync-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      'db_sync',
      result.success ? 'completed' : 'failed',
      result.totalRecords,
      'postgres',
      result.timestamp - result.duration,
      result.timestamp,
      result.timestamp
    ).run();
  }
}

/**
 * Scheduled sync handler for Cloudflare Workers
 */
export async function handleScheduledSync(env: Env): Promise<SyncJobResult> {
  const syncService = new DatabaseSyncService(env);

  // Check if sync is enabled
  if (!databaseConfig.sync.enabled) {
    console.log('Database sync is disabled');
    return {
      success: false,
      totalRecords: 0,
      results: [],
      duration: 0,
      timestamp: Date.now()
    };
  }

  // Execute sync
  const result = await syncService.syncAll();

  // Log result
  await syncService.logSyncResult(result);

  return result;
}
