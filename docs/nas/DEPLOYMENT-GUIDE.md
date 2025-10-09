# 📚 NAS PostgreSQL HTTP Proxy 部署指南總覽

**目標**：在 Synology NAS 上部署 PostgreSQL HTTP Proxy，連接到 Cloudflare Tunnel

---

## 🎯 **快速開始**

根據你的情況選擇最適合的部署方案：

### ✅ **情況 1：Container Manager 可以創建容器**
→ **使用方案 A**：[Container Manager 手動創建](./NAS-CONTAINER-MANUAL-SETUP.md)
- 最穩定可靠
- 你已有使用經驗（pgvector, pgadmin4）
- 容器化管理

### ✅ **情況 2：Container Manager 專案功能不可用**
→ **使用方案 A**：[Container Manager 手動創建](./NAS-CONTAINER-MANUAL-SETUP.md)
- 不需要 Docker Compose
- 直接通過 UI 配置

### ✅ **情況 3：想要最簡單的部署**
→ **使用方案 B**：[Task Scheduler](./NAS-TASKSCHEDULER-SETUP.md)
- 不使用 Docker
- 最快速部署
- 最少資源占用

### ✅ **情況 4：Container Manager 專案功能可用**
→ **使用方案 C**：[Docker Compose](./NAS-QUICK-DEPLOY.md)
- 自動化部署
- 最完整的容器管理

---

## 📊 **方案對比**

### **方案 A：Container Manager 手動創建**

**文件**：[NAS-CONTAINER-MANUAL-SETUP.md](./NAS-CONTAINER-MANUAL-SETUP.md)

**優點**：
- ✅ 最穩定可靠
- ✅ 你已有 Docker 容器使用經驗
- ✅ 容器化運行，易於管理
- ✅ 不需要 SSH 訪問
- ✅ 不需要 Docker Compose 專案功能

**缺點**：
- ⚠️ 需要手動配置較多設定
- ⚠️ 每次啟動時安裝 psycopg2（約 10 秒）

**適合**：
- 已經成功創建過 pgvector 和 pgadmin4 容器
- 熟悉 Container Manager UI
- Container Manager 專案功能不可用

**部署時間**：約 15 分鐘

---

### **方案 B：Task Scheduler**

**文件**：[NAS-TASKSCHEDULER-SETUP.md](./NAS-TASKSCHEDULER-SETUP.md)

**優點**：
- ✅ 最簡單快速
- ✅ 不依賴 Docker
- ✅ 資源占用最少
- ✅ 易於調試和修改
- ✅ 開機自動啟動

**缺點**：
- ⚠️ 需要安裝 Python 和依賴
- ⚠️ 較少隔離性
- ⚠️ 需要 SSH 訪問（安裝依賴時）

**適合**：
- 想要快速部署
- Container Manager 完全無法使用
- 已有 Python 環境

**部署時間**：約 10 分鐘（如果 Python 已安裝）

---

### **方案 C：Docker Compose（專案）**

**文件**：[NAS-QUICK-DEPLOY.md](./NAS-QUICK-DEPLOY.md)

**優點**：
- ✅ 自動化部署
- ✅ 配置文件化管理
- ✅ 完整的容器管理

**缺點**：
- ⚠️ 需要 Container Manager 專案功能
- ⚠️ 部分 NAS 型號不支持

**適合**：
- Container Manager 專案功能可用
- 熟悉 Docker Compose

**部署時間**：約 10 分鐘

---

## 📋 **部署步驟概覽**

### **方案 A：Container Manager 手動創建**

1. 上傳 `nas-postgres-proxy.py` 到 NAS
2. Container Manager → 下載 `python:3.11-slim` 鏡像
3. 創建容器，配置：
   - 端口：8000:8000
   - 環境變數：PostgreSQL 連接資訊
   - 掛載：proxy 腳本文件
   - 執行命令：安裝 psycopg2 並運行
4. 啟動容器
5. 驗證：`curl http://localhost:8000/health`

**詳細步驟**：[NAS-CONTAINER-MANUAL-SETUP.md](./NAS-CONTAINER-MANUAL-SETUP.md)

---

### **方案 B：Task Scheduler**

