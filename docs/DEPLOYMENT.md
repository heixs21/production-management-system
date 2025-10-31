# GUNT生产管理系统 - Git传输与Ubuntu部署教程

## 1. Git仓库设置与代码上传

### 1.1 初始化Git仓库（如果还没有）
```bash
# 在项目根目录执行
cd E:\Users\XXH\Desktop\GUNT
git init
git add .
git commit -m "Initial commit: GUNT production management system"
```

### 1.2 添加远程仓库
```bash
# 方式1：使用GitHub
git remote add origin https://github.com/yourusername/gunt-system.git

# 方式2：使用GitLab
git remote add origin https://gitlab.com/yourusername/gunt-system.git

# 方式3：使用Gitee（国内）
git remote add origin https://gitee.com/yourusername/gunt-system.git
```

### 1.3 推送代码到远程仓库
```bash
git branch -M main
git push -u origin main
```

## 2. Ubuntu服务器环境准备

### 2.1 更新系统
```bash
sudo apt update
sudo apt upgrade -y
```

### 2.2 安装Node.js和npm
```bash
# 安装Node.js 18.x LTS版本
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

### 2.3 安装MySQL
```bash
# 安装MySQL服务器
sudo apt install mysql-server -y

# 启动MySQL服务
sudo systemctl start mysql
sudo systemctl enable mysql

# 安全配置
sudo mysql_secure_installation
```

### 2.4 配置MySQL数据库
```bash
# 登录MySQL
sudo mysql -u root -p

# 创建数据库和用户
CREATE DATABASE gunt_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'gunt_user'@'localhost' IDENTIFIED BY 'your_password_here';
GRANT ALL PRIVILEGES ON gunt_db.* TO 'gunt_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 2.5 安装PM2（进程管理器）
```bash
sudo npm install -g pm2
```

## 3. 项目部署

### 3.1 克隆项目到服务器
```bash
# 切换到部署目录
cd /var/www

# 克隆项目
sudo git clone https://github.com/yourusername/gunt-system.git
sudo chown -R $USER:$USER gunt-system
cd gunt-system
```

### 3.2 安装依赖
```bash
# 安装前端依赖
npm install

# 安装后端依赖
cd server
npm install
cd ..
```

### 3.3 配置环境变量
```bash
# 创建后端环境配置文件
cd server
cp .env.example .env  # 如果有示例文件
# 或者直接创建
nano .env
```

在.env文件中添加：
```env
PORT=12454
DB_HOST=localhost
DB_USER=gunt_user
DB_PASSWORD=your_password_here
DB_NAME=gunt_db
NODE_ENV=production
```

### 3.4 构建前端项目
```bash
# 回到项目根目录
cd /var/www/gunt-system

# 构建生产版本
npm run build
```

### 3.5 启动后端服务
```bash
cd server

# 使用PM2启动后端服务
pm2 start server.js --name "gunt-backend"

# 设置PM2开机自启
pm2 startup
pm2 save
```

## 4. Nginx配置（可选，用于生产环境）

### 4.1 安装Nginx
```bash
sudo apt install nginx -y
```

### 4.2 配置Nginx
```bash
sudo nano /etc/nginx/sites-available/gunt-system
```

添加配置：
```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名或IP

    # 前端静态文件
    location / {
        root /var/www/gunt-system/build;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # 后端API代理
    location /api/ {
        proxy_pass http://localhost:12454;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4.3 启用站点
```bash
sudo ln -s /etc/nginx/sites-available/gunt-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 5. 项目更新流程

### 5.1 在开发机器上推送更新
```bash
# 提交更改
git add .
git commit -m "Update: description of changes"
git push origin main
```

### 5.2 在Ubuntu服务器上更新
```bash
# 进入项目目录
cd /var/www/gunt-system

# 拉取最新代码
git pull origin main

# 安装新依赖（如果有）
npm install
cd server && npm install && cd ..

# 重新构建前端
npm run build

# 重启后端服务
pm2 restart gunt-backend

# 如果使用Nginx，重新加载配置
sudo systemctl reload nginx
```

## 6. 监控和维护

### 6.1 查看服务状态
```bash
# 查看PM2进程
pm2 status
pm2 logs gunt-backend

# 查看Nginx状态
sudo systemctl status nginx

# 查看MySQL状态
sudo systemctl status mysql
```

### 6.2 备份数据库
```bash
# 创建备份脚本
nano backup_db.sh
```

添加内容：
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u gunt_user -p gunt_db > /var/backups/gunt_db_$DATE.sql
```

```bash
chmod +x backup_db.sh

# 设置定时备份（每天凌晨2点）
crontab -e
# 添加：0 2 * * * /var/www/gunt-system/backup_db.sh
```

## 7. 防火墙配置
```bash
# 允许HTTP和HTTPS
sudo ufw allow 80
sudo ufw allow 443

# 如果直接访问后端端口
sudo ufw allow 12454

# 启用防火墙
sudo ufw enable
```

## 8. SSL证书配置（可选）
```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取SSL证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo crontab -e
# 添加：0 12 * * * /usr/bin/certbot renew --quiet
```

## 故障排除

### 常见问题：
1. **端口被占用**：`sudo netstat -tulpn | grep :12454`
2. **权限问题**：`sudo chown -R $USER:$USER /var/www/gunt-system`
3. **MySQL连接失败**：检查.env配置和MySQL服务状态
4. **前端无法访问后端**：检查防火墙和Nginx配置

### 日志查看：
- PM2日志：`pm2 logs gunt-backend`
- Nginx日志：`sudo tail -f /var/log/nginx/error.log`
- MySQL日志：`sudo tail -f /var/log/mysql/error.log`