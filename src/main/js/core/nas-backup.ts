/**
 * NAS Backup System
 * Handles backup to Network Attached Storage
 */

import type { Env, BackupType, BackupStatus } from '../types';
import { Logger } from '../utils/logger';

export interface BackupResult {
  backup_id: string;
  status: BackupStatus;
  backup_type: BackupType;
  file_count?: number;
  backup_size?: number;
  checksum?: string;
  started_at: number;
  completed_at?: number;
  error_message?: string;
}

export class NASBackupSystem {
  private logger: Logger;

  constructor(private env: Env) {
    this.logger = new Logger(env, 'NASBackupSystem');
  }

  /**
   * Perform full database backup
   */
  async backupDatabase(): Promise<BackupResult> {
    const backupId = `backup-db-${Date.now()}`;
    const startedAt = Date.now();

    try {
      await this.logger.info('Starting database backup', { backupId });

      // Export D1 database
      const tables = ['users', 'conversations', 'messages', 'documents', 'tasks', 'agents', 'knowledge_entries'];
      let totalRecords = 0;
      const sqlStatements: string[] = [];

      for (const table of tables) {
        const result = await this.env.DB.prepare(`SELECT * FROM ${table}`).all();
        totalRecords += result.results.length;

        // Generate INSERT statements
        for (const row of result.results) {
          const columns = Object.keys(row).join(', ');
          const values = Object.values(row)
            .map((v) => (v === null ? 'NULL' : typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v))
            .join(', ');
          sqlStatements.push(`INSERT INTO ${table} (${columns}) VALUES (${values});`);
        }
      }

      const backupContent = sqlStatements.join('\n');
      const checksum = await this.calculateChecksum(backupContent);

      // Send to NAS via webhook
      if (this.env.NAS_WEBHOOK_URL) {
        await this.sendToNAS({
          type: 'database_backup',
          backup_id: backupId,
          content: backupContent,
          checksum,
          timestamp: Date.now(),
        });
      }

      // Log backup record
      await this.logBackup({
        id: backupId,
        backup_type: 'full',
        status: 'completed',
        file_count: totalRecords,
        backup_size: backupContent.length,
        checksum,
        started_at: startedAt,
        completed_at: Date.now(),
      });

      await this.logger.info('Database backup completed', {
        backupId,
        records: totalRecords,
        size: backupContent.length,
      });

      return {
        backup_id: backupId,
        status: 'completed',
        backup_type: 'full',
        file_count: totalRecords,
        backup_size: backupContent.length,
        checksum,
        started_at: startedAt,
        completed_at: Date.now(),
      };
    } catch (error) {
      await this.logger.error('Database backup failed', { error, backupId });

      await this.logBackup({
        id: backupId,
        backup_type: 'full',
        status: 'failed',
        error_message: (error as Error).message,
        started_at: startedAt,
        completed_at: Date.now(),
      });

      return {
        backup_id: backupId,
        status: 'failed',
        backup_type: 'full',
        started_at: startedAt,
        completed_at: Date.now(),
        error_message: (error as Error).message,
      };
    }
  }

  /**
   * Sync R2 files to NAS
   */
  async syncR2Files(): Promise<BackupResult> {
    const backupId = `backup-r2-${Date.now()}`;
    const startedAt = Date.now();

    try {
      await this.logger.info('Starting R2 sync', { backupId });

      // List all objects in R2
      const listed = await this.env.STORAGE.list();
      const files: Array<{ key: string; size: number; content: ArrayBuffer }> = [];

      for (const object of listed.objects) {
        const obj = await this.env.STORAGE.get(object.key);
        if (obj) {
          const content = await obj.arrayBuffer();
          files.push({
            key: object.key,
            size: object.size,
            content,
          });
        }
      }

      const totalSize = files.reduce((sum, f) => sum + f.size, 0);

      // Send to NAS
      if (this.env.NAS_WEBHOOK_URL) {
        await this.sendToNAS({
          type: 'r2_sync',
          backup_id: backupId,
          files: files.map((f) => ({
            key: f.key,
            size: f.size,
            content: Buffer.from(f.content).toString('base64'),
          })),
          timestamp: Date.now(),
        });
      }

      await this.logBackup({
        id: backupId,
        backup_type: 'r2_sync',
        status: 'completed',
        file_count: files.length,
        backup_size: totalSize,
        started_at: startedAt,
        completed_at: Date.now(),
      });

      await this.logger.info('R2 sync completed', {
        backupId,
        fileCount: files.length,
        totalSize,
      });

      return {
        backup_id: backupId,
        status: 'completed',
        backup_type: 'r2_sync',
        file_count: files.length,
        backup_size: totalSize,
        started_at: startedAt,
        completed_at: Date.now(),
      };
    } catch (error) {
      await this.logger.error('R2 sync failed', { error, backupId });

      return {
        backup_id: backupId,
        status: 'failed',
        backup_type: 'r2_sync',
        started_at: startedAt,
        error_message: (error as Error).message,
      };
    }
  }

