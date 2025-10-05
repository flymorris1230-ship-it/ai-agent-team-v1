# 🎯 通過 pgAdmin4 安裝 pgvector 完整指南

**時間需求**: 5 分鐘
**難度**: ⭐ 簡單
**前置條件**: pgAdmin4 容器已運行並可通過 Cloudflare Tunnel 訪問

---

## 📋 **當前配置概覽**

### ✅ **pgAdmin4 容器配置**
- **訪問地址**: https://postgres.shyangtsuen.xyz
- **登入帳號**: flycan1230@hotmail.com
- **登入密碼**: Morris1230
- **儲存空間**: /docker/pgadmin4 (NAS 掛載)
- **當前管理**: stic-postgres-n8n (n8n 工作流資料庫)

### 🎯 **目標**
在 pgAdmin4 中添加新的 PostgreSQL Server 連接，安裝 pgvector 擴展。

**兩個 PostgreSQL 資料庫：**
1. **stic-postgres-n8n** (原有) - n8n 工作流資料
2. **NAS PostgreSQL pgvector** (新增) - AI Agent 向量資料

---

## 🚀 **安裝步驟**

### 步驟 1：登入 pgAdmin4

1. 打開瀏覽器訪問：
   ```
   https://postgres.shyangtsuen.xyz
   ```

2. 輸入登入資訊：
   - **Email**: `flycan1230@hotmail.com`
   - **Password**: `Morris1230`

3. 點擊 **Login**

---

### 步驟 2：添加 pgvector PostgreSQL Server

1. 在左側面板找到 **Servers**
2. 右鍵點擊 **Servers**
3. 選擇 **Register** → **Server...**

4. 在彈出的對話框中填入：

#### **General 標籤**
```
Name: NAS PostgreSQL pgvector
```

#### **Connection 標籤**
```
Host name/address: 192.168.1.114
Port: 5532
Maintenance database: postgres
Username: postgres
Password: Morris1230
```

#### **Advanced 標籤** (可選)
```
DB restriction: postgres
```
*(限制只顯示 postgres 資料庫，避免混亂)*

5. 點擊 **Save**

---

### 步驟 3：連接到 pgvector 資料庫

1. 展開左側 **Servers** → **NAS PostgreSQL pgvector**
2. 展開 **Databases** → **postgres**
3. 右鍵點擊 **postgres** 資料庫
4. 選擇 **Query Tool**

---

### 步驟 4：安裝 pgvector 擴展

在 Query Tool 編輯器中，**複製貼上**以下完整 SQL：

```sql
-- ========================================
-- pgvector 擴展安裝與測試
-- ========================================

-- 1. 創建 pgvector 擴展
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. 驗證安裝
SELECT extname, extversion
FROM pg_extension
WHERE extname = 'vector';

-- 3. 創建測試表
DROP TABLE IF EXISTS vector_test;

CREATE TABLE vector_test (
    id SERIAL PRIMARY KEY,
    content TEXT,
    embedding vector(1536)  -- OpenAI text-embedding-3-small 維度
);

-- 4. 插入測試數據
INSERT INTO vector_test (content, embedding) VALUES
    ('Test document 1', array_fill(0.1, ARRAY[1536])::vector),
    ('Test document 2', array_fill(0.2, ARRAY[1536])::vector),
    ('Test document 3', array_fill(0.3, ARRAY[1536])::vector);

-- 5. 測試相似度搜索（餘弦距離）
SELECT
    id,
    content,
    embedding <=> array_fill(0.15, ARRAY[1536])::vector AS distance
FROM vector_test
ORDER BY distance
LIMIT 3;

-- 6. 測試 L2 距離
SELECT
    id,
    content,
    embedding <-> array_fill(0.15, ARRAY[1536])::vector AS l2_distance
FROM vector_test
ORDER BY l2_distance
LIMIT 3;

-- 7. 測試內積
SELECT
    id,
    content,
    embedding <#> array_fill(0.15, ARRAY[1536])::vector AS inner_product
FROM vector_test
ORDER BY inner_product
LIMIT 3;

-- 8. 清理測試數據（可選）
-- DROP TABLE vector_test;
```

---

### 步驟 5：執行 SQL

1. 確認 SQL 已完整貼上到 Query Tool
2. 點擊工具欄的 **Execute/Run** 按鈕（▶️ 圖標）
3. 或按鍵盤快捷鍵 **F5**

---

## ✅ **預期結果**

執行成功後，您會在 **Data Output** 面板看到多個結果集：

