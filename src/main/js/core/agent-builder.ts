/**
 * Agent Builder System
 * Allows users to create custom AI agents with specific capabilities
 */

import type { Env } from '../types';
import { Logger } from '../utils/logger';

export interface CustomAgentConfig {
  name: string;
  description?: string;
  instructions: string;
  model?: string;
  capabilities?: string[];
  tools?: AgentTool[];
  knowledge_base_ids?: string[];
  supports_audio?: boolean;
  supports_image?: boolean;
  audio_config?: AudioConfig;
  image_config?: ImageConfig;
  temperature?: number;
  max_tokens?: number;
  response_format?: 'text' | 'json' | 'structured';
  tags?: string[];
  is_public?: boolean;
}

export interface AgentTool {
  type: 'function' | 'code_interpreter' | 'file_search' | 'web_search';
  function?: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface AudioConfig {
  voice?: string; // Voice ID for TTS
  language?: string;
  speed?: number;
  enable_transcription?: boolean;
}

export interface ImageConfig {
  enable_vision?: boolean;
  enable_generation?: boolean;
  generation_model?: string;
  max_image_size?: number;
}

export interface CustomAgent {
  id: string;
  name: string;
  description?: string;
  instructions: string;
  model: string;
  capabilities: string[];
  tools: AgentTool[];
  knowledge_base_ids: string[];
  supports_audio: boolean;
  supports_image: boolean;
  audio_config?: AudioConfig;
  image_config?: ImageConfig;
  temperature: number;
  max_tokens: number;
  response_format: string;
  created_by: string;
  is_public: boolean;
  is_template: boolean;
  usage_count: number;
  rating?: number;
  tags: string[];
  status: string;
  created_at: number;
  updated_at: number;
}

export class AgentBuilderSystem {
  private logger: Logger;

  constructor(private env: Env) {
    this.logger = new Logger(env, 'AgentBuilderSystem');
  }

  /**
   * Create a new custom agent
   */
  async createAgent(userId: string, config: CustomAgentConfig): Promise<CustomAgent> {
    const agentId = `custom-agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    // Validate configuration
    this.validateAgentConfig(config);

    const agent: CustomAgent = {
      id: agentId,
      name: config.name,
      description: config.description,
      instructions: config.instructions,
      model: config.model || 'claude-3-5-sonnet',
      capabilities: config.capabilities || [],
      tools: config.tools || [],
      knowledge_base_ids: config.knowledge_base_ids || [],
      supports_audio: config.supports_audio || false,
      supports_image: config.supports_image || false,
      audio_config: config.audio_config,
      image_config: config.image_config,
      temperature: config.temperature ?? 0.7,
      max_tokens: config.max_tokens || 4096,
      response_format: config.response_format || 'text',
      created_by: userId,
      is_public: config.is_public || false,
      is_template: false,
      usage_count: 0,
      tags: config.tags || [],
      status: 'active',
      created_at: now,
      updated_at: now,
    };

    // Insert into database
    await this.env.DB.prepare(
      `INSERT INTO custom_agents (
        id, name, description, instructions, model,
        capabilities, tools, knowledge_base_ids,
        supports_audio, supports_image, audio_config, image_config,
        temperature, max_tokens, response_format,
        created_by, is_public, is_template, usage_count, tags, status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        agent.id,
        agent.name,
        agent.description || null,
        agent.instructions,
        agent.model,
        JSON.stringify(agent.capabilities),
        JSON.stringify(agent.tools),
        JSON.stringify(agent.knowledge_base_ids),
        agent.supports_audio ? 1 : 0,
        agent.supports_image ? 1 : 0,
        agent.audio_config ? JSON.stringify(agent.audio_config) : null,
        agent.image_config ? JSON.stringify(agent.image_config) : null,
        agent.temperature,
        agent.max_tokens,
        agent.response_format,
        agent.created_by,
        agent.is_public ? 1 : 0,
        agent.is_template ? 1 : 0,
        agent.usage_count,
        JSON.stringify(agent.tags),
        agent.status,
        agent.created_at,
        agent.updated_at
      )
      .run();

    await this.logger.info('Custom agent created', { agentId, userId, name: agent.name });

    return agent;
  }

  /**
   * Get custom agent by ID
   */
  async getAgent(agentId: string, userId?: string): Promise<CustomAgent | null> {
    const result = await this.env.DB.prepare(
      `SELECT * FROM custom_agents WHERE id = ? AND (is_public = 1 OR created_by = ? OR ? IS NULL)`
    )
      .bind(agentId, userId || null, userId || null)
      .first();

    if (!result) {
      return null;
    }

    return this.parseAgentFromRow(result);
  }

