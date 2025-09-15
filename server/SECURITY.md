# 安全配置指南

## Token安全措施

### 1. 加密存储
- 所有Token在内存中加密存储
- 使用AES-256-CBC加密算法
- 每次启动生成新的加密密钥

### 2. 自动过期
- Token默认30分钟过期
- 过期后自动清除
- 定期清理过期Token

### 3. 内存存储
- Token仅存储在内存中
- 进程重启后自动清除
- 不写入日志文件

### 4. 敏感信息保护
- 错误日志中隐藏敏感信息
- API响应中不返回完整Token
- 登录失败不显示详细错误

## 环境变量配置

### 必须配置的敏感信息
```bash
# WMS系统账号（生产环境请使用专用账号）
WMS_USERNAME=your_wms_username
WMS_PASSWORD=your_strong_password

# SAP系统账号
SAP_USERNAME=your_sap_username  
SAP_PASSWORD=your_strong_password

# MES系统账号
MES_USERNAME=your_mes_username
MES_PASSWORD=your_strong_password

# 数据库密码
DB_PASSWORD=your_strong_db_password
```

## 生产环境安全建议

### 1. 账号安全
- 使用专用服务账号，避免使用个人账号
- 定期更换密码
- 设置账号权限最小化原则

### 2. 网络安全
- 配置防火墙，只开放必要端口
- 使用HTTPS（如果支持）
- 限制访问IP范围

### 3. 系统安全
- 定期更新依赖包
- 监控异常访问
- 备份重要数据

### 4. 日志安全
- 不在日志中记录密码和Token
- 定期清理日志文件
- 监控异常登录

## Token管理API

### WMS系统
```
GET /api/wms/token-status    # 查询Token状态
POST /api/wms/clear-token    # 清除Token
POST /api/wms/update-quantities  # 更新报工数量
```

### SAP系统
```
GET /api/sap/token-status     # 查询Token状态
POST /api/sap/clear-token     # 清除Token
POST /api/sap/refresh-auth    # 刷新认证
POST /api/sap/order-material  # 获取工单物料信息
```

### MES系统
```
GET /api/mes/token-status     # 查询Token状态
POST /api/mes/clear-token     # 清除Token
POST /api/mes/refresh-token   # 刷新Token
POST /api/mes/workOrder       # 下达ERP工单
```

## 故障排除

### Token相关问题
1. 如果WMS连接失败，检查账号密码是否正确
2. 如果Token过期，系统会自动重新获取
3. 如果需要强制刷新，可调用清除Token API

### 安全事件处理
1. 发现异常访问立即更换密码
2. 重启服务清除所有内存中的Token
3. 检查日志文件是否有敏感信息泄露