# 🧮 pgvector 擴展安裝指南

**安裝時間**: 2 分鐘
**難度**: ⭐ 超簡單
**成本**: $0

---

## 📋 **前置條件**

✅ 你已經有：
- PostgreSQL 16.10 運行中（192.168.1.114:5532）
- Container: pgvector/pgvector:pg16
- pgAdmin4 可訪問（http://192.168.1.114:8080）

---

## 🎯 **安裝步驟**

### **步驟 1：訪問 pgAdmin**

1. 在瀏覽器打開：**http://192.168.1.114:8080**

2. 登入 pgAdmin
   - 使用你的 pgAdmin 帳號密碼

---

### **步驟 2：連接到 PostgreSQL**

1. 在 pgAdmin 左側面板：
   - 點擊 **Servers**
   - 如果還沒有連接，點擊 **Create** → **Server**

2. 配置連接（如果需要新增）：

**General 標籤**：
```
Name: NAS PostgreSQL
```

**Connection 標籤**：
```
Host name/address: 192.168.1.114
Port: 5532
Maintenance database: postgres
Username: postgres
Password: Morris
```

3. 點擊 **Save**

---

### **步驟 3：啟用 pgvector 擴展**

1. 在左側面板展開：
   ```
   Servers → NAS PostgreSQL → Databases → postgres
   ```

2. 右鍵點擊 **postgres** 資料庫

3. 選擇 **Query Tool**

4. 在查詢編輯器中輸入：

```sql
-- 創建 pgvector 擴展
CREATE EXTENSION IF NOT EXISTS vector;
```

5. 點擊 **Execute/Run** 按鈕（或按 F5）

6. 應該看到成功訊息：
```
CREATE EXTENSION

Query returned successfully in XXX msec.
```

---

### **步驟 4：驗證安裝**

在同一個 Query Tool 中執行：

```sql
-- 檢查擴展是否已安裝
SELECT * FROM pg_extension WHERE extname = 'vector';
```

**期望輸出**：
```
extname | extowner | extnamespace | extrelocatable | extversion | ...
--------|----------|--------------|----------------|------------|-----
vector  | 10       | 2200         | false          | 0.7.x      | ...
```

---

### **步驟 5：測試向量功能**

執行以下測試查詢：

```sql
-- 創建測試表
CREATE TABLE IF NOT EXISTS vector_test (
    id SERIAL PRIMARY KEY,
    content TEXT,
    embedding vector(1536)  -- OpenAI embedding 維度
);

-- 插入測試數據
INSERT INTO vector_test (content, embedding) VALUES
    ('測試文檔 1', array_fill(0.1, ARRAY[1536])::vector),
    ('測試文檔 2', array_fill(0.2, ARRAY[1536])::vector),
    ('測試文檔 3', array_fill(0.3, ARRAY[1536])::vector);

-- 測試相似度查詢（餘弦距離）
SELECT
    id,
    content,
    embedding <=> array_fill(0.15, ARRAY[1536])::vector AS distance
FROM vector_test
ORDER BY distance
LIMIT 3;

-- 清理測試數據（可選）
-- DROP TABLE vector_test;
```

**期望輸出**：
```
id | content     | distance
---|-------------|----------
1  | 測試文檔 1  | 0.05
2  | 測試文檔 2  | 0.05
3  | 測試文檔 3  | 0.15
```

✅ 如果查詢成功，pgvector 已正確安裝！

---

## 🔍 **驗證通過 Tunnel**

現在測試通過 Cloudflare Tunnel 訪問：

```bash
# 在 Mac 終端執行
curl -s https://postgres-ai-agent.shyangtsuen.xyz/health | python3 -m json.tool | grep pgvector
```

**期望輸出**：
```json
"pgvector": "available"
```

如果看到 `"available"`，代表：
- ✅ pgvector 已安裝
- ✅ Tunnel 可以訪問
- ✅ Proxy 正確檢測到擴展

---

## 📊 **pgvector 功能說明**

### **支持的向量操作**

```sql
-- 1. 餘弦距離（最常用於相似度搜索）
embedding <=> query_vector

-- 2. L2 距離（歐氏距離）
embedding <-> query_vector

-- 3. 內積
embedding <#> query_vector
```

### **常用查詢模式**

**相似度搜索（Top-K）**：
```sql
SELECT id, content
FROM documents
ORDER BY embedding <=> query_vector
LIMIT 10;
```

**閾值過濾**：
```sql
SELECT id, content
FROM documents
WHERE embedding <=> query_vector < 0.5
ORDER BY embedding <=> query_vector
LIMIT 10;
```

### **性能優化**

