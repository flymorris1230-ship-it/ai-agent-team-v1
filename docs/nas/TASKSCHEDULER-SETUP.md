# ⏰ Task Scheduler 部署 PostgreSQL HTTP Proxy

**適用情況**：Container Manager 無法使用，或偏好簡單部署
**難度**：⭐ 簡單
**推薦度**：⭐⭐⭐⭐ 最快速部署

---

## 📊 **方案說明**

不使用 Docker，直接在 NAS 上運行 Python 腳本。

**優點**：
- ✅ 最簡單快速
- ✅ 不依賴 Docker
- ✅ 資源占用最少
- ✅ 易於調試和修改

**缺點**：
- ⚠️ 需要在 NAS 上安裝 Python 和依賴
- ⚠️ 較少隔離性（與系統共享環境）

---

## 🎯 **前置條件**

- ✅ NAS 可以通過 QuickConnect 訪問
- ✅ 有 sudo 權限（admin 帳號）
- ✅ 可以啟用 SSH 或使用 DSM 終端機

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

上傳後路徑：
```
/volume1/docker/postgres-proxy/nas-postgres-proxy.py
```

---

## 🐍 **步驟 2：安裝 Python 和依賴**

### 選項 A：通過 SSH（推薦）

#### A1. 啟用 SSH

1. **DSM 控制台** → **終端機和 SNMP**
2. ✅ 勾選 **啟用 SSH 服務**
3. 端口：`22`
4. 點擊 **套用**

#### A2. SSH 連接到 NAS

從 Mac 連接（如果可以，嘗試從同一網段的設備）：
```bash
# 嘗試 SSH 連接
ssh admin@192.168.1.114

# 如果無法連接，嘗試通過 QuickConnect 域名
ssh admin@stic.tw3.quickconnect.to
```

#### A3. 安裝依賴

```bash
# 切換到 root
sudo -i

# 檢查 Python 版本
python3 --version
# 應該看到 Python 3.x

# 安裝 pip（如果沒有）
wget https://bootstrap.pypa.io/get-pip.py
python3 get-pip.py

# 安裝 psycopg2
pip3 install psycopg2-binary

# 驗證安裝
python3 -c "import psycopg2; print('✅ psycopg2 installed successfully')"
```

### 選項 B：通過 Package Center（更簡單）

#### B1. 安裝 Python 套件

1. **套件中心** → 搜索 **Python**
2. 安裝 **Python 3** 套件
3. 等待安裝完成

#### B2. 通過 Task Scheduler 安裝依賴

創建一次性任務安裝 psycopg2（見步驟 3）

---

## ⏰ **步驟 3：創建 Task Scheduler 任務**

### 3.1 創建環境變數文件

先通過 File Station 創建 `.env` 文件：

**位置**：`/volume1/docker/postgres-proxy/.env`

**內容**：
```bash
POSTGRES_HOST=192.168.1.114
POSTGRES_PORT=5532
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=Morris
SERVER_PORT=8000
PROXY_API_KEY=K6udBL4OmPs3J+hOLkjM6MfSatZQW+vXY1vm/o9y0L0=
```

### 3.2 創建啟動任務

1. **DSM 控制台** → **任務排程器**
2. **新增** → **觸發的任務** → **用戶定義的腳本**

#### 一般設定

- **任務名稱**：`PostgreSQL HTTP Proxy`
- **使用者**：`root`
- ✅ **啟用**

#### 排程

- 選擇：**開機時**（容器啟動時自動運行）
- 或選擇：**每日** 00:00（如果需要定時重啟）

#### 任務設定

**腳本類型**：用戶定義的腳本

**執行命令**（方案 A - 已安裝 psycopg2）：
```bash
#!/bin/bash

# 設定工作目錄
cd /volume1/docker/postgres-proxy

# 加載環境變數
export $(cat .env | grep -v '^#' | xargs)

# 啟動 Proxy（輸出到日誌）
/usr/bin/python3 nas-postgres-proxy.py > /var/log/postgres-proxy.log 2>&1
```

