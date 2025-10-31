#!/bin/bash

# ========================================
# 数据库备份脚本 (Linux/Mac)
# GUNT生产管理系统
# ========================================

# 设置变量
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-Hota@123456}"
DB_NAME="${DB_NAME:-gunt_db}"
BACKUP_DIR="../backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/gunt_db_${TIMESTAMP}.sql"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "  数据库备份脚本"
echo "  GUNT生产管理系统"
echo "========================================"
echo ""

# 创建备份目录
mkdir -p "${BACKUP_DIR}"

# 检查mysqldump命令
echo "[1/4] 检查MySQL命令..."
if ! command -v mysqldump &> /dev/null; then
    echo -e "${RED}❌ 错误: 未找到mysqldump命令${NC}"
    echo "请安装MySQL客户端工具"
    exit 1
fi

echo -e "${GREEN}✅ mysqldump 命令已找到${NC}"
echo ""

# 执行备份
echo "[2/4] 开始备份数据库..."
echo "数据库: ${DB_NAME}"
echo "备份文件: ${BACKUP_FILE}"
echo ""

mysqldump --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --user="${DB_USER}" \
    --password="${DB_PASSWORD}" \
    --single-transaction \
    --quick \
    --lock-tables=false \
    --routines \
    --triggers \
    --events \
    --set-gtid-purged=OFF \
    --default-character-set=utf8mb4 \
    "${DB_NAME}" > "${BACKUP_FILE}" 2>/dev/null

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 备份失败！${NC}"
    echo "请检查数据库连接信息是否正确"
    exit 1
fi

echo -e "${GREEN}✅ 数据库备份成功${NC}"
echo ""

# 压缩备份文件
echo "[3/4] 压缩备份文件..."
if command -v gzip &> /dev/null; then
    gzip -9 "${BACKUP_FILE}"
    BACKUP_FILE="${BACKUP_FILE}.gz"
    echo -e "${GREEN}✅ 压缩完成${NC}"
else
    echo -e "${YELLOW}⚠️  未找到gzip，跳过压缩${NC}"
fi
echo ""

# 清理旧备份（保留最近7天）
echo "[4/4] 清理旧备份（保留最近7天）..."
find "${BACKUP_DIR}" -name "gunt_db_*.sql*" -type f -mtime +7 -delete 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 旧备份已清理${NC}"
else
    echo "ℹ️  没有需要清理的旧备份"
fi
echo ""

# 获取备份文件大小
if [ -f "${BACKUP_FILE}" ]; then
    FILESIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
else
    FILESIZE="未知"
fi

echo "========================================"
echo "  ✅ 备份完成！"
echo "========================================"
echo ""
echo "备份信息:"
echo "  文件: ${BACKUP_FILE}"
echo "  大小: ${FILESIZE}"
echo "  时间: $(date)"
echo ""
echo "备份目录: ${BACKUP_DIR}"
echo ""
echo "========================================"

