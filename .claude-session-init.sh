#!/bin/bash
# Claude Code Session 初始化腳本
# 每次開啟新終端機時執行此腳本，確保擁有最新的專案狀態

set -e

echo "🚀 正在初始化 Claude Code Session..."
echo ""

# 1. 檢查是否在 git repo 中
if [ ! -d .git ]; then
    echo "❌ 錯誤: 不在 git repository 中"
    echo "請先執行: git init && git remote add origin <repo-url>"
    exit 1
fi

# 2. 拉取最新的 PROJECT-CONTINUATION.md
echo "📥 正在從 GitHub 拉取最新專案狀態..."
git fetch origin main

# 3. 僅更新 PROJECT-CONTINUATION.md (避免覆蓋本地修改)
if git show origin/main:PROJECT-CONTINUATION.md > /dev/null 2>&1; then
    git checkout origin/main -- PROJECT-CONTINUATION.md
    echo "✅ 已更新 PROJECT-CONTINUATION.md"
else
    echo "⚠️  GitHub 上找不到 PROJECT-CONTINUATION.md"
fi

# 4. 顯示當前專案狀態
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 專案當前狀態"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Git 狀態
CURRENT_BRANCH=$(git branch --show-current)
LATEST_COMMIT=$(git log -1 --oneline 2>/dev/null || echo "無提交記錄")
echo "🌿 分支: $CURRENT_BRANCH"
echo "📝 最新提交: $LATEST_COMMIT"

# 檢查未提交的變更
UNCOMMITTED=$(git status --short | wc -l | tr -d ' ')
if [ "$UNCOMMITTED" -gt 0 ]; then
    echo "⚠️  有 $UNCOMMITTED 個未提交的變更"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 快速開始"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "輸入以下關鍵字之一開始工作:"
echo ""
echo "  📌 繼續執行專案    - 接續上次進度"
echo "  🔍 查看專案狀態    - 檢視當前階段"
echo "  📋 查看待辦事項    - 顯示 TODO 清單"
echo "  📖 閱讀指南        - 查看完整文檔"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✨ Session 已準備就緒！"
echo ""