**執行命令**（方案 B - 每次啟動時安裝 psycopg2）：
```bash
#!/bin/bash

# 安裝依賴（如果尚未安裝）
pip3 install --quiet psycopg2-binary

# 設定工作目錄
cd /volume1/docker/postgres-proxy

# 加載環境變數
export $(cat .env | grep -v '^#' | xargs)

# 啟動 Proxy
/usr/bin/python3 nas-postgres-proxy.py > /var/log/postgres-proxy.log 2>&1
```

### 3.3 保存並測試

1. 點擊 **確定** 保存任務
2. 右鍵任務 → **執行** 立即測試
3. 等待 10-15 秒

---

## ✅ **步驟 4：驗證 Proxy 運行**

### 4.1 檢查進程

通過 SSH 或 DSM 終端機：
```bash
# 檢查 Python 進程
ps aux | grep nas-postgres-proxy

# 應該看到：
# root ... python3 nas-postgres-proxy.py
```

### 4.2 檢查端口

```bash
# 檢查 8000 端口是否監聽
netstat -tulpn | grep 8000

# 應該看到：
# tcp 0 0 0.0.0.0:8000 0.0.0.0:* LISTEN 12345/python3
```

### 4.3 查看日誌

```bash
# 查看 Proxy 日誌
tail -f /var/log/postgres-proxy.log
```

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
```

### 4.4 測試健康檢查

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
  "response_time_ms": 45.32
}
```

---

## 🔧 **常見問題**

### 問題 1：Task Scheduler 任務沒有運行

**檢查**：
1. 確認任務已啟用（✅ 勾選）
2. 查看任務歷史記錄：
   - Task Scheduler → 選擇任務 → **動作** → **查看結果**

**解決**：
```bash
# 手動測試腳本
cd /volume1/docker/postgres-proxy
export $(cat .env | xargs)
python3 nas-postgres-proxy.py
```

### 問題 2：psycopg2 導入失敗

**錯誤訊息**：`ModuleNotFoundError: No module named 'psycopg2'`

**解決**：
```bash
# 確認 pip 安裝位置
which pip3

# 安裝 psycopg2
sudo pip3 install psycopg2-binary

# 或使用完整路徑
sudo /usr/local/bin/pip3 install psycopg2-binary

# 驗證
python3 -c "import psycopg2; print('OK')"
```

### 問題 3：端口 8000 已被佔用

**錯誤訊息**：`Address already in use`

**檢查**：
```bash
# 找到佔用端口的進程
netstat -tulpn | grep 8000
lsof -i :8000

# 如果是舊的 Proxy 進程，停止它
kill -9 <PID>
```

**或更改端口**：
修改 `.env` 文件：
```bash
SERVER_PORT=8001
```

同時更新 Cloudflare Tunnel Public Hostname URL 為 `http://192.168.1.114:8001`

### 問題 4：權限錯誤

**錯誤訊息**：`Permission denied`

**解決**：
```bash
# 檢查文件權限
ls -la /volume1/docker/postgres-proxy/

# 設定正確權限
chmod 644 /volume1/docker/postgres-proxy/nas-postgres-proxy.py
chmod 644 /volume1/docker/postgres-proxy/.env
```

---

## 🔄 **管理 Proxy 服務**

### 停止 Proxy

```bash
# 找到進程 ID
ps aux | grep nas-postgres-proxy

# 停止進程
kill <PID>

# 或強制停止
pkill -f nas-postgres-proxy
```

### 重啟 Proxy

```bash
# 停止
pkill -f nas-postgres-proxy

# 重新執行 Task Scheduler 任務
# 或手動啟動：
cd /volume1/docker/postgres-proxy
export $(cat .env | xargs)
nohup python3 nas-postgres-proxy.py > /var/log/postgres-proxy.log 2>&1 &
```

