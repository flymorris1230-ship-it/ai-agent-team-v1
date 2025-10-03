/**
 * Centralized Logging System
 */

import type { Env, LogLevel, SystemLog, AgentId } from '../types';

export class Logger {
  constructor(
    private env: Env,
    private component: string
  ) {}

  /**
   * Log info message
   */
  async info(message: string, details?: Record<string, unknown>, agentId?: AgentId, taskId?: string): Promise<void> {
    await this.log('info', message, details, agentId, taskId);
  }

  /**
   * Log warning message
   */
  async warning(message: string, details?: Record<string, unknown>, agentId?: AgentId, taskId?: string): Promise<void> {
    await this.log('warning', message, details, agentId, taskId);
  }

  /**
   * Log error message
   */
  async error(message: string, details?: Record<string, unknown>, agentId?: AgentId, taskId?: string): Promise<void> {
    await this.log('error', message, details, agentId, taskId);
  }

  /**
   * Log critical message
   */
  async critical(message: string, details?: Record<string, unknown>, agentId?: AgentId, taskId?: string): Promise<void> {
    await this.log('critical', message, details, agentId, taskId);
  }

  /**
   * Core logging method
   */
  private async log(
    level: LogLevel,
    message: string,
    details?: Record<string, unknown>,
    agentId?: AgentId,
    taskId?: string
  ): Promise<void> {
    const logEntry: SystemLog = {
      id: crypto.randomUUID(),
      level,
      component: this.component,
      message,
      details,
      agent_id: agentId,
      task_id: taskId,
      created_at: Date.now(),
    };

    // Log to console in development
    if (this.env.ENVIRONMENT === 'development' || this.env.LOG_LEVEL === 'debug') {
      console.log(`[${level.toUpperCase()}] [${this.component}]`, message, details || '');
    }

    // Store in database for all environments
    try {
      await this.env.DB.prepare(
        `INSERT INTO system_logs (id, level, component, message, details, agent_id, task_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          logEntry.id,
          logEntry.level,
          logEntry.component,
          logEntry.message,
          logEntry.details ? JSON.stringify(logEntry.details) : null,
          logEntry.agent_id || null,
          logEntry.task_id || null,
          logEntry.created_at
        )
        .run();
    } catch (error) {
      // If logging to DB fails, at least log to console
      console.error('Failed to write log to database:', error);
    }
  }

  /**
   * Query logs from database
   */
  static async queryLogs(
    env: Env,
    filters: {
      level?: LogLevel;
      component?: string;
      agent_id?: AgentId;
      task_id?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<SystemLog[]> {
    let query = 'SELECT * FROM system_logs WHERE 1=1';
    const params: unknown[] = [];

    if (filters.level) {
      query += ' AND level = ?';
      params.push(filters.level);
    }

    if (filters.component) {
      query += ' AND component = ?';
      params.push(filters.component);
    }

    if (filters.agent_id) {
      query += ' AND agent_id = ?';
      params.push(filters.agent_id);
    }

    if (filters.task_id) {
      query += ' AND task_id = ?';
      params.push(filters.task_id);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    const result = await env.DB.prepare(query).bind(...params).all();

    return (result.results as SystemLog[]).map((log) => ({
      ...log,
      details: log.details ? JSON.parse(log.details as string) : undefined,
    }));
  }
}
