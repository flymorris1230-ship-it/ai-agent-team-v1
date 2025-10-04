-- ==========================================
-- Seed 9 AI Agents into Database
-- ==========================================

-- Clear existing agents (for idempotency)
DELETE FROM agents;

-- Insert 9 specialized agents
INSERT INTO agents (id, name, role, status, capabilities, performance_metrics, created_at, updated_at) VALUES
(
  'agent-coordinator',
  'Coordinator',
  'Task Orchestration & Team Management',
  'idle',
  '["task_breakdown", "agent_assignment", "workflow_execution", "workload_rebalancing", "health_monitoring"]',
  '{"total_tasks": 0, "completed_tasks": 0, "failed_tasks": 0, "success_rate": 0, "avg_completion_time": 0}',
  strftime('%s', 'now') * 1000,
  strftime('%s', 'now') * 1000
),
(
  'agent-pm',
  'Product Manager',
  'Requirements Analysis & PRD Creation',
  'idle',
  '["requirements_analysis", "prd_writing", "user_stories", "acceptance_criteria", "feature_prioritization"]',
  '{"total_tasks": 0, "completed_tasks": 0, "failed_tasks": 0, "success_rate": 0, "avg_completion_time": 0}',
  strftime('%s', 'now') * 1000,
  strftime('%s', 'now') * 1000
),
(
  'agent-architect',
  'Solution Architect',
  'System Design & Technical Decisions',
  'idle',
  '["architecture_design", "technical_planning", "system_diagrams", "tech_stack_selection", "scalability_planning"]',
  '{"total_tasks": 0, "completed_tasks": 0, "failed_tasks": 0, "success_rate": 0, "avg_completion_time": 0}',
  strftime('%s', 'now') * 1000,
  strftime('%s', 'now') * 1000
),
(
  'agent-backend-dev',
  'Backend Developer',
  'API & Backend Implementation',
  'idle',
  '["api_development", "database_operations", "cloudflare_workers", "typescript", "rest_api", "d1_database"]',
  '{"total_tasks": 0, "completed_tasks": 0, "failed_tasks": 0, "success_rate": 0, "avg_completion_time": 0}',
  strftime('%s', 'now') * 1000,
  strftime('%s', 'now') * 1000
),
(
  'agent-frontend-dev',
  'Frontend Developer',
  'UI Development',
  'idle',
  '["ui_components", "react", "svelte", "tailwindcss", "responsive_design", "accessibility"]',
  '{"total_tasks": 0, "completed_tasks": 0, "failed_tasks": 0, "success_rate": 0, "avg_completion_time": 0}',
  strftime('%s', 'now') * 1000,
  strftime('%s', 'now') * 1000
),
(
  'agent-qa',
  'QA Engineer',
  'Testing & Quality Assurance',
  'idle',
  '["test_writing", "integration_testing", "bug_reporting", "quality_assurance", "vitest", "test_automation"]',
  '{"total_tasks": 0, "completed_tasks": 0, "failed_tasks": 0, "success_rate": 0, "avg_completion_time": 0}',
  strftime('%s', 'now') * 1000,
  strftime('%s', 'now') * 1000
),
(
  'agent-devops',
  'DevOps Engineer',
  'Deployment & Monitoring',
  'idle',
  '["deployment_automation", "cloudflare_deployment", "monitoring", "ci_cd", "wrangler", "infrastructure"]',
  '{"total_tasks": 0, "completed_tasks": 0, "failed_tasks": 0, "success_rate": 0, "avg_completion_time": 0}',
  strftime('%s', 'now') * 1000,
  strftime('%s', 'now') * 1000
),
(
  'agent-data-analyst',
  'Data Analyst',
  'Analytics & Insights',
  'idle',
  '["data_analysis", "metrics_tracking", "insights_generation", "report_creation", "data_visualization"]',
  '{"total_tasks": 0, "completed_tasks": 0, "failed_tasks": 0, "success_rate": 0, "avg_completion_time": 0}',
  strftime('%s', 'now') * 1000,
  strftime('%s', 'now') * 1000
),
(
  'agent-knowledge-mgr',
  'Knowledge Manager',
  'Knowledge Base Management',
  'idle',
  '["documentation", "knowledge_base_management", "information_retrieval", "content_organization", "rag_system"]',
  '{"total_tasks": 0, "completed_tasks": 0, "failed_tasks": 0, "success_rate": 0, "avg_completion_time": 0}',
  strftime('%s', 'now') * 1000,
  strftime('%s', 'now') * 1000
);

-- Verify insertion
SELECT
  id,
  name,
  role,
  status,
  json_array_length(capabilities) as capability_count
FROM agents
ORDER BY id;
