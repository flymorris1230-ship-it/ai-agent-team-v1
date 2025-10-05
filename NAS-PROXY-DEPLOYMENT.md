# 🚀 NAS PostgreSQL HTTP Proxy 部署指南

**更新日期**: 2025-10-05
**NAS IP**: 192.168.1.114
**PostgreSQL Port**: 5532 (pgvector)
**Proxy Port**: 8000

---

## 📦 **步驟 1：上傳 Proxy 文件到 NAS**

### 1.1 通過 File Station 上傳

1. 登入 Synology DSM: https://stic.tw3.quickconnect.to/
2. 打開 **File Station**
3. 創建目錄：`/volume1/docker/postgres-proxy`
4. 上傳文件：
   - `nas-postgres-proxy.py`

---

## 🐍 **步驟 2：安裝 Python 依賴**

### 2.1 啟用 SSH（如果還沒有）

1. **控制台** → **終端機和 SNMP**
2. ✅ 勾選 **啟用 SSH 服務**
3. 端口：22
4. 點擊 **套用**

### 2.2 通過 SSH 安裝依賴

從 Mac 連接到 NAS（如果在同一網段）：
```bash
# 如果可以 SSH（需要在同一網段）
ssh admin@192.168.1.114

# 安裝 Python pip
sudo apt-get update
sudo apt-get install python3-pip

# 安裝 psycopg2
sudo pip3 install psycopg2-binary
```

**如果無法 SSH**，使用 Synology Package Center：
1. **套件中心** → 搜索 **Python**
2. 安裝 **Python 3**
3. 然後通過 Task Scheduler 運行安裝命令

---

## 🔧 **步驟 3：配置環境變數**

創建環境變數配置文件：

### 3.1 創建 `.env` 文件

在 `/volume1/docker/postgres-proxy/.env`:

```bash
POSTGRES_HOST=192.168.1.114
POSTGRES_PORT=5532
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=Morris1230
PROXY_API_KEY=$(openssl rand -base64 32)
SERVER_PORT=8000
```

### 3.2 生成安全的 API Key

在 Mac 上運行：
```bash
openssl rand -base64 32
```

將生成的 API Key 複製到 `.env` 文件的 `PROXY_API_KEY`

**保存這個 API Key** - Cloudflare Workers 需要使用它來訪問代理！

---

## 🚀 **步驟 4：部署 Proxy**

### 方法 A：使用 Task Scheduler（推薦）

1. **控制台** → **任務排程器**
2. 新增 → **觸發的任務** → **用戶定義的腳本**
3. **一般設定**：
   - 任務名稱：`PostgreSQL HTTP Proxy`
   - 使用者：`root`
   - ✅ 啟用
4. **排程**：
   - 選擇 **開機時**
5. **任務設定** → **執行命令**：

```bash
# 加載環境變數並啟動 Proxy
cd /volume1/docker/postgres-proxy
export $(cat .env | xargs)
/usr/bin/python3 nas-postgres-proxy.py > /var/log/postgres-proxy.log 2>&1
```

6. 點擊 **確定**
7. **立即執行任務**（右鍵 → 執行）

### 方法 B：Docker 部署（進階）

如果你熟悉 Docker，創建 `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN pip install psycopg2-binary

COPY nas-postgres-proxy.py .

ENV POSTGRES_HOST=192.168.1.114
ENV POSTGRES_PORT=5532
ENV POSTGRES_DB=postgres
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=Morris1230
ENV SERVER_PORT=8000

EXPOSE 8000

CMD ["python3", "nas-postgres-proxy.py"]
```

然後：
```bash
docker build -t postgres-proxy .
docker run -d --name postgres-proxy -p 8000:8000 --env-file .env postgres-proxy
```

---

## ✅ **步驟 5：驗證 Proxy 運行**

### 5.1 在 NAS 本地測試