  /**
   * Export vector embeddings
   */
  async exportVectors(): Promise<BackupResult> {
    const backupId = `backup-vectors-${Date.now()}`;
    const startedAt = Date.now();

    try {
      await this.logger.info('Starting vector export', { backupId });

      // Get all document chunks with vectors
      const chunks = await this.env.DB.prepare(
        'SELECT id, document_id, chunk_index, content, vector_id, metadata FROM document_chunks'
      ).all();

      const vectorData = chunks.results.map((chunk) => ({
        id: chunk.id,
        document_id: chunk.document_id,
        chunk_index: chunk.chunk_index,
        content: chunk.content,
        vector_id: chunk.vector_id,
        metadata: chunk.metadata,
      }));

      const backupContent = JSON.stringify(vectorData, null, 2);
      const checksum = await this.calculateChecksum(backupContent);

      // Send to NAS
      if (this.env.NAS_WEBHOOK_URL) {
        await this.sendToNAS({
          type: 'vector_export',
          backup_id: backupId,
          content: backupContent,
          checksum,
          timestamp: Date.now(),
        });
      }

      await this.logBackup({
        id: backupId,
        backup_type: 'vector_export',
        status: 'completed',
        file_count: vectorData.length,
        backup_size: backupContent.length,
        checksum,
        started_at: startedAt,
        completed_at: Date.now(),
      });

      return {
        backup_id: backupId,
        status: 'completed',
        backup_type: 'vector_export',
        file_count: vectorData.length,
        backup_size: backupContent.length,
        checksum,
        started_at: startedAt,
        completed_at: Date.now(),
      };
    } catch (error) {
      await this.logger.error('Vector export failed', { error, backupId });

      return {
        backup_id: backupId,
        status: 'failed',
        backup_type: 'vector_export',
        started_at: startedAt,
        error_message: (error as Error).message,
      };
    }
  }

  /**
   * Incremental backup (changes only)
   */
  async incrementalBackup(sinceTimestamp: number): Promise<BackupResult> {
    const backupId = `backup-incr-${Date.now()}`;
    const startedAt = Date.now();

    try {
      await this.logger.info('Starting incremental backup', { backupId, since: sinceTimestamp });

      const changes: Record<string, any[]> = {};
      const tables = ['users', 'conversations', 'messages', 'documents', 'tasks'];

      for (const table of tables) {
        const result = await this.env.DB.prepare(
          `SELECT * FROM ${table} WHERE updated_at > ? OR created_at > ?`
        )
          .bind(sinceTimestamp, sinceTimestamp)
          .all();

        if (result.results.length > 0) {
          changes[table] = result.results;
        }
      }

      const backupContent = JSON.stringify(changes, null, 2);
      const checksum = await this.calculateChecksum(backupContent);
      const totalChanges = Object.values(changes).reduce((sum, arr) => sum + arr.length, 0);

      if (this.env.NAS_WEBHOOK_URL) {
        await this.sendToNAS({
          type: 'incremental_backup',
          backup_id: backupId,
          since: sinceTimestamp,
          changes,
          checksum,
          timestamp: Date.now(),
        });
      }

      await this.logBackup({
        id: backupId,
        backup_type: 'incremental',
        status: 'completed',
        file_count: totalChanges,
        backup_size: backupContent.length,
        checksum,
        started_at: startedAt,
        completed_at: Date.now(),
      });

      return {
        backup_id: backupId,
        status: 'completed',
        backup_type: 'incremental',
        file_count: totalChanges,
        backup_size: backupContent.length,
        checksum,
        started_at: startedAt,
        completed_at: Date.now(),
      };
    } catch (error) {
      await this.logger.error('Incremental backup failed', { error, backupId });

      return {
        backup_id: backupId,
        status: 'failed',
        backup_type: 'incremental',
        started_at: startedAt,
        error_message: (error as Error).message,
      };
    }
  }

  /**
   * Send backup data to NAS via webhook
   */
  private async sendToNAS(payload: Record<string, unknown>): Promise<void> {
    if (!this.env.NAS_WEBHOOK_URL) {
      throw new Error('NAS_WEBHOOK_URL not configured');
    }

    const response = await fetch(this.env.NAS_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Backup-Source': 'cloudflare-workers',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`NAS webhook failed: ${response.status} ${response.statusText}`);
    }

    await this.logger.info('Backup sent to NAS', { status: response.status });
  }

  /**
   * Calculate checksum for backup verification
   */
  private async calculateChecksum(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Log backup to database
   */
  private async logBackup(backup: {
    id: string;
    backup_type: BackupType;
    status: BackupStatus;
    file_count?: number;
    backup_size?: number;
    checksum?: string;
    error_message?: string;
    started_at: number;
    completed_at?: number;
  }): Promise<void> {
    await this.env.DB.prepare(
      `INSERT INTO backup_logs (id, backup_type, status, backup_size, file_count, checksum, error_message, started_at, completed_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        backup.id,
        backup.backup_type,
        backup.status,
        backup.backup_size || null,
        backup.file_count || null,
        backup.checksum || null,
        backup.error_message || null,
        backup.started_at,
        backup.completed_at || null,
        Date.now()
      )
      .run();
  }

  /**
   * Get backup history
   */
  async getBackupHistory(limit = 50): Promise<BackupResult[]> {
    const result = await this.env.DB.prepare(
      'SELECT * FROM backup_logs ORDER BY created_at DESC LIMIT ?'
    )
      .bind(limit)
      .all();

    return result.results.map((row) => ({
      backup_id: row.id as string,
      status: row.status as BackupStatus,
      backup_type: row.backup_type as BackupType,
      file_count: row.file_count as number | undefined,
      backup_size: row.backup_size as number | undefined,
      checksum: row.checksum as string | undefined,
      started_at: row.started_at as number,
      completed_at: row.completed_at as number | undefined,
      error_message: row.error_message as string | undefined,
    }));
  }
}
