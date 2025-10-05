# Factory OS 整合快速入門

## 🚀 5 分鐘快速啟動

### 步驟 1: 配置環境變數

#### 選項 A: 本地開發 (Cloudflare Workers)

```bash
# 複製模板
cp .dev.vars.example .dev.vars

# 編輯配置
nano .dev.vars
```

填入以下內容：
```bash
FACTORY_OS_URL="http://localhost:3001"
FACTORY_OS_API_KEY="dev-test-key-12345"
```

#### 選項 B: Node.js 腳本測試

```bash
# 編輯 .env 文件（已配置）
# 確認以下變數存在：
FACTORY_OS_URL=http://localhost:3001
FACTORY_OS_API_KEY=dev-test-key-12345
```

### 步驟 2: 啟動 Factory OS

```bash
# 在 Factory OS 專案目錄中
cd /path/to/genesis-factory-os
npm run dev
# 確認運行在 http://localhost:3001
```

### 步驟 3: 測試整合

#### 方法 1: 運行測試腳本

```bash
npx tsx scripts/test-factory-os-integration.ts
```

**預期輸出：**
```
╔═══════════════════════════════════════════════════════════╗
║  AI Agent Team ↔ Factory OS 整合測試                      ║
╚═══════════════════════════════════════════════════════════╝

============================================================
Test 1: Ping Factory OS
============================================================
✅ Ping 成功
ℹ️    狀態: healthy
```

#### 方法 2: 本地開發模式

```bash
# 啟動本地 Workers 環境
npm run dev

# 在另一個終端測試 API
curl http://localhost:8787/api/v1/factory-status/current
```

**預期響應：**
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-10-06T12:00:00.000Z",
    "factory_os": {
      "status": "healthy",
      "response_time_ms": 245,
      "database_status": "connected"
    },
    "integration": {
      "operational": true
    }
  }
}
```

---

## 📊 可用的 API 端點

### 推薦端點（已啟用）

```bash
# 1. 當前狀態
curl http://localhost:8787/api/v1/factory-status/current

# 2. 歷史記錄（最近 20 條）
curl http://localhost:8787/api/v1/factory-status/history?limit=20

# 3. 統計數據（最近 24 小時）
curl http://localhost:8787/api/v1/factory-status/stats?hours=24

# 4. 儀表板數據（完整監控）
curl http://localhost:8787/api/v1/factory-status/dashboard

# 5. 手動健康檢查
curl -X POST http://localhost:8787/api/v1/factory-status/check-now

# 6. 連接測試
curl -X POST http://localhost:8787/api/v1/factory-status/test-connection
```

### 兼容端點（可選啟用）

如果需要使用兼容路徑，按以下步驟啟用：

**編輯 `src/main/js/api/index.ts`：**

```typescript
import { factoryStatusRoutes } from './routes/factory-status';
import { factoryStatusLegacyRoutes } from './routes/factory-status-legacy';  // ✅ 添加這行

// 推薦端點（保持啟用）
apiV1.route('/factory-status', factoryStatusRoutes);

// 兼容端點（可選啟用）
apiV1.route('/factory-status', factoryStatusLegacyRoutes);  // ✅ 添加這行
```

**然後使用：**
```bash
curl http://localhost:8787/api/v1/factory-status/status
curl http://localhost:8787/api/v1/factory-status/status/history
curl http://localhost:8787/api/v1/factory-status/status/summary
```

**注意：** 兼容端點和推薦端點路徑不同，可以同時啟用。

---

## ⏰ 自動健康檢查

### Cron 任務已配置

健康檢查將每 5 分鐘自動執行一次（通過 Cloudflare Cron Triggers）。

**查看 `wrangler.toml` 配置：**
```toml
[triggers]
crons = [
  "*/5 * * * *",   # Database sync + Factory OS health check
  ...
]
```

### 查看 Cron 執行日誌

部署後，使用 Wrangler 查看日誌：

```bash
npx wrangler tail
```

**預期日誌輸出：**
```
[Cron] Scheduled task triggered at: 2025-10-06T12:00:00.000Z
[Cron] Starting Factory OS health check...
[HealthMonitor] Saved health check result: healthy
[Cron] Factory OS health check completed
```

---

## 🗄️ 數據庫查詢

### 查看健康檢查記錄

```bash
# 使用 Wrangler 查詢 D1 數據庫
npx wrangler d1 execute DB --command "
  SELECT
    timestamp,
    factory_os_status,
    response_time_ms,
    database_status
  FROM factory_health_checks
  ORDER BY timestamp DESC
  LIMIT 10
"
```

### 查看統計摘要

```bash
npx wrangler d1 execute DB --command "
  SELECT
    COUNT(*) as total_checks,
    SUM(CASE WHEN factory_os_status = 'healthy' THEN 1 ELSE 0 END) as healthy,
    AVG(response_time_ms) as avg_response_time
  FROM factory_health_checks
  WHERE timestamp >= datetime('now', '-24 hours')
"
```

---

## 🚀 部署到生產環境

### 1. 設置生產環境變數

```bash
# 使用 Wrangler secrets（推薦）
npx wrangler secret put FACTORY_OS_URL
# 輸入: https://factory-os.shyangtsuen.xyz

npx wrangler secret put FACTORY_OS_API_KEY
# 輸入: your-production-api-key
```

### 2. 部署

```bash
npm run deploy
```

### 3. 測試生產端點

```bash
curl https://api.shyangtsuen.xyz/api/v1/factory-status/current
```

---

## 🔧 故障排除

### 問題 1: 連接失敗

**症狀：** `NETWORK_ERROR` 或超時

**解決方法：**
```bash
# 1. 確認 Factory OS 正在運行
curl http://localhost:3001/api/health

# 2. 檢查環境變數
cat .dev.vars | grep FACTORY_OS

# 3. 測試連接
npx tsx scripts/test-factory-os-integration.ts
```

### 問題 2: API Key 錯誤

**症狀：** `INVALID_API_KEY`

**解決方法：**
```bash
# 檢查 .dev.vars 中的 API Key
# 確保與 Factory OS 配置一致
```

### 問題 3: Cron 任務未執行

**症狀：** 沒有健康檢查記錄

**解決方法：**
```bash
# 1. 確認已部署到 Cloudflare
npm run deploy

# 2. 查看 Cron 日誌
npx wrangler tail

# 3. 手動觸發測試
curl -X POST https://api.shyangtsuen.xyz/api/v1/factory-status/check-now
```

---

## 📚 相關文檔

- [完整整合指南](./FACTORY_OS_INTEGRATION.md)
- [API 端點對比](./API_ENDPOINTS_COMPARISON.md)
- [健康指標存儲指南](./HEALTH_METRICS_STORAGE.md)

---

## ✅ 驗證清單

完成以下檢查確保整合成功：

- [ ] ✅ Factory OS 在 localhost:3001 運行
- [ ] ✅ 環境變數已配置（.dev.vars 或 .env）
- [ ] ✅ 測試腳本運行成功
- [ ] ✅ 本地開發模式 API 可訪問
- [ ] ✅ 數據庫表已創建（factory_health_checks）
- [ ] ✅ Cron 任務配置正確
- [ ] ✅ 推薦端點可用
- [ ] ✅ （可選）兼容端點已啟用

---

**🎯 快速入門完成！您現在可以使用 Factory OS 健康監控系統了。**

**維護者：** AI Agent Team
**更新日期：** 2025-10-06
**版本：** 1.0.0
