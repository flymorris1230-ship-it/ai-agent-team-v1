/**
 * Core Type Definitions for AI Agent Team System
 */

// ==========================================
// Environment Bindings
// ==========================================
export interface Env {
  DB: D1Database;
  VECTORIZE: VectorizeIndex;
  STORAGE: R2Bucket;
  CACHE: KVNamespace;
  TASK_QUEUE: Queue;
  BACKUP_QUEUE: Queue;

  // LLM API Keys
  OPENAI_API_KEY: string;
  GEMINI_API_KEY: string;

  // LLM Router Configuration
  LLM_STRATEGY?: string;           // 'cost' | 'performance' | 'balanced'
  PREFERRED_PROVIDER?: string;     // 'openai' | 'gemini'
  USE_LLM_ROUTER?: string;         // 'true' | 'false'

  // Factory OS Integration
  FACTORY_OS_URL?: string;         // Factory OS API base URL
  FACTORY_OS_API_KEY?: string;     // API key for authentication with Factory OS

  // Security
  JWT_SECRET: string;
  NAS_WEBHOOK_URL?: string;

  // Environment
  ENVIRONMENT: string;
  LOG_LEVEL: string;
}

// ==========================================
// Agent Types
// ==========================================
export type AgentId =
  | 'agent-coordinator'
  | 'agent-pm'
  | 'agent-architect'
  | 'agent-backend-dev'
  | 'agent-frontend-dev'
  | 'agent-qa'
  | 'agent-devops'
  | 'agent-data-analyst'
  | 'agent-knowledge-mgr';

export type AgentStatus = 'idle' | 'busy' | 'error';

export interface Agent {
  id: AgentId;
  name: string;
  role: string;
  status: AgentStatus;
  capabilities: string[];
  current_task_id?: string;
  performance_metrics: PerformanceMetrics;
  created_at: number;
  updated_at: number;
}

export interface PerformanceMetrics {
  total_tasks?: number;
  completed_tasks?: number;
  failed_tasks?: number;
  success_rate?: number;
  avg_completion_time?: number;
  last_active?: number;
}

// ==========================================
// Task Types
// ==========================================
export type TaskType =
  | 'develop_api'
  | 'write_prd'
  | 'design_architecture'
  | 'implement_feature'
  | 'write_tests'
  | 'deploy'
  | 'analyze_data'
  | 'manage_knowledge'
  | 'coordinate';

export type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Task {
  id: string;
  type: TaskType;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to?: AgentId;
  created_by: string;
  dependencies?: string[];
  input_data?: Record<string, unknown>;
  output_data?: Record<string, unknown>;
  error_message?: string;
  started_at?: number;
  completed_at?: number;
  deadline?: number;
  created_at: number;
  updated_at: number;
}

export interface TaskHistoryEntry {
  id: string;
  task_id: string;
  agent_id?: AgentId;
  action: 'created' | 'assigned' | 'started' | 'completed' | 'failed' | 'reassigned';
  from_status?: TaskStatus;
  to_status?: TaskStatus;
  notes?: string;
  created_at: number;
}

// ==========================================
// Message Types
// ==========================================
export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  agent_id?: AgentId;
  metadata?: Record<string, unknown>;
  created_at: number;
}

export interface Conversation {
  id: string;
  user_id: string;
  title?: string;
  context?: Record<string, unknown>;
  status: 'active' | 'archived';
  created_at: number;
  updated_at: number;
}

// ==========================================
// Agent Communication Types
// ==========================================
export type CommunicationType = 'request' | 'response' | 'notification' | 'error';

export interface AgentCommunication {
  id: string;
  from_agent_id: AgentId;
  to_agent_id: AgentId;
  message_type: CommunicationType;
  subject?: string;
  content: Record<string, unknown>;
  related_task_id?: string;
  read_at?: number;
  created_at: number;
}

// ==========================================
// Knowledge Base Types
// ==========================================
export interface Document {
  id: string;
  title: string;
  content: string;
  content_type?: string;
  source?: string;
  source_url?: string;
  category?: string;
  tags?: string[];
  vector_id?: string;
  user_id?: string;
  agent_id?: AgentId;
  metadata?: Record<string, unknown>;
  indexed_at?: number;
  created_at: number;
  updated_at: number;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  vector_id?: string;
  metadata?: Record<string, unknown>;
  created_at: number;
}

export type KnowledgeEntryType = 'decision' | 'best_practice' | 'prd' | 'architecture' | 'bug_report';

export interface KnowledgeEntry {
  id: string;
  type: KnowledgeEntryType;
  title: string;
  content: string;
  tags?: string[];
  related_tasks?: string[];
  author_agent_id?: AgentId;
  vector_id?: string;
  metadata?: Record<string, unknown>;
  created_at: number;
  updated_at: number;
}

// ==========================================
// RAG Types
// ==========================================
export interface RAGQuery {
  query: string;
  top_k?: number;
  filter?: Record<string, unknown>;
  conversation_history?: Message[];
}

export interface RAGResult {
  answer: string;
  sources: RetrievalSource[];
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export interface RetrievalSource {
  document_id: string;
  chunk_id?: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

// ==========================================
// System Log Types
// ==========================================
export type LogLevel = 'info' | 'warning' | 'error' | 'critical';

export interface SystemLog {
  id: string;
  level: LogLevel;
  component: string;
  message: string;
  details?: Record<string, unknown>;
  agent_id?: AgentId;
  task_id?: string;
  created_at: number;
}

// ==========================================
// User Types
// ==========================================
export interface User {
  id: string;
  email: string;
  password_hash?: string;
  name?: string;
  role: 'user' | 'admin';
  created_at: number;
  updated_at: number;
  last_login_at?: number;
}

// ==========================================
// Backup Types
// ==========================================
export type BackupType = 'full' | 'incremental' | 'r2_sync' | 'vector_export';
export type BackupStatus = 'started' | 'completed' | 'failed';

export interface BackupLog {
  id: string;
  backup_type: BackupType;
  status: BackupStatus;
  backup_size?: number;
  file_count?: number;
  destination?: string;
  error_message?: string;
  checksum?: string;
  started_at: number;
  completed_at?: number;
  created_at: number;
}

// ==========================================
// Auth Types
// ==========================================
export interface JWTPayload {
  user_id: string;
  email: string;
  role: 'user' | 'admin';
  iat?: number;
  exp?: number;
}

// ==========================================
// API Request/Response Types
// ==========================================
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata?: {
    timestamp: number;
    request_id?: string;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}
