# 🚀 NAS PostgreSQL HTTP Proxy 快速部署

**你的 NAS 配置**：
- ✅ PostgreSQL + pgvector 已安裝（Port 5532）
- ✅ pgAdmin4 已安裝（Port 8080）
- 🎯 目標：部署 HTTP Proxy（Port 8000）連接到 PostgreSQL

---

## 📦 **步驟 1：上傳文件到 NAS**

### 1.1 登入 NAS File Station

https://stic.tw3.quickconnect.to/

### 1.2 創建目錄並上傳文件

1. 打開 **File Station**
2. 創建目錄：`/docker/postgres-proxy`
3. 上傳以下文件（從你的 Mac）：
   - `nas-postgres-proxy.py`
   - `nas-proxy.env` → 重命名為 `.env`

**Mac 文件位置**：
```
/Users/morrislin/Desktop/ai-agent-team-v1/ai-agent-team-v1/nas-postgres-proxy.py
/Users/morrislin/Desktop/ai-agent-team-v1/ai-agent-team-v1/nas-proxy.env
```

---

## 🐍 **步驟 2：安裝 Python 依賴**

### 選項 A：通過 SSH（如果可以連接）

```bash
# SSH 到 NAS
ssh admin@192.168.1.114

# 切換到 root
sudo -i

# 安裝 pip（如果還沒有）
apt-get update
apt-get install python3-pip

# 安裝 psycopg2
pip3 install psycopg2-binary

# 驗證安裝
python3 -c "import psycopg2; print('psycopg2 installed successfully')"
```

### 選項 B：通過 Container（推薦，無需 SSH）

使用 Docker 容器運行 Proxy，無需在 NAS 上安裝 Python 依賴。

**創建 Dockerfile**（上傳到 `/docker/postgres-proxy/Dockerfile`）：

```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN pip install psycopg2-binary

COPY nas-postgres-proxy.py .

# 環境變數將從 .env 文件加載
ENV POSTGRES_HOST=192.168.1.114
ENV POSTGRES_PORT=5532
ENV POSTGRES_DB=postgres
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=Morris
ENV SERVER_PORT=8000
ENV PROXY_API_KEY=K6udBL4OmPs3J+hOLkjM6MfSatZQW+vXY1vm/o9y0L0=

EXPOSE 8000

CMD ["python3", "nas-postgres-proxy.py"]
```

---

## 🚀 **步驟 3：部署 Proxy**

### 方法 A：使用 Task Scheduler（需要 SSH 或 Python 已安裝）

1. **控制台** → **任務排程器**
2. 新增 → **觸發的任務** → **用戶定義的腳本**
3. **一般設定**：
   - 任務名稱：`PostgreSQL HTTP Proxy`
   - 使用者：`root`
   - ✅ 啟用
4. **排程**：開機時
5. **任務設定** → **執行命令**：

```bash
#!/bin/bash
cd /volume1/docker/postgres-proxy
export $(cat .env | xargs)
/usr/bin/python3 nas-postgres-proxy.py > /var/log/postgres-proxy.log 2>&1
```

6. 點擊 **確定**
7. 右鍵任務 → **執行** 立即啟動

---

### 方法 B：使用 Container Manager（推薦）

#### B1. 通過 Container Manager UI

1. 打開 **Container Manager**
2. **映像** → **新增** → **從 URL 新增**
3. 或者使用 Docker CLI（如果啟用）

#### B2. 通過 Docker Compose（最簡單）

創建 `docker-compose.yml`（上傳到 `/docker/postgres-proxy/`）：

```yaml
version: '3.8'

services:
  postgres-proxy:
    build: .
    container_name: postgres-http-proxy
    ports:
      - "8000:8000"
    environment:
      - POSTGRES_HOST=192.168.1.114
      - POSTGRES_PORT=5532
      - POSTGRES_DB=postgres
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=Morris
      - SERVER_PORT=8000
      - PROXY_API_KEY=K6udBL4OmPs3J+hOLkjM6MfSatZQW+vXY1vm/o9y0L0=
    restart: unless-stopped
    networks:
      - postgres-network

networks:
  postgres-network:
    driver: bridge
```

**部署步驟**：
1. Container Manager → **專案**
2. **新增** → 選擇 `/docker/postgres-proxy` 文件夾
3. 專案名稱：`postgres-proxy`
4. 點擊 **建置** 然後 **啟動**

---

## ✅ **步驟 4：驗證 Proxy 運行**

### 4.1 在 NAS 本地測試

通過 Container Manager 查看日誌，或使用 SSH：

```bash
# 測試健康檢查
curl http://localhost:8000/health

# 期望輸出：
{
  "status": "healthy",
  "database": "connected",
  "host": "192.168.1.114:5532",
  "version": "PostgreSQL 16.x...",
  "pgvector": "available",
  "response_time_ms": 45.32
}
```

### 4.2 檢查容器狀態（如果使用 Docker）

Container Manager → **容器** → 確認 `postgres-http-proxy` 運行中

### 4.3 查看日誌

Container Manager → 選擇容器 → **詳細資訊** → **日誌**

應該看到：
```
====================================================================
🚀 PostgreSQL HTTP Proxy for Cloudflare Tunnel
====================================================================
📍 HTTP Server Port: 8000
🗄️  PostgreSQL: 192.168.1.114:5532
📊 Database: postgres
👤 User: postgres
🔐 API Key: SET
====================================================================
✅ Connection pool initialized: 192.168.1.114:5532
✅ Proxy server running on http://0.0.0.0:8000
📡 Ready to accept Cloudflare Tunnel connections
```