**創建索引（IVFFlat）**：
```sql
-- 建議在有 1000+ 向量時使用
CREATE INDEX ON documents
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

**創建索引（HNSW - 更快但占用更多內存）**：
```sql
-- PostgreSQL 14+ with pgvector 0.5.0+
CREATE INDEX ON documents
USING hnsw (embedding vector_cosine_ops);
```

---

## 🎯 **與 Cloudflare Vectorize 對比**

| 特性 | NAS pgvector | Cloudflare Vectorize |
|------|-------------|---------------------|
| **成本** | 💰 免費 | 💰 免費額度（3000萬）|
| **速度** | ⚡ 本地網路 | ⚡ 全球 CDN |
| **容量** | 💾 無限制（NAS 容量）| 💾 3000 萬 vectors |
| **維護** | 🔧 自行管理 | ✅ 全託管 |
| **隱私** | 🔒 完全私有 | ☁️ Cloudflare 託管 |
| **可靠性** | 📊 依賴 NAS | ✅ 99.99% SLA |

### **推薦使用策略**

**主要存儲：NAS pgvector**
- 大量向量數據
- 隱私敏感資料
- 長期存儲

**備援/快取：Cloudflare Vectorize**
- 全球訪問優化
- 臨時向量
- 雲端備份

**當前配置**（已設定）：
```bash
ENABLE_POSTGRES_VECTOR=true    # 主要使用 NAS
ENABLE_HYBRID_SEARCH=false     # 不使用混合模式
```

---

## 🆘 **故障排除**

### **問題 1：CREATE EXTENSION 失敗**

**錯誤訊息**：
```
ERROR: could not open extension control file
```

**解決方案**：

**選項 A：容器已包含 pgvector**（最可能）
```bash
# 檢查容器鏡像
docker images | grep pgvector

# 應該看到：pgvector/pgvector:pg16
```

如果使用的是 `pgvector/pgvector:pg16` 鏡像，擴展應該已包含。

**選項 B：手動安裝**（如果需要）
```bash
# SSH 到 NAS 或通過 Container Manager 終端
docker exec -it <pgvector-container> bash

# 在容器內
apt-get update
apt-get install postgresql-16-pgvector

# 退出容器
exit

# 重新執行 CREATE EXTENSION
```

---

### **問題 2：權限錯誤**

**錯誤訊息**：
```
ERROR: permission denied to create extension "vector"
```

**解決方案**：
```sql
-- 確認使用 superuser
-- 或授予權限
ALTER USER postgres WITH SUPERUSER;
```

---

### **問題 3：版本不兼容**

**錯誤訊息**：
```
ERROR: extension "vector" has no installation script
```

**解決方案**：
確認 PostgreSQL 版本 >= 12：
```sql
SELECT version();
```

你的版本：PostgreSQL 16.10 ✅（支持）

---

## 📚 **參考資料**

### **pgvector 官方文檔**
- GitHub: https://github.com/pgvector/pgvector
- 性能優化: https://github.com/pgvector/pgvector#performance

### **向量操作符**
```
<->  L2 distance
<#>  inner product
<=>  cosine distance
```

### **數據類型**
```sql
vector(3)     -- 固定維度
vector        -- 任意維度
```

---

## ✅ **安裝完成檢查清單**

- [ ] pgAdmin 已訪問
- [ ] PostgreSQL 已連接
- [ ] `CREATE EXTENSION vector` 執行成功
- [ ] `SELECT * FROM pg_extension WHERE extname = 'vector'` 返回結果
- [ ] 測試表創建成功
- [ ] 向量查詢執行成功
- [ ] Tunnel 健康檢查顯示 `"pgvector": "available"`

**全部勾選後，pgvector 安裝完成！** ✅

---

## 🎉 **下一步**

安裝完成後，你可以：

1. **創建實際的向量表**
   ```sql
   CREATE TABLE knowledge_vectors (
       id UUID PRIMARY KEY,
       content TEXT,
       metadata JSONB,
       embedding vector(1536),
       created_at TIMESTAMP DEFAULT NOW()
   );

   CREATE INDEX ON knowledge_vectors
   USING ivfflat (embedding vector_cosine_ops);
   ```

2. **整合到應用代碼**
   - 文檔向量化
   - 相似度搜索
   - RAG 檢索

3. **測試完整 RAG 流程**
   - 上傳文檔
   - 生成 embeddings
   - 向量搜索
   - LLM 生成回答

---

**安裝時間**: ~2 分鐘
**成本**: $0
**收益**: 完整 RAG 功能 + 無限容量 ✅

開始安裝吧！有任何問題隨時告訴我。
