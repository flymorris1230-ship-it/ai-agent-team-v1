# 🎯 Claude Code Session 快速設置指南

每次開啟新的 Claude Code 終端機時，執行以下步驟確保擁有最新專案狀態。

---

## 🚀 方法一: 自動初始化 (推薦)

在終端機中執行:

```bash
./.claude-session-init.sh
```

**腳本會自動**:
- ✅ 從 GitHub 拉取最新 `PROJECT-CONTINUATION.md`
- ✅ 顯示當前 Git 分支和最新提交
- ✅ 檢查未提交的變更
- ✅ 顯示快速開始選單

**輸出範例**:
```
🚀 正在初始化 Claude Code Session...
📥 正在從 GitHub 拉取最新專案狀態...
✅ 已更新 PROJECT-CONTINUATION.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 專案當前狀態
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌿 分支: main
📝 最新提交: bd300b0 Add project continuation guide

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 快速開始
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

輸入以下關鍵字之一開始工作:

  📌 繼續執行專案    - 接續上次進度
  🔍 查看專案狀態    - 檢視當前階段
  📋 查看待辦事項    - 顯示 TODO 清單
  📖 閱讀指南        - 查看完整文檔

✨ Session 已準備就緒！
```

---

## 🔧 方法二: 手動更新

```bash
# 1. 拉取最新變更
git fetch origin main

# 2. 僅更新 PROJECT-CONTINUATION.md
git checkout origin/main -- PROJECT-CONTINUATION.md

# 3. 在 Claude Code 中輸入關鍵字
# "繼續執行專案"
```

---

## 📝 完整工作流程

### 1️⃣ 開啟新終端機
```bash
cd /Users/morrislin/Desktop/ai-agent-team-v1/ai-agent-team-v1
./.claude-session-init.sh
```

### 2️⃣ 在 Claude Code 中輸入關鍵字
```
繼續執行專案
```

### 3️⃣ AI 會自動回應
- 讀取 `PROJECT-CONTINUATION.md`
- 了解當前專案狀態 (Phase 1-3 已完成)
- 詢問你要執行的任務優先級

### 4️⃣ 執行任務
```
執行優先級 1  # 配置環境
執行優先級 2  # 設置 NAS cron
執行優先級 3  # 測試系統
執行優先級 4  # 部署準備
```

---

## 🔄 更新專案狀態指南

**當你完成新的階段後**，更新 `PROJECT-CONTINUATION.md`:

1. **更新已完成階段**
   ```markdown
   ### Phase 4: 新階段名稱 ✅
   - [x] 完成的任務 1
   - [x] 完成的任務 2
   ```

2. **更新當前待辦事項**
   ```markdown
   ### 優先級 1: 新的任務
   - [ ] 待執行任務 1
   - [ ] 待執行任務 2
   ```

3. **提交並推送**
   ```bash
   git add PROJECT-CONTINUATION.md
   git commit -m "Update project status: completed Phase 4"
   git push
   ```

4. **下次開啟新終端機時**
   ```bash
   ./.claude-session-init.sh
   # 會自動拉取最新狀態
   ```

---

## 🎨 自訂關鍵字

你可以在 `PROJECT-CONTINUATION.md` 中自訂觸發關鍵字:

| 關鍵字 | 用途 |
|--------|------|
| `繼續執行專案` | 接續上次進度，執行下一個待辦事項 |
| `查看專案狀態` | 顯示當前階段和已完成工作 |
| `查看待辦事項` | 列出所有 TODO (優先級 1-4) |
| `執行優先級 N` | 直接執行特定優先級的任務 |
| `查看成本分析` | 顯示 COST-ANALYSIS.md 摘要 |
| `查看 Multi-LLM 指南` | 顯示 docs/multi-llm-guide.md |

---

## 🆘 故障排除

### 問題: 腳本執行權限被拒絕
```bash
# 解決方案
chmod +x .claude-session-init.sh
```

### 問題: git fetch 失敗
```bash
# 檢查遠端 repo
git remote -v

# 重新設定 origin
git remote set-url origin https://github.com/flymorris1230-ship-it/ai-agent-team-v1.git
```

### 問題: PROJECT-CONTINUATION.md 不存在
```bash
# 從 GitHub 直接下載
curl -o PROJECT-CONTINUATION.md https://raw.githubusercontent.com/flymorris1230-ship-it/ai-agent-team-v1/main/PROJECT-CONTINUATION.md
```

---

## 💡 進階用法

### 設定別名 (Alias)
在 `~/.zshrc` 或 `~/.bashrc` 中添加:

```bash
alias claude-init="cd /Users/morrislin/Desktop/ai-agent-team-v1/ai-agent-team-v1 && ./.claude-session-init.sh"
```

重新載入配置:
```bash
source ~/.zshrc  # 或 source ~/.bashrc
```

之後只需輸入:
```bash
claude-init
```

---

## 📚 相關文檔

- `PROJECT-CONTINUATION.md` - 專案繼續執行指南 (主文檔)
- `COST-ANALYSIS.md` - 成本分析報告
- `docs/multi-llm-guide.md` - Multi-LLM 使用指南
- `CLAUDE.md` - 開發規範
- `README.md` - 專案介紹

---

**🎯 記住**: 每次開啟新終端機 → 執行 `./.claude-session-init.sh` → 輸入 "繼續執行專案"
