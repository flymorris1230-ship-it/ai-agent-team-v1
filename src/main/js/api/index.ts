/**
 * API Router - Main entry point for all API routes
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import type { Env } from '../types';

// Import route handlers
import { chatRoutes } from './routes/chat';
import { documentRoutes } from './routes/documents';
import { taskRoutes } from './routes/tasks';
import { agentRoutes } from './routes/agents';
import { knowledgeRoutes } from './routes/knowledge';
import { authRoutes } from './routes/auth';
import { healthRoutes } from './routes/health';
import { factoryOsRoutes } from './routes/factory-os';
import { factoryStatusRoutes } from './routes/factory-status';
import { factoryStatusLegacyRoutes } from './routes/factory-status-legacy';

// Create Hono app
const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use(
  '*',
  cors({
    origin: [
      'http://localhost:3000', // Local development
      'https://yourapp.com',
      'http://localhost:3001', // Genesis Factory OS local dev
      'https://factory-os.shyangtsuen.xyz', // Genesis Factory OS production
      'https://genesis-factory-os.vercel.app', // Genesis Factory OS Vercel
    ],
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  })
);

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'AI Agent Team API',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      auth: '/api/v1/auth',
      chat: '/api/v1/chat',
      documents: '/api/v1/documents',
      tasks: '/api/v1/tasks',
      agents: '/api/v1/agents',
      knowledge: '/api/v1/knowledge',
      health: '/api/v1/health',
      'factory-os': '/api/v1/factory-os', // Genesis Factory OS integration
      'factory-status': '/api/v1/factory-status', // Factory OS monitoring (recommended + legacy)
    },
    factory_status_endpoints: {
      recommended: {
        current: '/api/v1/factory-status/current',
        history: '/api/v1/factory-status/history?limit=N',
        stats: '/api/v1/factory-status/stats?hours=N',
        dashboard: '/api/v1/factory-status/dashboard',
        check_now: '/api/v1/factory-status/check-now',
        test_connection: '/api/v1/factory-status/test-connection',
      },
      legacy: {
        status: '/api/v1/factory-status/status',
        history: '/api/v1/factory-status/status/history',
        summary: '/api/v1/factory-status/status/summary',
        detailed: '/api/v1/factory-status/status/detailed',
      },
    },
    documentation: '/api/v1/docs',
  });
});

// API v1 routes
const apiV1 = new Hono<{ Bindings: Env }>();

apiV1.route('/auth', authRoutes);
apiV1.route('/chat', chatRoutes);
apiV1.route('/documents', documentRoutes);
apiV1.route('/tasks', taskRoutes);
apiV1.route('/agents', agentRoutes);
apiV1.route('/knowledge', knowledgeRoutes);
apiV1.route('/health', healthRoutes);
apiV1.route('/factory-os', factoryOsRoutes); // Genesis Factory OS integration
apiV1.route('/factory-status', factoryStatusRoutes); // Factory OS monitoring (recommended)
apiV1.route('/factory-status', factoryStatusLegacyRoutes); // Factory OS monitoring (legacy compatibility)

app.route('/api/v1', apiV1);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested endpoint does not exist',
      },
    },
    404
  );
});

// Error handler
app.onError((err, c) => {
  console.error('API Error:', err);
  return c.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message || 'An unexpected error occurred',
      },
    },
    500
  );
});

export default app;
