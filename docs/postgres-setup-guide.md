# PostgreSQL + pgvector 設定指南

## 🎯 目標
在 NAS Container Manager 中設定 PostgreSQL 16 + pgvector + pgAdmin4

---

## 📋 步驟 1: 使用 pgAdmin4 連線到 PostgreSQL

### 1.1 開啟 pgAdmin4
- 在瀏覽器中開啟：`http://192.168.1.114:<pgadmin-port>`
- 登入 pgAdmin4

### 1.2 新增 Server 連線
1. 右鍵點擊 **Servers** → **Register** → **Server**
2. 填寫連線資訊：

**General Tab:**
- Name: `AI Agent Team - NAS`

**Connection Tab:**
- Host name/address: `192.168.1.114`
- Port: `5432`
- Maintenance database: `postgres`
- Username: `postgres`
- Password: `<您的 postgres 密碼>`

3. 點擊 **Save**

---

## 📋 步驟 2: 建立資料庫和使用者

### 2.1 執行資料庫設定腳本

1. 連線成功後，展開 **AI Agent Team - NAS**
2. 右鍵點擊 **Databases** → 選擇 **postgres** 資料庫
3. 點擊上方工具列的 **Query Tool** (或按 Alt+Shift+Q)
4. 複製以下 SQL 並執行：

```sql
-- ==========================================
-- 建立資料庫
-- ==========================================
CREATE DATABASE ai_agent_team
    WITH
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

-- ==========================================
-- 建立專用使用者
-- ==========================================
CREATE USER ai_agent_user WITH ENCRYPTED PASSWORD 'Morris1230';

-- 授予權限
GRANT ALL PRIVILEGES ON DATABASE ai_agent_team TO ai_agent_user;

-- 確認建立成功
SELECT datname FROM pg_database WHERE datname = 'ai_agent_team';
```

5. 點擊 **Execute (F5)** 執行

### 2.2 切換到新資料庫

1. 在左側面板右鍵點擊 **Databases** → **Refresh**
2. 展開 **ai_agent_team** 資料庫
3. 右鍵點擊 **ai_agent_team** → **Query Tool**

---

## 📋 步驟 3: 啟用 pgvector 擴充

在 **ai_agent_team** 資料庫的 Query Tool 中執行：

```sql
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

-- 確認擴充安裝成功
SELECT extname, extversion FROM pg_extension WHERE extname IN ('vector', 'uuid-ossp');
```

---

## 📋 步驟 4: 建立資料表結構

### 4.1 開啟 schema 檔案

在專案目錄中開啟：
```
src/main/js/database/postgres-schema.sql
```

### 4.2 複製並執行

1. 複製整個 `postgres-schema.sql` 的內容
2. 在 pgAdmin4 的 Query Tool 中貼上
3. 點擊 **Execute (F5)** 執行

### 4.3 確認建立成功

執行以下查詢確認：

```sql
-- 查看所有資料表
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 查看 Agent 資料
SELECT id, name, role, status FROM agents;

-- 確認應該看到 9 個 Agent
```

---

## 📋 步驟 5: 驗證 pgvector 功能

執行測試查詢：

```sql
-- 測試向量功能
SELECT '[1,2,3]'::vector;

-- 測試向量相似度搜尋 (cosine distance)
SELECT '[1,2,3]'::vector <=> '[4,5,6]'::vector AS cosine_distance;
```

如果能正常執行，表示 pgvector 設定成功！

---

## 📋 步驟 6: 設定外部連線 (重要)

為了讓 Cloudflare Workers 能夠連線，需要設定：

### 6.1 修改 PostgreSQL 配置

連線到 PostgreSQL 容器：

```bash
# 進入容器
docker exec -it <postgres-container-name> bash

# 編輯 postgresql.conf
echo "listen_addresses = '*'" >> /var/lib/postgresql/data/postgresql.conf

# 編輯 pg_hba.conf (允許密碼認證)
echo "host all all 0.0.0.0/0 md5" >> /var/lib/postgresql/data/pg_hba.conf

# 重啟 PostgreSQL
exit
docker restart <postgres-container-name>
```

### 6.2 NAS 防火牆設定

在 Synology NAS 控制面板：
1. **控制台** → **安全性** → **防火牆**
2. 編輯規則，允許 Port **5432**
3. (可選) 限制只允許 Cloudflare IP 範圍

---

## ✅ 完成檢查清單

- [ ] pgAdmin4 能連線到 PostgreSQL
- [ ] `ai_agent_team` 資料庫已建立
- [ ] `ai_agent_user` 使用者已建立
- [ ] pgvector 和 uuid-ossp 擴充已啟用
- [ ] 14 個資料表已建立
- [ ] 9 個 Agent 資料已插入
- [ ] pgvector 測試查詢成功
- [ ] PostgreSQL 允許外部連線
- [ ] 防火牆 Port 5432 已開放

---

## 🔧 常見問題

### Q1: 無法連線到 PostgreSQL
- 確認容器正在運行：`docker ps | grep postgres`
- 確認 Port 5432 未被佔用
- 檢查 NAS 防火牆設定

### Q2: pgvector 擴充無法啟用
- 確認容器使用 `pgvector/pgvector:pg16` 映像檔
- 或確認已安裝 pgvector 擴充

### Q3: 權限不足錯誤
- 確認使用 `postgres` 超級使用者執行設定腳本
- 確認授權語句已執行

---

## 📞 下一步

完成以上步驟後，請告知：
1. ✅ 資料庫建立成功
2. ✅ 資料表建立成功
3. ✅ Agent 資料查詢成功

然後我們繼續設定 **Cloudflare Hyperdrive** 連線！
