# SAP RFC 集成设置指南

## 概述
本系统已集成 SAP RFC 功能，可以直接从 SAP 系统获取工单详情，包括产成品信息和组件信息。

## 功能特性
- 输入工单号自动获取产成品物料号和名称
- 获取工单组件列表和描述
- 自动去除物料号前导零
- 支持组件描述存储到数据库

## 环境要求
1. Python 3.7+
2. pyrfc 库
3. SAP NetWeaver RFC SDK

## 安装步骤

### 1. 安装 Python 依赖
运行以下命令或执行 `setup_python.bat`：
```bash
pip install pyrfc==3.3
```

### 2. 配置环境变量
在 `.env` 文件中已配置：
```
SAP_RFC_USERNAME=H11974
SAP_RFC_PASSWORD=Hota@20251313
```

### 3. SAP RFC SDK 安装
如果遇到 pyrfc 安装问题，需要安装 SAP NetWeaver RFC SDK：
1. 从 SAP 官网下载 RFC SDK
2. 解压到系统路径
3. 设置环境变量

## API 使用

### 获取工单信息
```javascript
POST /api/sap/order-material
Content-Type: application/json

{
  "orderNo": "123456"
}
```

### 响应格式
```javascript
{
  "success": true,
  "data": {
    "orderNo": "123456",
    "materialNo": "12345",
    "materialName": "产成品名称",
    "quantity": "100",
    "orderComponent": "comp1,comp2,comp3",
    "componentDescription": "comp1: 组件1描述 (10EA); comp2: 组件2描述 (20KG)"
  }
}
```

## 数据库字段说明
- `materialNo`: 产成品物料号（去除前导零）
- `materialName`: 产成品名称
- `quantity`: 产成品数量
- `orderComponent`: 工单组件物料号列表（逗号分隔）
- `componentDescription`: 组件描述详情

## 故障排除
1. 如果 Python 脚本执行失败，检查 Python 环境和 pyrfc 安装
2. 如果 SAP 连接失败，检查网络连接和 SAP 服务器状态
3. 如果认证失败，检查 `.env` 文件中的用户名密码配置

## 注意事项
- 工单号会自动补零到12位进行查询
- 物料号显示时会去除前导零
- 组件描述会自动格式化为易读格式