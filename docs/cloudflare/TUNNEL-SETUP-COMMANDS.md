# 🚀 Cloudflare Tunnel 快速設置指令

**你的資訊**：
- NAS IP: `192.168.1.114`
- NAS 訪問: https://stic.tw3.quickconnect.to/
- 域名: `shyangtsuen.xyz`
- PostgreSQL Port: `5532`
- PostgreSQL 密碼: `Morris1230`

---

## 📝 步驟 1：創建 Cloudflare Tunnel（手動操作）

### 1.1 訪問 Cloudflare Zero Trust

```
https://one.dash.cloudflare.com/
```

**如果沒有 Zero Trust**：
1. 訪問：https://dash.cloudflare.com
2. 左側選單 → **Zero Trust**
3. 點擊 **開始使用**（免費）

### 1.2 創建 Tunnel

1. **Networks** → **Tunnels**
2. 點擊 **Create a tunnel**
3. 選擇 **Cloudflared**
4. Tunnel 名稱：`stic-nas`
5. 點擊 **Save tunnel**

### 1.3 獲取 Docker 命令

在 "Choose your environment" 頁面：
1. 選擇 **Docker**
2. 會顯示類似命令：
   ```bash
   docker run -d --restart=unless-stopped \
     cloudflare/cloudflared:latest tunnel \
     --no-autoupdate run \
     --token eyJhIjoixxxxxxxxxxxxxxxxxxxxxxx
   ```
3. **📋 複製整個命令（包含完整 token）**
4. **暫時保存到記事本**

---

## 🐳 步驟 2：在 NAS 部署 Cloudflare Tunnel

### 2.1 登入 NAS

訪問：https://stic.tw3.quickconnect.to/

### 2.2 配置任務排程器

1. **控制台** → **任務排程器**
2. **新增** → **觸發的任務** → **用戶定義的腳本**

### 2.3 配置任務

**一般設定**：
- 任務名稱：`Cloudflare Tunnel`
- 使用者：`root`

**排程**：
- 選擇：**開機時**

**任務設定** → **執行命令**：

```bash
# 先停止舊容器（如果存在）
docker stop cloudflare-tunnel 2>/dev/null || true
docker rm cloudflare-tunnel 2>/dev/null || true

# 啟動新容器（替換下面的 TOKEN）
docker run -d \
  --name cloudflare-tunnel \
  --restart=unless-stopped \
  cloudflare/cloudflared:latest tunnel \
  --no-autoupdate run \
  --token YOUR_TOKEN_HERE
```

**⚠️ 重要**：將 `YOUR_TOKEN_HERE` 替換為步驟 1.3 中獲取的完整 token

### 2.4 執行任務

1. 點擊 **確定**
2. 找到剛創建的任務
3. 右鍵 → **執行**

### 2.5 驗證運行

1. **Container Manager** → **容器**
2. 應該看到 `cloudflare-tunnel` 容器 ✅ 運行中
3. 點擊容器 → **詳細資訊** → **日誌**
4. 應該看到：
   ```
   INF Connection registered connIndex=0
   INF Registered tunnel connection
   ```

---

## 🌐 步驟 3：配置 Public Hostname（在 Cloudflare Dashboard）

回到 Cloudflare Zero Trust Dashboard：

### 3.1 PostgreSQL Proxy 端點

1. 找到你的 Tunnel `stic-nas`
2. **Public Hostname** → **Add a public hostname**

**配置**：
- Subdomain: `postgres-ai-agent`
- Domain: `shyangtsuen.xyz`
- Path: 留空
- Type: `HTTP`
- URL: `http://192.168.1.114:8000`

點擊 **Save hostname**

### 3.2 健康檢查端點（可選）

再次點擊 **Add a public hostname**

**配置**：
- Subdomain: `health.stic`
- Domain: `shyangtsuen.xyz`
- Path: 留空
- Type: `HTTP`
- URL: `http://192.168.1.114:8000/health`

點擊 **Save hostname**

### 3.3 NAS 管理界面（可選）

**配置**：
- Subdomain: `nas.stic`
- Domain: `shyangtsuen.xyz`
- Path: 留空
- Type: `HTTPS`
- URL: `https://192.168.1.114:5001`
- ✅ 勾選 **No TLS Verify**

點擊 **Save hostname**

---

## 📦 步驟 4：部署 PostgreSQL HTTP Proxy

### 方案 A：Container Manager 手動創建（推薦）

#### 4.1 準備 Proxy 腳本

1. 在你的 Mac，找到文件：
   ```
   /mnt/c/Users/flyca/Desktop/claude/gac-v1/nas-postgres-proxy.py
   ```

2. 上傳到 NAS：
   - **File Station**
   - 創建目錄：`docker/postgres-proxy`
   - 上傳 `nas-postgres-proxy.py` 到該目錄

#### 4.2 創建 Docker 容器

1. **Container Manager** → **映像**
2. 搜索並下載：`python:3.11-slim`

3. **Container Manager** → **容器** → **新增**
4. 選擇 `python:3.11-slim` 映像

**常規設定**：
- 容器名稱：`postgres-proxy`
- ✅ 啟用自動重新啟動

**進階設定** → **端口設定**：
- 本地端口：`8000`
- 容器端口：`8000`
- 類型：`TCP`

**進階設定** → **儲存空間**：
- 新增 → **掛載檔案**
- 檔案：`/volume1/docker/postgres-proxy/nas-postgres-proxy.py`
- 掛載路徑：`/app/proxy.py`

