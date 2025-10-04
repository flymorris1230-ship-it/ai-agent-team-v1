# 🔍 Cloudflare Tunnel 診斷和修復指南

**診斷時間**: 2025-10-05
**目標**: 解決 NAS Cloudflare Tunnel 訪問問題

---

## 📊 **診斷結果**

### ✅ **正常項目**
- ✅ `stic.shyangtsuen.xyz` DNS 解析正常（指向 Cloudflare）
- ✅ NAS IP 確認：192.168.1.114
- ✅ Cloudflare Tunnel 已安裝在 NAS

### ❌ **問題項目**
- ❌ `postgres.stic.shyangtsuen.xyz` 無 DNS 記錄
- ❌ `health.stic.shyangtsuen.xyz` 無 DNS 記錄
- ⚠️ Tunnel 路由可能未配置

---

## 🎯 **問題分析**

你遇到的情況是：
1. Cloudflare Tunnel 已安裝 ✅
2. 但 DNS 路由未設置 ❌
3. 所以無法通過 `postgres.stic.shyangtsuen.xyz` 訪問 ❌

**解決方案**：需要配置 Tunnel 並創建 DNS 路由

---

## 🛠️ **完整修復步驟**

### **準備工作：SSH 連接 NAS**

```bash
# 從 Mac SSH 到 NAS
ssh admin@192.168.1.114

# 如果無法連接，請確保：
# 1. NAS 已啟用 SSH 服務
# 2. 防火牆允許 SSH (端口 22)
```

---

### **步驟 1：檢查 Cloudflare Tunnel 狀態**

在 NAS 上執行：

```bash
# 檢查 cloudflared 是否安裝
which cloudflared
cloudflared --version

# 檢查 Tunnel 列表
cloudflared tunnel list

# 檢查服務狀態
sudo systemctl status cloudflared
# 或
sudo service cloudflared status
```

**期望輸出**：
```
NAME      ID                                   CREATED
stic-nas  a1b2c3d4-xxxx-xxxx-xxxx-xxxxxxxxxxxx  2025-10-05...
```

**如果沒有 Tunnel**，執行：
```bash
cloudflared tunnel create stic-nas
```

**記下 Tunnel ID**（類似：a1b2c3d4-xxxx-xxxx-xxxx-xxxxxxxxxxxx）

---

### **步驟 2：配置 Tunnel**

#### **2.1 創建配置文件**

```bash
# 創建配置目錄
sudo mkdir -p /etc/cloudflared

# 創建配置文件
sudo nano /etc/cloudflared/config.yml
```

#### **2.2 填入配置**（替換 YOUR_TUNNEL_ID）

```yaml
tunnel: YOUR_TUNNEL_ID_HERE
credentials-file: /root/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  # PostgreSQL Proxy 端點
  - hostname: postgres.stic.shyangtsuen.xyz
    service: http://localhost:8000

  # 健康檢查端點
  - hostname: health.stic.shyangtsuen.xyz
    service: http://localhost:8000/health

  # NAS 管理界面（可選）
  - hostname: nas.stic.shyangtsuen.xyz
    service: http://localhost:5000

  # 默認規則（必須）
  - service: http_status:404
```

**保存並退出**（Nano: Ctrl+X, Y, Enter）

#### **2.3 檢查配置文件**

```bash
sudo cloudflared tunnel ingress validate
```

應該顯示：
```
Validating rules from /etc/cloudflared/config.yml
OK
```

---

### **步驟 3：創建 DNS 路由**

這是**關鍵步驟**！

```bash
# 方式 1：使用 cloudflared 命令（推薦）
cloudflared tunnel route dns stic-nas postgres.stic.shyangtsuen.xyz
cloudflared tunnel route dns stic-nas health.stic.shyangtsuen.xyz
cloudflared tunnel route dns stic-nas nas.stic.shyangtsuen.xyz

# 方式 2：手動在 Cloudflare Dashboard 添加
# 1. 登入 https://dash.cloudflare.com
# 2. 選擇域名 shyangtsuen.xyz
# 3. DNS → Records → Add record
# 4. Type: CNAME
# 5. Name: postgres.stic
# 6. Target: YOUR_TUNNEL_ID.cfargotunnel.com
# 7. Proxy status: Proxied (橙色雲)
```

**驗證 DNS 已創建**（在 Mac 上執行）：

```bash
# 等待 30 秒讓 DNS 傳播
sleep 30

# 檢查 DNS
dig postgres.stic.shyangtsuen.xyz +short
dig health.stic.shyangtsuen.xyz +short
```

應該看到 Cloudflare IP（如 172.67.x.x 或 104.21.x.x）

---

### **步驟 4：啟動 Tunnel**

```bash
# 測試運行（前台，可以看日誌）
sudo cloudflared tunnel run stic-nas

# 應該看到：
# 2025-10-05... INF Connection registered connIndex=0
# 2025-10-05... INF Starting metrics server on 127.0.0.1:36193/metrics
```

**如果正常運行**，按 Ctrl+C 停止，然後安裝為服務：

```bash
# 安裝為系統服務
sudo cloudflared service install

# 啟動服務
sudo systemctl start cloudflared

# 設置開機自啟
sudo systemctl enable cloudflared

# 檢查狀態
sudo systemctl status cloudflared
```

---

### **步驟 5：測試訪問**

在 **Mac** 上執行：

