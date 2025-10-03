# NAS Container Manager - PostgreSQL 容器設定指南

## 🎯 目標
在 Synology NAS Container Manager 中建立 PostgreSQL 16 + pgvector 容器

---

## 📋 步驟 1: 下載 PostgreSQL + pgvector 映像檔

### 1.1 開啟 Container Manager
1. 登入 Synology NAS DSM
2. 開啟 **Container Manager**
3. 點擊左側 **登錄**

### 1.2 搜尋並下載映像檔
1. 在搜尋欄輸入：`pgvector/pgvector`
2. 找到 **pgvector/pgvector** 官方映像檔
3. 選擇標籤：`pg16` 或 `pg16-latest`
4. 點擊 **下載**

---

## 📋 步驟 2: 建立 PostgreSQL 容器

### 2.1 從映像檔建立容器
1. 下載完成後，點擊左側 **映像**
2. 找到 `pgvector/pgvector:pg16`
3. 點擊 **執行**

### 2.2 一般設定
```
容器名稱: postgres-ai-agent
```

- ✅ 勾選「啟用自動重新啟動」

點擊 **進階設定**

---

## 📋 步驟 3: 進階設定

### 3.1 進階設定 → 連接埠設定

**手動建立連接埠對應：**

| 本機連接埠 | 容器連接埠 | 類型 |
|-----------|-----------|------|
| 5432      | 5432      | TCP  |

- 點擊 **+** 新增
- 本機連接埠：`5432`
- 容器連接埠：`5432`
- 類型：`TCP`

### 3.2 進階設定 → 儲存空間設定

**新增資料夾掛載：**

1. 點擊 **新增資料夾**
2. 建立新資料夾：

```
資料夾路徑: /docker/postgres-ai-agent
掛載路徑: /var/lib/postgresql/data
```

| 檔案/資料夾 | 掛載路徑 | 權限 |
|------------|---------|------|
| docker/postgres-ai-agent | /var/lib/postgresql/data | 讀寫 |

### 3.3 進階設定 → 環境

**新增環境變數：**

點擊 **+** 新增以下環境變數：

| 變數名稱 | 值 |
|---------|-----|
| POSTGRES_USER | postgres |
| POSTGRES_PASSWORD | Morris1230 |
| POSTGRES_DB | postgres |
| POSTGRES_HOST_AUTH_METHOD | md5 |
| POSTGRES_INITDB_ARGS | --encoding=UTF8 --lc-collate=en_US.UTF-8 --lc-ctype=en_US.UTF-8 |

**重要說明：**
- `POSTGRES_PASSWORD`: 設定超級使用者密碼（請記住此密碼）
- `POSTGRES_USER`: 超級使用者名稱（預設 postgres）
- `POSTGRES_DB`: 預設建立的資料庫

### 3.4 進階設定 → 資源限制 (可選)

建議設定：
```
CPU 優先順序: 中
記憶體限制: 2048 MB (2GB)
```

---

## 📋 步驟 4: 啟動容器

1. 確認所有設定
2. 點擊 **完成**
3. 容器會自動啟動

### 4.1 檢查容器狀態
1. 在 Container Manager 中查看 **容器** 列表
2. 確認 `postgres-ai-agent` 狀態為 **執行中**
3. 查看日誌（點擊容器 → **詳細資料** → **日誌**）

**預期日誌：**
```
PostgreSQL init process complete; ready for start up.
LOG:  database system is ready to accept connections
```

---

## 📋 步驟 5: 設定 pgAdmin4 容器（可選但推薦）

### 5.1 下載 pgAdmin4 映像檔
1. 在 **登錄** 中搜尋：`dpage/pgadmin4`
2. 選擇標籤：`latest`
3. 點擊 **下載**

### 5.2 建立 pgAdmin4 容器

**一般設定：**
```
容器名稱: pgadmin4-ai-agent
```

**連接埠設定：**
| 本機連接埠 | 容器連接埠 | 類型 |
|-----------|-----------|------|
| 8080      | 80        | TCP  |

**環境變數：**
| 變數名稱 | 值 |
|---------|-----|
| PGADMIN_DEFAULT_EMAIL | admin@example.com |
| PGADMIN_DEFAULT_PASSWORD | Morris1230 |

**儲存空間：**
```
資料夾路徑: /docker/pgadmin4-ai-agent
掛載路徑: /var/lib/pgadmin
```

