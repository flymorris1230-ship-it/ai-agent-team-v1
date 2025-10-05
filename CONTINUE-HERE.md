# 🔄 專案繼續點 - Cloudflare Tunnel 設置

**最後更新**: 2025-10-05
**當前狀態**: 正在進行 Cloudflare Tunnel 設置
**進度**: 步驟 1/5 - 等待創建 Tunnel 並獲取 Token

---

## 📍 **你現在的位置**

你正在設置 Cloudflare Tunnel，以便能夠異地安全訪問 NAS 上的 PostgreSQL 資料庫。

### ✅ **已完成的工作**

1. ✅ GitHub 專案已同步（本地與遠端一致）
2. ✅ 本地檔案已加入版本控制
3. ✅ 專案進度已確認（95% 生產環境就緒）
4. ✅ Tunnel 設置文件已準備：
   - `TUNNEL-SETUP-COMMANDS.md` - 詳細手動指南
   - `QUICK-TUNNEL-SETUP.sh` - 自動化腳本
   - `nas-postgres-proxy.py` - PostgreSQL HTTP Proxy
   - `nas-proxy.env` - 環境配置範例

### 🎯 **下一步要做的事**

你需要完成 **Cloudflare Tunnel 設置的 5 個步驟**：

---

## 📋 **步驟 1：創建 Cloudflare Tunnel**（👈 你在這裡）

### 操作步驟：

1. **訪問 Cloudflare Zero Trust**
   ```
   https://one.dash.cloudflare.com/
   ```

2. **如果沒有 Zero Trust**，先啟用（免費）：
   - 訪問：https://dash.cloudflare.com
   - 左側選單 → **Zero Trust** → **開始使用**

3. **創建 Tunnel**：
   - 點擊：**Networks** → **Tunnels**
   - 點擊：**Create a tunnel**
   - 選擇：**Cloudflared**
   - 名稱輸入：`stic-nas`
   - 點擊：**Save tunnel**

4. **選擇環境 - Docker**：
   - 在 "Choose your environment" 頁面
   - 選擇：**Docker**
   - 你會看到一個命令，例如：
     ```bash
     docker run cloudflare/cloudflared:latest tunnel \
       --no-autoupdate run \
       --token eyJhIjoiXXXXXXXXXXXXXX...
     ```

5. **複製 Token**：
   - 從命令中複製 `--token` 後面的完整字串
   - Token 通常以 `eyJ` 開頭，很長

### 完成後：

將獲得的 token 準備好，然後繼續到步驟 2。

---

## 📋 **步驟 2：在 NAS 部署 cloudflared**

### 操作步驟：

1. **訪問 NAS 管理界面**
   ```
   https://stic.tw3.quickconnect.to/
   ```

2. **創建任務排程器**：
   - **控制台** → **任務排程器**
   - **新增** → **觸發的任務** → **用戶定義的腳本**

3. **配置任務**：

   **一般設定**：
   - 任務名稱：`Cloudflare Tunnel`
   - 使用者：`root`

   **排程**：
   - 選擇：**開機時**

   **任務設定** - 執行命令：
   ```bash
   # 清理舊容器
   docker stop cloudflare-tunnel 2>/dev/null || true
   docker rm cloudflare-tunnel 2>/dev/null || true

   # 啟動 Tunnel（替換下面的 YOUR_TOKEN）
   docker run -d \
     --name cloudflare-tunnel \
     --restart=unless-stopped \
     cloudflare/cloudflared:latest tunnel \
     --no-autoupdate run \
     --token YOUR_TOKEN_HERE
   ```

   ⚠️ **將 `YOUR_TOKEN_HERE` 替換為步驟 1 獲得的 token**

4. **執行任務**：
   - 點擊 **確定**
   - 右鍵該任務 → **執行**

5. **驗證運行**：
   - **Container Manager** → **容器**
   - 確認 `cloudflare-tunnel` 容器 ✅ 運行中
   - 點擊查看日誌，應該看到：
     ```
     INF Connection registered connIndex=0
     INF Registered tunnel connection
     ```

---

## 📋 **步驟 3：配置 Public Hostname**

回到 Cloudflare Zero Trust Dashboard：

### 配置 1：PostgreSQL Proxy（必須）

1. 找到你的 Tunnel `stic-nas`
2. **Public Hostname** → **Add a public hostname**
3. 填入以下資訊：
   - **Subdomain**: `postgres-ai-agent`
   - **Domain**: `shyangtsuen.xyz`
   - **Path**: 留空
   - **Type**: `HTTP`
   - **URL**: `http://192.168.1.114:8000`
4. 點擊 **Save hostname**

### 配置 2：健康檢查（可選）

再次點擊 **Add a public hostname**：
- **Subdomain**: `health.stic`
- **Domain**: `shyangtsuen.xyz`
- **Type**: `HTTP`
- **URL**: `http://192.168.1.114:8000/health`

### 配置 3：NAS 管理界面（可選）

再次點擊 **Add a public hostname**：
- **Subdomain**: `nas.stic`
- **Domain**: `shyangtsuen.xyz`
- **Type**: `HTTPS`
- **URL**: `https://192.168.1.114:5001`
- ✅ 勾選 **No TLS Verify**

---

## 📋 **步驟 4：部署 PostgreSQL HTTP Proxy**

### 4.1 上傳文件到 NAS

