# MySQL数据库迁移指南

## 1. 安装MySQL

### Windows:
1. 下载MySQL Installer: https://dev.mysql.com/downloads/installer/
2. 选择"MySQL Server"进行安装
3. 设置root用户密码（请记住这个密码）

### 或者使用XAMPP:
1. 下载XAMPP: https://www.apachefriends.org/
2. 安装后启动MySQL服务

## 2. 配置数据库连接

1. 复制 `.env.example` 为 `.env`
2. 修改 `.env` 文件中的数据库配置：
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=你的MySQL密码
DB_NAME=gunt_db
```

## 3. 数据迁移

### 方法一：自动迁移（推荐）
```bash
# 修改 migrate-to-mysql.js 中的MySQL密码
# 然后运行：
node migrate-to-mysql.js
```

### 方法二：手动创建数据库
1. 登录MySQL：
```sql
mysql -u root -p
```

2. 创建数据库：
```sql
CREATE DATABASE gunt_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 4. 启动服务器

```bash
node server.js
```

## 5. 网络访问配置

### 让其他电脑访问：

1. **修改前端API配置** (`src/services/api.js`)：
```javascript
// 将localhost改为服务器电脑的IP地址
const API_BASE_URL = 'http://192.168.1.100:12454/api';
```

2. **配置防火墙**：
   - Windows: 允许端口12454通过防火墙
   - 或者临时关闭防火墙进行测试

3. **修改服务器CORS配置** (已在代码中配置)

## 6. 优势

✅ **多台电脑共享数据**：所有电脑连接同一个MySQL数据库
✅ **数据实时同步**：一台电脑修改，其他电脑立即看到更新
✅ **数据安全**：MySQL支持备份、事务等企业级功能
✅ **性能更好**：MySQL比SQLite在并发访问时性能更优

## 故障排除

### 连接失败：
1. 检查MySQL服务是否启动
2. 检查用户名密码是否正确
3. 检查防火墙设置

### 中文乱码：
- 确保数据库使用utf8mb4字符集（已在代码中配置）

### 网络访问问题：
1. 确认服务器IP地址
2. 检查防火墙设置
3. 确认端口12454未被占用