### 查看日誌

```bash
# 實時查看
tail -f /var/log/postgres-proxy.log

# 查看最近 100 行
tail -n 100 /var/log/postgres-proxy.log

# 搜索錯誤
grep -i error /var/log/postgres-proxy.log
```

---

## 📊 **自動化腳本**

創建管理腳本以便操作：

### 創建啟動腳本

**File Station** → `/volume1/docker/postgres-proxy/start-proxy.sh`

```bash
#!/bin/bash

cd /volume1/docker/postgres-proxy
export $(cat .env | grep -v '^#' | xargs)

# 檢查是否已運行
if pgrep -f nas-postgres-proxy.py > /dev/null; then
    echo "❌ Proxy 已在運行"
    exit 1
fi

# 啟動 Proxy
echo "🚀 啟動 PostgreSQL HTTP Proxy..."
nohup python3 nas-postgres-proxy.py > /var/log/postgres-proxy.log 2>&1 &

sleep 2

# 檢查狀態
if pgrep -f nas-postgres-proxy.py > /dev/null; then
    echo "✅ Proxy 啟動成功"
    echo "📡 端口: 8000"
    echo "📝 日誌: tail -f /var/log/postgres-proxy.log"
else
    echo "❌ Proxy 啟動失敗"
    exit 1
fi
```

### 創建停止腳本

**File Station** → `/volume1/docker/postgres-proxy/stop-proxy.sh`

```bash
#!/bin/bash

echo "🛑 停止 PostgreSQL HTTP Proxy..."

if pgrep -f nas-postgres-proxy.py > /dev/null; then
    pkill -f nas-postgres-proxy.py
    sleep 1
    echo "✅ Proxy 已停止"
else
    echo "⚠️ Proxy 未運行"
fi
```

### 設定執行權限

```bash
chmod +x /volume1/docker/postgres-proxy/start-proxy.sh
chmod +x /volume1/docker/postgres-proxy/stop-proxy.sh
```

### 使用

```bash
# 啟動
/volume1/docker/postgres-proxy/start-proxy.sh

# 停止
/volume1/docker/postgres-proxy/stop-proxy.sh
```

---

## 🌐 **下一步：配置 Cloudflare Tunnel**

Proxy 運行成功後，配置 Cloudflare Tunnel：

1. https://one.dash.cloudflare.com/
2. **Zero Trust** → **Networks** → **Tunnels**
3. 選擇 `stic-nas`
4. **Public Hostname** → **Add a public hostname**

**配置**：
- **Subdomain**: `postgres-ai-agent`
- **Domain**: `shyangtsuen.xyz`
- **Type**: `HTTP`
- **URL**: `http://192.168.1.114:8000`

---

## 🧪 **測試完整連接**

```bash
# 本地測試
curl http://192.168.1.114:8000/health

# 等待 DNS 傳播
sleep 30

# 外部測試
curl https://postgres-ai-agent.shyangtsuen.xyz/health
```

---

## 📋 **部署摘要**

**文件結構**：
```
/volume1/docker/postgres-proxy/
├── nas-postgres-proxy.py      ← Python Proxy 腳本
├── .env                        ← 環境變數配置
├── start-proxy.sh             ← 啟動腳本（可選）
└── stop-proxy.sh              ← 停止腳本（可選）
```

**Task Scheduler 任務**：
- 名稱：PostgreSQL HTTP Proxy
- 觸發：開機時
- 使用者：root
- 日誌：/var/log/postgres-proxy.log

**端口**：
- HTTP Proxy: 8000

**監控**：
```bash
# 檢查狀態
ps aux | grep nas-postgres-proxy

# 查看日誌
tail -f /var/log/postgres-proxy.log

# 測試健康
curl http://localhost:8000/health
```

---

**🎉 完成！使用 Task Scheduler 方案，Proxy 將在 NAS 開機時自動啟動！**
