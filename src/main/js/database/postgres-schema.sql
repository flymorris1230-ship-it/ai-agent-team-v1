-- ==========================================
-- AI Agent Team - PostgreSQL Schema
-- ==========================================
-- 這個腳本用於建立所有資料表結構
-- 使用 PostgreSQL + pgvector

-- ==========================================
-- Extensions
-- ==========================================
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------
-- 1. Users Table
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user', -- user, admin
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ----------------------------------------
-- 2. Agents Table
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS agents (
  id VARCHAR(100) PRIMARY KEY, -- agent-coordinator, agent-pm, etc.
  name VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'idle', -- idle, busy, error
  capabilities JSONB, -- JSON array of capabilities
  current_task_id UUID,
  performance_metrics JSONB DEFAULT '{}', -- JSON: success_rate, avg_time, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_role ON agents(role);

-- ----------------------------------------
-- 3. Tasks Table
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(100) NOT NULL, -- develop_api, write_prd, design_architecture, etc.
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, assigned, in_progress, completed, failed
  priority VARCHAR(50) DEFAULT 'medium', -- low, medium, high, critical
  assigned_to VARCHAR(100), -- agent_id
  created_by VARCHAR(100), -- user_id or agent_id
  dependencies JSONB DEFAULT '[]', -- JSON array of task_ids
  input_data JSONB, -- JSON with task-specific data
  output_data JSONB, -- JSON with task results
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (assigned_to) REFERENCES agents(id)
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
CREATE INDEX idx_tasks_type ON tasks(type);

-- ----------------------------------------
-- 4. Task History Table
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS task_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL,
  agent_id VARCHAR(100),
  action VARCHAR(100) NOT NULL, -- created, assigned, started, completed, failed, reassigned
  from_status VARCHAR(50),
  to_status VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE INDEX idx_task_history_task_id ON task_history(task_id);
CREATE INDEX idx_task_history_agent_id ON task_history(agent_id);
CREATE INDEX idx_task_history_created_at ON task_history(created_at);

-- ----------------------------------------
-- 5. Conversations Table
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  title VARCHAR(500),
  context JSONB, -- JSON: conversation context
  status VARCHAR(50) DEFAULT 'active', -- active, archived
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_created_at ON conversations(created_at);

-- ----------------------------------------
-- 6. Messages Table
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL,
  role VARCHAR(50) NOT NULL, -- user, assistant, system
  content TEXT NOT NULL,
  agent_id VARCHAR(100), -- if from agent
  metadata JSONB, -- JSON: sources, confidence, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_role ON messages(role);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- ----------------------------------------
-- 7. Documents Table (Knowledge Base)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  content_type VARCHAR(50), -- markdown, text, code, etc.
  source VARCHAR(100), -- upload, web-scrape, api, etc.
  source_url TEXT,
  category VARCHAR(100),
  tags JSONB DEFAULT '[]', -- JSON array
  embedding VECTOR(1536), -- pgvector for RAG
  user_id UUID,
  agent_id VARCHAR(100), -- if created by agent
  metadata JSONB, -- JSON: author, version, etc.
  indexed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_source ON documents(source);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_documents_embedding ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ----------------------------------------
-- 8. Document Chunks Table (for RAG)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536), -- pgvector for similarity search
  metadata JSONB, -- JSON: heading, section, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX idx_chunks_document_id ON document_chunks(document_id);
CREATE INDEX idx_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ----------------------------------------
-- 9. Agent Communications Table
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS agent_communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_agent_id VARCHAR(100) NOT NULL,
  to_agent_id VARCHAR(100) NOT NULL,
  message_type VARCHAR(50) NOT NULL, -- request, response, notification, error
  subject VARCHAR(500),
  content JSONB NOT NULL, -- JSON message payload
  related_task_id UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (from_agent_id) REFERENCES agents(id),
  FOREIGN KEY (to_agent_id) REFERENCES agents(id),
  FOREIGN KEY (related_task_id) REFERENCES tasks(id)
);

CREATE INDEX idx_comms_from_agent ON agent_communications(from_agent_id);
CREATE INDEX idx_comms_to_agent ON agent_communications(to_agent_id);
CREATE INDEX idx_comms_created_at ON agent_communications(created_at);
CREATE INDEX idx_comms_read_at ON agent_communications(read_at);

-- ----------------------------------------
-- 10. Knowledge Base Entries (Decisions, Best Practices)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS knowledge_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(100) NOT NULL, -- decision, best_practice, prd, architecture, bug_report
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  tags JSONB DEFAULT '[]', -- JSON array
  related_tasks JSONB DEFAULT '[]', -- JSON array of task_ids
  author_agent_id VARCHAR(100),
  embedding VECTOR(1536), -- pgvector for semantic search
  metadata JSONB, -- JSON
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (author_agent_id) REFERENCES agents(id)
);

