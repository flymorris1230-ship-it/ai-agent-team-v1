-- ==========================================
-- Phase 1 Expansion Migration
-- 12-Agent Team + Multi-LLM Intelligent Routing
-- ==========================================

-- ----------------------------------------
-- 1. LLM Capabilities Table
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS llm_capabilities (
  id TEXT PRIMARY KEY,
  model_name TEXT NOT NULL,
  provider TEXT NOT NULL, -- openai, gemini, anthropic
  strengths TEXT NOT NULL, -- JSON array of strength descriptions
  context_window_kb INTEGER NOT NULL,
  cost_per_1k_input_tokens REAL NOT NULL,
  cost_per_1k_output_tokens REAL NOT NULL,
  avg_speed_tps INTEGER, -- tokens per second
  suitable_for TEXT, -- JSON array of TaskType values
  max_tokens INTEGER,
  supports_vision INTEGER DEFAULT 0, -- boolean: 0 or 1
  supports_function_calling INTEGER DEFAULT 0, -- boolean: 0 or 1
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_llm_capabilities_provider ON llm_capabilities(provider);
CREATE INDEX idx_llm_capabilities_model_name ON llm_capabilities(model_name);

-- ----------------------------------------
-- 2. LLM Routing Decisions Log
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS llm_routing_decisions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  task_complexity TEXT, -- simple, medium, complex
  required_context_kb INTEGER,
  priority_dimension TEXT, -- speed, quality, cost, balanced
  selected_model TEXT NOT NULL,
  selected_provider TEXT NOT NULL,
  selection_reason TEXT NOT NULL,
  alternative_models TEXT, -- JSON array
  estimated_cost REAL,
  actual_cost REAL,
  actual_tokens_used INTEGER,
  routing_strategy TEXT, -- cost, performance, balanced
  decided_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE INDEX idx_routing_decisions_task_id ON llm_routing_decisions(task_id);
CREATE INDEX idx_routing_decisions_provider ON llm_routing_decisions(selected_provider);
CREATE INDEX idx_routing_decisions_strategy ON llm_routing_decisions(routing_strategy);
CREATE INDEX idx_routing_decisions_created_at ON llm_routing_decisions(created_at);

-- ----------------------------------------
-- 3. Add 3 New Agents (9 → 12 Agents)
-- ----------------------------------------
INSERT OR IGNORE INTO agents (id, name, role, status, capabilities, performance_metrics, created_at, updated_at) VALUES
  ('agent-ui-ux-designer', 'UI/UX Designer Agent', 'UI/UX Designer', 'idle', '["ui_design", "ux_research", "prototyping", "visual_design", "user_journey_mapping"]', '{}', unixepoch(), unixepoch()),
  ('agent-finops-guardian', 'FinOps Guardian Agent', 'Cost Guardian', 'idle', '["cost_estimation", "resource_optimization", "budget_monitoring", "cost_analysis"]', '{}', unixepoch(), unixepoch()),
  ('agent-security-guardian', 'Security Guardian Agent', 'Security Guardian', 'idle', '["security_review", "vulnerability_scanning", "compliance_check", "threat_analysis"]', '{}', unixepoch(), unixepoch());

-- ----------------------------------------
-- 4. Seed LLM Capabilities (OpenAI + Gemini)
-- ----------------------------------------
INSERT OR IGNORE INTO llm_capabilities (id, model_name, provider, strengths, context_window_kb, cost_per_1k_input_tokens, cost_per_1k_output_tokens, avg_speed_tps, suitable_for, max_tokens, supports_vision, supports_function_calling, created_at, updated_at) VALUES
  -- OpenAI Models
  ('llm-gpt-4o-mini', 'gpt-4o-mini', 'openai', '["high_quality", "reasoning", "complex_tasks", "function_calling"]', 128, 0.00015, 0.0006, 150, '["write_prd", "design_architecture", "implement_feature", "security_review", "coordinate"]', 16384, 1, 1, unixepoch(), unixepoch()),
  ('llm-text-embedding-3-small', 'text-embedding-3-small', 'openai', '["embeddings", "semantic_search", "rag"]', 8, 0.00002, 0, 1000, '["manage_knowledge", "analyze_data"]', 8192, 0, 0, unixepoch(), unixepoch()),

  -- Gemini Models
  ('llm-gemini-2-flash-thinking', 'gemini-2.0-flash-thinking-exp-1219', 'gemini', '["free_tier", "fast", "multimodal", "reasoning"]', 1024, 0, 0, 200, '["design_ui_ux", "create_prototype", "write_tests", "analyze_data"]', 8192, 1, 1, unixepoch(), unixepoch()),
  ('llm-gemini-flash-8b', 'gemini-1.5-flash-8b', 'gemini', '["cheapest", "fast", "simple_tasks"]', 1024, 0.0000375, 0.00015, 250, '["design_review", "cost_alert", "compliance_check"]', 8192, 0, 1, unixepoch(), unixepoch()),
  ('llm-gemini-flash', 'gemini-1.5-flash', 'gemini', '["balanced", "multimodal", "cost_effective"]', 1024, 0.000075, 0.0003, 180, '["implement_feature", "write_tests", "deploy"]', 8192, 1, 1, unixepoch(), unixepoch()),
  ('llm-gemini-pro', 'gemini-1.5-pro', 'gemini', '["high_quality", "complex_reasoning", "large_context"]', 2048, 0.00125, 0.005, 100, '["design_architecture", "security_review", "estimate_cost"]', 8192, 1, 1, unixepoch(), unixepoch()),
  ('llm-text-embedding-004', 'text-embedding-004', 'gemini', '["free_embeddings", "semantic_search", "rag"]', 8, 0, 0, 1200, '["manage_knowledge", "analyze_data"]', 2048, 0, 0, unixepoch(), unixepoch());

-- ----------------------------------------
-- 5. Add metadata column to tasks table
-- ----------------------------------------
-- SQLite doesn't support ALTER TABLE ADD COLUMN IF NOT EXISTS,
-- so we'll add it anyway and ignore errors if it already exists
-- This is safe because the application will handle NULL values
ALTER TABLE tasks ADD COLUMN metadata TEXT; -- JSON: TaskMetadata