---

## 🌐 **步驟 5：配置 Cloudflare Tunnel**

### 5.1 添加 Public Hostname

1. https://one.dash.cloudflare.com/
2. **Zero Trust** → **Networks** → **Tunnels**
3. 選擇 `stic-nas`
4. **Public Hostname** → **Add a public hostname**

**配置**：
- **Subdomain**: `postgres-ai-agent`
- **Domain**: `shyangtsuen.xyz`
- **Type**: `HTTP`
- **URL**: `http://192.168.1.114:8000`

點擊 **Save hostname**

### 5.2 等待 DNS 傳播並測試

```bash
# 等待 DNS（約 30 秒）
sleep 30

# 測試 DNS
dig postgres-ai-agent.shyangtsuen.xyz +short

# 應該看到 Cloudflare IP
# 172.67.x.x 或 104.21.x.x

# 測試健康檢查
curl https://postgres-ai-agent.shyangtsuen.xyz/health
```

---

## 🔐 **步驟 6：配置 Cloudflare Workers**

### 6.1 設定 Secrets

```bash
# 設定 Proxy URL
echo "https://postgres-ai-agent.shyangtsuen.xyz" | \
  npx wrangler secret put POSTGRES_PROXY_URL --env production

# 設定 API Key
echo "K6udBL4OmPs3J+hOLkjM6MfSatZQW+vXY1vm/o9y0L0=" | \
  npx wrangler secret put POSTGRES_PROXY_API_KEY --env production
```

### 6.2 更新 .env

編輯 `/Users/morrislin/Desktop/ai-agent-team-v1/ai-agent-team-v1/.env`：

```bash
# PostgreSQL Proxy (通過 Cloudflare Tunnel)
POSTGRES_PROXY_URL=https://postgres-ai-agent.shyangtsuen.xyz
POSTGRES_PROXY_API_KEY=K6udBL4OmPs3J+hOLkjM6MfSatZQW+vXY1vm/o9y0L0=
```

### 6.3 重新部署 Workers

```bash
cd /Users/morrislin/Desktop/ai-agent-team-v1/ai-agent-team-v1
npm run deploy:production
```

---

## 📊 **完整架構**

```
Cloudflare Workers (api.shyangtsuen.xyz)
    ↓ HTTPS + API Key
Cloudflare Edge Network
    ↓ Encrypted Tunnel
Cloudflare Tunnel (postgres-ai-agent.shyangtsuen.xyz)
    ↓ Local HTTP
PostgreSQL HTTP Proxy (Port 8000)
    ↓ psycopg2 + Connection Pool
PostgreSQL + pgvector (Port 5532) ← 你已安裝的容器
```

---

## 🔧 **故障排除**

### 問題 1：Proxy 無法連接到 PostgreSQL

**檢查 PostgreSQL 容器**：
```bash
# Container Manager 確認 pgvector 容器運行中
# 檢查端口映射：5532:5432
```

**測試直接連接**：
```bash
# 在 NAS 上測試
docker exec -it <pgvector-container-name> psql -U postgres -d postgres

# 或通過 pgAdmin (http://192.168.1.114:8080)
```

### 問題 2：端口 8000 已被佔用

**檢查端口使用**：
```bash
netstat -tulpn | grep 8000

# 如果被佔用，修改 SERVER_PORT
# 在 .env 或 docker-compose.yml 中改為其他端口（如 8001）
# 同時更新 Cloudflare Tunnel Public Hostname URL
```

### 問題 3：API Key 認證失敗

**確認 API Key 一致**：
- NAS Proxy `.env`: `PROXY_API_KEY=K6udBL4OmPs3J+hOLkjM6MfSatZQW+vXY1vm/o9y0L0=`
- Workers Secret: `POSTGRES_PROXY_API_KEY=K6udBL4OmPs3J+hOLkjM6MfSatZQW+vXY1vm/o9y0L0=`

---

## 📋 **部署檢查清單**

- [ ] 文件已上傳到 NAS `/docker/postgres-proxy/`
- [ ] PostgreSQL 容器運行中（Port 5532）
- [ ] psycopg2 已安裝（或使用 Docker）
- [ ] Proxy 容器/服務運行中
- [ ] 本地測試通過：`curl http://localhost:8000/health`
- [ ] Cloudflare Tunnel Public Hostname 已配置
- [ ] DNS 已傳播：`dig postgres-ai-agent.shyangtsuen.xyz`
- [ ] 外部測試通過：`curl https://postgres-ai-agent.shyangtsuen.xyz/health`
- [ ] Workers Secrets 已設定
- [ ] Workers 已重新部署
- [ ] 完整測試通過

---

## 🎯 **重要資訊**

**API Key（保密）**：
```
K6udBL4OmPs3J+hOLkjM6MfSatZQW+vXY1vm/o9y0L0=
```

**端點**：
- 健康檢查：https://postgres-ai-agent.shyangtsuen.xyz/health（公開）
- 資訊：https://postgres-ai-agent.shyangtsuen.xyz/info（公開）
- 測試：https://postgres-ai-agent.shyangtsuen.xyz/test（需要 API Key）

**PostgreSQL 連接**：
- Host: 192.168.1.114
- Port: 5532
- Database: postgres
- User: postgres
- Password: Morris

---

**🎉 準備好開始部署了嗎？選擇你喜歡的方法（Task Scheduler 或 Docker）！**
