# GitHub 同步設置

## 當前狀態

✅ 本地 Git 已配置
✅ 遠端倉庫：`git@github.com:flymorris1230-ship-it/ai-agent-team-v1.git`
❌ SSH 密鑰未設置（需要配置才能 push）

## 選項 1: 使用 SSH 密鑰（推薦）

### 步驟 1: 生成 SSH 密鑰

```bash
# 在 WSL/Linux 中生成 SSH 密鑰
ssh-keygen -t ed25519 -C "your_email@example.com"

# 按 Enter 使用預設位置 (~/.ssh/id_ed25519)
# 可以設置密碼保護（可選）
```

### 步驟 2: 複製公鑰

```bash
# 顯示公鑰內容
cat ~/.ssh/id_ed25519.pub

# 複製整個輸出內容
```

### 步驟 3: 添加到 GitHub

1. 訪問 https://github.com/settings/keys
2. 點擊 "New SSH key"
3. Title: 填入 "WSL Ubuntu" 或其他識別名稱
4. Key: 貼上剛才複製的公鑰
5. 點擊 "Add SSH key"

### 步驟 4: 測試連接

```bash
# 測試 SSH 連接
ssh -T git@github.com

# 應該看到：
# Hi flymorris1230-ship-it! You've successfully authenticated...
```

### 步驟 5: 推送到 GitHub

```bash
git push origin main
```

---

## 選項 2: 使用 HTTPS（替代方案）

如果不想設置 SSH，可以改用 HTTPS：

### 步驟 1: 更改遠端 URL

```bash
git remote set-url origin https://github.com/flymorris1230-ship-it/ai-agent-team-v1.git
```

### 步驟 2: 配置認證

```bash
# 設置 Git 憑證快取（避免每次輸入密碼）
git config --global credential.helper store
```

### 步驟 3: 推送（會要求輸入 GitHub 用戶名和 Token）

```bash
git push origin main

# 第一次會要求：
# Username: flymorris1230-ship-it
# Password: <使用 Personal Access Token，不是密碼>
```

### 創建 Personal Access Token

1. 訪問 https://github.com/settings/tokens
2. 點擊 "Generate new token" > "Generate new token (classic)"
3. 勾選權限：
   - `repo` (完整倉庫訪問)
4. 生成並複製 token
5. 在 git push 時使用此 token 作為密碼

---

## 選項 3: 使用 GitHub Desktop（最簡單）

1. 下載 GitHub Desktop for Windows
2. 登入您的 GitHub 帳號
3. Clone 倉庫或添加現有倉庫
4. 使用圖形介面 commit 和 push

---

## 推薦方案

**對於 WSL 使用者（您的環境）：選項 1 (SSH)**

原因：
- ✅ 一次設置，永久使用
- ✅ 更安全
- ✅ 無需記住 token
- ✅ 速度更快

---

## 快速設置腳本

```bash
# 一鍵設置 SSH（執行後按照提示操作）
cat > ~/setup-github-ssh.sh << 'SCRIPT'
#!/bin/bash

echo "🔐 GitHub SSH 設置腳本"
echo ""

# 檢查是否已有 SSH 密鑰
if [ -f ~/.ssh/id_ed25519 ]; then
    echo "✅ SSH 密鑰已存在"
    echo "公鑰內容："
    cat ~/.ssh/id_ed25519.pub
else
    echo "生成新的 SSH 密鑰..."
    ssh-keygen -t ed25519 -C "$(git config user.email)"

    echo ""
    echo "✅ SSH 密鑰已生成"
    echo "公鑰內容："
    cat ~/.ssh/id_ed25519.pub
fi

echo ""
echo "📋 請執行以下步驟："
echo "1. 複製上面的公鑰（從 ssh-ed25519 開始到最後）"
echo "2. 訪問 https://github.com/settings/keys"
echo "3. 點擊 'New SSH key'"
echo "4. 貼上公鑰並保存"
echo "5. 回來執行: ssh -T git@github.com 測試"
echo "6. 執行: git push origin main"

SCRIPT

chmod +x ~/setup-github-ssh.sh
~/setup-github-ssh.sh
```

---

## 當前進度

✅ 已提交的內容：
- 混合架構設計
- NAS 整合方案
- Python 依賴清單

⏳ 等待推送到 GitHub

---

## 需要幫助？

選擇一個方案後告訴我，我可以：
1. 引導您完成 SSH 設置
2. 幫您切換到 HTTPS
3. 或者我們可以繼續開發，稍後再推送
