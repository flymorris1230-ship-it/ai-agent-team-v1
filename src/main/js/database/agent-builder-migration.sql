-- ==========================================
-- Agent Builder Extension Migration
-- Adds support for custom agent building, audio, and image processing
-- ==========================================

-- ----------------------------------------
-- 1. Custom Agents Table (User-created agents)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS custom_agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT NOT NULL, -- System prompt/instructions for the agent
  model TEXT DEFAULT 'claude-3-5-sonnet', -- LLM model to use

  -- Capabilities
  capabilities TEXT, -- JSON array: ["code_interpreter", "file_search", "web_search"]
  tools TEXT, -- JSON array of tool definitions
  knowledge_base_ids TEXT, -- JSON array of document/knowledge base IDs

  -- Audio & Image support
  supports_audio INTEGER DEFAULT 0, -- Boolean: can process audio input
  supports_image INTEGER DEFAULT 0, -- Boolean: can process image input
  audio_config TEXT, -- JSON: voice settings, TTS config
  image_config TEXT, -- JSON: vision model settings, generation params

  -- Agent behavior
  temperature REAL DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 4096,
  response_format TEXT DEFAULT 'text', -- 'text', 'json', 'structured'

  -- Metadata
  created_by TEXT NOT NULL, -- user_id
  is_public INTEGER DEFAULT 0, -- Boolean: available to all users
  is_template INTEGER DEFAULT 0, -- Boolean: can be cloned as template
  usage_count INTEGER DEFAULT 0,
  rating REAL, -- Average user rating
  tags TEXT, -- JSON array for categorization

  -- Status
  status TEXT DEFAULT 'active', -- active, archived, disabled

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_custom_agents_created_by ON custom_agents(created_by);
CREATE INDEX idx_custom_agents_status ON custom_agents(status);
CREATE INDEX idx_custom_agents_is_public ON custom_agents(is_public);
CREATE INDEX idx_custom_agents_rating ON custom_agents(rating);

