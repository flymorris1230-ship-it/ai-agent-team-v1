/**
 * Agent Communication System
 * Handles message passing and coordination between agents
 */

import type { Env, AgentCommunication, AgentId, CommunicationType } from '../types';
import { Logger } from '../utils/logger';

export interface MessagePayload {
  subject?: string;
  content: Record<string, unknown>;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  requires_response?: boolean;
  expires_at?: number;
}

export interface CommunicationChannel {
  id: string;
  participants: AgentId[];
  topic?: string;
  created_at: number;
}

export class AgentCommunicationSystem {
  private logger: Logger;

  constructor(private env: Env) {
    this.logger = new Logger(env, 'AgentCommunicationSystem');
  }

  /**
   * Send message from one agent to another
   */
  async sendMessage(
    fromAgentId: AgentId,
    toAgentId: AgentId,
    messageType: CommunicationType,
    payload: MessagePayload
  ): Promise<AgentCommunication> {
    const message: AgentCommunication = {
      id: `msg-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      from_agent_id: fromAgentId,
      to_agent_id: toAgentId,
      message_type: messageType,
      subject: payload.subject,
      content: {
        ...payload.content,
        priority: payload.priority || 'medium',
        requires_response: payload.requires_response || false,
        sent_at: Date.now(),
      },
      related_task_id: payload.content.task_id as string | undefined,
      created_at: Date.now(),
    };

    // Store message in database
    await this.env.DB.prepare(
      `INSERT INTO agent_communications (id, from_agent_id, to_agent_id, message_type, subject, content, related_task_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        message.id,
        message.from_agent_id,
        message.to_agent_id,
        message.message_type,
        message.subject || null,
        JSON.stringify(message.content),
        message.related_task_id || null,
        message.created_at
      )
      .run();

    await this.logger.info(`Message sent: ${fromAgentId} → ${toAgentId}`, {
      messageId: message.id,
      type: messageType,
    });

    // If urgent, send notification via queue
    if (payload.priority === 'urgent') {
      await this.sendUrgentNotification(message);
    }

    return message;
  }

  /**
   * Broadcast message to multiple agents
   */
  async broadcastMessage(
    fromAgentId: AgentId,
    toAgentIds: AgentId[],
    messageType: CommunicationType,
    payload: MessagePayload
  ): Promise<AgentCommunication[]> {
    const messages: AgentCommunication[] = [];

    for (const toAgentId of toAgentIds) {
      const message = await this.sendMessage(fromAgentId, toAgentId, messageType, payload);
      messages.push(message);
    }

    await this.logger.info(`Broadcast sent: ${fromAgentId} → ${toAgentIds.length} agents`, {
      messageCount: messages.length,
    });

    return messages;
  }

  /**
   * Send request and wait for response
   */
  async sendRequest(
    fromAgentId: AgentId,
    toAgentId: AgentId,
    request: {
      subject: string;
      content: Record<string, unknown>;
      timeout_ms?: number;
    }
  ): Promise<AgentCommunication | null> {
    // Send request
    const requestMsg = await this.sendMessage(fromAgentId, toAgentId, 'request', {
      subject: request.subject,
      content: request.content,
      requires_response: true,
    });

    // Wait for response (with timeout)
    const timeout = request.timeout_ms || 30000; // 30 seconds default
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const response = await this.env.DB.prepare(
        `SELECT * FROM agent_communications
         WHERE from_agent_id = ? AND to_agent_id = ? AND message_type = 'response'
         AND content LIKE ?
         ORDER BY created_at DESC LIMIT 1`
      )
        .bind(toAgentId, fromAgentId, `%${requestMsg.id}%`)
        .first();

      if (response) {
        return this.deserializeMessage(response);
      }

      // Wait 100ms before checking again
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    await this.logger.warning(`Request timeout: ${requestMsg.id}`, {
      fromAgentId,
      toAgentId,
      timeout,
    });

    return null;
  }

  /**
   * Send response to a request
   */
  async sendResponse(
    fromAgentId: AgentId,
    toAgentId: AgentId,
    requestId: string,
    responseContent: Record<string, unknown>
  ): Promise<AgentCommunication> {
    return this.sendMessage(fromAgentId, toAgentId, 'response', {
      subject: `Re: Request ${requestId}`,
      content: {
        request_id: requestId,
        ...responseContent,
      },
    });
  }

  /**
   * Get unread messages for an agent
   */
  async getUnreadMessages(agentId: AgentId): Promise<AgentCommunication[]> {
    const result = await this.env.DB.prepare(
      `SELECT * FROM agent_communications
       WHERE to_agent_id = ? AND read_at IS NULL
       ORDER BY created_at DESC`
    )
      .bind(agentId)
      .all();

    return result.results.map((row) => this.deserializeMessage(row));
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    await this.env.DB.prepare('UPDATE agent_communications SET read_at = ? WHERE id = ?')
      .bind(Date.now(), messageId)
      .run();
  }

  /**
   * Get conversation history between two agents
   */
  async getConversationHistory(
    agentId1: AgentId,
    agentId2: AgentId,
    limit = 50
  ): Promise<AgentCommunication[]> {
    const result = await this.env.DB.prepare(
      `SELECT * FROM agent_communications
       WHERE (from_agent_id = ? AND to_agent_id = ?)
          OR (from_agent_id = ? AND to_agent_id = ?)
       ORDER BY created_at DESC
       LIMIT ?`
    )
      .bind(agentId1, agentId2, agentId2, agentId1, limit)
      .all();

    return result.results.map((row) => this.deserializeMessage(row));
  }

  /**
   * Create a communication channel for multiple agents
   */
  async createChannel(participants: AgentId[], topic?: string): Promise<CommunicationChannel> {
    const channel: CommunicationChannel = {
      id: `channel-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      participants,
      topic,
      created_at: Date.now(),
    };

    // Store channel metadata in KV
    await this.env.CACHE.put(`channel:${channel.id}`, JSON.stringify(channel));

    await this.logger.info(`Communication channel created: ${channel.id}`, {
      participants: participants.length,
      topic,
    });

    return channel;
  }

  /**
   * Send message to a channel (all participants)
   */
  async sendToChannel(
    channelId: string,
    fromAgentId: AgentId,
    messageType: CommunicationType,
    payload: MessagePayload
  ): Promise<AgentCommunication[]> {
    // Get channel info
    const channelData = await this.env.CACHE.get(`channel:${channelId}`);
    if (!channelData) {
      throw new Error(`Channel not found: ${channelId}`);
    }

    const channel = JSON.parse(channelData) as CommunicationChannel;

    // Send to all participants except sender
    const recipients = channel.participants.filter((id) => id !== fromAgentId);

    return this.broadcastMessage(fromAgentId, recipients, messageType, {
      ...payload,
      content: {
        ...payload.content,
        channel_id: channelId,
      },
    });
  }

  /**
   * Get messages from a channel
   */
  async getChannelMessages(channelId: string, limit = 100): Promise<AgentCommunication[]> {
    const result = await this.env.DB.prepare(
      `SELECT * FROM agent_communications
       WHERE content LIKE ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
      .bind(`%"channel_id":"${channelId}"%`, limit)
      .all();

    return result.results.map((row) => this.deserializeMessage(row));
  }

  /**
   * Send notification about task assignment
   */
  async notifyTaskAssignment(
    fromAgentId: AgentId,
    toAgentId: AgentId,
    taskId: string,
    taskDetails: {
      title: string;
      description?: string;
      priority: string;
      deadline?: number;
    }
  ): Promise<AgentCommunication> {
    return this.sendMessage(fromAgentId, toAgentId, 'notification', {
      subject: `New Task Assigned: ${taskDetails.title}`,
      content: {
        type: 'task_assignment',
        task_id: taskId,
        ...taskDetails,
      },
      priority: taskDetails.priority as 'low' | 'medium' | 'high' | 'urgent',
    });
  }

  /**
   * Send notification about task completion
   */
  async notifyTaskCompletion(
    fromAgentId: AgentId,
    toAgentId: AgentId,
    taskId: string,
    result: Record<string, unknown>
  ): Promise<AgentCommunication> {
    return this.sendMessage(fromAgentId, toAgentId, 'notification', {
      subject: `Task Completed: ${taskId}`,
      content: {
        type: 'task_completion',
        task_id: taskId,
        result,
        completed_at: Date.now(),
      },
    });
  }

  /**
   * Send error notification
   */
  async notifyError(
    fromAgentId: AgentId,
    toAgentId: AgentId,
    error: {
      task_id?: string;
      error_message: string;
      error_type: string;
      details?: Record<string, unknown>;
    }
  ): Promise<AgentCommunication> {
    return this.sendMessage(fromAgentId, toAgentId, 'error', {
      subject: `Error: ${error.error_type}`,
      content: {
        type: 'error_notification',
        ...error,
        timestamp: Date.now(),
      },
      priority: 'urgent',
    });
  }

  /**
   * Request collaboration from another agent
   */
  async requestCollaboration(
    fromAgentId: AgentId,
    toAgentId: AgentId,
    collaboration: {
      task_id: string;
      reason: string;
      required_expertise: string[];
      deadline?: number;
    }
  ): Promise<AgentCommunication> {
    return this.sendMessage(fromAgentId, toAgentId, 'request', {
      subject: `Collaboration Request: ${collaboration.task_id}`,
      content: {
        type: 'collaboration_request',
        ...collaboration,
      },
      requires_response: true,
      priority: 'high',
    });
  }

  /**
   * Send urgent notification via queue
   */
  private async sendUrgentNotification(message: AgentCommunication): Promise<void> {
    try {
      await this.env.TASK_QUEUE.send({
        type: 'urgent_notification',
        message_id: message.id,
        to_agent_id: message.to_agent_id,
        subject: message.subject,
        timestamp: Date.now(),
      });

      await this.logger.info(`Urgent notification queued: ${message.id}`);
    } catch (error) {
      await this.logger.error('Failed to queue urgent notification', { error, messageId: message.id });
    }
  }

  /**
   * Get communication statistics for an agent
   */
  async getAgentCommunicationStats(agentId: AgentId): Promise<{
    sent: number;
    received: number;
    unread: number;
    by_type: Record<CommunicationType, number>;
  }> {
    const [sent, received, unread] = await Promise.all([
      this.env.DB.prepare('SELECT COUNT(*) as count FROM agent_communications WHERE from_agent_id = ?')
        .bind(agentId)
        .first(),
      this.env.DB.prepare('SELECT COUNT(*) as count FROM agent_communications WHERE to_agent_id = ?')
        .bind(agentId)
        .first(),
      this.env.DB.prepare(
        'SELECT COUNT(*) as count FROM agent_communications WHERE to_agent_id = ? AND read_at IS NULL'
      )
        .bind(agentId)
        .first(),
    ]);

    // Get counts by type
    const byType = await this.env.DB.prepare(
      `SELECT message_type, COUNT(*) as count
       FROM agent_communications
       WHERE from_agent_id = ? OR to_agent_id = ?
       GROUP BY message_type`
    )
      .bind(agentId, agentId)
      .all();

    const byTypeMap: Record<string, number> = {};
    for (const row of byType.results) {
      byTypeMap[row.message_type as string] = row.count as number;
    }

    return {
      sent: (sent?.count as number) || 0,
      received: (received?.count as number) || 0,
      unread: (unread?.count as number) || 0,
      by_type: byTypeMap as Record<CommunicationType, number>,
    };
  }

  /**
   * Clean up old messages
   */
  async cleanupOldMessages(olderThanDays = 30): Promise<number> {
    const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

    const result = await this.env.DB.prepare(
      'DELETE FROM agent_communications WHERE created_at < ? AND read_at IS NOT NULL'
    )
      .bind(cutoffTime)
      .run();

    const deletedCount = result.meta.changes || 0;

    await this.logger.info(`Cleaned up ${deletedCount} old messages`, { olderThanDays });

    return deletedCount;
  }

  /**
   * Deserialize message from database row
   */
  private deserializeMessage(row: Record<string, unknown>): AgentCommunication {
    return {
      ...row,
      content: row.content ? JSON.parse(row.content as string) : {},
    } as AgentCommunication;
  }
}
