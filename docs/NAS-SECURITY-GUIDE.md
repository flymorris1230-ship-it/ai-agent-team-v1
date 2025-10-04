# 🔒 NAS 外網安全訪問完全指南

**更新日期**: 2025-10-05
**目標**: 安全地從外網訪問 NAS PostgreSQL 數據庫
**難度**: 中級 → 進階

---

## 📊 方案比較表

| 方案 | 安全性 | 難度 | 成本 | 速度 | 推薦度 |
|------|--------|------|------|------|--------|
| **Cloudflare Tunnel** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 免費 | ⭐⭐⭐⭐ | ✅ **最推薦** |
| **Tailscale VPN** | ⭐⭐⭐⭐⭐ | ⭐ | 免費 | ⭐⭐⭐⭐⭐ | ✅ 推薦 |
| **WireGuard VPN** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 免費 | ⭐⭐⭐⭐⭐ | ⚠️ 進階 |
| **端口轉發 + HTTPS** | ⭐⭐ | ⭐⭐ | 免費 | ⭐⭐⭐⭐⭐ | ❌ 不推薦 |
| **DDNS + 端口轉發** | ⭐ | ⭐⭐ | 免費 | ⭐⭐⭐⭐⭐ | ❌ **危險** |

---

## 🎯 推薦方案：Cloudflare Tunnel

### 為什麼選擇 Cloudflare Tunnel？

✅ **零暴露風險**
- 不需要開放任何端口
- 不需要設置端口轉發
- NAS 主動連接 Cloudflare，而非被動等待連接

✅ **免費 + 企業級安全**
- Cloudflare 免費提供
- 自動 DDoS 防護
- 自動 HTTPS/TLS 加密
- 全球 CDN 加速

✅ **易於管理**
- Web UI 管理界面
- 可隨時啟用/停用
- 詳細的訪問日誌

✅ **適合 Cloudflare Workers**
- Workers 可直接訪問
- 低延遲
- 無需額外配置

---

## 🚀 完整設置教學

### 前置準備（必須）

#### 1. **確認 NAS 要求**

```bash
# SSH 連接到 NAS
ssh admin@192.168.1.114

# 檢查系統
uname -a
# 需要：Linux x86_64 或 ARM

# 檢查網絡
ping -c 3 1.1.1.1
# 確保 NAS 能訪問外網

# 檢查 PostgreSQL
netstat -tlnp | grep 5532
# 確認 PostgreSQL 正在運行
```

#### 2. **域名準備**

你需要一個域名託管在 Cloudflare：
- 主域名：`shyangtsuen.xyz`（已有）
- 將用於：`postgres.stic.shyangtsuen.xyz`

如果域名不在 Cloudflare：
1. 到域名註冊商修改 DNS 為 Cloudflare NS
2. 等待 DNS 傳播（24-48小時）

#### 3. **SSH 密鑰設置**（強烈推薦）

```bash
# 在 Mac 上生成 SSH 密鑰（如果還沒有）
ssh-keygen -t ed25519 -C "nas-access"

# 複製公鑰到 NAS
ssh-copy-id admin@192.168.1.114

# 測試無密碼登入
ssh admin@192.168.1.114 exit
# 成功則不需要輸入密碼
```

---

## 📝 方案 A：Cloudflare Tunnel（推薦）

### 架構圖

```
[Cloudflare Workers]
       ↓ HTTPS
[Cloudflare Edge Network]
       ↓ Encrypted Tunnel
[cloudflared on NAS]
       ↓ Local
[PostgreSQL HTTP Proxy :8000]
       ↓ Local
[PostgreSQL :5532]
```

### 步驟 1：部署 PostgreSQL HTTP Proxy

首先需要在 NAS 上部署 HTTP Proxy，因為 Cloudflare Tunnel 只能代理 HTTP/HTTPS。

**1.1 連接 NAS**
```bash
ssh admin@192.168.1.114
```

**1.2 創建目錄**
```bash
sudo mkdir -p /volume1/docker/postgres-proxy
cd /volume1/docker/postgres-proxy
```

**1.3 創建 Dockerfile**

從 Mac 上傳文件到 NAS，或直接在 NAS 創建：

