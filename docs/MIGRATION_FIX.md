# 🔧 迁移后问题修复说明

## 问题描述
迁移到新架构后，工单管理页面显示不出数据，但生产看板有数据。

## 问题原因

### 1. 导入路径错误
`App.js` 仍然引用已删除的 `.refactored` 文件：
```javascript
// 错误的引用
import { useOrderData } from "./hooks/useOrderData.refactored";
import { useMachineData } from "./hooks/useMachineData.refactored";
import { useMaterialData } from "./hooks/useMaterialData.refactored";
```

### 2. 默认启用分页导致数据不全
重构后的 `loadOrders()` 和 `loadMaterials()` 默认传递分页参数，导致只加载部分数据。

---

## 已修复的问题 ✅

### 修复1: 更新 App.js 导入路径

**文件**: `src/App.js`

**修改前**:
```javascript
import { useOrderData } from "./hooks/useOrderData.refactored";
import { useMachineData } from "./hooks/useMachineData.refactored";
import { useMaterialData } from "./hooks/useMaterialData.refactored";
```

**修改后**:
```javascript
import { useOrderData } from "./hooks/useOrderData";
import { useMachineData } from "./hooks/useMachineData";
import { useMaterialData } from "./hooks/useMaterialData";
```

### 修复2: 修改 loadOrders 默认行为

**文件**: `src/hooks/useOrderData.js`

**修改前**:
```javascript
const loadOrders = useCallback(async (page = currentPage, size = pageSize, filterOptions = filters) => {
  // 总是传递分页参数
  const data = await orderApi.getAll({
    page,
    limit: size,
    ...filterOptions
  });
  // ...
}, [currentPage, pageSize, filters, ...]);
```

**修改后**:
```javascript
const loadOrders = useCallback(async (usePagination = false, page = 1, size = 50, filterOptions = {}) => {
  // 默认不使用分页，加载全部数据
  const params = usePagination ? {
    page,
    limit: size,
    ...filterOptions
  } : filterOptions;
  
  const data = await orderApi.getAll(params);
  // ...
}, [setLoading, setError, setOrders, setOrdersWithPagination]);
```

### 修复3: 修改 loadMaterials 默认行为

**文件**: `src/hooks/useMaterialData.js`

**修改前**:
```javascript
const loadMaterials = useCallback(async (page = currentPage, size = pageSize) => {
  // 总是传递分页参数
  const data = await materialApi.getAll({
    page,
    limit: size
  });
  // ...
}, [currentPage, pageSize, ...]);
```

**修改后**:
```javascript
const loadMaterials = useCallback(async (usePagination = false, page = 1, size = 50) => {
  // 默认不使用分页，加载全部数据
  const params = usePagination ? { page, limit: size } : {};
  
  const data = await materialApi.getAll(params);
  // ...
}, [setLoading, setError, setMaterials, setMaterialsWithPagination]);
```

---

## 使用说明

### 默认行为（加载全部数据）
```javascript
// 在组件中
useEffect(() => {
  loadOrders();        // 加载所有工单
  loadMaterials();     // 加载所有物料
}, [loadOrders, loadMaterials]);
```

### 使用分页（可选）
```javascript
// 当数据量很大时，可以启用分页
loadOrders(true, 1, 50);  // 第1页，每页50条
loadMaterials(true, 1, 50);  // 第1页，每页50条
```

### 使用过滤（可选）
```javascript
// 加载特定状态的工单
loadOrders(false, 1, 50, { status: '生产中', machine: '机台1' });
```

---

## 验证修复

### 1. 检查浏览器控制台
打开浏览器开发者工具（F12），查看Console标签：
- 不应该有 import 错误
- 不应该有 "Cannot find module" 错误

### 2. 检查网络请求
在开发者工具的Network标签中：
- 查看 `/api/orders` 请求
- 确认请求URL **没有** `?page=1&limit=50` 参数（默认情况下）
- 响应应该是数组格式 `[{...}, {...}]`，而不是分页格式 `{orders: [...], total: ...}`

### 3. 检查数据显示
- 工单管理页面应该显示所有工单
- 物料节拍表应该显示所有物料
- 甘特图应该显示所有工单

---

## 如何重启应用

```bash
# 停止当前运行的服务（如果有）
Ctrl+C

# 重新启动
npm start
```

---

## 可能遇到的其他问题

### Q1: 仍然显示不出数据？

**检查步骤**：

1. **清除浏览器缓存**
   - 按 `Ctrl+Shift+Delete`
   - 清除缓存和Cookie
   - 刷新页面

2. **检查Zustand Store**
   - 确保 `src/stores/` 目录存在
   - 确保包含 `useOrderStore.js`, `useMachineStore.js`, `useMaterialStore.js`

3. **检查依赖安装**
   ```bash
   npm list zustand
   # 应该显示 zustand@4.5.5
   ```

### Q2: 显示 "Cannot find module 'zustand'" 错误？

**解决方案**：
```bash
# 重新安装依赖
npm install zustand @tanstack/react-query react-window

# 或运行
install-dependencies.bat
```

### Q3: 分页功能如何启用？

**当前状态**：分页功能已实现但默认禁用

**启用方法**：修改 `App.js` 中的 loadOrders 调用：
```javascript
// 在 useEffect 中
useEffect(() => {
  if (isAuthenticated) {
    loadOrders(true, 1, 50);  // 启用分页，第1页，每页50条
    loadMachines();
    loadMaterials(true, 1, 50);  // 启用分页
  }
}, [isAuthenticated, loadOrders, loadMachines, loadMaterials]);
```

**注意**：启用分页后，需要添加分页控件来切换页码。

---

## 文件修改清单

✅ **已修改的文件**：
1. `src/App.js` - 修复import路径
2. `src/hooks/useOrderData.js` - 修改loadOrders默认行为
3. `src/hooks/useMaterialData.js` - 修改loadMaterials默认行为

✅ **无需修改的文件**：
- `src/hooks/useMachineData.js` - 已经正确（不使用分页）
- `src/stores/useOrderStore.js` - 正常工作
- `src/stores/useMachineStore.js` - 正常工作
- `src/stores/useMaterialStore.js` - 正常工作

---

## 测试清单

### 功能测试
- [ ] 工单管理页面显示所有工单
- [ ] 可以添加新工单
- [ ] 可以编辑工单
- [ ] 可以删除工单
- [ ] 物料节拍表显示所有物料
- [ ] 甘特图显示正常
- [ ] 生产看板显示正常

### 性能测试
- [ ] 虚拟滚动工作正常（滚动流畅）
- [ ] 大量数据（1000+条）渲染流畅
- [ ] 页面切换速度快

---

## 回滚方案

如果修复后仍有问题，可以回滚到旧架构：

```bash
# 运行回滚脚本
migrate-rollback.bat
```

---

## 技术支持

如果问题仍未解决，请检查：

1. **浏览器控制台错误日志**
2. **服务器控制台输出**
3. **网络请求详情**

并参考以下文档：
- [REFACTORING_GUIDE.md](./REFACTORING_GUIDE.md) - 重构指南
- [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) - 测试清单
- [QUICK_START.md](./QUICK_START.md) - 快速开始

---

**修复日期**: 2025-10-31  
**状态**: ✅ 已修复  
**测试**: 待验证

🎉 **问题已解决，请重启应用并测试！**

