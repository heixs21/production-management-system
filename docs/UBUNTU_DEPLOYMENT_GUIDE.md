# 🚀 Ubuntu服务器部署指南

## 简介

本指南用于将GUNT生产管理系统（新架构）部署到Ubuntu服务器。

---

## 📋 部署前准备

### 1. 确认服务器环境
- ✅ Ubuntu 18.04+ 
- ✅ Node.js 16+ 
- ✅ MySQL 5.7+
- ✅ Git
- ✅ Nginx（可选）

### 2. 本地推送代码
```bash
# Windows本地
git add .
git commit -m "完成架构重构和性能优化"
git push origin test
```

---

## 🔧 一键部署（推荐）

### 方法一：使用部署脚本

```bash
# 在Ubuntu服务器上
cd /path/to/GUNT
chmod +x deploy-ubuntu.sh
./deploy-ubuntu.sh
```

脚本会自动完成：
- ✅ 拉取最新代码
- ✅ 安装前后端依赖
- ✅ 编译Tailwind CSS
- ✅ 构建前端
- ✅ （可选）运行数据库优化
- ✅ 重启PM2服务

---

## 📝 手动部署步骤

如果你想手动控制每一步：

### 步骤1: 拉取代码
```bash
cd /path/to/GUNT
git pull origin test
```

### 步骤2: 安装前端依赖
```bash
npm install
```

**新增依赖包括：**
- `zustand@^4.5.7` - 状态管理
- `@tanstack/react-query@^5.56.2` - 数据缓存
- `react-window@^1.8.11` - 虚拟滚动
- `eslint-plugin-react-hooks@^7.0.1` - ESLint插件

### 步骤3: 安装后端依赖
```bash
cd server
npm install
cd ..
```

### 步骤4: 编译Tailwind CSS（必须！）
```bash
npx tailwindcss -i ./src/index.css -o ./src/tailwind-output.css --minify
```

**为什么必须？**
- 新UI组件使用了大量Tailwind类（渐变色、动画等）
- 不编译会导致样式丢失，KPI卡片显示为空白

### 步骤5: 构建前端
```bash
npm run build
```

### 步骤6: 数据库优化（推荐）
```bash
# 为orders、machines等表添加索引
mysql -u root -p your_database < server/database-optimization.sql
```

**优化内容：**
- 为常用查询字段添加索引（status, startDate, machine等）
- 添加全文搜索索引（orderNo, materialNo, materialName）
- 为关联查询添加复合索引

### 步骤7: 重启服务

#### 使用PM2（推荐）
```bash
cd server

# 如果是第一次部署
pm2 start server.js --name gunt-server

# 如果已经部署过
pm2 restart gunt-server

# 保存PM2配置
pm2 save

# 设置开机自启
pm2 startup
```

#### 使用systemd
```bash
sudo systemctl restart gunt-server
```

---

## 🔍 验证部署

### 1. 检查服务状态
```bash
pm2 status
pm2 logs gunt-server
```

### 2. 检查端口
```bash
# 前端（默认3000）
netstat -tuln | grep 3000

# 后端API（默认12454）
netstat -tuln | grep 12454
```

### 3. 测试访问
```bash
# 测试后端API
curl http://localhost:12454/api/health

# 浏览器访问
http://你的服务器IP:3000
```

### 4. 验证新功能

登录系统后检查：
- ✅ **KPI彩色卡片**是否正常显示（顶部4个渐变色卡片）
- ✅ **加载速度**是否提升（虚拟滚动、分页）
- ✅ **Toast通知**是否正常弹出
- ✅ **骨架屏**加载动画是否显示
- ✅ **工单管理**页面数据是否正常
- ✅ **机台管理**页面数据是否正常

---

## ⚠️ 常见问题

### 问题1: KPI卡片显示空白
**原因：** Tailwind CSS未编译

**解决：**
```bash
npx tailwindcss -i ./src/index.css -o ./src/tailwind-output.css --minify
npm run build
pm2 restart gunt-server
```

### 问题2: 页面加载后没有数据
**原因：** 新架构需要显式调用loadData函数

**解决：** 确保已拉取最新代码（包含修复）

### 问题3: npm install失败
**原因：** 网络问题或权限问题

**解决：**
```bash
# 使用国内镜像
npm install --registry=https://registry.npmmirror.com

# 清除缓存
npm cache clean --force
npm install
```

### 问题4: 数据库优化脚本报错
**原因：** 索引可能已存在

**解决：** 这是正常的，可以忽略重复索引的错误

### 问题5: PM2服务无法启动
**原因：** 端口被占用

**解决：**
```bash
# 查找占用端口的进程
lsof -i :12454
# 杀死进程
kill -9 <PID>
# 重启服务
pm2 restart gunt-server
```

---

## 🔄 回滚到旧版本

如果新架构有问题，可以回滚：

```bash
# 1. 切换到之前的commit
git log --oneline  # 查看提交历史
git checkout <旧版本commit-hash>

# 2. 重新部署
npm install
npm run build
pm2 restart gunt-server
```

---

## 📊 性能监控

### 数据库性能监控
```bash
# 查看慢查询日志
mysql -u root -p -e "SHOW VARIABLES LIKE 'slow_query_log%';"

# 查看索引使用情况
curl http://localhost:12454/api/database/index-usage
```

### 应用性能监控
```bash
# 查看PM2监控
pm2 monit

# 查看内存使用
pm2 status
```

---

## 🔐 安全建议

1. **修改默认端口**
```bash
# 编辑 server/.env
PORT=自定义端口
```

2. **启用HTTPS**
```bash
# Nginx反向代理配置
# 参考 DEPLOYMENT.md
```

3. **定期备份数据库**
```bash
# 使用提供的备份脚本
cd server/scripts
./backup-database.sh
```

4. **更新依赖**
```bash
# 定期检查安全更新
npm audit
npm audit fix
```

---

## 📞 支持

如遇问题，请查看：
- 📖 `DEPLOYMENT_CHECKLIST.md` - 详细部署清单
- 📖 `OPTIMIZATION_COMPLETE.md` - 优化总结
- 📖 `DATABASE_OPTIMIZATION.md` - 数据库优化详情
- 📖 `TROUBLESHOOTING.md` - 故障排除指南

---

## ✅ 部署完成检查清单

- [ ] 代码拉取成功
- [ ] 前后端依赖安装完成
- [ ] Tailwind CSS编译完成
- [ ] 前端构建成功
- [ ] 数据库优化已运行
- [ ] PM2服务正常运行
- [ ] 网页可以正常访问
- [ ] KPI卡片显示正常
- [ ] 工单管理页面数据正常
- [ ] 机台管理页面数据正常
- [ ] 性能明显提升

---

**部署愉快！** 🎉