```bash
# 在 NAS 上執行
cat > /volume1/docker/postgres-proxy/Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

# 安裝依賴
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 複製應用
COPY postgres_proxy.py .

# 暴露端口
EXPOSE 8000

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# 啟動應用
CMD ["python", "postgres_proxy.py"]
EOF
```

**1.4 創建 requirements.txt**
```bash
cat > /volume1/docker/postgres-proxy/requirements.txt << 'EOF'
fastapi==0.104.1
uvicorn==0.24.0
psycopg2-binary==2.9.9
pydantic==2.5.0
python-dotenv==1.0.0
EOF
```

**1.5 上傳 Python 代碼**

從你的專案複製 `postgres_proxy.py`：

```bash
# 在 Mac 上執行（從專案目錄）
scp src/main/python/postgres_proxy.py admin@192.168.1.114:/volume1/docker/postgres-proxy/
```

或者在 NAS 上直接創建簡化版本：

```bash
cat > /volume1/docker/postgres-proxy/postgres_proxy.py << 'EOF'
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
import psycopg2
import os

app = FastAPI(title="PostgreSQL HTTP Proxy")

# 環境變數
DB_HOST = os.getenv("POSTGRES_HOST", "192.168.1.114")
DB_PORT = int(os.getenv("POSTGRES_PORT", "5532"))
DB_NAME = os.getenv("POSTGRES_DB", "postgres")
DB_USER = os.getenv("POSTGRES_USER", "postgres")
DB_PASS = os.getenv("POSTGRES_PASSWORD", "")
API_KEY = os.getenv("PROXY_API_KEY", "change-me")

def get_db_connection():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASS
    )

@app.get("/health")
async def health():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.close()
        conn.close()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

class QueryRequest(BaseModel):
    query: str
    params: list = []

@app.post("/query")
async def execute_query(
    request: QueryRequest,
    x_api_key: str = Header(None)
):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API Key")

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(request.query, request.params)

        if request.query.strip().upper().startswith("SELECT"):
            results = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            data = [dict(zip(columns, row)) for row in results]
            cursor.close()
            conn.close()
            return {"success": True, "data": data}
        else:
            conn.commit()
            cursor.close()
            conn.close()
            return {"success": True, "affected_rows": cursor.rowcount}
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
EOF
```

**1.6 創建 docker-compose.yml**
```bash
cat > /volume1/docker/postgres-proxy/docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres-proxy:
    build: .
    container_name: postgres-proxy
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - POSTGRES_HOST=192.168.1.114
      - POSTGRES_PORT=5532
      - POSTGRES_DB=postgres
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - PROXY_API_KEY=${PROXY_API_KEY}
    networks:
      - nas-network

networks:
  nas-network:
    driver: bridge
EOF
```

**1.7 創建環境變數文件**
```bash
cat > /volume1/docker/postgres-proxy/.env << 'EOF'
POSTGRES_PASSWORD=Morris1230
PROXY_API_KEY=your-super-secret-api-key-change-this-now
EOF

chmod 600 /volume1/docker/postgres-proxy/.env
```

**⚠️ 重要安全提示：**
請立即修改 `PROXY_API_KEY` 為強密碼！
```bash
# 生成安全的 API Key
openssl rand -base64 32
```

**1.8 啟動服務**
```bash
cd /volume1/docker/postgres-proxy
docker-compose up -d --build

# 查看日誌
docker-compose logs -f
```

**1.9 測試 Proxy**
```bash
# 在 NAS 上測試
curl http://localhost:8000/health

# 在 Mac 上測試（確保在同網域）
curl http://192.168.1.114:8000/health
```

期望輸出：
```json
{"status":"healthy","database":"connected"}
```

---

### 步驟 2：安裝 Cloudflare Tunnel

**2.1 在 NAS 上安裝 cloudflared**

```bash
# SSH 到 NAS
ssh admin@192.168.1.114

# 下載 cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64

# 安裝
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared

# 驗證安裝
cloudflared --version
```

**2.2 登入 Cloudflare**

```bash
cloudflared tunnel login
```

這會：
1. 打開瀏覽器
2. 要求你登入 Cloudflare
3. 選擇域名 `shyangtsuen.xyz`
4. 授權訪問