### 1. CREATE EXTENSION
```
Query returned successfully in XX msec.
```

### 2. 驗證 pgvector 安裝
```
extname | extversion
--------|------------
vector  | 0.7.x
```

### 3. 相似度搜索結果
```
id | content         | distance
---|-----------------|----------
1  | Test document 1 | 0.05
2  | Test document 2 | 0.05
3  | Test document 3 | 0.15
```

**✅ 如果看到這些結果，pgvector 已成功安裝！**

---

## 🎉 **完成檢查清單**

安裝完成後確認：

- [ ] ✅ `CREATE EXTENSION` 執行成功
- [ ] ✅ 可以查詢到 pgvector 擴展資訊
- [ ] ✅ 成功創建帶有 vector 類型的表
- [ ] ✅ 相似度搜索返回正確結果
- [ ] ✅ L2 距離搜索正常
- [ ] ✅ 內積搜索正常

---

## 🔧 **後續操作**

### 創建生產環境向量表

```sql
-- 創建 AI Agent 知識庫向量表
CREATE TABLE IF NOT EXISTS knowledge_vectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    metadata JSONB,
    embedding vector(1536) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 創建向量索引（提升搜索性能）
CREATE INDEX ON knowledge_vectors
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 創建文本搜索索引
CREATE INDEX ON knowledge_vectors USING gin(metadata);
```

### 整合到 RAG 系統

pgvector 安裝完成後，可以：
1. 配置 RAG Engine 使用 NAS PostgreSQL 作為向量存儲
2. 實現文檔向量化和存儲
3. 執行語義相似度搜索
4. 整合到 AI Agent 工作流

---

## 🆘 **故障排除**

### 問題 1：無法連接到 Server

**錯誤**: `could not connect to server`

**檢查**:
1. PostgreSQL 容器是否運行？
   ```bash
   docker ps | grep claudecodepgvector
   ```

2. 端口是否正確？應該是 `5532`

3. 密碼是否正確？應該是 `Morris1230`

### 問題 2：CREATE EXTENSION 失敗

**錯誤**: `could not open extension control file`

**原因**: 使用的不是 pgvector/pgvector:pg16 鏡像

**解決**:
- 確認容器使用 `pgvector/pgvector:pg16` 鏡像
- pgvector 擴展已包含在該鏡像中

### 問題 3：權限錯誤

**錯誤**: `permission denied to create extension`

**解決**:
```sql
-- 確認使用 postgres 超級用戶登入
-- 或授予權限
ALTER USER postgres WITH SUPERUSER;
```

### 問題 4：已存在連接但看不到

**現象**: 左側面板沒有看到新的 Server

**解決**:
1. 點擊左側 **Servers** 旁的刷新按鈕
2. 或重新登入 pgAdmin4
3. 檢查是否在正確的 Server Group

---

## 📊 **pgAdmin4 管理的 PostgreSQL 概覽**

安裝完成後，您的 pgAdmin4 將管理：

### 1. **stic-postgres-n8n** (原有)
- **用途**: n8n 工作流資料庫
- **連接**: 容器內部連接
- **資料**: n8n 自動化工作流

### 2. **NAS PostgreSQL pgvector** (新增)
- **用途**: AI Agent 向量資料庫
- **連接**: 192.168.1.114:5532
- **資料**: 知識庫向量、RAG 檢索
- **擴展**: ✅ pgvector

---

## 🔄 **清理測試數據**

如果要刪除測試表（可選）：

```sql
DROP TABLE IF EXISTS vector_test;
```

**注意**: 不要刪除生產環境的 `knowledge_vectors` 表！

---

## 📚 **參考資料**

- **pgvector 官方文檔**: https://github.com/pgvector/pgvector
- **pgAdmin4 使用指南**: https://www.pgadmin.org/docs/
- **PostgreSQL 向量操作**:
  - `<=>` Cosine distance (相似度搜索)
  - `<->` L2 distance (歐氏距離)
  - `<#>` Inner product (內積)

---

## 💡 **下一步**

pgvector 安裝完成後：

1. ✅ **更新 .env 配置** - 指向 NAS PostgreSQL
2. ✅ **配置 RAG Engine** - 使用 pgvector 作為向量存儲
3. ✅ **測試向量搜索** - 執行完整的 RAG 流程
4. ✅ **整合 Multi-LLM** - 使用 Gemini 免費 embedding

---

**🎯 現在可以開始使用 pgvector 進行語義搜索了！**

**安裝時間**: ~5 分鐘
**成本**: $0
**收益**: 完整的向量資料庫功能 ✅
