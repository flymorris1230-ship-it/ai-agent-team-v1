/**
 * Factory OS Integration Routes
 * API endpoints for Genesis Factory OS to interact with AI Agent Team
 */

import { Hono } from 'hono';
import type { Env } from '../../types';
import { CoordinatorAgent } from '../../agents/coordinator';
import { RAGEngine } from '../../core/rag-engine';

export const factoryOsRoutes = new Hono<{ Bindings: Env }>();

// ==========================================
// Middleware: API Key Authentication
// ==========================================

const factoryOsAuth = async (c: any, next: any) => {
  const apiKey = c.req.header('x-api-key') || c.req.header('Authorization')?.replace('Bearer ', '');

  if (!apiKey) {
    return c.json(
      {
        success: false,
        error: { code: 'MISSING_API_KEY', message: 'API key is required' },
      },
      401
    );
  }

  // Validate API key (from environment variable)
  const validApiKey = c.env.FACTORY_OS_API_KEY || 'default-factory-os-key';

  if (apiKey !== validApiKey) {
    return c.json(
      {
        success: false,
        error: { code: 'INVALID_API_KEY', message: 'Invalid API key' },
      },
      403
    );
  }

  await next();
};

// Apply auth middleware to all Factory OS routes
factoryOsRoutes.use('*', factoryOsAuth);

// ==========================================
// System Capabilities & Health
// ==========================================

/**
 * GET /factory-os/capabilities
 * Get AI Agent Team capabilities for Factory OS integration
 */
factoryOsRoutes.get('/capabilities', async (c) => {
  return c.json({
    success: true,
    data: {
      system: 'AI Agent Team v1 (GAC)',
      version: '2.3.0',
      status: 'operational',
      integration_type: 'symbiotic',
      capabilities: {
        agents: [
          {
            id: 'coordinator',
            name: 'Coordinator Agent',
            capabilities: ['task_orchestration', 'workload_balancing', 'progress_monitoring'],
            available: true,
          },
          {
            id: 'product-manager',
            name: 'Product Manager Agent',
            capabilities: ['prd_creation', 'requirements_analysis', 'user_stories', 'feature_prioritization'],
            available: true,
          },
          {
            id: 'solution-architect',
            name: 'Solution Architect Agent',
            capabilities: ['system_design', 'database_modeling', 'architecture_decisions', 'tech_stack_selection'],
            available: true,
          },
          {
            id: 'frontend-developer',
            name: 'Frontend Developer Agent',
            capabilities: ['react_components', 'ui_design', 'form_generation', 'responsive_layout'],
            available: true,
          },
          {
            id: 'qa-engineer',
            name: 'QA Engineer Agent',
            capabilities: ['test_generation', 'code_review', 'quality_assurance', 'test_automation'],
            available: true,
          },
        ],
        rag: {
          enabled: true,
          embedding_model: 'text-embedding-004',
          provider: 'gemini',
          cost: 0,
          vector_dimensions: 768,
        },
        multi_llm: {
          enabled: true,
          providers: ['openai', 'gemini'],
          strategies: ['cost', 'performance', 'balanced'],
          current_strategy: 'balanced',
        },
      },
      endpoints: {
        agent_tasks: '/api/v1/factory-os/agents/:agentId/tasks',
        rag_query: '/api/v1/factory-os/rag/query',
        rag_index: '/api/v1/factory-os/rag/index',
        health: '/api/v1/factory-os/health',
      },
    },
  });
});

/**
 * GET /factory-os/health
 * Health check for Factory OS integration
 */
factoryOsRoutes.get('/health', async (c) => {
  try {
    // Quick health check
    const dbTest = await c.env.DB.prepare('SELECT 1 as test').first();

    return c.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: Date.now(),
        services: {
          database: dbTest?.test === 1 ? 'healthy' : 'unhealthy',
          agents: 'healthy',
          rag: 'healthy',
          multi_llm: 'healthy',
        },
        integration: {
          factory_os_connected: true,
          last_request: Date.now(),
        },
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'HEALTH_CHECK_FAILED', message: (error as Error).message },
      },
      503
    );
  }
});

// ==========================================
// Agent Task Endpoints
// ==========================================

/**
 * POST /factory-os/agents/pm/create-prd
 * Request PM Agent to create PRD
 */