通過 SSH 或 Terminal：
```bash
# 測試健康檢查
curl http://localhost:8000/health

# 期望輸出：
# {
#   "status": "healthy",
#   "database": "connected",
#   "host": "192.168.1.114:5532",
#   "pgvector": "available",
#   ...
# }
```

### 5.2 從 Mac 測試（需要在同一網段）

```bash
curl http://192.168.1.114:8000/health
```

### 5.3 檢查日誌

```bash
# 查看 Proxy 日誌
tail -f /var/log/postgres-proxy.log
```

---

## 🌐 **步驟 6：配置 Cloudflare Tunnel Public Hostname**

現在 Proxy 已運行，回到 Cloudflare Dashboard 配置 Public Hostname：

### 6.1 添加 PostgreSQL Proxy 端點

1. https://one.dash.cloudflare.com/
2. **Zero Trust** → **Networks** → **Tunnels**
3. 選擇你的 Tunnel：`stic-nas` (ID: e41b8baa-f28e-4aef-b4cd-32b3d2bf88f2)
4. **Public Hostname** → **Add a public hostname**

**配置 1：PostgreSQL AI Agent Proxy**
- **Subdomain**: `postgres-ai-agent`
- **Domain**: `shyangtsuen.xyz`
- **Path**: 留空
- **Type**: `HTTP`
- **URL**: `http://192.168.1.114:8000`

點擊 **Save hostname**

**配置 2：Health Check (可選)**
- **Subdomain**: `health-ai`
- **Domain**: `shyangtsuen.xyz`
- **Path**: 留空
- **Type**: `HTTP`
- **URL**: `http://192.168.1.114:8000/health`

點擊 **Save hostname**

---

## 🧪 **步驟 7：測試 Tunnel 連接**

### 7.1 等待 DNS 傳播

```bash
# 等待 30 秒
sleep 30

# 測試 DNS
dig postgres-ai-agent.shyangtsuen.xyz +short
```

應該看到 Cloudflare IP（172.67.x.x 或 104.21.x.x）

### 7.2 從 Mac 測試完整鏈路

```bash
# 測試健康檢查（公開，無需 API Key）
curl https://postgres-ai-agent.shyangtsuen.xyz/health

# 期望輸出：
# {
#   "status": "healthy",
#   "database": "connected",
#   "host": "192.168.1.114:5532",
#   "pgvector": "available",
#   ...
# }

# 測試 Proxy 信息
curl https://postgres-ai-agent.shyangtsuen.xyz/info

# 測試數據庫操作（需要 API Key）
curl -H "X-API-Key: YOUR_API_KEY_HERE" \
  https://postgres-ai-agent.shyangtsuen.xyz/test
```

---

## 🔐 **步驟 8：配置 Cloudflare Workers**

### 8.1 設定 Workers Secrets

```bash
# 設定 Proxy URL
echo "https://postgres-ai-agent.shyangtsuen.xyz" | \
  npx wrangler secret put POSTGRES_PROXY_URL --env production

# 設定 API Key（使用步驟 3.2 生成的 API Key）
echo "YOUR_GENERATED_API_KEY" | \
  npx wrangler secret put POSTGRES_PROXY_API_KEY --env production
```

### 8.2 更新 Workers 配置

編輯 `.env`：
```bash
# PostgreSQL Proxy (通過 Cloudflare Tunnel)
POSTGRES_PROXY_URL=https://postgres-ai-agent.shyangtsuen.xyz
POSTGRES_PROXY_API_KEY=YOUR_GENERATED_API_KEY
```

### 8.3 重新部署 Workers

```bash
npm run deploy:production
```

---

## 📊 **架構總覽**

完成後的完整架構：

