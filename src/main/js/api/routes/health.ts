/**
 * Health Check Routes
 */

import { Hono } from 'hono';
import type { Env } from '../../types';

export const healthRoutes = new Hono<{ Bindings: Env }>();

// No auth middleware - health checks should be public

/**
 * GET /health - System health check
 */
healthRoutes.get('/', async (c) => {
  try {
    const startTime = Date.now();

    // Check basic system health
    const checks = {
      timestamp: startTime,
      status: 'healthy',
      uptime: process?.uptime?.() || 0,
      environment: c.env.ENVIRONMENT || 'unknown',
    };

    return c.json({
      success: true,
      data: checks,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'HEALTH_CHECK_ERROR', message: (error as Error).message },
      },
      500
    );
  }
});

/**
 * GET /health/db - Database health
 */
healthRoutes.get('/db', async (c) => {
  try {
    const startTime = Date.now();

    // Test database connection with a simple query
    const result = await c.env.DB.prepare('SELECT 1 as test').first();

    const responseTime = Date.now() - startTime;

    if (!result || result.test !== 1) {
      return c.json(
        {
          success: false,
          error: { code: 'DB_UNHEALTHY', message: 'Database query returned unexpected result' },
        },
        503
      );
    }

    // Get table counts for diagnostics
    const userCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first();
    const taskCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM tasks').first();
    const agentCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM agents').first();

    return c.json({
      success: true,
      data: {
        status: 'healthy',
        response_time_ms: responseTime,
        stats: {
          users: userCount?.count || 0,
          tasks: taskCount?.count || 0,
          agents: agentCount?.count || 0,
        },
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'DB_ERROR', message: (error as Error).message },
      },
      503
    );
  }
});

/**
 * GET /health/vectorize - Vectorize health
 */
healthRoutes.get('/vectorize', async (c) => {
  try {
    const startTime = Date.now();

    // Test vectorize with a simple query
    const testVector = new Array(1536).fill(0.1); // OpenAI embedding dimension
    const result = await c.env.VECTORIZE.query(testVector, {
      topK: 1,
      returnMetadata: false,
    });

    const responseTime = Date.now() - startTime;

    return c.json({
      success: true,
      data: {
        status: 'healthy',
        response_time_ms: responseTime,
        stats: {
          test_query_results: result.matches.length,
        },
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'VECTORIZE_ERROR', message: (error as Error).message },
      },
      503
    );
  }
});

/**
 * GET /health/agents - Agents health
 */
healthRoutes.get('/agents', async (c) => {
  try {
    const startTime = Date.now();

    // Get all agents and their statuses
    const agents = await c.env.DB.prepare('SELECT id, name, status, updated_at FROM agents').all();

    const now = Date.now();
    const healthyThreshold = 300000; // 5 minutes

    const agentHealth = agents.results.map((agent) => {
      const lastUpdate = agent.updated_at as number;
      const isStale = now - lastUpdate > healthyThreshold;

      return {
        id: agent.id,
        name: agent.name,
        status: agent.status,
        health: isStale ? 'stale' : 'healthy',
        last_update: lastUpdate,
        minutes_since_update: Math.floor((now - lastUpdate) / 60000),
      };
    });

    const healthyCount = agentHealth.filter((a) => a.health === 'healthy').length;
    const staleCount = agentHealth.filter((a) => a.health === 'stale').length;

    const overallStatus = staleCount > agentHealth.length / 2 ? 'degraded' : 'healthy';

    const responseTime = Date.now() - startTime;

    return c.json({
      success: true,
      data: {
        status: overallStatus,
        response_time_ms: responseTime,
        summary: {
          total_agents: agentHealth.length,
          healthy: healthyCount,
          stale: staleCount,
        },
        agents: agentHealth,
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'AGENT_HEALTH_ERROR', message: (error as Error).message },
      },
      503
    );
  }
});
