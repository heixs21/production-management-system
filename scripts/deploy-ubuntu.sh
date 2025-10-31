#!/bin/bash
# Ubuntu服务器一键部署脚本

echo "========================================="
echo "  GUNT生产管理系统 - Ubuntu部署脚本"
echo "========================================="

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. 拉取最新代码
echo -e "${YELLOW}[1/7] 拉取最新代码...${NC}"
git pull origin test
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Git拉取失败！${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 代码拉取成功${NC}"

# 2. 安装前端依赖
echo -e "${YELLOW}[2/7] 安装前端依赖...${NC}"
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 前端依赖安装失败！${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 前端依赖安装完成${NC}"

# 3. 安装后端依赖
echo -e "${YELLOW}[3/7] 安装后端依赖...${NC}"
cd server
npm install
cd ..
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 后端依赖安装失败！${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 后端依赖安装完成${NC}"

# 4. 编译Tailwind CSS
echo -e "${YELLOW}[4/7] 编译Tailwind CSS...${NC}"
npx tailwindcss -i ./src/index.css -o ./src/tailwind-output.css --minify
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Tailwind CSS编译失败！${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Tailwind CSS编译完成${NC}"

# 5. 构建前端
echo -e "${YELLOW}[5/7] 构建前端...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 前端构建失败！${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 前端构建完成${NC}"

# 6. 数据库优化（可选，询问用户）
echo -e "${YELLOW}[6/7] 是否运行数据库优化脚本？(添加索引等)${NC}"
read -p "输入 y 运行，其他键跳过: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}请输入MySQL密码：${NC}"
    mysql -u root -p < server/database-optimization.sql
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 数据库优化完成${NC}"
    else
        echo -e "${RED}⚠️  数据库优化失败，但可以继续${NC}"
    fi
else
    echo -e "${YELLOW}⏭️  跳过数据库优化${NC}"
fi

# 7. 重启服务
echo -e "${YELLOW}[7/7] 重启后端服务...${NC}"
cd server

# 检查pm2是否已安装
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ PM2未安装！正在安装...${NC}"
    sudo npm install -g pm2
fi

# 重启或启动服务
pm2 describe gunt-server > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${YELLOW}重启现有服务...${NC}"
    pm2 restart gunt-server
else
    echo -e "${YELLOW}首次启动服务...${NC}"
    pm2 start server.js --name gunt-server
fi

# 保存pm2配置
pm2 save

cd ..

echo -e "${GREEN}"
echo "========================================="
echo "  ✅ 部署完成！"
echo "========================================="
echo -e "${NC}"
echo "📊 查看服务状态: pm2 status"
echo "📋 查看日志: pm2 logs gunt-server"
echo "🔄 重启服务: pm2 restart gunt-server"
echo "⏹️  停止服务: pm2 stop gunt-server"
echo ""
echo "🌐 访问地址: http://你的服务器IP:3000"
echo ""

