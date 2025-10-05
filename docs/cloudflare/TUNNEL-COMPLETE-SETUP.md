# 🚀 Cloudflare Tunnel 完整設定指南（無需 SSH）

**更新日期**: 2025-10-05
**適用於**: 無法 SSH 到 NAS 的情況
**方法**: 通過 Cloudflare Dashboard + Synology DSM Web UI

---

## 📊 **你的網絡狀況**

- 🖥️ **Mac IP**: 192.168.50.54 (無法直接連接 NAS)
- 🗄️ **NAS IP**: 192.168.1.114 (在不同網段)
- 🌐 **NAS 訪問**: https://stic.tw3.quickconnect.to/

**因為無法 SSH，我們使用 Web UI 完成所有配置！**

---

## 🎯 **設定流程概覽**

1. ✅ **通過 Synology DSM** 安裝 cloudflared
2. ✅ **通過 Cloudflare Dashboard** 創建和配置 Tunnel
3. ✅ **設置 DNS 記錄**
4. ✅ **測試連接**

---

## 📝 **步驟 1：登入 Synology DSM**

### 1.1 訪問 NAS 管理界面

```
https://stic.tw3.quickconnect.to/
```

登入你的 Synology NAS。

### 1.2 啟用 SSH（用於後續配置）

1. **控制台** → **終端機和 SNMP**
2. 勾選 **✅ 啟用 SSH 服務**
3. 端口保持 **22**
4. 點擊 **套用**

---

## 🔧 **步驟 2：在 NAS 上安裝 Docker（如果還沒有）**

### 2.1 檢查 Docker

1. DSM → **套件中心**
2. 搜索 **Docker**
3. 如果未安裝，點擊 **安裝**

### 2.2 啟動 Docker

安裝完成後，打開 **Docker** 套件。

---

## 🌐 **步驟 3：通過 Cloudflare Dashboard 創建 Tunnel**

### 3.1 登入 Cloudflare Zero Trust

1. 訪問：https://one.dash.cloudflare.com/
2. 登入你的 Cloudflare 帳號
3. 選擇 **Zero Trust**

**如果沒有 Zero Trust 權限**：
- 訪問：https://dash.cloudflare.com
- 左側選單 → **Zero Trust**
- 點擊 **開始使用** (免費)

### 3.2 創建 Tunnel

1. **Networks** → **Tunnels**
2. 點擊 **Create a tunnel**
3. 選擇 **Cloudflared**
4. Tunnel 名稱：`stic-nas`
5. 點擊 **Save tunnel**

### 3.3 選擇環境（重要！）

在 "Choose your environment" 頁面：

**選擇 Docker**：

會顯示一個 Docker 命令，類似：

```bash
docker run -d --restart=unless-stopped \
  cloudflare/cloudflared:latest tunnel \
  --no-autoupdate run \
  --token eyJhIjoixxxxxxxxxxxxxxxxxxxxxxx
```

**📋 複製這個完整命令！**（包含 token）

---

## 🐳 **步驟 4：在 Synology Docker 中運行 Tunnel**

### 4.1 通過 Synology Task Scheduler 運行

1. **控制台** → **任務排程器**
2. 新增 → **觸發的任務** → **用戶定義的腳本**
3. **一般設定**：
   - 任務名稱：`Cloudflare Tunnel`
   - 使用者：`root`
4. **排程**：
   - 選擇 **開機時**
5. **任務設定** → **執行命令**：

貼上剛才複製的 Docker 命令：

```bash
docker run -d --restart=unless-stopped \
  --name cloudflare-tunnel \
  cloudflare/cloudflared:latest tunnel \
  --no-autoupdate run \
  --token eyJhIjoixxxxxxxxxxxxxxxxxxxxxxx
```

6. 點擊 **確定**
7. **立即執行任務**（右鍵 → 執行）

### 4.2 驗證 Tunnel 運行

1. DSM → **Docker** → **容器**
2. 應該看到 `cloudflare-tunnel` 容器運行中 ✅
3. 點擊容器 → **詳細資訊** → **日誌**
4. 應該看到：
   ```
   INF Connection registered connIndex=0
   INF Registered tunnel connection
   ```

---

## 🌍 **步驟 5：配置 Public Hostname（DNS 路由）**

回到 Cloudflare Dashboard：

### 5.1 添加 PostgreSQL Proxy 端點

1. 在 Tunnel 詳情頁面，找到 **Public Hostname**
2. 點擊 **Add a public hostname**

**配置 1：PostgreSQL Proxy**
- **Subdomain**: `postgres.stic`
- **Domain**: `shyangtsuen.xyz`
- **Path**: 留空
- **Type**: `HTTP`
- **URL**: `http://192.168.1.114:8000`

