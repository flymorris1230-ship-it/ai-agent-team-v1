#!/bin/bash

# ==========================================
# Safe GitHub Push Script
# ==========================================

echo "🔐 GitHub 推送腳本"
echo "=================="
echo ""

# 檢查是否有未提交的更改
if [[ -n $(git status -s) ]]; then
    echo "⚠️  有未提交的更改"
    git status -s
    echo ""
    read -p "要先提交嗎？(y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .
        read -p "提交訊息: " commit_msg
        git commit -m "$commit_msg"
    fi
fi

echo ""
echo "📤 準備推送到 GitHub..."
echo "倉庫: https://github.com/flymorris1230-ship-it/ai-agent-team-v1.git"
echo ""
echo "⚠️  如果是第一次推送，系統會要求您輸入："
echo "   Username: flymorris1230-ship-it"
echo "   Password: <您的 Personal Access Token>"
echo ""
echo "🔒 Token 會安全儲存，下次不需要再輸入"
echo ""

read -p "繼續推送？(y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "已取消"
    exit 0
fi

echo ""
echo "推送中..."

# 推送到 GitHub
git push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 成功推送到 GitHub！"
    echo ""
    echo "🌐 查看您的倉庫:"
    echo "   https://github.com/flymorris1230-ship-it/ai-agent-team-v1"
else
    echo ""
    echo "❌ 推送失敗"
    echo ""
    echo "可能的原因："
    echo "1. Token 無效或已過期"
    echo "2. 網路連線問題"
    echo "3. 倉庫權限問題"
    echo ""
    echo "請重新創建 Token 並再試一次"
fi