完成後會生成認證文件：`~/.cloudflared/cert.pem`

**2.3 創建 Tunnel**

```bash
# 創建名為 stic-nas 的 tunnel
cloudflared tunnel create stic-nas

# 記下 Tunnel ID（類似：a1b2c3d4-e5f6-7890-abcd-ef1234567890）
```

**2.4 配置 Tunnel**

```bash
# 創建配置目錄
sudo mkdir -p /etc/cloudflared

# 創建配置文件
sudo nano /etc/cloudflared/config.yml
```

貼上以下內容（**替換 TUNNEL_ID**）：

```yaml
tunnel: YOUR_TUNNEL_ID_HERE
credentials-file: /root/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  # PostgreSQL Proxy (主要訪問點)
  - hostname: postgres.stic.shyangtsuen.xyz
    service: http://localhost:8000

  # 健康檢查端點
  - hostname: health.stic.shyangtsuen.xyz
    service: http://localhost:8000/health

  # 默認規則（拒絕其他訪問）
  - service: http_status:404
```

**2.5 配置 DNS 路由**

```bash
# 為 postgres 子域名創建 DNS 記錄
cloudflared tunnel route dns stic-nas postgres.stic.shyangtsuen.xyz

# 為 health 子域名創建 DNS 記錄
cloudflared tunnel route dns stic-nas health.stic.shyangtsuen.xyz
```

**2.6 啟動 Tunnel（測試）**

```bash
cloudflared tunnel run stic-nas
```

保持運行，在另一個終端測試：

```bash
# 測試健康檢查
curl https://health.stic.shyangtsuen.xyz

# 測試 Proxy
curl https://postgres.stic.shyangtsuen.xyz/health
```

如果成功，繼續下一步。

**2.7 安裝為系統服務（開機自啟）**

```bash
# 停止測試（Ctrl+C）

# 安裝服務
sudo cloudflared service install

# 複製配置文件
sudo cp /etc/cloudflared/config.yml /etc/cloudflared/config.yml

# 啟動服務
sudo systemctl start cloudflared

# 設置開機自啟
sudo systemctl enable cloudflared

# 查看狀態
sudo systemctl status cloudflared
```

---

### 步驟 3：配置 Cloudflare Workers 訪問

**3.1 測試從外網訪問**

```bash
# 從任何地方測試（Mac、手機、其他網絡）
curl https://postgres.stic.shyangtsuen.xyz/health
```

**3.2 更新 Workers 配置**

在專案的 `.env` 文件中更新：

```bash
# 原本（內網）
POSTGRES_PROXY_URL=http://192.168.1.114:8000

# 改為（外網 - Cloudflare Tunnel）
POSTGRES_PROXY_URL=https://postgres.stic.shyangtsuen.xyz
POSTGRES_PROXY_API_KEY=your-super-secret-api-key-change-this-now
```

**3.3 在 Workers 中設置 Secret**

```bash
# 設置 API Key
echo "your-super-secret-api-key" | npx wrangler secret put POSTGRES_PROXY_API_KEY --env production

# 設置 Proxy URL
echo "https://postgres.stic.shyangtsuen.xyz" | npx wrangler secret put POSTGRES_PROXY_URL --env production
```

---

## 🔒 安全最佳實踐

### 1. **API Key 管理**

✅ **DO（應該做）：**
- 使用強隨機密碼（至少 32 字符）
- 定期輪換 API Key（每 90 天）
- 使用環境變數，不要寫死在代碼
- 為不同環境使用不同的 Key

❌ **DON'T（不要做）：**
- 使用簡單密碼如 `123456`
- 把 API Key 提交到 Git
- 在公開文檔中分享真實的 Key
- 多個服務共用同一個 Key

```bash
# 生成安全的 API Key
openssl rand -base64 32

# 或
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 2. **網絡隔離**

```bash
# PostgreSQL 只監聽本地
# 編輯 postgresql.conf
listen_addresses = 'localhost'

# 或只監聽內網 IP
listen_addresses = '192.168.1.114'
```

### 3. **防火牆規則**

```bash
# 在 NAS 上設置防火牆（示例）
# 只允許來自 Cloudflare 的連接

