# 权限系统说明

## 权限分类

### 基础权限
- `board` - 生产看板访问权限（所有用户默认拥有）

### 工单权限
- `orders.read` - 工单查看权限
  - 可以查看工单列表
  - 可以查看甘特图（只读模式）
  - 可以导出工单数据
  - 不能拖拽甘特图
  - 不能进行任何工单操作

- `orders.write` - 工单管理权限
  - 包含所有 `orders.read` 权限
  - 可以创建、编辑、删除工单
  - 可以暂停、恢复、完成工单
  - 可以设置延期、紧急插单
  - 可以报工、下达工单
  - 可以拖拽甘特图调整排产
  - 可以导入Excel数据
  - 可以更新WMS数量
  - 可以管理物料节拍表

### 机台权限
- `machines.read` - 机台查看权限
  - 可以查看机台列表和状态
  - 不能添加、编辑、删除机台

- `machines.write` - 机台管理权限
  - 包含所有 `machines.read` 权限
  - 可以添加、编辑、删除机台

### 管理员权限
- `admin` - 系统管理权限
  - 用户管理
  - 权限分配
  - 系统配置

## 默认账户

### 管理员账户
- **用户名**: `admin`
- **密码**: `admin123`
- **权限**: 所有权限

### 只读用户
- **用户名**: `user`
- **密码**: `user123`
- **权限**: `orders.read`, `machines.read`, `board`
- **说明**: 只能查看，不能操作

### 操作员
- **用户名**: `operator`
- **密码**: `op123`
- **权限**: `orders.write`, `machines.read`, `board`
- **说明**: 可以管理工单，但不能管理机台

## 功能权限对照表

| 功能 | orders.read | orders.write | machines.read | machines.write | admin |
|------|-------------|--------------|---------------|----------------|-------|
| 查看工单列表 | ✅ | ✅ | ❌ | ❌ | ✅ |
| 创建工单 | ❌ | ✅ | ❌ | ❌ | ✅ |
| 编辑工单 | ❌ | ✅ | ❌ | ❌ | ✅ |
| 删除工单 | ❌ | ✅ | ❌ | ❌ | ✅ |
| 暂停/恢复工单 | ❌ | ✅ | ❌ | ❌ | ✅ |
| 紧急插单 | ❌ | ✅ | ❌ | ❌ | ✅ |
| 查看甘特图 | ✅ | ✅ | ❌ | ❌ | ✅ |
| 拖拽甘特图 | ❌ | ✅ | ❌ | ❌ | ✅ |
| 工单报工 | ❌ | ✅ | ❌ | ❌ | ✅ |
| 导出工单 | ✅ | ✅ | ❌ | ❌ | ✅ |
| 导入Excel | ❌ | ✅ | ❌ | ❌ | ✅ |
| 查看机台 | ❌ | ❌ | ✅ | ✅ | ✅ |
| 管理机台 | ❌ | ❌ | ❌ | ✅ | ✅ |
| 生产看板 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 用户管理 | ❌ | ❌ | ❌ | ❌ | ✅ |

## 权限控制实现

### 前端权限控制
- 按钮显示/隐藏
- 功能启用/禁用
- 路由访问控制

### 后端权限控制
- API接口权限验证
- 数据访问权限过滤
- JWT Token权限检查

## 权限配置示例

### 创建只读用户
```json
{
  "username": "viewer",
  "password": "view123",
  "role": "user",
  "permissions": ["orders.read", "machines.read", "board"],
  "allowedMachines": ["all"]
}
```

### 创建工单操作员
```json
{
  "username": "operator1",
  "password": "op123",
  "role": "user", 
  "permissions": ["orders.write", "machines.read", "board"],
  "allowedMachines": ["机台1", "机台2"]
}
```

### 创建机台管理员
```json
{
  "username": "machine_admin",
  "password": "ma123",
  "role": "user",
  "permissions": ["orders.read", "machines.write", "board"],
  "allowedMachines": ["all"]
}
```