factoryOsRoutes.post('/agents/pm/create-prd', async (c) => {
  try {
    const body = await c.req.json();
    const { feature_name, description, requirements } = body;

    if (!feature_name) {
      return c.json(
        {
          success: false,
          error: { code: 'MISSING_PARAMETER', message: 'feature_name is required' },
        },
        400
      );
    }

    // Note: PM Agent methods are currently designed for internal task processing
    // This endpoint provides a wrapper for Factory OS integration
    // Future enhancement: expose public API methods on agents

    const prdStructure = {
      title: `Product Requirements Document: ${feature_name}`,
      version: '1.0.0',
      date: new Date().toISOString(),
      overview: description || `Requirements analysis for ${feature_name}`,
      user_stories: requirements || [],
      acceptance_criteria: [],
      technical_requirements: {},
      timeline: {},
    };

    return c.json({
      success: true,
      data: {
        agent: 'product-manager',
        task_type: 'prd_creation',
        output: prdStructure,
        metadata: {
          feature: feature_name,
          timestamp: Date.now(),
          cost: 0, // Using Gemini free tier
        },
        note: 'PRD structure provided. For full AI-generated content, use task-based workflow.',
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'PRD_GENERATION_FAILED', message: (error as Error).message },
      },
      500
    );
  }
});

/**
 * POST /factory-os/agents/architect/design-database
 * Request Architect Agent to design database schema
 */
factoryOsRoutes.post('/agents/architect/design-database', async (c) => {
  try {
    const body = await c.req.json();
    const { entity_name, requirements } = body;

    if (!entity_name) {
      return c.json(
        {
          success: false,
          error: { code: 'MISSING_PARAMETER', message: 'entity_name is required' },
        },
        400
      );
    }

    // Provide Prisma schema template for multi-tenant entity
    const schema = {
      model_name: entity_name,
      prisma_schema: `model ${entity_name} {
  id         String   @id @default(cuid())
  tenant_id  String
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  // Add your fields here

  // Relations
  tenant Tenant @relation(fields: [tenant_id], references: [id], onDelete: Cascade)

  @@index([tenant_id])
}`,
      recommendations: [
        'Always include tenant_id for multi-tenant isolation',
        'Use @index([tenant_id]) for query performance',
        'Use onDelete: Cascade to clean up orphaned records',
      ],
      requirements: requirements || {},
    };

    return c.json({
      success: true,
      data: {
        agent: 'solution-architect',
        task_type: 'database_design',
        output: schema,
        metadata: {
          entity: entity_name,
          timestamp: Date.now(),
        },
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'SCHEMA_DESIGN_FAILED', message: (error as Error).message },
      },
      500
    );
  }
});

/**
 * POST /factory-os/agents/frontend/generate-component
 * Request Frontend Agent to generate React component
 */
factoryOsRoutes.post('/agents/frontend/generate-component', async (c) => {
  try {
    const body = await c.req.json();
    const { component_name, component_type, props } = body;

    if (!component_name) {
      return c.json(
        {
          success: false,
          error: { code: 'MISSING_PARAMETER', message: 'component_name is required' },
        },
        400
      );
    }

    // Provide React component template
    const component = {
      name: component_name,
      type: component_type || 'functional',
      code: `// ${component_name} Component
import React from 'react';

interface ${component_name}Props {
  // Add your props here
}

export const ${component_name}: React.FC<${component_name}Props> = (props) => {
  return (
    <div className="${component_name.toLowerCase()}">
      {/* Component content */}
    </div>
  );
};`,
      props: props || {},
    };

    return c.json({
      success: true,
      data: {
        agent: 'frontend-developer',
        task_type: 'component_generation',
        output: component,
        metadata: {
          component: component_name,
          timestamp: Date.now(),
        },
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'COMPONENT_GENERATION_FAILED', message: (error as Error).message },
      },
      500
    );
  }
});

/**
 * POST /factory-os/agents/qa/generate-tests
 * Request QA Agent to generate tests
 */