# UFW (如果使用)
sudo ufw allow from 173.245.48.0/20 to any port 8000
sudo ufw allow from 103.21.244.0/22 to any port 8000
# ... (添加所有 Cloudflare IP 範圍)

# 拒絕其他訪問
sudo ufw deny 8000
```

### 4. **監控和日誌**

```bash
# 查看 Tunnel 日誌
sudo journalctl -u cloudflared -f

# 查看 Proxy 日誌
docker logs -f postgres-proxy

# 查看 PostgreSQL 日誌
tail -f /var/log/postgresql/postgresql.log
```

### 5. **備份配置**

```bash
# 備份 Tunnel 配置
sudo cp /etc/cloudflared/config.yml ~/cloudflared-config-backup.yml

# 備份 Proxy 配置
cp /volume1/docker/postgres-proxy/.env ~/postgres-proxy-env-backup

# 備份到 Git（不包含密碼）
```

---

## 🎯 方案 B：Tailscale VPN（備選）

如果你覺得 Cloudflare Tunnel 太複雜，Tailscale 是最簡單的方案。

### 特點
- ✅ 5 分鐘設置完成
- ✅ 零配置 VPN
- ✅ 點對點加密
- ✅ 免費 (100 設備)

### 快速設置

**1. 在 NAS 上安裝**
```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

**2. 在 Mac 上安裝**
```bash
brew install tailscale
sudo tailscale up
```

**3. 訪問**
```bash
# NAS 會得到一個 Tailscale IP，例如 100.64.1.2
curl http://100.64.1.2:8000/health
```

**缺點**：
- Cloudflare Workers 無法直接訪問 Tailscale 網絡
- 需要中繼服務器

---

## 🚨 危險方案（不要使用）

### ❌ 方案：端口轉發 + DDNS

**為什麼危險：**
1. 直接暴露服務到公網
2. 容易被掃描和攻擊
3. DDoS 風險
4. IP 洩露

如果你看到這樣的教程：
```
路由器設置 → 端口轉發 → 5432 → 192.168.1.114:5432
```

**千萬不要這樣做！**

---

## 📊 安全性檢查清單

部署完成後，檢查以下項目：

- [ ] API Key 是強隨機密碼（32+ 字符）
- [ ] API Key 已加入 `.gitignore`
- [ ] PostgreSQL 不監聽 `0.0.0.0`
- [ ] PostgreSQL 端口（5532）未暴露到公網
- [ ] Proxy 端口（8000）只通過 Tunnel 訪問
- [ ] Cloudflare Tunnel 運行正常
- [ ] DNS 記錄正確指向 Tunnel
- [ ] HTTPS 強制啟用
- [ ] 日誌記錄啟用
- [ ] 備份配置文件已創建

---

## 🆘 故障排除

### 問題 1：無法訪問 https://postgres.stic.shyangtsuen.xyz

**檢查步驟：**
```bash
# 1. 檢查 Tunnel 運行
sudo systemctl status cloudflared

# 2. 檢查 DNS
dig postgres.stic.shyangtsuen.xyz

# 3. 檢查 Proxy
curl http://localhost:8000/health

# 4. 查看日誌
sudo journalctl -u cloudflared -n 50
```

### 問題 2：Workers 無法連接

**檢查：**
1. Workers Secret 是否正確設置
2. API Key 是否一致
3. CORS 設置（如果需要）

### 問題 3：連接緩慢

**優化：**
1. 檢查 NAS 網速
2. 升級 NAS 網卡
3. 使用 Cloudflare Argo Tunnel（付費加速）

---

## 💡 推薦後續步驟

1. **啟用監控**
   - Cloudflare Analytics
   - Uptime Robot 監控
   - 錯誤告警

2. **性能優化**
   - 啟用 Cloudflare 緩存
   - 配置連接池
   - 優化 SQL 查詢

3. **成本優化**
   - 監控流量
   - 設置預算警報

---

## 📚 相關資源

- [Cloudflare Tunnel 官方文檔](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Tailscale 文檔](https://tailscale.com/kb/)
- [PostgreSQL 安全指南](https://www.postgresql.org/docs/current/auth-pg-hba-conf.html)

---

**🔐 記住：安全永遠是第一優先級！**

如有疑問，請參考本指南或諮詢安全專家。
