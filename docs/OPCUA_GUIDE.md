# OPC UA 集成使用指南

## 📖 概述

本系统已集成 OPC UA 协议，可以实时读取机床的运行状态数据，并在机台管理页面实时显示。

## 🎯 功能特性

### ✅ 已实现的功能

1. **OPC UA 连接管理**
   - 支持配置 OPC UA 服务器地址（Endpoint）
   - 支持配置节点 ID（Node ID）
   - 支持用户名/密码认证（可选）
   - 支持匿名连接

2. **实时数据监控**
   - 自动订阅机床状态节点
   - 实时推送状态变化到前端
   - WebSocket 实时通信
   - 断线自动重连

3. **可视化界面**
   - 机台连接状态显示（🟢 已连接 / ⚪ 未连接）
   - 实时状态数据展示
   - 最后更新时间显示
   - 状态指示灯动画

4. **连接测试**
   - 配置前可测试连接
   - 显示读取的实时数据
   - 验证配置正确性

## 🚀 快速开始

### 1. 安装依赖

在 `server` 目录下运行：

```bash
cd server
npm install
```

这会自动安装以下新增依赖：
- `node-opcua`: OPC UA 客户端库
- `ws`: WebSocket 服务器

### 2. 启动后端服务

```bash
npm start
```

服务启动后会看到：

```
🚀 服务器运行在 http://0.0.0.0:12454
💾 数据库: MySQL
🔌 WebSocket: ws://0.0.0.0:12454/ws/machine-status
```

服务会在 10 秒后自动连接所有已启用 OPC UA 的机台。

### 3. 配置机台 OPC UA

1. 登录系统，进入**机台管理**页面
2. 找到需要配置的机台，点击 ⚙️ **设置图标**
3. 在弹出的配置界面中填写：

   | 字段 | 说明 | 示例 |
   |------|------|------|
   | **启用 OPC UA** | 开启/关闭 OPC UA 功能 | ✅ |
   | **服务器地址** | OPC UA 服务器 Endpoint | `opc.tcp://192.168.1.100:4840` |
   | **节点 ID** | 要监控的节点标识 | `ns=2;s=Machine.Status` 或 `ns=2;i=1001` |
   | **用户名** | 可选，需要认证时填写 | `admin` |
   | **密码** | 可选，需要认证时填写 | `password123` |

4. 点击 **"测试连接"** 验证配置
5. 测试成功后，点击 **"保存配置"**
6. 点击 **"连接"** 按钮建立 OPC UA 连接

## 📊 实时状态显示

配置并连接成功后，在机台管理页面可以看到：

### 连接状态列
- 🟢 **Wifi 图标（绿色）**：已连接
- ⚪ **WifiOff 图标（灰色）**：未连接
- ⚙️ **设置图标**：点击配置 OPC UA

### 实时状态列
显示从 OPC UA 读取的实时数据：
- **状态值**：如 "正常"、"停机"、"维修" 等
- **更新时间**：最后一次数据更新的时间
- **其他参数**：温度、速度、错误码等（如果节点包含）

### 页面头部
- **实时监控已启用**：绿色指示灯，表示 WebSocket 已连接

## 🔧 节点 ID 格式说明

OPC UA 节点 ID 有多种格式：

### 1. 字符串格式
```
ns=2;s=Machine.Status
ns=3;s=Production.Line1.Temperature
```

### 2. 数字格式
```
ns=2;i=1001
ns=3;i=5000
```

### 3. GUID 格式
```
ns=2;g=09087e75-8e5e-499b-954f-f2a9603db28a
```

### 4. 字节串格式
```
ns=2;b=M/RbKBsRVkePCePcx24oRA==
```

**查找节点 ID 的方法：**
- 使用 **UAExpert** 等 OPC UA 客户端工具浏览服务器
- 查看机床厂商提供的文档
- 联系设备供应商获取节点清单

## 🎨 状态值解析

系统会自动解析不同类型的状态值：

### 数字类型
```
0 → 停机
1 → 正常
2 → 维修
3 → 待机
4 → 报警
```

### 布尔类型
```
true  → 正常
false → 停机
```

### 对象类型
支持包含多个字段的对象：
```json
{
  "status": "正常",
  "running": true,
  "temperature": 45.5,
  "speed": 1200,
  "errorCode": null
}
```

## 🔌 API 接口说明

### 获取机台 OPC UA 配置
```http
GET /api/machines/:id/opcua-config
Authorization: Bearer {token}
```

### 更新机台 OPC UA 配置
```http
PUT /api/machines/:id/opcua-config
Authorization: Bearer {token}
Content-Type: application/json

{
  "opcuaEnabled": true,
  "opcuaEndpoint": "opc.tcp://192.168.1.100:4840",
  "opcuaNodeId": "ns=2;s=Machine.Status",
  "opcuaUsername": "",
  "opcuaPassword": ""
}
```

### 连接到 OPC UA 服务器
```http
POST /api/machines/:id/opcua-connect
Authorization: Bearer {token}
```

### 断开 OPC UA 连接
```http
POST /api/machines/:id/opcua-disconnect
Authorization: Bearer {token}
```

### 测试 OPC UA 连接
```http
POST /api/machines/opcua-test
Authorization: Bearer {token}
Content-Type: application/json

{
  "opcuaEndpoint": "opc.tcp://192.168.1.100:4840",
  "opcuaNodeId": "ns=2;s=Machine.Status"
}
```

### 获取连接状态
```http
GET /api/machines/:id/opcua-status
Authorization: Bearer {token}
```