  /**
   * List user's custom agents
   */
  async listUserAgents(userId: string, includePublic: boolean = false): Promise<CustomAgent[]> {
    let query = `SELECT * FROM custom_agents WHERE created_by = ? AND status = 'active'`;

    if (includePublic) {
      query = `SELECT * FROM custom_agents WHERE (created_by = ? OR is_public = 1) AND status = 'active'`;
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.env.DB.prepare(query).bind(userId).all();

    return result.results.map((row) => this.parseAgentFromRow(row));
  }

  /**
   * Update custom agent
   */
  async updateAgent(agentId: string, userId: string, updates: Partial<CustomAgentConfig>): Promise<CustomAgent> {
    // Verify ownership
    const existing = await this.getAgent(agentId, userId);
    if (!existing || existing.created_by !== userId) {
      throw new Error('Agent not found or access denied');
    }

    const now = Date.now();
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (updates.name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(updates.name);
    }
    if (updates.description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(updates.description);
    }
    if (updates.instructions !== undefined) {
      updateFields.push('instructions = ?');
      updateValues.push(updates.instructions);
    }
    if (updates.capabilities !== undefined) {
      updateFields.push('capabilities = ?');
      updateValues.push(JSON.stringify(updates.capabilities));
    }
    if (updates.tools !== undefined) {
      updateFields.push('tools = ?');
      updateValues.push(JSON.stringify(updates.tools));
    }
    if (updates.supports_audio !== undefined) {
      updateFields.push('supports_audio = ?');
      updateValues.push(updates.supports_audio ? 1 : 0);
    }
    if (updates.supports_image !== undefined) {
      updateFields.push('supports_image = ?');
      updateValues.push(updates.supports_image ? 1 : 0);
    }

    updateFields.push('updated_at = ?');
    updateValues.push(now);

    updateValues.push(agentId);

    await this.env.DB.prepare(`UPDATE custom_agents SET ${updateFields.join(', ')} WHERE id = ?`)
      .bind(...updateValues)
      .run();

    await this.logger.info('Custom agent updated', { agentId, userId });

    const updated = await this.getAgent(agentId, userId);
    if (!updated) {
      throw new Error('Failed to retrieve updated agent');
    }

    return updated;
  }

  /**
   * Delete custom agent
   */
  async deleteAgent(agentId: string, userId: string): Promise<void> {
    const existing = await this.getAgent(agentId, userId);
    if (!existing || existing.created_by !== userId) {
      throw new Error('Agent not found or access denied');
    }

    await this.env.DB.prepare(`UPDATE custom_agents SET status = 'deleted', updated_at = ? WHERE id = ?`)
      .bind(Date.now(), agentId)
      .run();

    await this.logger.info('Custom agent deleted', { agentId, userId });
  }

  /**
   * Clone agent from template
   */
  async cloneFromTemplate(templateId: string, userId: string, customName?: string): Promise<CustomAgent> {
    const template = await this.env.DB.prepare(`SELECT * FROM agent_templates WHERE id = ?`).bind(templateId).first();

    if (!template) {
      throw new Error('Template not found');
    }

    const config: CustomAgentConfig = {
      name: customName || `${template.name} (Copy)`,
      description: template.description as string,
      instructions: template.default_instructions as string,
      model: (template.suggested_model as string) || 'claude-3-5-sonnet',
      capabilities: template.default_capabilities ? JSON.parse(template.default_capabilities as string) : [],
      tools: template.default_tools ? JSON.parse(template.default_tools as string) : [],
      supports_audio: Boolean(template.supports_audio),
      supports_image: Boolean(template.supports_image),
    };

    // Increment template usage count
    await this.env.DB.prepare(`UPDATE agent_templates SET usage_count = usage_count + 1 WHERE id = ?`)
      .bind(templateId)
      .run();

    return this.createAgent(userId, config);
  }

  /**
   * Get available templates
   */
  async listTemplates(category?: string): Promise<any[]> {
    let query = `SELECT * FROM agent_templates WHERE 1=1`;
    const params: any[] = [];

    if (category) {
      query += ` AND category = ?`;
      params.push(category);
    }

    query += ` ORDER BY is_featured DESC, rating DESC, usage_count DESC`;

    const result = await this.env.DB.prepare(query).bind(...params).all();

    return result.results.map((row) => ({
      ...row,
      default_capabilities: row.default_capabilities ? JSON.parse(row.default_capabilities as string) : [],
      default_tools: row.default_tools ? JSON.parse(row.default_tools as string) : [],
    }));
  }

  /**
   * Increment agent usage count
   */
  async incrementUsageCount(agentId: string): Promise<void> {
    await this.env.DB.prepare(`UPDATE custom_agents SET usage_count = usage_count + 1 WHERE id = ?`)
      .bind(agentId)
      .run();
  }

  /**
   * Validate agent configuration
   */
  private validateAgentConfig(config: CustomAgentConfig): void {
    if (!config.name || config.name.trim().length === 0) {
      throw new Error('Agent name is required');
    }

    if (!config.instructions || config.instructions.trim().length === 0) {
      throw new Error('Agent instructions are required');
    }

    if (config.name.length > 100) {
      throw new Error('Agent name must be 100 characters or less');
    }

    if (config.instructions.length > 10000) {
      throw new Error('Instructions must be 10000 characters or less');
    }

    if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 2)) {
      throw new Error('Temperature must be between 0 and 2');
    }

    if (config.max_tokens !== undefined && (config.max_tokens < 1 || config.max_tokens > 100000)) {
      throw new Error('Max tokens must be between 1 and 100000');
    }
  }

  /**
   * Parse agent from database row
   */
  private parseAgentFromRow(row: any): CustomAgent {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      instructions: row.instructions,
      model: row.model,
      capabilities: row.capabilities ? JSON.parse(row.capabilities) : [],
      tools: row.tools ? JSON.parse(row.tools) : [],
      knowledge_base_ids: row.knowledge_base_ids ? JSON.parse(row.knowledge_base_ids) : [],
      supports_audio: Boolean(row.supports_audio),
      supports_image: Boolean(row.supports_image),
      audio_config: row.audio_config ? JSON.parse(row.audio_config) : undefined,
      image_config: row.image_config ? JSON.parse(row.image_config) : undefined,
      temperature: row.temperature,
      max_tokens: row.max_tokens,
      response_format: row.response_format,
      created_by: row.created_by,
      is_public: Boolean(row.is_public),
      is_template: Boolean(row.is_template),
      usage_count: row.usage_count,
      rating: row.rating,
      tags: row.tags ? JSON.parse(row.tags) : [],
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