```
┌─────────────────────────────────────────────────┐
│  Cloudflare Workers (Production)                │
│  api.shyangtsuen.xyz                           │
└─────────────────┬───────────────────────────────┘
                  │ HTTPS (Authenticated)
                  ↓
┌─────────────────────────────────────────────────┐
│  Cloudflare Edge Network (Global CDN)          │
└─────────────────┬───────────────────────────────┘
                  │ Encrypted Tunnel
                  ↓
┌─────────────────────────────────────────────────┐
│  Cloudflare Tunnel                             │
│  postgres-ai-agent.shyangtsuen.xyz             │
│  Tunnel ID: e41b8baa-f28e-4aef-b4cd-32b3d2bf88f2│
└─────────────────┬───────────────────────────────┘
                  │ Local HTTP (192.168.1.114)
                  ↓
┌─────────────────────────────────────────────────┐
│  PostgreSQL HTTP Proxy (Port 8000)             │
│  nas-postgres-proxy.py                         │
│  - Authentication: X-API-Key header            │
│  - Endpoints: /health, /info, /test            │
└─────────────────┬───────────────────────────────┘
                  │ psycopg2
                  ↓
┌─────────────────────────────────────────────────┐
│  PostgreSQL + pgvector (Port 5532)             │
│  NAS: 192.168.1.114                            │
│  - Vector embeddings for RAG                   │
│  - Persistent data storage                     │
└─────────────────────────────────────────────────┘
```

**安全層級**：
1. ✅ Cloudflare Workers 認證
2. ✅ HTTPS/TLS 加密
3. ✅ Cloudflare Tunnel（無端口轉發）
4. ✅ Proxy API Key 驗證
5. ✅ PostgreSQL 密碼保護
6. ✅ 本地網路隔離

---

## 🔧 **故障排除**

### 問題 1：Proxy 無法啟動

**檢查**：
```bash
# 查看日誌
tail -f /var/log/postgres-proxy.log

# 檢查 Python 進程
ps aux | grep postgres-proxy

# 檢查端口
netstat -tulpn | grep 8000
```

**常見錯誤**：
- `psycopg2 not installed` → 安裝 `pip3 install psycopg2-binary`
- `Port 8000 already in use` → 停止其他服務或更改端口
- `Connection refused` → 檢查 PostgreSQL 是否運行在 5532 端口

### 問題 2：Tunnel 503 錯誤

**原因**：Proxy 未運行或無法訪問

**檢查**：
```bash
# 在 NAS 上測試 Proxy
curl http://localhost:8000/health

# 檢查 Tunnel 日誌
# Cloudflare Dashboard → Tunnels → stic-nas → Logs
```

### 問題 3：API Key 驗證失敗

**檢查**：
```bash
# 確認 .env 中的 API Key
cat /volume1/docker/postgres-proxy/.env | grep PROXY_API_KEY

# 確認 Workers Secret
npx wrangler secret list --env production
```

---

## 📋 **部署檢查清單**

- [ ] Proxy 文件已上傳到 NAS
- [ ] psycopg2 已安裝
- [ ] 環境變數已配置（.env）
- [ ] API Key 已生成並保存
- [ ] Task Scheduler 任務已創建
- [ ] Proxy 服務運行正常（http://localhost:8000/health）
- [ ] Cloudflare Tunnel Public Hostname 已配置
- [ ] DNS 記錄已創建並傳播
- [ ] 外部健康檢查正常（https://health.shyangtsuen.xyz）
- [ ] Workers Secrets 已設定
- [ ] Workers 已重新部署
- [ ] 完整鏈路測試通過

---

## 🎯 **下一步**

完成部署後：

1. ✅ **監控 Proxy 運行**
   ```bash
   tail -f /var/log/postgres-proxy.log
   ```

2. ✅ **測試 Workers 訪問**
   ```bash
   curl https://api.shyangtsuen.xyz/health/db
   ```

3. ✅ **設定自動備份**
   - Cloudflare D1 ← PostgreSQL 雙向同步
   - 參考：`docs/BACKUP-STRATEGY.md`

4. ✅ **啟用監控告警**
   - Cloudflare Analytics
   - NAS Resource Monitor

---

**🎉 完成！你的 NAS PostgreSQL 現在可以安全地從 Cloudflare Workers 訪問了！**
