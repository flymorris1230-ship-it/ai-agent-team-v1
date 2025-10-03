# PostgreSQL HTTP Proxy 部署指南

## 📋 前置需求

- NAS 已安裝 Docker 和 Docker Compose
- PostgreSQL 已運行在 port 5532
- pgvector 擴展已啟用
- SSH 訪問權限

## 🚀 快速部署

### 步驟 1: 連接到 NAS

```bash
# SSH 連接到 NAS
ssh your-user@192.168.1.114
```

### 步驟 2: 創建專案目錄

```bash
# 創建 proxy 目錄
sudo mkdir -p /volume1/docker/postgres-proxy
cd /volume1/docker/postgres-proxy
```

### 步驟 3: 上傳文件

將以下文件從專案複製到 NAS：

```bash
# 在本地執行 (從專案根目錄)
scp src/main/python/postgres_proxy.py your-user@192.168.1.114:/volume1/docker/postgres-proxy/
scp src/main/python/requirements.txt your-user@192.168.1.114:/volume1/docker/postgres-proxy/
scp src/main/python/Dockerfile your-user@192.168.1.114:/volume1/docker/postgres-proxy/
scp src/main/python/docker-compose.yml your-user@192.168.1.114:/volume1/docker/postgres-proxy/
```

### 步驟 4: 配置環境變數

```bash
# 在 NAS 上創建 .env 文件
cd /volume1/docker/postgres-proxy

cat > .env << 'EOF'
POSTGRES_HOST=192.168.1.114
POSTGRES_PORT=5532
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=Morris1230
PROXY_API_KEY=your-secure-api-key-change-this
EOF

# 設置安全權限
chmod 600 .env
```

### 步驟 5: 啟動 Proxy 服務

```bash
# 構建並啟動容器
docker-compose up -d --build

# 查看日誌
docker-compose logs -f postgres-proxy
```

### 步驟 6: 驗證部署

```bash
# 測試健康檢查
curl http://192.168.1.114:8000/health

# 測試 pgvector 狀態
curl -H "X-API-Key: your-secure-api-key-change-this" \
     http://192.168.1.114:8000/pgvector/status
```

## 🔍 部署驗證

### 1. 檢查容器狀態

```bash
docker ps | grep postgres-proxy
```

預期輸出：
```
CONTAINER ID   IMAGE                    STATUS         PORTS
xxxxx          postgres-proxy:latest    Up 2 minutes   0.0.0.0:8000->8000/tcp
```

### 2. 測試 API 端點

```bash
# 健康檢查
curl http://192.168.1.114:8000/health

# 預期輸出:
# {
#   "status": "healthy",
#   "database": "connected",
#   "timestamp": "2025-10-03T..."
# }
```

### 3. 測試向量搜索

```bash
curl -X POST http://192.168.1.114:8000/vector-search \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secure-api-key-change-this" \
  -d '{
    "table": "document_chunks",
    "embedding": [0.1, 0.2, 0.3],
    "limit": 5,
    "threshold": 0.7,
    "metric": "cosine"
  }'
```

## 🔧 故障排除

### 問題 1: 容器無法啟動

```bash
# 查看詳細日誌
docker-compose logs postgres-proxy

# 檢查 PostgreSQL 連接
docker exec postgres-proxy python -c "
import psycopg2
conn = psycopg2.connect(
    host='192.168.1.114',
    port=5532,
    database='postgres',
    user='postgres',
    password='Morris1230'
)
print('PostgreSQL 連接成功！')
conn.close()
"
```

### 問題 2: API 返回 401 錯誤

檢查 API Key 是否正確：

```bash
# 查看當前環境變數
docker exec postgres-proxy env | grep PROXY_API_KEY
```

### 問題 3: pgvector 不可用

```bash
# 在 PostgreSQL 容器中啟用 pgvector
docker exec postgres-container psql -U postgres -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

## 📊 監控與維護

### 查看實時日誌

```bash
docker-compose logs -f postgres-proxy
```

### 重啟服務

```bash
docker-compose restart postgres-proxy
```

### 更新服務

```bash
# 拉取最新代碼
cd /volume1/docker/postgres-proxy

# 重新構建並重啟
docker-compose down
docker-compose up -d --build
```

### 性能監控

```bash
# 查看容器資源使用
docker stats postgres-proxy
```

## 🔐 安全建議

1. **更改默認 API Key**
   ```bash
   # 生成隨機 API Key
   openssl rand -hex 32

   # 更新 .env 文件
   nano .env
   ```

2. **限制訪問 IP**

   在 `docker-compose.yml` 中添加：
   ```yaml
   ports:
     - "127.0.0.1:8000:8000"  # 只允許本地訪問
   ```

3. **使用 HTTPS**

   建議使用 Nginx 反向代理添加 SSL。

## 📝 配置文件位置

- 應用代碼: `/volume1/docker/postgres-proxy/postgres_proxy.py`
- 環境變數: `/volume1/docker/postgres-proxy/.env`
- Docker 配置: `/volume1/docker/postgres-proxy/docker-compose.yml`
- 日誌: `docker-compose logs postgres-proxy`

## 🔄 自動重啟

確保容器在 NAS 重啟後自動啟動：

```yaml
# docker-compose.yml 中已配置
restart: unless-stopped
```

## ✅ 部署檢查清單

- [ ] SSH 連接到 NAS
- [ ] 創建專案目錄
- [ ] 上傳所有必要文件
- [ ] 配置環境變數
- [ ] 構建並啟動容器
- [ ] 驗證健康檢查端點
- [ ] 測試 pgvector 功能
- [ ] 配置防火牆（如需要）
- [ ] 設置監控告警
- [ ] 記錄 API Key 到密碼管理器
