-- ==========================================
-- AI Agent Team - D1 Database Schema
-- ==========================================

-- ----------------------------------------
-- 1. Users Table
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name TEXT,
  role TEXT DEFAULT 'user', -- user, admin
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_login_at INTEGER
);

CREATE INDEX idx_users_email ON users(email);

-- ----------------------------------------
-- 2. Agents Table
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY, -- agent-coordinator, agent-pm, etc.
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT DEFAULT 'idle', -- idle, busy, error
  capabilities TEXT, -- JSON array of capabilities
  current_task_id TEXT,
  performance_metrics TEXT, -- JSON: success_rate, avg_time, etc.
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_agents_status ON agents(status);

-- ----------------------------------------
-- 3. Tasks Table
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- develop_api, write_prd, design_architecture, etc.
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending', -- pending, assigned, in_progress, completed, failed
  priority TEXT DEFAULT 'medium', -- low, medium, high, critical
  assigned_to TEXT, -- agent_id
  created_by TEXT, -- user_id or agent_id
  dependencies TEXT, -- JSON array of task_ids
  input_data TEXT, -- JSON with task-specific data
  output_data TEXT, -- JSON with task results
  error_message TEXT,
  started_at INTEGER,
  completed_at INTEGER,
  deadline INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (assigned_to) REFERENCES agents(id)
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);

