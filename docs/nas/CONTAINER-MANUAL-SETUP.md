# 🐳 Container Manager 手動創建 PostgreSQL HTTP Proxy

**適用情況**：Container Manager 無法使用「專案」功能
**難度**：⭐⭐ 中等
**推薦度**：⭐⭐⭐⭐⭐ 最穩定可靠

---

## 📊 **前置條件**

你已經成功創建：
- ✅ pgvector/pgvector:pg16 容器（Port 5532）
- ✅ dpage/pgadmin4:latest 容器（Port 8080）

使用相同方式創建 HTTP Proxy 容器！

---

## 🎯 **方案說明**

由於 Container Manager 專案功能不可用，我們使用預構建的 Python 鏡像直接運行腳本。

**優點**：
- ✅ 不需要建置 Docker 鏡像
- ✅ 使用官方 Python 鏡像（穩定可靠）
- ✅ 你已有 Container Manager 使用經驗
- ✅ 容器化運行，易於管理

**缺點**：
- ⚠️ 需要手動配置環境變數
- ⚠️ 每次啟動時安裝 psycopg2（約 10 秒）

---

## 📦 **步驟 1：上傳 Proxy 腳本到 NAS**

### 1.1 登入 File Station

https://stic.tw3.quickconnect.to/

### 1.2 創建目錄並上傳

1. **File Station** → 創建目錄：`/docker/postgres-proxy`
2. 上傳文件：`nas-postgres-proxy.py`

**Mac 文件位置**：
```
/Users/morrislin/Desktop/gac-v1/gac-v1/nas-postgres-proxy.py
```

上傳後路徑應為：
```
/volume1/docker/postgres-proxy/nas-postgres-proxy.py
```

---

## 🐳 **步驟 2：在 Container Manager 創建容器**

### 2.1 下載 Python 鏡像

1. 打開 **Container Manager**
2. **映像** → **新增**
3. **從 Docker Hub 新增**
4. 搜索：`python`
5. 選擇：`python:3.11-slim`
6. 標籤：`latest` 或 `3.11-slim`
7. 點擊 **新增**

等待鏡像下載完成（約 1-2 分鐘）

### 2.2 創建容器

1. **容器** → **新增**
2. 選擇剛下載的 `python:3.11-slim` 鏡像
3. **容器名稱**：`postgres-http-proxy`
4. 點擊 **進階設定**

---

## ⚙️ **步驟 3：配置容器設定**

### 3.1 一般設定

- **容器名稱**：`postgres-http-proxy`
- **啟用自動重新啟動**：✅ 勾選

### 3.2 端口設定

點擊 **端口設定** 標籤：

| 本地端口 | 容器端口 | 類型 |
|---------|---------|------|
| 8000    | 8000    | TCP  |

點擊 **+** 新增端口映射

### 3.3 環境變數

點擊 **環境** 標籤，新增以下環境變數：

| 變數名稱 | 值 |
|---------|---|
| POSTGRES_HOST | 192.168.1.114 |
| POSTGRES_PORT | 5532 |
| POSTGRES_DB | postgres |
| POSTGRES_USER | postgres |
| POSTGRES_PASSWORD | Morris |
| SERVER_PORT | 8000 |
| PROXY_API_KEY | K6udBL4OmPs3J+hOLkjM6MfSatZQW+vXY1vm/o9y0L0= |

**重要**：每個變數都要點擊 **+** 新增

### 3.4 卷（Volume）設定

點擊 **卷** 標籤，新增掛載：

| 文件/文件夾 | 掛載路徑 | 權限 |
|-----------|---------|------|
| /docker/postgres-proxy/nas-postgres-proxy.py | /app/nas-postgres-proxy.py | 只讀 |

或使用完整路徑：
```
/volume1/docker/postgres-proxy/nas-postgres-proxy.py
```

### 3.5 執行命令

點擊 **執行命令** 標籤：

在 **命令** 欄位輸入：
```bash
sh -c "pip install --no-cache-dir psycopg2-binary && python3 /app/nas-postgres-proxy.py"
```

**說明**：
- `pip install psycopg2-binary`：安裝 PostgreSQL 連接庫
- `python3 /app/nas-postgres-proxy.py`：運行 Proxy 腳本

### 3.6 完成創建

1. 檢查所有設定
2. 點擊 **套用**
3. 容器將自動啟動

---

## ✅ **步驟 4：驗證容器運行**

### 4.1 檢查容器狀態

**Container Manager** → **容器**

應該看到：
```
名稱: postgres-http-proxy
狀態: ▶ 運行中
```

### 4.2 查看日誌

1. 點擊 `postgres-http-proxy` 容器
2. **詳細資訊** → **日誌**