1. 上傳 `nas-postgres-proxy.py` 到 NAS
2. 啟用 SSH，安裝 Python 依賴：
   ```bash
   sudo pip3 install psycopg2-binary
   ```
3. 創建 `.env` 環境變數文件
4. Task Scheduler → 創建開機任務
5. 執行任務
6. 驗證：`curl http://localhost:8000/health`

**詳細步驟**：[NAS-TASKSCHEDULER-SETUP.md](./NAS-TASKSCHEDULER-SETUP.md)

---

### **方案 C：Docker Compose**

1. 上傳所有文件到 NAS
2. Container Manager → 專案 → 新增
3. 選擇專案目錄
4. 建置並啟動
5. 驗證：`curl http://localhost:8000/health`

**詳細步驟**：[NAS-QUICK-DEPLOY.md](./NAS-QUICK-DEPLOY.md)

---

## 🛠️ **輔助工具**

### **安裝依賴腳本**（方案 B 使用）

**文件**：`install-python-deps.sh`

自動安裝 Python 和 psycopg2 依賴：

```bash
# 上傳到 NAS 並執行
chmod +x install-python-deps.sh
sudo ./install-python-deps.sh
```

### **測試腳本**

**文件**：`test-proxy.sh`

測試 Proxy 運行狀態：

```bash
# 測試本地連接
./test-proxy.sh local

# 測試遠程連接（Cloudflare Tunnel）
./test-proxy.sh remote

# 測試所有
./test-proxy.sh all
```

---

## 📦 **所需文件清單**

所有文件位於你的 Mac：
```
/Users/morrislin/Desktop/gac-v1/gac-v1/
```

### **核心文件**（所有方案都需要）

| 文件 | 用途 | 上傳到 NAS 路徑 |
|------|------|-----------------|
| `nas-postgres-proxy.py` | HTTP Proxy 主程序 | `/volume1/docker/postgres-proxy/` |

### **方案 A 額外文件**

| 文件 | 用途 |
|------|------|
| - | 僅需要 proxy 腳本 |

### **方案 B 額外文件**

| 文件 | 用途 | 上傳到 NAS 路徑 |
|------|------|-----------------|
| `nas-proxy.env` → `.env` | 環境變數配置 | `/volume1/docker/postgres-proxy/` |
| `install-python-deps.sh` | 依賴安裝腳本（可選） | `/volume1/docker/postgres-proxy/` |

### **方案 C 額外文件**

| 文件 | 用途 | 上傳到 NAS 路徑 |
|------|------|-----------------|
| `Dockerfile.proxy` → `Dockerfile` | Docker 鏡像定義 | `/volume1/docker/postgres-proxy/` |
| `docker-compose.proxy.yml` → `docker-compose.yml` | Docker Compose 配置 | `/volume1/docker/postgres-proxy/` |

### **測試工具**（可選）

| 文件 | 用途 | 上傳到 NAS 路徑 |
|------|------|-----------------|
| `test-proxy.sh` | 自動化測試腳本 | `/volume1/docker/postgres-proxy/` |

---

## 🌐 **部署後步驟（所有方案相同）**

### **1. 驗證 Proxy 運行**

```bash
# 在 NAS 上測試
curl http://localhost:8000/health

# 期望輸出
{
  "status": "healthy",
  "database": "connected",
  "host": "192.168.1.114:5532",
  "pgvector": "available"
}
```

### **2. 配置 Cloudflare Tunnel**

1. https://one.dash.cloudflare.com/
2. **Zero Trust** → **Networks** → **Tunnels**
3. 選擇 `stic-nas`
4. **Public Hostname** → **Add a public hostname**

**配置**：
- **Subdomain**: `postgres-ai-agent`
- **Domain**: `shyangtsuen.xyz`
- **Type**: `HTTP`
- **URL**: `http://192.168.1.114:8000`

### **3. 測試遠程連接**

```bash
# 等待 DNS 傳播
sleep 30

# 測試健康檢查
curl https://postgres-ai-agent.shyangtsuen.xyz/health
```

### **4. 配置 Cloudflare Workers**