1. **File Station** 創建目錄：`docker/postgres-proxy`
2. 上傳文件（從你的 Mac）：
   - 檔案位置：`/mnt/c/Users/flyca/Desktop/claude/ai-agent-team-v1/nas-postgres-proxy.py`
   - 上傳到：`/volume1/docker/postgres-proxy/nas-postgres-proxy.py`

### 4.2 下載 Python 映像

1. **Container Manager** → **映像**
2. 搜索：`python:3.11-slim`
3. 點擊下載

### 4.3 創建容器

1. **Container Manager** → **容器** → **新增**
2. 選擇：`python:3.11-slim`

**常規設定**：
- 容器名稱：`postgres-proxy`
- ✅ 啟用自動重新啟動

**進階設定** → **端口設定**：
| 本地端口 | 容器端口 | 類型 |
|---------|---------|------|
| 8000    | 8000    | TCP  |

**進階設定** → **儲存空間** → **新增** → **掛載檔案**：
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

**完成**：
- 點擊 **完成**
- 啟動容器

### 4.4 驗證運行

查看容器日誌，應該看到：
```
Server running on port 8000
```

---

## 📋 **步驟 5：測試與配置 Workers**

### 5.1 測試遠端連接

在你的 Mac 終端執行：

```bash
# 等待 DNS 傳播
sleep 30

# 測試健康檢查
curl https://postgres-ai-agent.shyangtsuen.xyz/health

# 期望看到
{
  "status": "healthy",
  "database": "connected",
  "host": "192.168.1.114:5532",
  "pgvector": "available"
}
```

### 5.2 配置 Cloudflare Workers

```bash
cd /mnt/c/Users/flyca/Desktop/claude/ai-agent-team-v1

# 設定 Proxy URL
echo "https://postgres-ai-agent.shyangtsuen.xyz" | \
  npx wrangler secret put POSTGRES_PROXY_URL --env production

# 設定 API Key
echo "K6udBL4OmPs3J+hOLkjM6MfSatZQW+vXY1vm/o9y0L0=" | \
  npx wrangler secret put POSTGRES_PROXY_API_KEY --env production
```

### 5.3 更新本地配置

編輯 `.env` 文件，添加：
```bash
# PostgreSQL Proxy (通過 Cloudflare Tunnel)
POSTGRES_PROXY_URL=https://postgres-ai-agent.shyangtsuen.xyz
POSTGRES_PROXY_API_KEY=K6udBL4OmPs3J+hOLkjM6MfSatZQW+vXY1vm/o9y0L0=
ENABLE_POSTGRES_VECTOR=true
```

---

## ✅ **完成檢查清單**

- [ ] 步驟 1: Cloudflare Tunnel 已創建並獲取 token
- [ ] 步驟 2: cloudflared 容器在 NAS 上運行
- [ ] 步驟 3: Public Hostname 已配置（至少 postgres-ai-agent）
- [ ] 步驟 4: PostgreSQL Proxy 容器在 NAS 上運行
- [ ] 步驟 5: 遠端連接測試通過
- [ ] 步驟 5: Workers Secrets 已配置
- [ ] 步驟 5: 本地 .env 已更新

---

## 📚 **參考文件**

- **詳細指南**: `TUNNEL-SETUP-COMMANDS.md`
- **自動化腳本**: `QUICK-TUNNEL-SETUP.sh`（需要互動）
- **Proxy 程式**: `nas-postgres-proxy.py`
- **環境配置**: `nas-proxy.env`

---

## 🆘 **遇到問題？**

### Tunnel 無法連接
```bash
# 查看 NAS 上的 Tunnel 日誌
docker logs cloudflare-tunnel
```

### Proxy 無法運行
```bash
# 查看 NAS 上的 Proxy 日誌
docker logs postgres-proxy

# 測試本地連接
curl http://192.168.1.114:8000/health
```

### DNS 無法解析
```bash
# 測試 DNS
dig postgres-ai-agent.shyangtsuen.xyz +short

# 檢查 Cloudflare DNS Records
# https://dash.cloudflare.com → 域名 → DNS
```

---

## 🎯 **快速恢復指令**

當你下次打開終端時，執行：

```bash
cd /mnt/c/Users/flyca/Desktop/claude/ai-agent-team-v1
cat CONTINUE-HERE.md
```

然後從當前步驟繼續。

---

## 📊 **整體架構**

```
Cloudflare Workers (生產環境)
    ↓ HTTPS + API Key
Cloudflare Edge Network
    ↓ Encrypted Tunnel
cloudflared (NAS Docker)
    ↓ HTTP (內網)
PostgreSQL Proxy (NAS Docker :8000)
    ↓ psycopg2
PostgreSQL + pgvector (NAS Docker :5532)
```

---

## 💡 **重要資訊**

**NAS 資訊**：
- IP: 192.168.1.114
- 訪問: https://stic.tw3.quickconnect.to/
- PostgreSQL Port: 5532
- PostgreSQL 密碼: Morris1230

**Cloudflare 資訊**：
- 域名: shyangtsuen.xyz
- Tunnel 名稱: stic-nas
- API Key: K6udBL4OmPs3J+hOLkjM6MfSatZQW+vXY1vm/o9y0L0=

**預期端點**：
- PostgreSQL Proxy: https://postgres-ai-agent.shyangtsuen.xyz
- 健康檢查: https://health.stic.shyangtsuen.xyz
- NAS 管理: https://nas.stic.shyangtsuen.xyz

---

**🎯 下次開啟時，直接從步驟 1 開始執行！**