**期望看到**：
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
🔍 Health check: http://localhost:8000/health
```

### 4.3 測試健康檢查

在 **Synology DSM 終端機** 或通過 SSH：
```bash
curl http://localhost:8000/health
```

**期望輸出**：
```json
{
  "status": "healthy",
  "database": "connected",
  "host": "192.168.1.114:5532",
  "version": "PostgreSQL 16.x...",
  "pgvector": "available",
  "response_time_ms": 45.32,
  "timestamp": "2025-10-05T..."
}
```

---

## 🔧 **常見問題**

### 問題 1：容器無法啟動

**錯誤訊息**：容器啟動後立即停止

**檢查**：
1. 查看容器日誌（詳細資訊 → 日誌）
2. 確認文件路徑正確：`/volume1/docker/postgres-proxy/nas-postgres-proxy.py`
3. 確認執行命令格式正確

**解決**：
```bash
# 檢查文件是否存在
ls -la /volume1/docker/postgres-proxy/

# 確認文件權限
chmod 644 /volume1/docker/postgres-proxy/nas-postgres-proxy.py
```

### 問題 2：pip install 失敗

**錯誤訊息**：`Could not install psycopg2-binary`

**原因**：網絡問題或鏡像問題

**解決**：
1. 檢查 NAS 網絡連接
2. 更換執行命令：
```bash
sh -c "pip install --no-cache-dir psycopg2-binary -i https://pypi.tuna.tsinghua.edu.cn/simple && python3 /app/nas-postgres-proxy.py"
```

### 問題 3：無法連接到 PostgreSQL

**錯誤訊息**：`Connection refused`

**檢查**：
1. PostgreSQL 容器是否運行
```bash
# Container Manager 確認 pgvector 容器狀態
```

2. 端口是否正確
```bash
# 在 PostgreSQL 容器設定中確認端口映射
# 應該是：5532:5432
```

3. 測試直接連接
```bash
# 在 NAS 上測試
psql -h 192.168.1.114 -p 5532 -U postgres -d postgres
# 或通過 pgAdmin: http://192.168.1.114:8080
```

### 問題 4：文件掛載失敗

**錯誤訊息**：`No such file or directory`

**解決**：
1. 使用完整路徑：`/volume1/docker/postgres-proxy/nas-postgres-proxy.py`
2. 確認文件上傳成功
3. 或者不使用掛載，直接複製文件到容器內（見下方方案 B）

---

## 🔄 **替代方案**

### 方案 B：複製文件到容器內（無需掛載）

如果文件掛載有問題，可以先啟動容器，再複製文件進去：

#### B1. 創建基礎容器

**執行命令** 改為：
```bash
sh -c "pip install --no-cache-dir psycopg2-binary && tail -f /dev/null"
```

這會讓容器保持運行

#### B2. 複製文件到容器

通過 SSH 到 NAS：
```bash
# 複製文件到容器
docker cp /volume1/docker/postgres-proxy/nas-postgres-proxy.py postgres-http-proxy:/app/

# 進入容器
docker exec -it postgres-http-proxy bash

# 運行 Proxy
cd /app
python3 nas-postgres-proxy.py
```

#### B3. 更新容器執行命令

停止容器 → 編輯 → **執行命令** 改為：
```bash
python3 /app/nas-postgres-proxy.py
```

重新啟動容器

---

## 📊 **容器管理**

### 啟動/停止容器

**Container Manager** → **容器** → 選擇 `postgres-http-proxy`
- **啟動**：▶ 按鈕
- **停止**：⏹ 按鈕
- **重新啟動**：🔄 按鈕

### 查看資源使用

**詳細資訊** → **性能**
- CPU 使用率
- 記憶體使用量
- 網絡流量

### 更新配置

1. 停止容器
2. **編輯** → 修改環境變數或其他設定
3. **套用**
4. 啟動容器

---

## 🌐 **下一步：配置 Cloudflare Tunnel**

容器運行成功後，繼續配置 Cloudflare Tunnel：

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

---

## 🧪 **測試完整連接**

```bash
# 等待 DNS 傳播
sleep 30

# 測試 DNS
dig postgres-ai-agent.shyangtsuen.xyz +short

# 測試健康檢查（公開端點）
curl https://postgres-ai-agent.shyangtsuen.xyz/health

# 測試 API（需要 API Key）
curl -H "X-API-Key: K6udBL4OmPs3J+hOLkjM6MfSatZQW+vXY1vm/o9y0L0=" \
  https://postgres-ai-agent.shyangtsuen.xyz/test
```

---

## 📋 **配置摘要**

完成後你的 NAS 將有 3 個容器運行：

| 容器名稱 | 鏡像 | 端口 | 用途 |
|---------|------|------|------|
| pgvector | pgvector/pgvector:pg16 | 5532 | PostgreSQL + pgvector |
| pgadmin4 | dpage/pgadmin4:latest | 8080 | 資料庫管理 UI |
| postgres-http-proxy | python:3.11-slim | 8000 | HTTP Proxy for Tunnel |

**架構**：
```
Cloudflare Tunnel
    ↓
postgres-http-proxy (8000)
    ↓
PostgreSQL pgvector (5532)
```

---

**🎉 完成！你的 PostgreSQL 現在可以通過 Cloudflare Tunnel 安全訪問！**