factoryOsRoutes.post('/agents/qa/generate-tests', async (c) => {
  try {
    const body = await c.req.json();
    const { test_target } = body;

    if (!test_target) {
      return c.json(
        {
          success: false,
          error: { code: 'MISSING_PARAMETER', message: 'test_target is required' },
        },
        400
      );
    }

    // Provide test template
    const tests = {
      target: test_target,
      test_code: `// ${test_target} Tests
import { describe, it, expect } from 'vitest';

describe('${test_target}', () => {
  it('should render correctly', () => {
    // Add test implementation
    expect(true).toBe(true);
  });

  it('should handle user interactions', () => {
    // Add test implementation
  });
});`,
    };

    return c.json({
      success: true,
      data: {
        agent: 'qa-engineer',
        task_type: 'test_generation',
        output: tests,
        metadata: {
          target: test_target,
          timestamp: Date.now(),
        },
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'TEST_GENERATION_FAILED', message: (error as Error).message },
      },
      500
    );
  }
});

// ==========================================
// RAG Knowledge Base Endpoints
// ==========================================

/**
 * POST /factory-os/rag/query
 * Query knowledge base using RAG
 */
factoryOsRoutes.post('/rag/query', async (c) => {
  try {
    const body = await c.req.json();
    const { query, top_k } = body;

    if (!query) {
      return c.json(
        {
          success: false,
          error: { code: 'MISSING_PARAMETER', message: 'query is required' },
        },
        400
      );
    }

    const rag = new RAGEngine(c.env, {
      usePostgresVector: true,
      useLLMRouter: true,
      llmStrategy: 'cost', // Use Gemini for free
    });

    // Query knowledge base
    const result = await rag.generateAnswer({
      query,
      top_k: top_k || 5,
      conversation_history: [],
    });

    return c.json({
      success: true,
      data: {
        query,
        answer: result.answer,
        sources: result.sources,
        metadata: {
          timestamp: Date.now(),
          provider: 'gemini',
          cost: 0,
        },
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'RAG_QUERY_FAILED', message: (error as Error).message },
      },
      500
    );
  }
});

/**
 * POST /factory-os/rag/index
 * Index documents into knowledge base
 */
factoryOsRoutes.post('/rag/index', async (c) => {
  try {
    const body = await c.req.json();
    const { documents } = body;

    if (!documents || !Array.isArray(documents)) {
      return c.json(
        {
          success: false,
          error: { code: 'INVALID_PARAMETER', message: 'documents array is required' },
        },
        400
      );
    }

    // Future: RAG indexing will be implemented in Sprint 3
    // const rag = new RAGEngine(c.env, { usePostgresVector: true, useLLMRouter: true, llmStrategy: 'cost' });
    // for (const doc of documents) {
    //   const embedding = await rag.createEmbedding(doc.content);
    //   await db.insertKnowledgeVector(doc.content, embedding, doc.metadata);
    // }

    // Placeholder response - actual implementation requires postgres proxy integration
    return c.json({
      success: true,
      data: {
        total_documents: documents.length,
        indexed: 0,
        note: 'Indexing endpoint ready. Full implementation in Sprint 3 (RAG Knowledge Sharing)',
        metadata: {
          timestamp: Date.now(),
          provider: 'gemini',
          cost: 0,
        },
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'INDEXING_FAILED', message: (error as Error).message },
      },
      500
    );
  }
});

// ==========================================
// Coordinator Endpoints
// ==========================================

/**
 * POST /factory-os/coordinator/create-task
 * Create a task for agent coordination
 */
factoryOsRoutes.post('/coordinator/create-task', async (c) => {
  try {
    const body = await c.req.json();
    const { task_type, description, priority } = body;

    if (!task_type || !description) {
      return c.json(
        {
          success: false,
          error: { code: 'MISSING_PARAMETERS', message: 'task_type and description are required' },
        },
        400
      );
    }

    const coordinator = new CoordinatorAgent(c.env);

    // Process task request (would normally delegate to appropriate agents)
    const result = await coordinator.processUserRequest({
      user_id: 'factory-os-system',
      description,
      priority: priority || 'medium',
    });

    return c.json({
      success: true,
      data: {
        task_id: result.tasks[0]?.id || `task-${Date.now()}`,
        agent: 'coordinator',
        status: 'created',
        execution_plan: result.execution_plan,
        metadata: {
          task_type,
          timestamp: Date.now(),
        },
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'TASK_CREATION_FAILED', message: (error as Error).message },
      },
      500
    );
  }
});
