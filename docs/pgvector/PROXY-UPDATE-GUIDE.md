# 🔄 PostgreSQL Proxy 更新指南

## 📋 概述

已為 PostgreSQL HTTP Proxy 添加 `/query` 端點，支持通過 Cloudflare Tunnel 執行自定義 SQL 查詢。

## 🆕 新功能

### `/query` 端點（POST）

**功能**: 執行自定義 SQL 查詢

**認證**: 需要 API Key

**請求格式**:
```bash
curl -X POST https://postgres-ai-agent.shyangtsuen.xyz/query \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"query": "SELECT * FROM your_table LIMIT 5"}'
```

**響應格式**:

**SELECT 查詢**:
```json
{
  "success": true,
  "query": "SELECT * FROM table",
  "row_count": 5,
  "columns": ["id", "name", "value"],
  "data": [
    {"id": 1, "name": "test", "value": 100}
  ]
}
```

**INSERT/UPDATE/DELETE 查詢**:
```json
{
  "success": true,
  "query": "INSERT INTO ...",
  "message": "Query executed successfully. Rows affected: 1"
}
```

## 🔄 更新步驟

### 選項 A：通過 SSH 更新（推薦）

```bash
# 1. SSH 到 NAS
ssh admin@192.168.1.114

# 2. 停止舊的 Proxy 進程
pkill -f nas-postgres-proxy.py

# 3. 下載最新版本的 Proxy 腳本
cd /volume1/docker/ai-agent-backup
curl -O https://raw.githubusercontent.com/flymorris1230-ship-it/gac-v1/main/nas-postgres-proxy.py

# 4. 確認環境變數
cat nas-proxy.env

# 5. 啟動新的 Proxy
nohup python3 nas-postgres-proxy.py > proxy.log 2>&1 &

# 6. 檢查日誌
tail -f proxy.log

# 7. 驗證服務
curl http://localhost:8000/health
```

### 選項 B：通過 Container Manager（如果使用容器）

1. 登入 Synology DSM
2. 打開 Container Manager
3. 找到 `postgres-proxy` 容器
4. 點擊 **停止**
5. 點擊 **編輯**，更新 Python 腳本
6. 點擊 **啟動**
7. 查看日誌確認啟動成功

### 選項 C：本地推送更新

```bash
# 在 Mac 上執行

# 1. 複製更新的 Proxy 到 NAS
scp nas-postgres-proxy.py admin@192.168.1.114:/volume1/docker/ai-agent-backup/

# 2. SSH 到 NAS
ssh admin@192.168.1.114

# 3. 重啟 Proxy
cd /volume1/docker/ai-agent-backup
pkill -f nas-postgres-proxy.py
nohup python3 nas-postgres-proxy.py > proxy.log 2>&1 &

# 4. 退出 SSH
exit
```

## ✅ 驗證更新

### 1. 檢查 Proxy 版本

```bash
curl https://postgres-ai-agent.shyangtsuen.xyz/info | python3 -m json.tool
```

**期望輸出**:
```json
{
  "endpoints": {
    "/health": "...",
    "/info": "...",
    "/test": "...",
    "/query": "Execute SQL queries (POST, requires API key)"
  }
}
```

### 2. 測試 /query 端點

```bash
# 從 .env 加載 API Key
source .env

# 執行測試查詢
curl -X POST https://postgres-ai-agent.shyangtsuen.xyz/query \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $POSTGRES_PROXY_API_KEY" \
  -d '{"query": "SELECT version()"}' | python3 -m json.tool
```

**期望輸出**:
```json
{
  "success": true,
  "query": "SELECT version()",
  "row_count": 1,
  "columns": ["version"],
  "data": [
    {"version": "PostgreSQL 16.10 ..."}
  ]
}
```

## 🧮 測試 pgvector 安裝

更新完成後，執行自動化測試腳本：

```bash
./scripts/test-pgvector.sh
```

這個腳本會：
1. ✅ 檢查 pgvector 擴展狀態
2. ✅ 創建 pgvector 擴展（如果需要）
3. ✅ 創建測試向量表
4. ✅ 插入測試數據
5. ✅ 執行相似度搜索測試
6. ✅ 測試不同距離度量（Cosine, L2, Inner Product）
7. ✅ 清理測試數據

## 🆘 故障排除

### 問題 1: Proxy 無法啟動

**檢查**:
```bash
# SSH 到 NAS
ssh admin@192.168.1.114

# 查看錯誤日誌
tail -50 /volume1/docker/ai-agent-backup/proxy.log

# 檢查 Python 依賴
python3 -c "import psycopg2; print('✅ psycopg2 installed')"
```

**解決**:
```bash
# 安裝缺失的依賴
pip3 install psycopg2-binary
```

### 問題 2: /query 端點 404

**原因**: Proxy 沒有更新到最新版本

**解決**: 重新執行更新步驟（選項 A 或 C）

### 問題 3: API Key 認證失敗

**檢查**:
```bash
# 查看 NAS 上的環境變數
ssh admin@192.168.1.114
cat /volume1/docker/ai-agent-backup/nas-proxy.env | grep PROXY_API_KEY

# 查看本地 .env
cat .env | grep POSTGRES_PROXY_API_KEY
```

**確認**: 兩邊的 API Key 必須一致

### 問題 4: Cloudflare Tunnel 無法訪問

**檢查 Tunnel 狀態**:
```bash
ssh admin@192.168.1.114
docker ps | grep cloudflared

# 檢查 Tunnel 日誌
docker logs cloudflared-tunnel
```

**重啟 Tunnel**:
```bash
docker restart cloudflared-tunnel
```

## 📊 Proxy 端點總覽

| 端點 | 方法 | 認證 | 功能 |
|------|------|------|------|
| `/health` | GET | ❌ | 健康檢查 + pgvector 狀態 |
| `/info` | GET | ❌ | Proxy 資訊和端點列表 |
| `/test` | GET | ✅ | 測試數據庫連接 |
| `/query` | POST | ✅ | 執行自定義 SQL 查詢 |

## 🎯 下一步

更新完成後：

1. ✅ **執行 pgvector 測試**: `./scripts/test-pgvector.sh`
2. ✅ **創建生產向量表**: 參考 `PGVECTOR-INSTALLATION.md`
3. ✅ **整合到 RAG 系統**: 更新 RAG engine 使用 pgvector
4. ✅ **測試完整流程**: 文檔向量化 → 存儲 → 檢索

---

**更新時間**: 2025-10-05
**版本**: Proxy v1.1.0 (添加 /query 端點)