### 启动所有 OPC UA 连接
```http
POST /api/opcua/start-all
Authorization: Bearer {token}
```

### 停止所有 OPC UA 连接
```http
POST /api/opcua/stop-all
Authorization: Bearer {token}
```

## 🌐 WebSocket 通信

前端通过 WebSocket 接收实时状态更新：

### 连接地址
```
ws://[服务器IP]:12454/ws/machine-status
```

### 消息格式

**连接成功消息**
```json
{
  "type": "connected",
  "message": "已连接到机台状态服务器"
}
```

**状态更新消息**
```json
{
  "type": "status-update",
  "data": {
    "machineId": 1,
    "machineName": "注塑机1号",
    "status": "正常",
    "running": true,
    "temperature": 45.5,
    "timestamp": "2025-10-07T10:30:00Z"
  }
}
```

## 🛠️ 故障排查

### 问题 1：无法连接到 OPC UA 服务器

**检查项：**
1. 服务器地址是否正确（包括端口号）
2. 网络是否互通（ping 测试）
3. 防火墙是否开放端口
4. OPC UA 服务器是否运行

**解决方法：**
```bash
# 测试网络连通性
ping 192.168.1.100

# 测试端口是否开放
telnet 192.168.1.100 4840
```

### 问题 2：节点 ID 错误

**症状：** 连接成功但读取不到数据

**解决方法：**
1. 使用 UAExpert 验证节点 ID
2. 检查命名空间索引（ns）是否正确
3. 确认节点类型（s=字符串，i=数字）

### 问题 3：WebSocket 连接失败

**检查项：**
1. 浏览器控制台是否有错误
2. 后端服务是否正常运行
3. 端口 12454 是否被占用

**解决方法：**
```bash
# 检查端口占用
lsof -i :12454  # macOS/Linux
netstat -ano | findstr 12454  # Windows
```

### 问题 4：数据不更新

**可能原因：**
1. OPC UA 订阅失败
2. 节点值未变化
3. WebSocket 连接断开

**解决方法：**
- 查看后端日志
- 重新连接 OPC UA
- 刷新页面重建 WebSocket

## 📈 性能优化建议

1. **采样间隔**：默认 1 秒，可根据需要调整
   ```javascript
   // server/opcuaService.js 第 65 行
   requestedPublishingInterval: 1000, // 改为 2000 即 2 秒
   ```

2. **状态更新频率**：前端每 30 秒轮询一次状态
   ```javascript
   // src/pages/MachineManagementPage.js 第 173 行
   const interval = setInterval(updateStatuses, 30000); // 改为 60000 即 1 分钟
   ```

3. **连接数限制**：建议不超过 50 个并发 OPC UA 连接

## 🔒 安全建议

1. **使用 TLS 加密**
   ```
   opc.tcp://  → 明文传输
   opc.tls://  → TLS 加密传输（推荐）
   ```

2. **启用用户认证**
   - 配置用户名和密码
   - 定期更换密码

3. **网络隔离**
   - 将 OPC UA 服务器放在独立网段
   - 使用防火墙限制访问

## 📝 数据库字段说明

新增的机台表字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `opcuaEnabled` | BOOLEAN | 是否启用 OPC UA |
| `opcuaEndpoint` | VARCHAR(500) | OPC UA 服务器地址 |
| `opcuaNodeId` | VARCHAR(255) | 节点 ID |
| `opcuaUsername` | VARCHAR(100) | 用户名（可选） |
| `opcuaPassword` | VARCHAR(255) | 密码（可选） |
| `realtimeData` | JSON | 实时数据 |
| `lastOpcuaUpdate` | TIMESTAMP | 最后更新时间 |

## 🎓 进阶使用

### 自定义状态解析

修改 `server/opcuaService.js` 中的 `parseStatusValue` 方法：

```javascript
parseStatusValue(value) {
  // 自定义解析逻辑
  if (typeof value === 'number') {
    const statusMap = {
      0: '待机',
      1: '运行',
      2: '故障',
      3: '维护',
      // 添加更多状态映射
    };
    return {
      status: statusMap[value] || '未知',
      running: value === 1,
      statusCode: value
    };
  }
  // ... 其他类型处理
}
```

### 监控多个节点

目前每个机台只能监控一个节点。如需监控多个节点（如温度、速度、压力等），需要：

1. 修改数据库添加多个节点 ID 字段
2. 在 `opcuaService.js` 中创建多个订阅
3. 更新前端界面显示多个参数

### 历史数据记录

创建历史数据表：

```sql
CREATE TABLE machine_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  machineId INT NOT NULL,
  status VARCHAR(50),
  realtimeData JSON,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_machine_time (machineId, timestamp)
);
```

在 `opcuaService.js` 的 `updateMachineRealtimeStatus` 方法中添加历史记录保存逻辑。

## 📞 技术支持

如遇到问题，请查看：
- 后端日志：检查 OPC UA 连接错误
- 浏览器控制台：检查前端 WebSocket 错误
- 网络抓包：使用 Wireshark 分析 OPC UA 通信

## 🔄 更新日志

### v1.0.0 (2025-10-07)
- ✅ 初始版本发布
- ✅ 支持 OPC UA 客户端连接
- ✅ 实时数据订阅和推送
- ✅ WebSocket 实时通信
- ✅ 可视化配置界面
- ✅ 连接测试功能
- ✅ 自动重连机制

---

**开发者：** Production Management System Team  
**文档版本：** 1.0.0  
**最后更新：** 2025年10月7日