CREATE INDEX idx_knowledge_type ON knowledge_entries(type);
CREATE INDEX idx_knowledge_created_at ON knowledge_entries(created_at);
CREATE INDEX idx_knowledge_embedding ON knowledge_entries USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ----------------------------------------
-- 11. System Logs Table
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level VARCHAR(50) NOT NULL, -- info, warning, error, critical
  component VARCHAR(100) NOT NULL, -- coordinator, task_queue, rag_engine, etc.
  message TEXT NOT NULL,
  details JSONB, -- JSON with additional context
  agent_id VARCHAR(100),
  task_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE INDEX idx_logs_level ON system_logs(level);
CREATE INDEX idx_logs_component ON system_logs(component);
CREATE INDEX idx_logs_created_at ON system_logs(created_at);
CREATE INDEX idx_logs_agent_id ON system_logs(agent_id);

-- ----------------------------------------
-- 12. Backup Logs Table
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS backup_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  backup_type VARCHAR(50) NOT NULL, -- full, incremental, vector_export
  status VARCHAR(50) NOT NULL, -- started, completed, failed
  backup_size BIGINT,
  file_count INTEGER,
  destination TEXT,
  error_message TEXT,
  checksum VARCHAR(255),
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_backup_logs_type ON backup_logs(backup_type);
CREATE INDEX idx_backup_logs_status ON backup_logs(status);
CREATE INDEX idx_backup_logs_created_at ON backup_logs(created_at);

-- ----------------------------------------
-- 13. Performance Metrics Table
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_type VARCHAR(100) NOT NULL, -- api_response_time, rag_retrieval_time, task_completion_time
  metric_name VARCHAR(255) NOT NULL,
  value NUMERIC NOT NULL,
  unit VARCHAR(50), -- ms, seconds, count, percentage
  tags JSONB, -- JSON: endpoint, agent_id, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_metrics_type ON performance_metrics(metric_type);
CREATE INDEX idx_metrics_name ON performance_metrics(metric_name);
CREATE INDEX idx_metrics_created_at ON performance_metrics(created_at);

-- ----------------------------------------
-- 14. Insert Default Agents
-- ----------------------------------------
INSERT INTO agents (id, name, role, status, capabilities, performance_metrics, created_at, updated_at) VALUES
  ('agent-coordinator', 'Coordinator Agent', 'Team Coordinator', 'idle', '["task_orchestration", "team_management", "risk_assessment"]'::jsonb, '{}'::jsonb, NOW(), NOW()),
  ('agent-pm', 'Product Manager Agent', 'Product Manager', 'idle', '["requirements_analysis", "prd_writing", "user_research"]'::jsonb, '{}'::jsonb, NOW(), NOW()),
  ('agent-architect', 'Solution Architect Agent', 'Solution Architect', 'idle', '["system_design", "technology_selection", "performance_optimization"]'::jsonb, '{}'::jsonb, NOW(), NOW()),
  ('agent-backend-dev', 'Backend Developer Agent', 'Backend Developer', 'idle', '["api_development", "database_design", "rag_implementation"]'::jsonb, '{}'::jsonb, NOW(), NOW()),
  ('agent-frontend-dev', 'Frontend Developer Agent', 'Frontend Developer', 'idle', '["ui_development", "api_integration", "state_management"]'::jsonb, '{}'::jsonb, NOW(), NOW()),
  ('agent-qa', 'QA Engineer Agent', 'QA Engineer', 'idle', '["test_planning", "automated_testing", "bug_tracking"]'::jsonb, '{}'::jsonb, NOW(), NOW()),
  ('agent-devops', 'DevOps Engineer Agent', 'DevOps Engineer', 'idle', '["deployment", "monitoring", "backup_management"]'::jsonb, '{}'::jsonb, NOW(), NOW()),
  ('agent-data-analyst', 'Data Analyst Agent', 'Data Analyst', 'idle', '["data_analysis", "reporting", "rag_evaluation"]'::jsonb, '{}'::jsonb, NOW(), NOW()),
  ('agent-knowledge-mgr', 'Knowledge Manager Agent', 'Knowledge Manager', 'idle', '["knowledge_curation", "content_classification", "quality_monitoring"]'::jsonb, '{}'::jsonb, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------
-- Completion Message
-- ----------------------------------------
SELECT 'PostgreSQL schema created successfully!' AS status;
SELECT COUNT(*) AS agent_count FROM agents;
