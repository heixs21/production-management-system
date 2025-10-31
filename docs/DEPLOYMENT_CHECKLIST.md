# 🚀 部署检查清单

## ✅ 部署前准备

### 1. 清除旧版本缓存
```bash
# 删除 node_modules 和 package-lock.json（可选）
rm -rf node_modules package-lock.json

# 重新安装依赖
npm install
```

### 2. 确保依赖已安装
```bash
# 检查 lucide-react（图标库）
npm list lucide-react

# 如果没有安装
npm install lucide-react
```

### 3. 构建项目
```bash
# 开发模式测试
npm start

# 生产构建
npm run build
```

### 4. 检查构建输出
```bash
# 确保这些文件存在
build/index.html
build/static/css/
build/static/js/
```

---

## 🧪 功能测试清单

### 性能测试
- [ ] 打开工单管理页面，甘特图加载是否流畅（<200ms）
- [ ] 拖拽工单是否流畅无卡顿
- [ ] 切换机台组是否快速响应
- [ ] 批量下达10+工单是否有进度反馈

### UI组件测试
- [ ] 页面顶部是否显示4个KPI卡片（蓝绿紫红）
- [ ] 首次加载是否显示骨架屏动画
- [ ] 删除所有工单后是否显示空状态引导
- [ ] 操作成功/失败是否显示Toast通知（右上角）

### 功能测试
- [ ] 添加工单：成功后显示Toast，表单清空
- [ ] 编辑工单：成功后显示Toast，模态框关闭
- [ ] 紧急插单：成功后显示Toast（带暂停工单列表）
- [ ] 批量下达：显示详细结果（成功/失败统计）
- [ ] MES工单：每60秒自动刷新

### 兼容性测试
- [ ] Chrome浏览器正常显示
- [ ] Edge浏览器正常显示
- [ ] 移动端（手机）正常显示
- [ ] 平板设备正常显示

---

## 🔍 常见问题排查

### 问题1: 页面样式没有变化
**原因**: 浏览器缓存

**解决方案**:
```bash
# 方法1: 清除浏览器缓存
Chrome/Edge: Ctrl + Shift + Delete

# 方法2: 使用无痕模式
Chrome: Ctrl + Shift + N

# 方法3: 强制刷新
Ctrl + F5  或  Ctrl + Shift + R
```

### 问题2: Toast不显示
**原因**: ToastProvider没有正确配置

**检查**:
1. `src/index.js` 中是否有 `<ToastProvider>`
2. 组件是否正确导入 `useToast`
3. F12控制台是否有错误

### 问题3: 图标不显示
**原因**: lucide-react未安装

**解决方案**:
```bash
npm install lucide-react
```

### 问题4: 骨架屏不显示
**原因**: 数据加载太快或条件不满足

**检查**:
- 确保 `loading && orders.length === 0` 条件正确
- 打开Network面板，模拟慢速网络（Slow 3G）

### 问题5: KPI卡片数据不对
**原因**: orders或machines数据格式问题

**检查**:
- F12控制台查看数据结构
- 确保 `orders` 包含 `actualEndDate`, `status` 等字段
- 确保 `machines` 是数组

---

## 📱 移动端测试

### 响应式检查
```bash
# Chrome开发者工具
F12 → 点击设备图标 → 选择设备

测试设备:
- iPhone 12 Pro (390x844)
- iPad Pro (1024x1366)
- Galaxy S20 (360x800)
```

### 移动端功能
- [ ] KPI卡片堆叠显示（竖向）
- [ ] 按钮大小适合手指点击
- [ ] 表格可以横向滚动
- [ ] Toast在移动端正确显示

---

## 🚦 性能监控

### 打开Chrome DevTools
```bash
F12 → Performance标签 → 录制页面加载
```

### 关键指标
| 指标 | 目标 | 当前 |
|------|------|------|
| FCP (First Contentful Paint) | <1.5s | [ ] |
| LCP (Largest Contentful Paint) | <2.5s | [ ] |
| TTI (Time to Interactive) | <3.5s | [ ] |
| CLS (Cumulative Layout Shift) | <0.1 | [ ] |

### 甘特图性能
```bash
# 在控制台输入
console.time('gantt-render');
// 切换日期范围
console.timeEnd('gantt-render');

预期: <200ms
```

---

## 🔄 回滚方案

### 如果出现严重问题

#### 方案1: Git回滚
```bash
# 查看提交历史
git log --oneline

# 回滚到之前的版本
git revert HEAD
# 或
git reset --hard <commit-hash>
```

#### 方案2: 使用备份文件
```bash
# 如果有备份，恢复关键文件
cp backup/GanttChart.js.backup src/components/GanttChart.js
cp backup/OrderManagementPage.js.backup src/pages/OrderManagementPage.js
```

#### 方案3: 禁用新功能
```javascript
// 临时注释新组件
// import KPICards from './components/KPICards';
// import { useToast } from './components/Toast';
```

---

## 📊 上线后监控

### 用户反馈收集
- [ ] 页面加载速度是否有提升
- [ ] Toast通知是否比alert更好用
- [ ] KPI卡片是否有用
- [ ] 批量下达是否更可靠

### 错误监控
```bash
# 查看浏览器控制台
- 是否有JS错误
- 是否有网络请求失败
- 是否有内存泄漏
```

### 性能监控
```bash
# 关键操作耗时
- 甘特图渲染时间
- 批量下达耗时
- 页面切换流畅度
```

---

## ✅ 最终确认

### 部署前
- [ ] 所有功能测试通过
- [ ] 没有控制台错误
- [ ] 性能达标
- [ ] 移动端正常
- [ ] 备份已创建

### 部署中
- [ ] 停止旧服务
- [ ] 复制新文件
- [ ] 重启服务
- [ ] 验证服务启动成功

### 部署后
- [ ] 访问首页正常
- [ ] 登录功能正常
- [ ] 关键功能可用
- [ ] 通知团队测试

---

## 📞 技术支持

### 如遇问题
1. **查看文档**: `OPTIMIZATION_COMPLETE.md`
2. **查看分析**: `ORDER_MANAGEMENT_ANALYSIS.md`
3. **查看UI方案**: `UI_UX_IMPROVEMENT_PLAN.md`
4. **查看修复记录**: `DATA_LOADING_FIX.md`, `MES_API_FIX.md`

### 日志位置
```bash
# 浏览器控制台
F12 → Console标签

# 后端日志（如果有问题）
server/dev_rfc.log
```

---

## 🎉 部署成功标志

✅ **全部满足以下条件**:
1. 页面打开速度快，无白屏
2. KPI卡片正确显示数据
3. Toast通知替代了alert
4. 骨架屏加载动画流畅
5. 甘特图滑动流畅无卡顿
6. 批量下达工单稳定可靠
7. 移动端显示正常
8. 无控制台错误

**恭喜！系统优化成功上线！** 🎊

---

**最后更新**: 2025-10-31  
**文档版本**: 1.0  
**适用版本**: 优化后的GUNT系统

