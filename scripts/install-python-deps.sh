#!/bin/bash

###############################################################################
# PostgreSQL HTTP Proxy - Python Dependencies Installation Script
#
# 用途：在 Synology NAS 上安裝 Python 和 psycopg2 依賴
# 使用方式：
#   1. 上傳此腳本到 NAS: /volume1/docker/postgres-proxy/
#   2. 賦予執行權限: chmod +x install-python-deps.sh
#   3. 執行: sudo ./install-python-deps.sh
###############################################################################

set -e  # 遇到錯誤立即退出

echo "======================================================================"
echo "🚀 PostgreSQL HTTP Proxy Dependencies Installer"
echo "======================================================================"
echo ""

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 檢查 root 權限
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ 請使用 sudo 執行此腳本${NC}"
    echo "   sudo ./install-python-deps.sh"
    exit 1
fi

echo -e "${GREEN}✅ Root 權限檢查通過${NC}"
echo ""

# 步驟 1: 檢查 Python
echo "======================================================================"
echo "📍 步驟 1/4: 檢查 Python 安裝"
echo "======================================================================"

if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✅ Python 已安裝: $PYTHON_VERSION${NC}"
    PYTHON_CMD="python3"
else
    echo -e "${RED}❌ Python 未安裝${NC}"
    echo ""
    echo "請通過以下方式安裝 Python："
    echo "1. DSM 套件中心 → 搜索 'Python' → 安裝 'Python 3'"
    echo "2. 或使用 apt-get (需要 Entware):"
    echo "   opkg install python3"
    exit 1
fi

echo ""

# 步驟 2: 檢查/安裝 pip
echo "======================================================================"
echo "📍 步驟 2/4: 檢查 pip 安裝"
echo "======================================================================"

if command -v pip3 &> /dev/null; then
    PIP_VERSION=$(pip3 --version)
    echo -e "${GREEN}✅ pip 已安裝: $PIP_VERSION${NC}"
else
    echo -e "${YELLOW}⚠️  pip 未安裝，正在安裝...${NC}"

    # 下載 get-pip.py
    if [ -f "get-pip.py" ]; then
        rm get-pip.py
    fi

    echo "📥 下載 get-pip.py..."
    wget -q https://bootstrap.pypa.io/get-pip.py

    if [ $? -eq 0 ]; then
        echo "🔧 安裝 pip..."
        $PYTHON_CMD get-pip.py

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ pip 安裝成功${NC}"
            rm get-pip.py
        else
            echo -e "${RED}❌ pip 安裝失敗${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ 下載 get-pip.py 失敗${NC}"
        echo "   請檢查網絡連接"
        exit 1
    fi
fi

echo ""

# 步驟 3: 升級 pip
echo "======================================================================"
echo "📍 步驟 3/4: 升級 pip"
echo "======================================================================"

echo "🔄 升級 pip 到最新版本..."
pip3 install --upgrade pip --quiet

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ pip 升級成功${NC}"
else
    echo -e "${YELLOW}⚠️  pip 升級失敗，使用現有版本${NC}"
fi

echo ""

# 步驟 4: 安裝 psycopg2-binary
echo "======================================================================"
echo "📍 步驟 4/4: 安裝 psycopg2-binary"
echo "======================================================================"

echo "📦 檢查 psycopg2 是否已安裝..."

if $PYTHON_CMD -c "import psycopg2" 2>/dev/null; then
    PSYCOPG2_VERSION=$($PYTHON_CMD -c "import psycopg2; print(psycopg2.__version__)")
    echo -e "${GREEN}✅ psycopg2 已安裝: $PSYCOPG2_VERSION${NC}"

    echo ""
    read -p "是否重新安裝最新版本？ (y/N): " -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "⏭️  跳過安裝"
    else
        echo "🔄 重新安裝 psycopg2-binary..."
        pip3 install --upgrade psycopg2-binary

        if [ $? -eq 0 ]; then
            NEW_VERSION=$($PYTHON_CMD -c "import psycopg2; print(psycopg2.__version__)")
            echo -e "${GREEN}✅ psycopg2 更新成功: $NEW_VERSION${NC}"
        else
            echo -e "${RED}❌ psycopg2 更新失敗${NC}"
            exit 1
        fi
    fi
else
    echo "📥 安裝 psycopg2-binary..."
    echo "   這可能需要幾分鐘時間..."

    # 嘗試使用國內鏡像源（更快）
    echo "🌏 嘗試使用清華鏡像源..."
    pip3 install psycopg2-binary -i https://pypi.tuna.tsinghua.edu.cn/simple

    if [ $? -ne 0 ]; then
        echo "⚠️  鏡像源失敗，使用官方源..."
        pip3 install psycopg2-binary
    fi

    if [ $? -eq 0 ]; then
        PSYCOPG2_VERSION=$($PYTHON_CMD -c "import psycopg2; print(psycopg2.__version__)")
        echo -e "${GREEN}✅ psycopg2 安裝成功: $PSYCOPG2_VERSION${NC}"
    else
        echo -e "${RED}❌ psycopg2 安裝失敗${NC}"
        echo ""
        echo "可能原因："
        echo "1. 網絡連接問題"
        echo "2. 缺少編譯工具（libpq-dev, gcc）"
        echo ""
        echo "建議："
        echo "1. 檢查網絡連接"
        echo "2. 嘗試手動安裝: pip3 install psycopg2-binary"
        exit 1
    fi
fi

echo ""

# 驗證安裝
echo "======================================================================"
echo "✅ 驗證安裝"
echo "======================================================================"

echo "🔍 測試 psycopg2 導入..."

$PYTHON_CMD -c "
import psycopg2
from psycopg2 import pool
print('✅ psycopg2 模塊導入成功')
print(f'📦 版本: {psycopg2.__version__}')
" 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "======================================================================"
    echo -e "${GREEN}🎉 所有依賴安裝完成！${NC}"
    echo "======================================================================"
    echo ""
    echo "已安裝的套件："
    echo "  • Python: $($PYTHON_CMD --version)"
    echo "  • pip: $(pip3 --version | cut -d' ' -f1-2)"
    echo "  • psycopg2: $($PYTHON_CMD -c 'import psycopg2; print(psycopg2.__version__)')"
    echo ""
    echo "📋 下一步："
    echo "  1. 確認 nas-postgres-proxy.py 已上傳"
    echo "  2. 創建 .env 環境變數文件"
    echo "  3. 運行 Proxy: python3 nas-postgres-proxy.py"
    echo ""
    echo "或使用 Task Scheduler 設定自動啟動"
    echo ""
else
    echo ""
    echo -e "${RED}❌ 驗證失敗${NC}"
    echo "   請檢查安裝過程中的錯誤訊息"
    exit 1
fi

exit 0
