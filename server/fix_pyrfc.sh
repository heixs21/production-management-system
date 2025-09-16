#!/bin/bash

echo "PyRFC 修复工具"
echo "=============="

# 检查当前环境
echo "1. 检查Python环境..."
python3 --version
pip3 --version

# 检查pyrfc安装状态
echo -e "\n2. 检查pyrfc状态..."
python3 -c "
import sys
try:
    import pyrfc
    print('✅ pyrfc 已安装，版本:', pyrfc.__version__)
    try:
        from pyrfc import Connection
        print('✅ Connection 类可以导入')
    except ImportError as e:
        print('❌ Connection 类导入失败:', e)
        print('这通常意味着缺少SAP NetWeaver RFC SDK')
        sys.exit(1)
except ImportError:
    print('❌ pyrfc 未安装')
    sys.exit(1)
" 2>/dev/null

if [ $? -ne 0 ]; then
    echo -e "\n3. 尝试修复pyrfc..."
    
    # 卸载现有的pyrfc
    echo "卸载现有pyrfc..."
    pip3 uninstall -y pyrfc
    
    # 安装系统依赖
    echo "安装系统依赖..."
    sudo apt update
    sudo apt install -y build-essential python3-dev libssl-dev libffi-dev
    
    # 尝试不同的安装方法
    echo "尝试重新安装pyrfc..."
    
    # 方法1: 直接安装
    pip3 install pyrfc==3.3
    
    # 检查是否成功
    python3 -c "from pyrfc import Connection; print('✅ pyrfc 修复成功')" 2>/dev/null
    
    if [ $? -ne 0 ]; then
        echo "❌ 标准安装失败，尝试其他方法..."
        
        # 方法2: 使用conda（如果可用）
        if command -v conda &> /dev/null; then
            echo "尝试使用conda安装..."
            conda install -c conda-forge pyrfc
        fi
        
        # 方法3: 从源码编译
        echo "❌ 所有自动修复方法都失败了"
        echo ""
        echo "手动解决方案："
        echo "1. 下载SAP NetWeaver RFC SDK:"
        echo "   https://support.sap.com/en/product/connectors/nwrfcsdk.html"
        echo ""
        echo "2. 解压SDK到 /usr/local/sap/nwrfcsdk/"
        echo ""
        echo "3. 设置环境变量:"
        echo "   export SAPNWRFC_HOME=/usr/local/sap/nwrfcsdk"
        echo "   export LD_LIBRARY_PATH=\$SAPNWRFC_HOME/lib:\$LD_LIBRARY_PATH"
        echo ""
        echo "4. 重新安装pyrfc:"
        echo "   pip3 install pyrfc"
        echo ""
        exit 1
    fi
else
    echo "✅ pyrfc 工作正常"
fi

echo -e "\n4. 测试SAP连接..."
python3 -c "
import os
from pyrfc import Connection

# 测试连接参数
conn_params = {
    'ashost': '192.168.202.40',
    'sysnr': '00',
    'client': '100',
    'user': os.getenv('SAP_RFC_USERNAME', 'H11974'),
    'passwd': os.getenv('SAP_RFC_PASSWORD', 'Hota@20251313'),
    'lang': 'ZH'
}

try:
    print('尝试连接SAP系统...')
    with Connection(**conn_params) as conn:
        print('✅ SAP连接成功')
except Exception as e:
    print('❌ SAP连接失败:', str(e))
    print('请检查网络连接和SAP服务器状态')
"

echo -e "\n修复完成！"