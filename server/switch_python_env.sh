#!/bin/bash

echo "Python环境切换工具"
echo "=================="

# 显示当前Python环境
echo "当前Python环境:"
echo "  python3: $(which python3)"
echo "  pip3: $(which pip3)"
echo ""

# 选择环境类型
echo "请选择要切换的环境:"
echo "1) 全局环境 (系统默认)"
echo "2) 虚拟环境 (创建新的)"
echo "3) 虚拟环境 (使用现有的)"
echo "4) 指定Python路径"
echo ""

read -p "请输入选择 (1-4): " choice

case $choice in
    1)
        echo "切换到全局环境..."
        # 清除环境变量
        sed -i '/^PYTHON_PATH=/d' .env
        echo "✅ 已切换到全局环境"
        ;;
    2)
        read -p "请输入虚拟环境名称 (默认: gunt_env): " venv_name
        venv_name=${venv_name:-gunt_env}
        
        echo "创建虚拟环境: $venv_name"
        python3 -m venv $venv_name
        
        echo "激活虚拟环境并安装依赖..."
        source $venv_name/bin/activate
        pip install pyrfc==3.3
        
        # 更新.env文件
        python_path="$(pwd)/$venv_name/bin/python"
        sed -i '/^PYTHON_PATH=/d' .env
        echo "PYTHON_PATH=$python_path" >> .env
        
        echo "✅ 虚拟环境创建完成: $python_path"
        echo "💡 重启Node.js服务器以应用更改"
        ;;
    3)
        read -p "请输入现有虚拟环境路径: " venv_path
        if [ -f "$venv_path/bin/python" ]; then
            # 更新.env文件
            sed -i '/^PYTHON_PATH=/d' .env
            echo "PYTHON_PATH=$venv_path/bin/python" >> .env
            echo "✅ 已切换到虚拟环境: $venv_path/bin/python"
            echo "💡 重启Node.js服务器以应用更改"
        else
            echo "❌ 虚拟环境不存在: $venv_path"
        fi
        ;;
    4)
        read -p "请输入Python可执行文件的完整路径: " python_path
        if [ -f "$python_path" ]; then
            # 更新.env文件
            sed -i '/^PYTHON_PATH=/d' .env
            echo "PYTHON_PATH=$python_path" >> .env
            echo "✅ 已设置Python路径: $python_path"
            echo "💡 重启Node.js服务器以应用更改"
        else
            echo "❌ Python路径不存在: $python_path"
        fi
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

echo ""
echo "当前.env配置:"
grep "PYTHON_PATH" .env || echo "  使用系统默认Python"