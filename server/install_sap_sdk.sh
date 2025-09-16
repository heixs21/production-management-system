#!/bin/bash

echo "SAP NetWeaver RFC SDK 安装脚本"
echo "=============================="

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
    echo "请使用sudo运行此脚本"
    exit 1
fi

# 创建SAP目录
echo "1. 创建SAP目录..."
mkdir -p /usr/local/sap

# 检查是否已有SDK文件
if [ -d "/usr/local/sap/nwrfcsdk" ]; then
    echo "⚠️  SAP SDK目录已存在，是否重新安装？(y/n)"
    read -r response
    if [[ "$response" != "y" ]]; then
        echo "跳过SDK安装"
        exit 0
    fi
    rm -rf /usr/local/sap/nwrfcsdk
fi

echo "2. 下载SAP NetWeaver RFC SDK..."
echo "由于SAP SDK需要SAP账户下载，请手动完成以下步骤："
echo ""
echo "📋 手动安装步骤："
echo "1. 访问: https://support.sap.com/en/product/connectors/nwrfcsdk.html"
echo "2. 登录SAP账户"
echo "3. 下载适合Linux x86_64的SDK (nwrfcsdk-7.50.x-linux-x64.zip)"
echo "4. 将下载的文件放到当前目录"
echo ""

# 检查是否有SDK文件
SDK_FILE=""
for file in nwrfcsdk*.zip; do
    if [ -f "$file" ]; then
        SDK_FILE="$file"
        break
    fi
done

if [ -z "$SDK_FILE" ]; then
    echo "❌ 未找到SDK文件，请先下载SDK"
    echo "将SDK文件放到当前目录后重新运行此脚本"
    exit 1
fi

echo "3. 找到SDK文件: $SDK_FILE"
echo "4. 解压SDK..."

# 安装unzip（如果没有）
apt update
apt install -y unzip

# 解压SDK
unzip -q "$SDK_FILE" -d /usr/local/sap/

# 检查解压结果
if [ ! -d "/usr/local/sap/nwrfcsdk" ]; then
    echo "❌ SDK解压失败"
    exit 1
fi

echo "5. 设置权限..."
chmod -R 755 /usr/local/sap/nwrfcsdk

echo "6. 配置环境变量..."
# 添加到系统环境变量
cat > /etc/environment.d/sap-rfc.conf << EOF
SAPNWRFC_HOME=/usr/local/sap/nwrfcsdk
LD_LIBRARY_PATH=/usr/local/sap/nwrfcsdk/lib:\$LD_LIBRARY_PATH
EOF

# 添加到当前会话
export SAPNWRFC_HOME=/usr/local/sap/nwrfcsdk
export LD_LIBRARY_PATH=/usr/local/sap/nwrfcsdk/lib:$LD_LIBRARY_PATH

# 添加到ldconfig
echo "/usr/local/sap/nwrfcsdk/lib" > /etc/ld.so.conf.d/sap-rfc.conf
ldconfig

echo "7. 验证安装..."
if [ -f "/usr/local/sap/nwrfcsdk/lib/libsapnwrfc.so" ]; then
    echo "✅ SAP SDK安装成功"
    echo "SDK路径: /usr/local/sap/nwrfcsdk"
    echo "库文件: $(ls /usr/local/sap/nwrfcsdk/lib/libsap*.so)"
else
    echo "❌ SAP SDK安装失败"
    exit 1
fi

echo ""
echo "8. 重新安装pyrfc..."
# 切换到普通用户安装pyrfc
sudo -u $SUDO_USER pip3 uninstall -y pyrfc
sudo -u $SUDO_USER pip3 install pyrfc

echo ""
echo "✅ 安装完成！"
echo "请重新登录或运行以下命令使环境变量生效："
echo "source /etc/environment"
echo "export SAPNWRFC_HOME=/usr/local/sap/nwrfcsdk"
echo "export LD_LIBRARY_PATH=/usr/local/sap/nwrfcsdk/lib:\$LD_LIBRARY_PATH"