-- ----------------------------------------
-- 4. Task History Table
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS task_history (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  agent_id TEXT,
  action TEXT NOT NULL, -- created, assigned, started, completed, failed, reassigned
  from_status TEXT,
  to_status TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE INDEX idx_task_history_task_id ON task_history(task_id);
CREATE INDEX idx_task_history_created_at ON task_history(created_at);

-- ----------------------------------------
-- 5. Conversations Table
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT,
  context TEXT, -- JSON: conversation context
  status TEXT DEFAULT 'active', -- active, archived
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_status ON conversations(status);

-- ----------------------------------------
-- 6. Messages Table
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL, -- user, assistant, system
  content TEXT NOT NULL,
  agent_id TEXT, -- if from agent
  metadata TEXT, -- JSON: sources, confidence, etc.
  created_at INTEGER NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- ----------------------------------------
-- 7. Documents Table (Knowledge Base)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT, -- markdown, text, code, etc.
  source TEXT, -- upload, web-scrape, api, etc.
  source_url TEXT,
  category TEXT,
  tags TEXT, -- JSON array
  vector_id TEXT, -- Reference to Vectorize index
  user_id TEXT,
  agent_id TEXT, -- if created by agent
  metadata TEXT, -- JSON: author, version, etc.
  indexed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_source ON documents(source);
CREATE INDEX idx_documents_created_at ON documents(created_at);

-- ----------------------------------------
-- 8. Document Chunks Table (for RAG)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS document_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  vector_id TEXT, -- Reference to Vectorize
  metadata TEXT, -- JSON: heading, section, etc.
  created_at INTEGER NOT NULL,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX idx_chunks_document_id ON document_chunks(document_id);
CREATE INDEX idx_chunks_vector_id ON document_chunks(vector_id);

-- ----------------------------------------
-- 9. Agent Communications Table
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS agent_communications (
  id TEXT PRIMARY KEY,
  from_agent_id TEXT NOT NULL,
  to_agent_id TEXT NOT NULL,
  message_type TEXT NOT NULL, -- request, response, notification, error
  subject TEXT,
  content TEXT NOT NULL, -- JSON message payload
  related_task_id TEXT,
  read_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (from_agent_id) REFERENCES agents(id),
  FOREIGN KEY (to_agent_id) REFERENCES agents(id),
  FOREIGN KEY (related_task_id) REFERENCES tasks(id)
);

CREATE INDEX idx_comms_to_agent ON agent_communications(to_agent_id);
CREATE INDEX idx_comms_created_at ON agent_communications(created_at);
CREATE INDEX idx_comms_read_at ON agent_communications(read_at);

-- ----------------------------------------
-- 10. Knowledge Base Entries (Decisions, Best Practices)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS knowledge_entries (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- decision, best_practice, prd, architecture, bug_report
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT, -- JSON array
  related_tasks TEXT, -- JSON array of task_ids
  author_agent_id TEXT,
  vector_id TEXT, -- Reference to Vectorize
  metadata TEXT, -- JSON
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (author_agent_id) REFERENCES agents(id)
);

CREATE INDEX idx_knowledge_type ON knowledge_entries(type);
CREATE INDEX idx_knowledge_created_at ON knowledge_entries(created_at);

-- ----------------------------------------
-- 11. System Logs Table
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS system_logs (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL, -- info, warning, error, critical
  component TEXT NOT NULL, -- coordinator, task_queue, rag_engine, etc.
  message TEXT NOT NULL,
  details TEXT, -- JSON with additional context
  agent_id TEXT,
  task_id TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE INDEX idx_logs_level ON system_logs(level);
CREATE INDEX idx_logs_component ON system_logs(component);
CREATE INDEX idx_logs_created_at ON system_logs(created_at);

-- ----------------------------------------
-- 12. Backup Logs Table
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS backup_logs (
  id TEXT PRIMARY KEY,
  backup_type TEXT NOT NULL, -- full, incremental, r2_sync, vector_export
  status TEXT NOT NULL, -- started, completed, failed
  backup_size INTEGER,
  file_count INTEGER,
  destination TEXT,
  error_message TEXT,
  checksum TEXT,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_backup_logs_type ON backup_logs(backup_type);
CREATE INDEX idx_backup_logs_status ON backup_logs(status);
CREATE INDEX idx_backup_logs_created_at ON backup_logs(created_at);

-- ----------------------------------------
-- 13. Performance Metrics Table
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS performance_metrics (
  id TEXT PRIMARY KEY,
  metric_type TEXT NOT NULL, -- api_response_time, rag_retrieval_time, task_completion_time
  metric_name TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT, -- ms, seconds, count, percentage
  tags TEXT, -- JSON: endpoint, agent_id, etc.
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_metrics_type ON performance_metrics(metric_type);
CREATE INDEX idx_metrics_name ON performance_metrics(metric_name);
CREATE INDEX idx_metrics_created_at ON performance_metrics(created_at);

-- ----------------------------------------
-- 14. Factory Health Checks Table
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS factory_health_checks (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  timestamp TEXT NOT NULL,
  factory_os_status TEXT NOT NULL, -- healthy, degraded, down
  response_time_ms INTEGER NOT NULL,
  database_status TEXT NOT NULL, -- connected, error
  integration_operational INTEGER NOT NULL, -- 0 or 1 (boolean)
  error_message TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_factory_health_timestamp ON factory_health_checks(timestamp);
CREATE INDEX idx_factory_health_status ON factory_health_checks(factory_os_status);
CREATE INDEX idx_factory_health_created_at ON factory_health_checks(created_at);

-- ----------------------------------------
-- 15. Insert Default Agents
-- ----------------------------------------
INSERT OR IGNORE INTO agents (id, name, role, status, capabilities, performance_metrics, created_at, updated_at) VALUES
  ('agent-coordinator', 'Coordinator Agent', 'Team Coordinator', 'idle', '["task_orchestration", "team_management", "risk_assessment"]', '{}', unixepoch(), unixepoch()),
  ('agent-pm', 'Product Manager Agent', 'Product Manager', 'idle', '["requirements_analysis", "prd_writing", "user_research"]', '{}', unixepoch(), unixepoch()),
  ('agent-architect', 'Solution Architect Agent', 'Solution Architect', 'idle', '["system_design", "technology_selection", "performance_optimization"]', '{}', unixepoch(), unixepoch()),
  ('agent-backend-dev', 'Backend Developer Agent', 'Backend Developer', 'idle', '["api_development", "database_design", "rag_implementation"]', '{}', unixepoch(), unixepoch()),
  ('agent-frontend-dev', 'Frontend Developer Agent', 'Frontend Developer', 'idle', '["ui_development", "api_integration", "state_management"]', '{}', unixepoch(), unixepoch()),
  ('agent-qa', 'QA Engineer Agent', 'QA Engineer', 'idle', '["test_planning", "automated_testing", "bug_tracking"]', '{}', unixepoch(), unixepoch()),
  ('agent-devops', 'DevOps Engineer Agent', 'DevOps Engineer', 'idle', '["deployment", "monitoring", "backup_management"]', '{}', unixepoch(), unixepoch()),
  ('agent-data-analyst', 'Data Analyst Agent', 'Data Analyst', 'idle', '["data_analysis", "reporting", "rag_evaluation"]', '{}', unixepoch(), unixepoch()),
  ('agent-knowledge-mgr', 'Knowledge Manager Agent', 'Knowledge Manager', 'idle', '["knowledge_curation", "content_classification", "quality_monitoring"]', '{}', unixepoch(), unixepoch());
