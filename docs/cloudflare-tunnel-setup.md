# Cloudflare Tunnel 自動部署指南

## 🚀 一鍵部署 Cloudflare Tunnel

本指南將協助您自動設置 Cloudflare Tunnel，實現從任何地方安全訪問 NAS 上的 PostgreSQL。

---

## 📋 前置需求

### 1. NAS 端
- ✅ NAS 可通過 SSH 訪問
- ✅ PostgreSQL 運行在 port 5532
- ✅ PostgreSQL Proxy 運行在 port 8000
- ✅ 擁有 sudo 權限

### 2. Cloudflare 端
- ✅ Cloudflare 帳號（免費即可）
- ✅ 域名 `shyangtsuen.xyz` 已託管在 Cloudflare
- ✅ 域名 `stic.shyangtsuen.xyz` 已指向 NAS

### 3. 本地端（Mac）
- ✅ Git 已安裝
- ✅ SSH 密鑰已配置（推薦）

---

## 🎯 自動部署步驟

### 步驟 1: 準備 SSH 連接（可選但推薦）

```bash
# 配置 SSH 密鑰以避免重複輸入密碼
ssh-copy-id your-user@stic.shyangtsuen.xyz

# 測試連接
ssh your-user@stic.shyangtsuen.xyz exit
```

### 步驟 2: 執行自動部署腳本

```bash
# 進入專案目錄
cd ~/Desktop/ai-agent-team-v1

# 設置環境變數（如果 NAS 用戶名不是 admin）
export NAS_USER=your-username

# 執行自動部署
./scripts/setup-cloudflare-tunnel.sh
```

### 步驟 3: 完成 Cloudflare 授權

腳本會自動開啟瀏覽器，請完成以下步驟：

1. 登入您的 Cloudflare 帳號
2. 選擇域名 `shyangtsuen.xyz`
3. 點擊「Authorize」授權
4. 返回終端，腳本會自動繼續

---

## 📊 腳本會自動完成

✅ **安裝 cloudflared** - 下載並安裝到 NAS
✅ **創建 Tunnel** - 建立名為 `stic-nas` 的 Tunnel
✅ **配置路由** - 設置以下端點：
   - `postgres.stic.shyangtsuen.xyz` → PostgreSQL Proxy (port 8000)
   - `db.stic.shyangtsuen.xyz` → PostgreSQL 直連 (port 5532)
   - `health.stic.shyangtsuen.xyz` → 健康檢查

✅ **設置 DNS** - 自動創建 CNAME 記錄
✅ **啟動服務** - 安裝為系統服務並開機自動啟動
✅ **驗證部署** - 測試所有端點

---

## ✅ 部署成功後

### 訪問端點

```bash
# 健康檢查
curl https://health.stic.shyangtsuen.xyz

# PostgreSQL Proxy
curl https://postgres.stic.shyangtsuen.xyz/health

# pgvector 狀態（需要 API Key）
curl -H "X-API-Key: your-api-key" \
     https://postgres.stic.shyangtsuen.xyz/pgvector/status
```

### 更新 Mac 專案配置

在專案的 `.env` 文件中添加：

```bash
# Cloudflare Tunnel 配置
POSTGRES_HOST=postgres.stic.shyangtsuen.xyz
POSTGRES_PORT=443
POSTGRES_PROXY_URL=https://postgres.stic.shyangtsuen.xyz
POSTGRES_PROXY_API_KEY=your-secure-api-key
USE_HTTPS=true
```

### 測試連接

```bash
# 測試 PostgreSQL Proxy
PROXY_HOST=postgres.stic.shyangtsuen.xyz \
PROXY_PORT=443 \
./scripts/test-postgres-proxy.sh

# 啟動開發服務器
npm run dev
```

---

## 🔧 管理命令

### 在 NAS 上執行

```bash
# 查看服務狀態
sudo systemctl status cloudflared

# 查看實時日誌
sudo journalctl -u cloudflared -f

# 重啟服務
sudo systemctl restart cloudflared

# 停止服務
sudo systemctl stop cloudflared

# 列出所有 Tunnels
cloudflared tunnel list

# 查看路由
cloudflared tunnel route list
```

### 在 Mac 上執行

```bash
# 測試健康端點
curl https://health.stic.shyangtsuen.xyz

# 測試 PostgreSQL 連接
curl https://postgres.stic.shyangtsuen.xyz/health

# 運行完整測試
./scripts/test-postgres-proxy.sh
```

---

## 🆘 故障排除

### 問題 1: SSH 連接失敗

```bash
# 檢查 NAS 是否可達
ping stic.shyangtsuen.xyz

# 測試 SSH 連接
ssh -v your-user@stic.shyangtsuen.xyz

# 配置 SSH 密鑰
ssh-copy-id your-user@stic.shyangtsuen.xyz
```

### 問題 2: DNS 記錄未生效

```bash
# 檢查 DNS 傳播
nslookup postgres.stic.shyangtsuen.xyz

# 等待 DNS 傳播（可能需要 5-10 分鐘）
# 或使用 Cloudflare DNS (1.1.1.1)
dig @1.1.1.1 postgres.stic.shyangtsuen.xyz
```

### 問題 3: Tunnel 無法啟動

在 NAS 上執行：

```bash
# 查看詳細日誌
sudo journalctl -u cloudflared -n 50

# 測試配置
cloudflared tunnel run stic-nas --loglevel debug

# 檢查配置文件
cat ~/.cloudflared/config.yml
```

### 問題 4: 503 Service Unavailable

```bash
# 在 NAS 上檢查服務
docker ps | grep postgres
curl http://localhost:8000/health

# 確認 Tunnel 運行
sudo systemctl status cloudflared
```

---

## 🔄 重新部署

如果需要重新部署：

```bash
# 在 NAS 上刪除舊 Tunnel
cloudflared tunnel delete stic-nas

# 重新執行部署腳本
./scripts/setup-cloudflare-tunnel.sh
```

---

## 📝 配置文件位置

### NAS 端

- **配置文件**: `~/.cloudflared/config.yml`
- **憑證文件**: `~/.cloudflared/<tunnel-id>.json`
- **服務文件**: `/etc/systemd/system/cloudflared.service`

### 輸出文件

- **Tunnel ID**: `/tmp/tunnel_id.txt`
- **配置信息**: `/tmp/tunnel_config.txt`

---

## 🎯 下一步

部署完成後：

1. ✅ 更新 Mac 專案 `.env` 配置
2. ✅ 測試所有端點
3. ✅ 運行專案測試腳本
4. ✅ 開始在 Mac 上開發

---

## 💡 優勢

使用 Cloudflare Tunnel 後：

- ✅ **全球訪問** - 從任何地方連接 NAS
- ✅ **自動 HTTPS** - 免費 SSL 證書
- ✅ **無需端口轉發** - 不暴露 NAS 端口
- ✅ **零信任安全** - Cloudflare 保護
- ✅ **CDN 加速** - 全球節點加速

---

## 📞 需要幫助？

- 查看腳本輸出的詳細信息
- 檢查 `/tmp/tunnel_config.txt` 配置文件
- 運行測試腳本診斷問題
- 查看 Cloudflare Dashboard 的 Tunnel 狀態