-- ----------------------------------------
-- 2. Agent Conversations Table (for custom agents)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS agent_conversations (
  id TEXT PRIMARY KEY,
  custom_agent_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT,
  context TEXT, -- JSON: conversation state and context

  -- Audio/Image tracking
  has_audio_messages INTEGER DEFAULT 0,
  has_image_messages INTEGER DEFAULT 0,

  status TEXT DEFAULT 'active', -- active, archived
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  FOREIGN KEY (custom_agent_id) REFERENCES custom_agents(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_agent_conversations_agent ON agent_conversations(custom_agent_id);
CREATE INDEX idx_agent_conversations_user ON agent_conversations(user_id);
CREATE INDEX idx_agent_conversations_status ON agent_conversations(status);

-- ----------------------------------------
-- 3. Audio Messages Table
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS audio_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL, -- Can link to conversations or agent_conversations
  message_id TEXT, -- Optional link to messages table

  -- Audio metadata
  audio_url TEXT NOT NULL, -- R2 storage URL
  audio_format TEXT NOT NULL, -- mp3, wav, ogg, webm
  duration_seconds REAL,
  file_size_bytes INTEGER,

  -- Transcription
  transcription TEXT, -- Converted text from audio
  transcription_confidence REAL,
  language TEXT, -- Detected or specified language

  -- TTS metadata (if generated audio)
  is_generated INTEGER DEFAULT 0,
  voice_id TEXT, -- TTS voice used

  -- Processing status
  processing_status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  error_message TEXT,

  created_at INTEGER NOT NULL,
  processed_at INTEGER,

  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

CREATE INDEX idx_audio_messages_conversation ON audio_messages(conversation_id);
CREATE INDEX idx_audio_messages_status ON audio_messages(processing_status);
CREATE INDEX idx_audio_messages_created_at ON audio_messages(created_at);

-- ----------------------------------------
-- 4. Image Messages Table
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS image_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL, -- Can link to conversations or agent_conversations
  message_id TEXT, -- Optional link to messages table

  -- Image metadata
  image_url TEXT NOT NULL, -- R2 storage URL
  image_format TEXT NOT NULL, -- png, jpg, webp, gif
  width INTEGER,
  height INTEGER,
  file_size_bytes INTEGER,

  -- Vision analysis
  description TEXT, -- AI-generated description
  detected_objects TEXT, -- JSON array of detected objects
  ocr_text TEXT, -- Extracted text from image

  -- Generation metadata (if AI-generated)
  is_generated INTEGER DEFAULT 0,
  generation_prompt TEXT,
  generation_model TEXT, -- DALL-E, Stable Diffusion, etc.

  -- Processing status
  processing_status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  error_message TEXT,

  created_at INTEGER NOT NULL,
  processed_at INTEGER,

  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

CREATE INDEX idx_image_messages_conversation ON image_messages(conversation_id);
CREATE INDEX idx_image_messages_status ON image_messages(processing_status);
CREATE INDEX idx_image_messages_is_generated ON image_messages(is_generated);
CREATE INDEX idx_image_messages_created_at ON image_messages(created_at);

-- ----------------------------------------
-- 5. Agent Builder Templates Table
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS agent_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- productivity, creative, technical, customer_service, etc.
  icon TEXT, -- Icon identifier or emoji

  -- Template configuration (pre-filled values)
  default_instructions TEXT NOT NULL,
  default_capabilities TEXT, -- JSON array
  default_tools TEXT, -- JSON array
  suggested_model TEXT DEFAULT 'claude-3-5-sonnet',

  -- Feature flags
  supports_audio INTEGER DEFAULT 0,
  supports_image INTEGER DEFAULT 0,

  -- Popularity metrics
  usage_count INTEGER DEFAULT 0,
  rating REAL,

  is_featured INTEGER DEFAULT 0, -- Featured templates
  is_official INTEGER DEFAULT 1, -- Official vs community templates

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_agent_templates_category ON agent_templates(category);
CREATE INDEX idx_agent_templates_featured ON agent_templates(is_featured);
CREATE INDEX idx_agent_templates_rating ON agent_templates(rating);

-- ----------------------------------------
-- 6. Agent Usage Analytics Table
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS agent_usage_analytics (
  id TEXT PRIMARY KEY,
  custom_agent_id TEXT NOT NULL,
  user_id TEXT NOT NULL,

  -- Usage metrics
  message_count INTEGER DEFAULT 0,
  audio_message_count INTEGER DEFAULT 0,
  image_message_count INTEGER DEFAULT 0,

  -- Token usage
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,

  -- Timing
  total_response_time_ms INTEGER DEFAULT 0,
  avg_response_time_ms REAL,

  -- Cost (if tracked)
  estimated_cost_usd REAL DEFAULT 0,

  -- Session info
  session_start INTEGER NOT NULL,
  session_end INTEGER,
  session_duration_seconds INTEGER,

  created_at INTEGER NOT NULL,

  FOREIGN KEY (custom_agent_id) REFERENCES custom_agents(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_usage_agent ON agent_usage_analytics(custom_agent_id);
CREATE INDEX idx_usage_user ON agent_usage_analytics(user_id);
CREATE INDEX idx_usage_created_at ON agent_usage_analytics(created_at);

-- ----------------------------------------
-- 7. Insert Default Agent Templates
-- ----------------------------------------
INSERT OR IGNORE INTO agent_templates (id, name, description, category, icon, default_instructions, default_capabilities, suggested_model, supports_audio, supports_image, is_featured, is_official, created_at, updated_at) VALUES
  (
    'template-quality-inspector',
    'Quality Inspector Agent',
    'Specialized agent for quality control and defect analysis',
    'manufacturing',
    '🔍',
    'You are a quality inspection expert. Analyze product defects, provide root cause analysis, and suggest corrective actions based on ISO 9001 standards and company quality procedures.',
    '["file_search", "image_analysis"]',
    'claude-3-5-sonnet',
    1,
    1,
    1,
    1,
    unixepoch(),
    unixepoch()
  ),
  (
    'template-production-planner',
    'Production Planning Agent',
    'Optimize production schedules and resource allocation',
    'manufacturing',
    '📅',
    'You are a production planning specialist. Analyze capacity, order priority, and material availability to provide optimal production scheduling recommendations.',
    '["code_interpreter", "file_search"]',
    'claude-3-5-sonnet',
    1,
    0,
    1,
    1,
    unixepoch(),
    unixepoch()
  ),
  (
    'template-maintenance-assistant',
    'Equipment Maintenance Agent',
    'Equipment diagnostics and maintenance guidance',
    'manufacturing',
    '🔧',
    'You are an equipment maintenance expert. Diagnose equipment failures, provide troubleshooting steps, and recommend maintenance actions based on equipment manuals and maintenance history.',
    '["file_search", "image_analysis"]',
    'claude-3-5-sonnet',
    1,
    1,
    1,
    1,
    unixepoch(),
    unixepoch()
  ),
  (
    'template-customer-service',
    'Customer Service Agent',
    'Professional customer support with empathy',
    'customer_service',
    '🤝',
    'You are a customer support agent. Provide helpful, empathetic, and professional assistance. Focus on understanding customer issues and providing clear solutions.',
    '["file_search", "web_search"]',
    'claude-3-5-sonnet',
    1,
    0,
    1,
    1,
    unixepoch(),
    unixepoch()
  ),
  (
    'template-code-assistant',
    'Code Assistant',
    'Expert programming assistant',
    'technical',
    '💻',
    'You are an expert programming assistant. Help with code generation, debugging, and technical explanations across multiple programming languages.',
    '["code_interpreter", "file_search"]',
    'claude-3-5-sonnet',
    0,
    1,
    1,
    1,
    unixepoch(),
    unixepoch()
  ),
  (
    'template-data-analyst',
    'Data Analyst Agent',
    'Analyze data and generate insights',
    'technical',
    '📊',
    'You are a data analyst. Help analyze datasets, create visualizations, perform statistical analysis, and extract actionable insights.',
    '["code_interpreter", "file_search"]',
    'claude-3-5-sonnet',
    0,
    1,
    1,
    1,
    unixepoch(),
    unixepoch()
  );