點擊 **Save hostname**

### 5.2 添加健康檢查端點

再次點擊 **Add a public hostname**

**配置 2：Health Check**
- **Subdomain**: `health.stic`
- **Domain**: `shyangtsuen.xyz`
- **Path**: 留空
- **Type**: `HTTP`
- **URL**: `http://192.168.1.114:8000/health`

點擊 **Save hostname**

### 5.3 添加 NAS 管理界面（可選）

**配置 3：NAS DSM**
- **Subdomain**: `nas.stic`
- **Domain**: `shyangtsuen.xyz`
- **Path**: 留空
- **Type**: `HTTPS`
- **URL**: `https://192.168.1.114:5001`
- ✅ **No TLS Verify**（勾選）

點擊 **Save hostname**

---

## 📝 **步驟 6：驗證 DNS 自動創建**

Cloudflare 會自動創建 DNS 記錄。驗證：

### 6.1 檢查 DNS 設定

1. https://dash.cloudflare.com
2. 選擇域名 `shyangtsuen.xyz`
3. **DNS** → **Records**

應該看到：

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | postgres.stic | xxx.cfargotunnel.com | ✅ Proxied |
| CNAME | health.stic | xxx.cfargotunnel.com | ✅ Proxied |
| CNAME | nas.stic | xxx.cfargotunnel.com | ✅ Proxied |

### 6.2 測試 DNS 解析

在 Mac 上執行：

```bash
# 等待 DNS 傳播（約 30 秒）
sleep 30

# 測試 DNS
dig postgres.stic.shyangtsuen.xyz +short
dig health.stic.shyangtsuen.xyz +short
dig nas.stic.shyangtsuen.xyz +short
```

應該看到 Cloudflare IP（172.67.x.x 或 104.21.x.x）

---

## 🧪 **步驟 7：部署 PostgreSQL HTTP Proxy**

現在 Tunnel 已運行，需要部署後端服務。

### 7.1 通過 Synology Docker UI 部署

由於無法 SSH，我們用 Synology 的 Docker UI：

**方法 A：使用 Docker Compose（推薦）**

1. DSM → **File Station**
2. 創建文件夾：`docker/postgres-proxy`
3. 上傳文件（從專案複製）：
   - `Dockerfile`
   - `docker-compose.yml`
   - `postgres_proxy.py`
   - `requirements.txt`
   - `.env`

4. DSM → **Docker** → **Project**
5. 新增 → 選擇 `docker/postgres-proxy` 文件夾
6. 啟動

**方法 B：使用預構建鏡像（最簡單）**

1. DSM → **Docker** → **Registry**
2. 搜索：`postgres` （或使用自定義鏡像）
3. 下載

4. **Container** → **Create**
5. 選擇剛下載的鏡像
6. **環境變數**：
   ```
   POSTGRES_HOST=192.168.1.114
   POSTGRES_PORT=5532
   POSTGRES_DB=postgres
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=Morris1230
   PROXY_API_KEY=your-secure-key-here
   ```
7. **端口設定**：
   - 本地端口：8000
   - 容器端口：8000
8. 啟動容器

### 7.2 快速測試腳本（Python）

如果上述方法複雜，創建一個最簡單的 HTTP Proxy：

**創建文件：simple-proxy.py**

```python
from http.server import HTTPServer, BaseHTTPRequestHandler
import json

class ProxyHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "healthy",
                "message": "Proxy running"
            }).encode())
        else:
            self.send_response(404)
            self.end_headers()

if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', 8000), ProxyHandler)
    print('Proxy running on port 8000...')
    server.serve_forever()
```

**在 Synology 運行**：
1. File Station → 上傳 `simple-proxy.py`
2. Task Scheduler → 新增腳本：
   ```bash
   python3 /volume1/docker/postgres-proxy/simple-proxy.py
   ```

---

## ✅ **步驟 8：測試完整連接**

### 8.1 從 Mac 測試

```bash
# 測試健康檢查
curl https://health.stic.shyangtsuen.xyz

# 期望輸出
{"status":"healthy","message":"Proxy running"}

# 測試 PostgreSQL Proxy
curl https://postgres.stic.shyangtsuen.xyz/health

# 測試 NAS 管理界面（可選）
curl -k https://nas.stic.shyangtsuen.xyz
```

### 8.2 瀏覽器測試

訪問：
- https://health.stic.shyangtsuen.xyz
- https://nas.stic.shyangtsuen.xyz （DSM 管理界面）

---

## 🔧 **故障排除**

### 問題 1：Tunnel 狀態顯示 "Down"

