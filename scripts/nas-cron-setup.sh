#!/bin/bash
# ==========================================
# NAS Cron Setup Script
# 在 NAS 上設置定時任務，替代 Cloudflare Cron (避免付費)
# ==========================================

echo "🔧 Setting up NAS Cron Jobs for AI Agent Team..."

# ==========================================
# 配置變數
# ==========================================
API_ENDPOINT="https://api.shyangtsuen.xyz"  # 你的 API 端點
API_KEY="${API_KEY:-your-api-key-here}"     # 從環境變數或填入你的 API Key
BACKUP_PATH="/volume1/docker/ai-agent-backup"
LOG_PATH="/volume1/docker/ai-agent-backup/logs"

# 建立日誌目錄
mkdir -p "$LOG_PATH"

# ==========================================
# 建立同步腳本
# ==========================================
cat > "$BACKUP_PATH/sync-database.sh" << 'EOF'
#!/bin/bash
# Database Sync Script
# 每 5 分鐘執行一次，同步 Cloudflare D1 到 PostgreSQL

API_ENDPOINT="https://api.shyangtsuen.xyz"
API_KEY="${API_KEY}"
LOG_FILE="/volume1/docker/ai-agent-backup/logs/sync-$(date +%Y%m%d).log"

echo "[$(date)] Starting database sync..." >> "$LOG_FILE"

# 呼叫同步 API
curl -X POST "$API_ENDPOINT/api/v1/admin/sync" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"direction": "d1_to_postgres"}' \
  >> "$LOG_FILE" 2>&1

echo "[$(date)] Sync completed" >> "$LOG_FILE"
EOF

chmod +x "$BACKUP_PATH/sync-database.sh"

# ==========================================
# 建立全量備份腳本
# ==========================================
cat > "$BACKUP_PATH/full-backup.sh" << 'EOF'
#!/bin/bash
# Full Backup Script
# 每天凌晨 2 點執行全量備份

BACKUP_DIR="/volume1/docker/ai-agent-backup/backups"
DATE=$(date +%Y%m%d)
LOG_FILE="/volume1/docker/ai-agent-backup/logs/backup-$DATE.log"

echo "[$(date)] Starting full backup..." >> "$LOG_FILE"

# 建立備份目錄
mkdir -p "$BACKUP_DIR/$DATE"

# 備份 PostgreSQL
echo "[$(date)] Backing up PostgreSQL..." >> "$LOG_FILE"
docker exec postgres pg_dump -U postgres postgres > "$BACKUP_DIR/$DATE/postgres-dump.sql"

# 壓縮備份
echo "[$(date)] Compressing backup..." >> "$LOG_FILE"
cd "$BACKUP_DIR"
tar -czf "$DATE.tar.gz" "$DATE/"
rm -rf "$DATE/"

# 保留最近 30 天的備份
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete

echo "[$(date)] Backup completed: $BACKUP_DIR/$DATE.tar.gz" >> "$LOG_FILE"
EOF

chmod +x "$BACKUP_PATH/full-backup.sh"

# ==========================================
# 建立任務分配腳本
# ==========================================
cat > "$BACKUP_PATH/distribute-tasks.sh" << 'EOF'
#!/bin/bash
# Task Distribution Script
# 每 30 分鐘檢查並分配任務

API_ENDPOINT="https://api.shyangtsuen.xyz"
API_KEY="${API_KEY}"
LOG_FILE="/volume1/docker/ai-agent-backup/logs/tasks-$(date +%Y%m%d).log"

echo "[$(date)] Checking for pending tasks..." >> "$LOG_FILE"

# 呼叫任務分配 API
curl -X POST "$API_ENDPOINT/api/v1/admin/distribute-tasks" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  >> "$LOG_FILE" 2>&1

echo "[$(date)] Task distribution completed" >> "$LOG_FILE"
EOF

chmod +x "$BACKUP_PATH/distribute-tasks.sh"

# ==========================================
# 建立日誌清理腳本
# ==========================================
cat > "$BACKUP_PATH/cleanup-logs.sh" << 'EOF'
#!/bin/bash
# Log Cleanup Script
# 每週執行，清理舊日誌

LOG_PATH="/volume1/docker/ai-agent-backup/logs"

echo "[$(date)] Cleaning up old logs..."

# 保留最近 7 天的日誌
find "$LOG_PATH" -name "*.log" -mtime +7 -delete

echo "[$(date)] Log cleanup completed"
EOF

chmod +x "$BACKUP_PATH/cleanup-logs.sh"

# ==========================================
# 設定環境變數
# ==========================================
cat > "$BACKUP_PATH/cron.env" << EOF
API_KEY=$API_KEY
API_ENDPOINT=$API_ENDPOINT
BACKUP_PATH=$BACKUP_PATH
LOG_PATH=$LOG_PATH
EOF

# ==========================================
# 生成 Crontab 配置
# ==========================================
cat > "$BACKUP_PATH/crontab.txt" << 'EOF'
# ==========================================
# AI Agent Team - NAS Cron Jobs
# 替代 Cloudflare Cron Triggers (免費方案)
# ==========================================

# 載入環境變數
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# 每 5 分鐘：資料庫同步
*/5 * * * * /volume1/docker/ai-agent-backup/sync-database.sh

# 每 30 分鐘：任務分配
*/30 * * * * /volume1/docker/ai-agent-backup/distribute-tasks.sh

# 每天凌晨 2 點：全量備份
0 2 * * * /volume1/docker/ai-agent-backup/full-backup.sh

# 每週日凌晨 3 點：清理舊日誌
0 3 * * 0 /volume1/docker/ai-agent-backup/cleanup-logs.sh
EOF

echo ""
echo "✅ NAS Cron 腳本已建立！"
echo ""
echo "📁 檔案位置:"
echo "  - 同步腳本: $BACKUP_PATH/sync-database.sh"
echo "  - 備份腳本: $BACKUP_PATH/full-backup.sh"
echo "  - 任務腳本: $BACKUP_PATH/distribute-tasks.sh"
echo "  - 清理腳本: $BACKUP_PATH/cleanup-logs.sh"
echo "  - Crontab:  $BACKUP_PATH/crontab.txt"
echo ""
echo "📋 下一步操作："
echo ""
echo "1. 編輯環境變數："
echo "   vim $BACKUP_PATH/cron.env"
echo "   # 設定你的 API_KEY"
echo ""
echo "2. 安裝 Crontab (選擇一種方式)："
echo ""
echo "   方式 A - 使用 Synology Task Scheduler (建議)："
echo "   - 登入 DSM > 控制台 > 任務排程"
echo "   - 建立 > 排程的任務 > 使用者定義的指令碼"
echo "   - 複製 $BACKUP_PATH/crontab.txt 中的任務"
echo ""
echo "   方式 B - 使用 Linux Crontab："
echo "   crontab -e"
echo "   # 貼上 $BACKUP_PATH/crontab.txt 的內容"
echo ""
echo "3. 驗證 Cron 運作："
echo "   tail -f $LOG_PATH/sync-*.log"
echo ""
echo "✨ 完成後，你的系統將完全使用免費方案！"
