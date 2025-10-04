/**
 * Database Configuration
 * Dual database architecture: Cloudflare D1 + PostgreSQL
 */

export interface DatabaseConfig {
  // Cloudflare D1 (Edge, fast access, operational data)
  d1: {
    enabled: boolean;
    binding: string; // 'DB'
    useCases: string[];
  };

  // PostgreSQL (NAS, persistent storage, RAG with pgvector)
  postgres: {
    enabled: boolean;
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    useCases: string[];
  };

  // Data sync strategy
  sync: {
    enabled: boolean;
    direction: 'bidirectional' | 'to-postgres' | 'to-d1';
    interval: number; // seconds
    tables: string[];
  };
}

export const databaseConfig: DatabaseConfig = {
  d1: {
    enabled: true,
    binding: 'DB',
    useCases: [
      'conversations',       // Real-time chat messages
      'messages',           // Chat history
      'tasks',              // Task management
      'task_history',       // Task tracking
      'agent_communications', // Agent messaging
      'system_logs',        // Operational logs
      'performance_metrics' // Real-time metrics
    ]
  },

  postgres: {
    // Disabled in Workers environment (NAS PostgreSQL not accessible from edge)
    enabled: false,
    host: typeof process !== 'undefined' ? (process.env.POSTGRES_HOST || '192.168.1.114') : '192.168.1.114',
    port: typeof process !== 'undefined' ? parseInt(process.env.POSTGRES_PORT || '5532') : 5532,
    database: typeof process !== 'undefined' ? (process.env.POSTGRES_DB || 'postgres') : 'postgres',
    user: typeof process !== 'undefined' ? (process.env.POSTGRES_USER || 'postgres') : 'postgres',
    password: typeof process !== 'undefined' ? (process.env.POSTGRES_PASSWORD || '') : '',
    useCases: [
      'documents',          // Knowledge base with pgvector
      'document_chunks',    // RAG chunks with embeddings
      'knowledge_entries',  // Long-term knowledge with vector search
      'users',              // User data (master copy)
      'agents',             // Agent data (master copy)
      'backup_logs'         // Backup history
    ]
  },

  sync: {
    // Disabled when PostgreSQL is not available
    enabled: false,
    direction: 'bidirectional',
    interval: 300, // 5 minutes
    tables: ['users', 'agents'] // Sync these tables between D1 and PostgreSQL
  }
};

/**
 * Database Router
 * Determines which database to use for each operation
 */
export class DatabaseRouter {
  static shouldUseD1(table: string): boolean {
    return databaseConfig.d1.useCases.includes(table);
  }

  static shouldUsePostgres(table: string): boolean {
    return databaseConfig.postgres.useCases.includes(table);
  }

  static shouldSync(table: string): boolean {
    return databaseConfig.sync.tables.includes(table);
  }

  static getPreferredDatabase(
    table: string,
    operation: 'read' | 'write' | 'vector-search'
  ): 'd1' | 'postgres' {
    // Vector search operations always use PostgreSQL
    if (operation === 'vector-search') {
      return 'postgres';
    }

    // Check explicit use cases
    if (this.shouldUseD1(table)) {
      return 'd1';
    }

    if (this.shouldUsePostgres(table)) {
      return 'postgres';
    }

    // Default to D1 for edge performance
    return 'd1';
  }
}

/**
 * Table Mapping
 * Maps logical table names to physical database tables
 */
export const tableMapping = {
  // Operational tables (D1)
  conversations: { d1: 'conversations', postgres: null },
  messages: { d1: 'messages', postgres: null },
  tasks: { d1: 'tasks', postgres: 'tasks' },
  task_history: { d1: 'task_history', postgres: 'task_history' },
  agent_communications: { d1: 'agent_communications', postgres: 'agent_communications' },
  system_logs: { d1: 'system_logs', postgres: 'system_logs' },
  performance_metrics: { d1: 'performance_metrics', postgres: 'performance_metrics' },

  // Knowledge & RAG tables (PostgreSQL with pgvector)
  documents: { d1: 'documents', postgres: 'documents' },
  document_chunks: { d1: 'document_chunks', postgres: 'document_chunks' },
  knowledge_entries: { d1: 'knowledge_entries', postgres: 'knowledge_entries' },

  // Synced tables (Both)
  users: { d1: 'users', postgres: 'users' },
  agents: { d1: 'agents', postgres: 'agents' },
  backup_logs: { d1: 'backup_logs', postgres: 'backup_logs' }
} as const;

/**
 * Database Strategy Summary
 *
 * 1. Cloudflare D1 (Edge Database)
 *    - Real-time operational data
 *    - Low latency access from Workers
 *    - Task management and chat
 *    - System logs and metrics
 *
 * 2. PostgreSQL (NAS Database)
 *    - Knowledge base with pgvector
 *    - RAG system with embeddings
 *    - Long-term persistent storage
 *    - Advanced analytics
 *
 * 3. Sync Strategy
 *    - Users & Agents: Bidirectional sync
 *    - D1 → PostgreSQL: Backup operational data
 *    - PostgreSQL → D1: Cache knowledge metadata
 *
 * 4. Query Routing
 *    - Vector search → PostgreSQL (pgvector)
 *    - Real-time queries → D1 (edge)
 *    - Analytics → PostgreSQL (powerful)
 */