```bash
# 測試健康檢查
curl https://health.stic.shyangtsuen.xyz

# 期望輸出（如果 Proxy 已部署）：
# {"status":"healthy","database":"connected"}

# 或簡單的 404（如果 Proxy 未部署）
```

---

## 🔧 **常見問題和解決方案**

### **問題 1：`cloudflared tunnel list` 顯示空**

**原因**：尚未登入 Cloudflare 或未創建 Tunnel

**解決**：
```bash
# 1. 登入 Cloudflare
cloudflared tunnel login
# 會打開瀏覽器，完成授權

# 2. 創建 Tunnel
cloudflared tunnel create stic-nas

# 3. 記下 Tunnel ID
```

---

### **問題 2：`tunnel route dns` 失敗**

**錯誤訊息**：
```
error: Failed to add route: zone not found
```

**原因**：域名未在 Cloudflare 託管

**解決**：
1. 登入 Cloudflare Dashboard
2. 確認 `shyangtsuen.xyz` 在你的帳戶中
3. 確認 DNS 狀態為 Active

---

### **問題 3：DNS 創建成功但無法訪問**

**檢查清單**：

```bash
# 1. 檢查 Tunnel 運行狀態
sudo systemctl status cloudflared

# 2. 查看日誌
sudo journalctl -u cloudflared -f

# 3. 檢查後端服務
curl http://localhost:8000/health

# 4. 檢查防火牆
sudo ufw status
```

---

### **問題 4：Tunnel 運行但 503 錯誤**

**原因**：後端服務（PostgreSQL Proxy）未運行

**解決**：

```bash
# 檢查 Proxy 是否運行
docker ps | grep postgres-proxy

# 如果未運行，啟動它
cd /volume1/docker/postgres-proxy
docker-compose up -d

# 測試 Proxy
curl http://localhost:8000/health
```

---

## 📋 **完整檢查清單**

在 NAS 上執行以下命令，並將輸出貼給我：

```bash
echo "=== Cloudflare Tunnel 狀態 ==="
cloudflared --version
echo ""

echo "=== Tunnel 列表 ==="
cloudflared tunnel list
echo ""

echo "=== Tunnel 服務狀態 ==="
sudo systemctl status cloudflared
echo ""

echo "=== 配置文件 ==="
sudo cat /etc/cloudflared/config.yml
echo ""

echo "=== 後端服務測試 ==="
curl http://localhost:8000/health
echo ""

echo "=== Docker 容器 ==="
docker ps
echo ""
```

---

## 🎯 **快速修復腳本**

我創建了一個自動診斷腳本：

```bash
#!/bin/bash
# 保存為 diagnose-tunnel.sh

echo "🔍 開始診斷 Cloudflare Tunnel..."
echo ""

# 檢查 cloudflared
if ! command -v cloudflared &> /dev/null; then
    echo "❌ cloudflared 未安裝"
    exit 1
fi
echo "✅ cloudflared 已安裝: $(cloudflared --version | head -n1)"

# 檢查 Tunnel
TUNNELS=$(cloudflared tunnel list 2>&1)
if [[ $TUNNELS == *"stic-nas"* ]]; then
    echo "✅ Tunnel 'stic-nas' 存在"
    TUNNEL_ID=$(echo "$TUNNELS" | grep stic-nas | awk '{print $2}')
    echo "   Tunnel ID: $TUNNEL_ID"
else
    echo "❌ Tunnel 'stic-nas' 不存在"
    echo "   請執行: cloudflared tunnel create stic-nas"
fi

# 檢查配置文件
if [ -f /etc/cloudflared/config.yml ]; then
    echo "✅ 配置文件存在"
else
    echo "❌ 配置文件不存在: /etc/cloudflared/config.yml"
fi

# 檢查服務
if systemctl is-active --quiet cloudflared; then
    echo "✅ Tunnel 服務運行中"
else
    echo "❌ Tunnel 服務未運行"
fi

# 檢查後端
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ 後端服務 (port 8000) 可訪問"
else
    echo "❌ 後端服務 (port 8000) 無法訪問"
fi

echo ""
echo "🔍 診斷完成"
```

**使用方法**：

```bash
# 在 NAS 上執行
chmod +x diagnose-tunnel.sh
./diagnose-tunnel.sh
```

---

## 🆘 **如果仍然無法解決**

**請提供以下資訊**：

1. **Tunnel 狀態**
   ```bash
   cloudflared tunnel list
   ```

2. **服務狀態**
   ```bash
   sudo systemctl status cloudflared
   ```

3. **配置文件**
   ```bash
   sudo cat /etc/cloudflared/config.yml
   ```

4. **日誌**
   ```bash
   sudo journalctl -u cloudflared -n 50
   ```

將這些輸出貼給我，我會幫你具體診斷！

---

## 💡 **下一步**

完成上述修復後：

1. ✅ **測試健康檢查**
   ```bash
   curl https://health.stic.shyangtsuen.xyz
   ```

2. ✅ **部署 PostgreSQL Proxy**
   - 參考：`docs/NAS-SECURITY-GUIDE.md`

3. ✅ **測試完整連接**
   ```bash
   curl https://postgres.stic.shyangtsuen.xyz/health
   ```

4. ✅ **配置 Workers 訪問**
   ```bash
   echo "https://postgres.stic.shyangtsuen.xyz" | \
     npx wrangler secret put POSTGRES_PROXY_URL --env production
   ```

---

**🔧 準備好了嗎？開始第一步檢查！**