**進階設定** → **環境**：
```
POSTGRES_HOST=192.168.1.114
POSTGRES_PORT=5532
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=Morris1230
PROXY_API_KEY=K6udBL4OmPs3J+hOLkjM6MfSatZQW+vXY1vm/o9y0L0=
SERVER_PORT=8000
```

**進階設定** → **執行命令**：
```bash
sh -c "pip install psycopg2-binary && python /app/proxy.py"
```

5. 點擊 **完成**
6. 啟動容器

#### 4.3 驗證 Proxy 運行

在 NAS 終端機（或通過 Container Manager 日誌）：
```bash
curl http://localhost:8000/health
```

期望輸出：
```json
{
  "status": "healthy",
  "database": "connected",
  "host": "192.168.1.114:5532",
  "pgvector": "available"
}
```

---

## ✅ 步驟 5：測試完整連接

### 5.1 等待 DNS 傳播

```bash
# 在你的 Mac 執行
sleep 30
```

### 5.2 測試遠端連接

```bash
# 測試健康檢查
curl https://postgres-ai-agent.shyangtsuen.xyz/health

# 測試 PostgreSQL 查詢
curl -X POST https://postgres-ai-agent.shyangtsuen.xyz/query \
  -H "Content-Type: application/json" \
  -H "X-API-Key: K6udBL4OmPs3J+hOLkjM6MfSatZQW+vXY1vm/o9y0L0=" \
  -d '{
    "sql": "SELECT version()"
  }'
```

### 5.3 測試 NAS 管理界面（可選）

在瀏覽器訪問：
```
https://nas.stic.shyangtsuen.xyz
```

應該可以看到 Synology DSM 登入畫面

---

## 🔧 步驟 6：配置 Cloudflare Workers

### 6.1 設定 Workers Secrets

在你的 Mac 執行：

```bash
cd /mnt/c/Users/flyca/Desktop/claude/gac-v1

# 設定 Proxy URL
echo "https://postgres-ai-agent.shyangtsuen.xyz" | \
  npx wrangler secret put POSTGRES_PROXY_URL --env production

# 設定 API Key
echo "K6udBL4OmPs3J+hOLkjM6MfSatZQW+vXY1vm/o9y0L0=" | \
  npx wrangler secret put POSTGRES_PROXY_API_KEY --env production
```

### 6.2 更新本地配置

編輯 `.env` 文件：
```bash
# PostgreSQL Proxy (通過 Cloudflare Tunnel)
POSTGRES_PROXY_URL=https://postgres-ai-agent.shyangtsuen.xyz
POSTGRES_PROXY_API_KEY=K6udBL4OmPs3J+hOLkjM6MfSatZQW+vXY1vm/o9y0L0=
ENABLE_POSTGRES_VECTOR=true
```

### 6.3 重新部署 Workers（如果已部署）

```bash
npm run deploy:production
```

---

## 🆘 故障排除

### 問題 1：Tunnel 狀態顯示 "Down"

**檢查**：
```bash
# 在 NAS Container Manager 查看容器日誌
# 或通過 SSH：
docker logs cloudflare-tunnel
```

**常見錯誤**：
- `token is invalid` → Token 過期，重新創建 Tunnel
- `tunnel credentials file doesn't exist` → 重新運行 Docker 命令

### 問題 2：503 Service Unavailable

**原因**：後端 Proxy 未運行

**檢查**：
```bash
# 在 NAS 上
curl http://localhost:8000/health
```

**如果失敗**：
- 檢查 postgres-proxy 容器是否運行
- 查看容器日誌排查錯誤

### 問題 3：無法連接到 PostgreSQL

**檢查 PostgreSQL 容器**：
```bash
# 確認 PostgreSQL 容器運行中
docker ps | grep postgres

# 測試連接
docker exec -it pgvector psql -U postgres -c "SELECT version();"
```

---

## 📊 配置摘要

完成後的架構：

```
[Cloudflare Workers]
    ↓ HTTPS
[Cloudflare Edge Network]
    ↓ Encrypted Tunnel
[cloudflared on NAS]
    ↓ HTTP (內網)
[PostgreSQL HTTP Proxy :8000]
    ↓
[PostgreSQL :5532]
```

**訪問端點**：
- ✅ `https://postgres-ai-agent.shyangtsuen.xyz` → PostgreSQL Proxy
- ✅ `https://health.stic.shyangtsuen.xyz` → 健康檢查
- ✅ `https://nas.stic.shyangtsuen.xyz` → NAS 管理界面

---

## 📋 檢查清單

- [ ] Cloudflare Tunnel 已創建（步驟 1）
- [ ] cloudflared Docker 容器運行中（步驟 2）
- [ ] Public Hostname 已配置（步驟 3）
- [ ] PostgreSQL Proxy 部署成功（步驟 4）
- [ ] 遠端連接測試通過（步驟 5）
- [ ] Workers Secrets 已設定（步驟 6）

---

## 🎯 快速命令參考

```bash
# 在 Mac 測試連接
curl https://postgres-ai-agent.shyangtsuen.xyz/health

# 在 NAS 查看 Tunnel 日誌
docker logs cloudflare-tunnel

# 在 NAS 查看 Proxy 日誌
docker logs postgres-proxy

# 重啟 Tunnel
docker restart cloudflare-tunnel

# 重啟 Proxy
docker restart postgres-proxy
```

---

**🎉 完成所有步驟後，你就可以在任何地方安全訪問 NAS PostgreSQL 了！**