### 5.3 啟動 pgAdmin4
1. 啟動容器
2. 開啟瀏覽器：`http://192.168.1.114:8080`
3. 使用設定的帳號密碼登入

---

## 📋 步驟 6: 測試 PostgreSQL 連線

### 6.1 從 NAS 內部測試

**方法 1: 使用終端機**
```bash
# SSH 連線到 NAS
ssh admin@192.168.1.114

# 進入 PostgreSQL 容器
docker exec -it postgres-ai-agent psql -U postgres

# 測試 pgvector
postgres=# SELECT version();
postgres=# CREATE EXTENSION IF NOT EXISTS vector;
postgres=# SELECT extversion FROM pg_extension WHERE extname = 'vector';
postgres=# \q
```

**方法 2: 使用 pgAdmin4**
1. 開啟 `http://192.168.1.114:8080`
2. 登入 pgAdmin4
3. 新增 Server：
   - Host: `postgres-ai-agent` (容器名稱) 或 `192.168.1.114`
   - Port: `5432`
   - Username: `postgres`
   - Password: `Morris1230`

### 6.2 從外部測試

使用任何 PostgreSQL 客戶端工具：
```
Host: 192.168.1.114
Port: 5432
Database: postgres
Username: postgres
Password: Morris1230
```

---

## 📋 步驟 7: 設定防火牆 (重要)

### 7.1 NAS 防火牆設定
1. **控制台** → **安全性** → **防火牆**
2. 選擇使用中的防火牆設定檔
3. 點擊 **編輯規則**
4. 新增規則：

```
來源 IP: 所有 (或限制特定 IP)
連接埠: 5432
動作: 允許
通訊協定: TCP
```

### 7.2 路由器 Port Forwarding (如需外網存取)

**⚠️ 安全警告：**
- 不建議將資料庫直接暴露到公網
- 建議使用 VPN 或 Cloudflare Tunnel
- 如果必須開放，請設定強密碼和 IP 白名單

---

## ✅ 完成檢查清單

- [ ] PostgreSQL 容器建立成功
- [ ] 容器狀態為「執行中」
- [ ] Port 5432 已開放
- [ ] 資料夾掛載設定正確
- [ ] 環境變數設定正確
- [ ] 可以從內部連線到資料庫
- [ ] pgvector 擴充可用
- [ ] pgAdmin4 容器建立成功（可選）
- [ ] 防火牆規則已設定

---

## 🔧 容器設定摘要（快速參考）

### PostgreSQL 容器
```yaml
容器名稱: postgres-ai-agent
映像檔: pgvector/pgvector:pg16
連接埠: 5432:5432
環境變數:
  - POSTGRES_USER=postgres
  - POSTGRES_PASSWORD=Morris1230
  - POSTGRES_DB=postgres
  - POSTGRES_HOST_AUTH_METHOD=md5
掛載:
  - /docker/postgres-ai-agent:/var/lib/postgresql/data
資源:
  - 記憶體: 2GB
自動重啟: ✅
```

### pgAdmin4 容器
```yaml
容器名稱: pgadmin4-ai-agent
映像檔: dpage/pgadmin4:latest
連接埠: 8080:80
環境變數:
  - PGADMIN_DEFAULT_EMAIL=admin@example.com
  - PGADMIN_DEFAULT_PASSWORD=Morris1230
掛載:
  - /docker/pgadmin4-ai-agent:/var/lib/pgadmin
自動重啟: ✅
```

---

## 🚨 常見問題

### Q1: 容器無法啟動
- 檢查 Port 5432 是否被佔用
- 查看容器日誌找錯誤訊息
- 確認掛載資料夾有寫入權限

### Q2: 無法從外部連線
- 確認防火牆 Port 5432 已開放
- 檢查 NAS 防火牆設定
- 確認環境變數 POSTGRES_HOST_AUTH_METHOD=md5

### Q3: pgvector 不可用
- 確認使用 `pgvector/pgvector:pg16` 映像檔
- 不是官方 `postgres:16` 映像檔

### Q4: 資料持久化問題
- 確認掛載路徑正確：`/var/lib/postgresql/data`
- 檢查 NAS 儲存空間是否足夠

---

## 📞 下一步

容器建立完成後，請執行：
1. **測試連線** - 確認可以連線到資料庫
2. **建立資料庫** - 執行 `postgres-setup.sql`
3. **建立資料表** - 執行 `postgres-schema.sql`

請告知容器建立狀態，我繼續協助下一步！