**檢查**：
1. Docker 容器是否運行
   - DSM → Docker → 容器
   - 查看 `cloudflare-tunnel` 狀態
2. 查看日誌
   - 點擊容器 → 詳細資訊 → 日誌
   - 查找錯誤訊息

**常見錯誤**：
- `token is invalid` → Token 過期，重新創建 Tunnel
- `tunnel credentials file doesn't exist` → 重新運行 Docker 命令

### 問題 2：DNS 解析失敗

```bash
# 測試 DNS
dig postgres.stic.shyangtsuen.xyz +short
```

**如果沒有結果**：
1. 檢查 Cloudflare DNS Records
2. 確認 Proxy 狀態為 Proxied（橙色雲）
3. 等待 DNS 傳播（最多 5 分鐘）

### 問題 3：503 Service Unavailable

**原因**：後端服務未運行

**檢查**：
```bash
# 在 NAS 上測試（需要能訪問 NAS Web UI）
# 通過 Synology Terminal 或 SSH
curl http://192.168.1.114:8000/health
```

**如果失敗**：
- 檢查 Proxy 容器是否運行
- 檢查端口 8000 是否被佔用

---

## 🔒 **安全設定**

### 1. 設定 API Key

在 `.env` 或環境變數中：
```bash
PROXY_API_KEY=$(openssl rand -base64 32)
```

### 2. 配置 Cloudflare Access（可選但推薦）

為 NAS 管理界面添加認證：

1. Zero Trust → Access → Applications
2. Add an Application → Self-hosted
3. **Application domain**: `nas.stic.shyangtsuen.xyz`
4. 設定 **Allow** 規則：
   - Email: `your-email@example.com`
5. Save

現在訪問 NAS 需要先通過 Cloudflare 認證！

---

## 📊 **配置摘要**

完成後，你的架構：

```
Cloudflare Workers (生產環境)
    ↓ HTTPS
Cloudflare Edge (全球 CDN)
    ↓ Encrypted Tunnel
cloudflared (Docker on NAS)
    ↓ Local HTTP
PostgreSQL HTTP Proxy (port 8000)
    ↓ Local
PostgreSQL (port 5532)
```

**訪問端點**：
- ✅ `https://postgres.stic.shyangtsuen.xyz` → PostgreSQL Proxy
- ✅ `https://health.stic.shyangtsuen.xyz` → 健康檢查
- ✅ `https://nas.stic.shyangtsuen.xyz` → NAS 管理界面

---

## 🚀 **步驟 9：配置 Cloudflare Workers**

### 9.1 設定 Workers Secrets

```bash
# 設定 Proxy URL
echo "https://postgres.stic.shyangtsuen.xyz" | \
  npx wrangler secret put POSTGRES_PROXY_URL --env production

# 設定 API Key
echo "your-secure-api-key" | \
  npx wrangler secret put POSTGRES_PROXY_API_KEY --env production
```

### 9.2 更新專案配置

編輯 `.env`：
```bash
# 改為通過 Tunnel 訪問
POSTGRES_PROXY_URL=https://postgres.stic.shyangtsuen.xyz
POSTGRES_PROXY_API_KEY=your-secure-api-key
```

### 9.3 重新部署 Workers

```bash
npx wrangler deploy --env production
```

---

## 📝 **檢查清單**

- [ ] Cloudflare Tunnel 已創建
- [ ] Docker 容器運行正常
- [ ] DNS 記錄已自動創建
- [ ] Public Hostname 已配置
- [ ] PostgreSQL Proxy 部署成功
- [ ] 健康檢查端點正常
- [ ] Workers Secrets 已設定
- [ ] Workers 重新部署

---

## 💡 **額外提示**

### 使用 Synology Package Center

如果覺得 Docker 複雜，可以尋找：
1. **套件中心** → 搜索 "Python"
2. 安裝 **Python 3**
3. 直接運行 Python 腳本

### 監控 Tunnel

在 Cloudflare Dashboard：
- Zero Trust → Networks → Tunnels
- 點擊 `stic-nas`
- 查看 **Metrics** 和 **Logs**

---

## 🆘 **需要幫助？**

如果遇到問題，提供以下資訊：

1. **Tunnel 狀態截圖**（Cloudflare Dashboard）
2. **Docker 容器日誌**（DSM Docker）
3. **DNS 解析結果**：
   ```bash
   dig postgres.stic.shyangtsuen.xyz
   ```
4. **測試結果**：
   ```bash
   curl https://health.stic.shyangtsuen.xyz
   ```

---

**🎉 完成後，你的 NAS PostgreSQL 將可以從全球任何地方安全訪問！**