```bash
# 設定 Proxy URL
echo "https://postgres-ai-agent.shyangtsuen.xyz" | \
  npx wrangler secret put POSTGRES_PROXY_URL --env production

# 設定 API Key
echo "K6udBL4OmPs3J+hOLkjM6MfSatZQW+vXY1vm/o9y0L0=" | \
  npx wrangler secret put POSTGRES_PROXY_API_KEY --env production

# 重新部署
npm run deploy:production
```

---

## 🔐 **重要配置資訊**

### **PostgreSQL 連接**
```
Host: 192.168.1.114
Port: 5532
Database: postgres
User: postgres
Password: Morris
```

### **HTTP Proxy**
```
Port: 8000
API Key: K6udBL4OmPs3J+hOLkjM6MfSatZQW+vXY1vm/o9y0L0=
```

### **Cloudflare Tunnel**
```
Tunnel ID: e41b8baa-f28e-4aef-b4cd-32b3d2bf88f2
Domain: postgres-ai-agent.shyangtsuen.xyz
```

---

## 🆘 **故障排除**

### **問題：Container Manager 無法創建容器**
→ 使用方案 B（Task Scheduler）

### **問題：無法 SSH 到 NAS**
→ 使用方案 A（Container Manager）或啟用 SSH：
- DSM 控制台 → 終端機和 SNMP → 啟用 SSH

### **問題：psycopg2 安裝失敗**
→ 使用 Container Manager 方案（Docker 自動安裝）

### **問題：端口 8000 被佔用**
→ 更改端口：
- 修改環境變數 `SERVER_PORT=8001`
- 更新 Cloudflare Tunnel URL 為 `http://192.168.1.114:8001`

### **問題：無法連接到 PostgreSQL**
→ 檢查：
1. PostgreSQL 容器是否運行
2. 端口映射是否正確（5532:5432）
3. 密碼是否正確（Morris）

---

## 📊 **完整架構**

```
┌────────────────────────────────────────────┐
│ Cloudflare Workers (Production)            │
│ api.shyangtsuen.xyz                        │
└──────────────┬─────────────────────────────┘
               │ HTTPS + API Key Auth
               ↓
┌────────────────────────────────────────────┐
│ Cloudflare Tunnel                          │
│ postgres-ai-agent.shyangtsuen.xyz          │
└──────────────┬─────────────────────────────┘
               │ Encrypted Tunnel
               ↓
┌────────────────────────────────────────────┐
│ NAS: 192.168.1.114                         │
├────────────────────────────────────────────┤
│ PostgreSQL HTTP Proxy (Port 8000)          │
│ ├─ 方案 A: Docker Container                │
│ ├─ 方案 B: Python Process (Task Scheduler) │
│ └─ 方案 C: Docker Compose                  │
│    ↓ psycopg2                              │
│                                            │
│ PostgreSQL + pgvector (Port 5532)          │
│ Container: pgvector/pgvector:pg16          │
│                                            │
│ pgAdmin4 (Port 8080)                       │
│ Container: dpage/pgadmin4:latest           │
└────────────────────────────────────────────┘
```

---

## 🎯 **推薦流程**

1. **首先嘗試**：方案 A（Container Manager 手動創建）
   - 你已有 Docker 容器使用經驗
   - 最穩定可靠

2. **如果方案 A 遇到困難**：方案 B（Task Scheduler）
   - 最簡單快速
   - 不依賴 Docker

3. **如果專案功能可用**：方案 C（Docker Compose）
   - 自動化部署

---

## 📚 **詳細文檔**

- **方案 A**：[NAS-CONTAINER-MANUAL-SETUP.md](./NAS-CONTAINER-MANUAL-SETUP.md)
- **方案 B**：[NAS-TASKSCHEDULER-SETUP.md](./NAS-TASKSCHEDULER-SETUP.md)
- **方案 C**：[NAS-QUICK-DEPLOY.md](./NAS-QUICK-DEPLOY.md)
- **Cloudflare Tunnel 設定**：[CLOUDFLARE-TUNNEL-COMPLETE-SETUP.md](./CLOUDFLARE-TUNNEL-COMPLETE-SETUP.md)
- **診斷指南**：[CLOUDFLARE-TUNNEL-DIAGNOSIS.md](./CLOUDFLARE-TUNNEL-DIAGNOSIS.md)

---

**🚀 選擇你的方案，開始部署！**
