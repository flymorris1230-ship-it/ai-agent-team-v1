/**
 * AI Agent Team - Main Entry Point
 * Cloudflare Workers Application
 */

import type { Env } from './types';
import { CoordinatorAgent } from './agents/coordinator';
import { Logger } from './utils/logger';
import app from './api';

// ==========================================
// Export Cloudflare Workers Handler
// ==========================================
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx);
  },

  async queue(batch: MessageBatch, env: Env): Promise<void> {
    const logger = new Logger(env, 'QueueHandler');
    await logger.info(`Processing queue batch with ${batch.messages.length} messages`);

    for (const message of batch.messages) {
      try {
        const data = message.body as any;

        if (data.type === 'task_assignment') {
          // Handle task assignment
          const coordinator = new CoordinatorAgent(env);
          await coordinator.distributeTasks();
        } else if (data.type === 'backup') {
          // Handle backup tasks
          await logger.info('Processing backup task', { data });
        } else if (data.type === 'urgent_notification') {
          // Handle urgent notifications
          await logger.warning('Urgent notification', { data });
        }

        message.ack();
      } catch (error) {
        await logger.error('Queue message processing failed', { error, message });
        message.retry();
      }
    }
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const logger = new Logger(env, 'ScheduledHandler');
    await logger.info(`Running scheduled event at ${new Date(event.scheduledTime).toISOString()}`);

    // Distribute pending tasks
    const coordinator = new CoordinatorAgent(env);
    await coordinator.distributeTasks();

    // Monitor progress
    const report = await coordinator.monitorProgress();
    await logger.info('Scheduled progress report', { report });
  },
};
