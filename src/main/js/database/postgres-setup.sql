-- ==========================================
-- AI Agent Team - PostgreSQL Database Setup
-- ==========================================
-- 這個腳本用於在 NAS PostgreSQL 上建立新資料庫

-- ==========================================
-- 1. 建立資料庫和使用者
-- ==========================================
-- 請以 postgres 超級使用者身份執行這些指令

-- 建立資料庫
CREATE DATABASE ai_agent_team
    WITH
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

-- 建立專用使用者
CREATE USER ai_agent_user WITH ENCRYPTED PASSWORD 'Morris1230';

-- 授予權限
GRANT ALL PRIVILEGES ON DATABASE ai_agent_team TO ai_agent_user;

-- 連線到新資料庫
\c ai_agent_team

-- 啟用 pgvector 擴充
CREATE EXTENSION IF NOT EXISTS vector;

-- 啟用 UUID 擴充
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 授予 schema 權限
GRANT ALL ON SCHEMA public TO ai_agent_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ai_agent_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ai_agent_user;

-- 設定預設權限
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ai_agent_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ai_agent_user;

-- ==========================================
-- 完成提示
-- ==========================================
SELECT 'Database setup completed successfully!' AS status;
SELECT version() AS postgresql_version;
SELECT extversion AS pgvector_version FROM pg_extension WHERE extname = 'vector';
