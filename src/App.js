import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useAuth } from "./contexts/AuthContext";
import Login from "./components/Login";
import Layout from "./components/Layout";
import "./index.css";

// 导入组件
import Header from "./components/Header";
import MachineManager from "./components/MachineManager";
import OrderManagement from "./components/OrderManagement";
import MaterialTaktTable from "./components/MaterialTaktTable";
import CurrentOrdersAnalysis from "./components/CurrentOrdersAnalysis";
import DateRangeSelector from "./components/DateRangeSelector";
import GanttChart from "./components/GanttChart";
import ProductionBoard from "./components/ProductionBoard";

// 导入优化后的虚拟滚动组件
import VirtualizedOrderTable from "./components/VirtualizedOrderTable";
import VirtualizedMaterialTable from "./components/VirtualizedMaterialTable";

// 导入模态框
import {
  ErrorMessage,
  LoadingSpinner,
  MachineModal,
  PasteModal,
  OrderModal,
  UrgentOrderModal,
  PauseResumeModal,
  ReportWorkModal,
  MaterialModal,
  FinishOrderModal,
  DelayOrderModal,
  SubmitWorkOrderModal
} from "./components/Modals";

// 导入重构后的hooks（使用Zustand）
import { useOrderData } from "./hooks/useOrderData";
import { useMachineData } from "./hooks/useMachineData";
import { useMaterialData } from "./hooks/useMaterialData";
import { workOrderApi } from "./services/api";

// 导入工具函数
import { calculateOrderStatus } from "./utils/orderUtils";
import { exportOrdersToExcel, exportGanttChart } from "./utils/exportUtils";

/**
 * 主应用组件 - 重构版本
 * 使用Zustand状态管理和虚拟滚动优化性能
 */
const App = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  
  // 页面状态
  const [currentPage, setCurrentPage] = useState('admin');
  
  // 使用重构后的hooks（Zustand state management）
  const orderData = useOrderData();
  const machineData = useMachineData();
  const materialData = useMaterialData();

  // 解构数据和方法
  const { 
    orders, 
    loading: ordersLoading, 
    error: ordersError,
    addOrder,
    updateOrder,
    deleteOrder,
    importOrders,
    loadOrders,
    addUrgentOrder,
    resumeOrder,
    pauseOrder,
    reportWork,
    setOrders
  } = orderData;

  const {
    machines,
    loading: machinesLoading,
    error: machinesError,
    addMachine,
    updateMachine,
    deleteMachine,
    getMachineStatus,
    loadMachines
  } = machineData;

  const {
    materials,
    loading: materialsLoading,
    error: materialsError,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    importMaterials,
    validateMaterial,
    loadMaterials
  } = materialData;

  // 初始化数据加载
  useEffect(() => {
    if (isAuthenticated) {
      loadOrders();
      loadMachines();
      loadMaterials();
    }
  }, [isAuthenticated, loadOrders, loadMachines, loadMaterials]);

  // UI状态管理
  const loading = ordersLoading || machinesLoading || materialsLoading;
  const error = ordersError || machinesError || materialsError;
  const [draggedOrder, setDraggedOrder] = useState(null);

  // 弹窗状态
  const [showMachineForm, setShowMachineForm] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showUrgentForm, setShowUrgentForm] = useState(false);
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [showPauseResumeModal, setShowPauseResumeModal] = useState(false);
  const [showReportWorkModal, setShowReportWorkModal] = useState(false);
  const [editingMachine, setEditingMachine] = useState(null);
  const [showFinishOrderModal, setShowFinishOrderModal] = useState(false);
  const [finishingOrder, setFinishingOrder] = useState(null);
  const [showDelayOrderModal, setShowDelayOrderModal] = useState(false);
  const [delayingOrder, setDelayingOrder] = useState(null);
  const [showSubmitWorkOrderModal, setShowSubmitWorkOrderModal] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [pauseResumeOrder, setPauseResumeOrder] = useState(null);
  const [pauseResumeAction, setPauseResumeAction] = useState('pause');
  const [reportWorkOrder, setReportWorkOrder] = useState(null);
  const [reportWorkDate, setReportWorkDate] = useState('');
  const [selectedTimeRange, setSelectedTimeRange] = useState('thisMonth');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);

  // 表单数据
  const [newMachine, setNewMachine] = useState({ name: "", status: "正常", coefficient: 1.00 });
  const [newOrder, setNewOrder] = useState({
    machine: "",
    orderNo: "",
    materialNo: "",
    materialName: "",
    orderComponent: "",
    quantity: "",
    priority: 1,
    startDate: "",
    expectedEndDate: "",
    actualEndDate: "",
    reportedQuantity: "",
    isSubmitted: false,
  });
  const [pasteData, setPasteData] = useState("");
  const [urgentOrder, setUrgentOrder] = useState({
    machine: "",
    orderNo: "",
    materialNo: "",
    materialName: "",
    orderComponent: "",
    quantity: "",
    startDate: "",
    expectedEndDate: "",
    reportedQuantity: "",
    isSubmitted: false,
  });
  const [newMaterial, setNewMaterial] = useState({
    category: "",
    feature: "",
    modelThickness: "",
    actualTakt: "",
  });

  // 动态生成日期范围 - 使用useMemo优化
  const dateRange = useMemo(() => {
    const getDateRange = () => {
      const now = new Date();
      let start, end;

      switch (selectedTimeRange) {
        case 'thisMonth':
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
        case 'lastMonth':
          start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          end = new Date(now.getFullYear(), now.getMonth(), 0);
          break;
        case 'thisYear':
          start = new Date(now.getFullYear(), 0, 1);
          end = new Date(now.getFullYear(), 11, 31);
          break;
        case 'lastYear':
          start = new Date(now.getFullYear() - 1, 0, 1);
          end = new Date(now.getFullYear() - 1, 11, 31);
          break;
        case 'custom':
          start = customStartDate ? new Date(customStartDate) : new Date();
          end = customEndDate ? new Date(customEndDate) : new Date();
          break;
        default:
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }

      const dates = [];
      const current = new Date(start);
      while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
      
      return dates;
    };

    return getDateRange();
  }, [selectedTimeRange, customStartDate, customEndDate]);

  // 更新工单状态 - 使用useCallback优化
  useEffect(() => {
    const updatedOrders = orders.map(order => {
      const newStatus = calculateOrderStatus(order, machines, orders);
      return order.status !== newStatus ? { ...order, status: newStatus } : order;
    });
    
    const hasStatusChanged = updatedOrders.some((order, index) => 
      order !== orders[index]
    );
    
    if (hasStatusChanged) {
      setOrders(updatedOrders);
    }
  }, [machines, orders, setOrders]);

  // 机台管理处理函数 - 使用useCallback优化
  const handleAddMachine = useCallback(async () => {
    try {
      await addMachine(newMachine);
      setNewMachine({ name: "", status: "正常", coefficient: 1.00 });
      setShowMachineForm(false);
    } catch (err) {
      alert(`添加机台失败: ${err.message}`);
    }
  }, [newMachine, addMachine]);

  const handleEditMachine = useCallback((machine) => {
    setEditingMachine({ ...machine });
  }, []);

  const handleSaveMachine = useCallback(async () => {
    try {
      await updateMachine(editingMachine);
      setEditingMachine(null);
    } catch (err) {
      alert(`更新机台失败: ${err.message}`);
    }
  }, [editingMachine, updateMachine]);

  const handleDeleteMachine = useCallback((machineId) => {
    const machine = machines.find(m => m.id === machineId);
    const hasOrders = orders.some(o => o.machine === machine.name);
    
    if (hasOrders) {
      if (!window.confirm(`机台 ${machine.name} 还有工单，确定要删除吗？删除后相关工单也会被删除。`)) {
        return;
      }
      setOrders(orders.filter(o => o.machine !== machine.name));
    }
    
    deleteMachine(machineId);
  }, [machines, orders, deleteMachine, setOrders]);

  // 工单管理处理函数
  const handleAddOrder = useCallback(async () => {
    try {
      await addOrder(newOrder);
      setNewOrder({
        machine: "",
        orderNo: "",
        materialNo: "",
        materialName: "",
        orderComponent: "",
        quantity: "",
        priority: 1,
        startDate: "",
        expectedEndDate: "",
        actualEndDate: "",
        reportedQuantity: "",
        isSubmitted: false,
      });
      setShowAddForm(false);
    } catch (err) {
      alert(`添加工单失败: ${err.message}`);
    }
  }, [newOrder, addOrder]);

  const handleEditOrder = useCallback((order) => {
    const formatDate = (date) => {
      if (!date) return '';
      return date.split('T')[0];
    };

    setEditingOrder({
      ...order,
      startDate: formatDate(order.startDate),
      expectedEndDate: formatDate(order.expectedEndDate),
      actualEndDate: formatDate(order.actualEndDate)
    });
  }, []);

  const handleSaveOrder = useCallback(async () => {
    try {
      await updateOrder(editingOrder);
      setEditingOrder(null);
    } catch (err) {
      alert(`更新工单失败: ${err.message}`);
    }
  }, [editingOrder, updateOrder]);

  const handleDeleteOrder = useCallback((orderId) => {
    if (window.confirm('确定要删除这个工单吗？')) {
      deleteOrder(orderId);
    }
  }, [deleteOrder]);

  // 紧急插单处理
  const handleAddUrgentOrder = useCallback(async () => {
    try {
      const result = await addUrgentOrder(urgentOrder, urgentOrder.machine, urgentOrder.startDate);

      if (result.pausedOrders.length > 0) {
        const pausedOrderNames = result.pausedOrders.map(o => o.orderNo).join(', ');
        alert(`紧急插单成功！已暂停工单：${pausedOrderNames}`);
      }

      setUrgentOrder({
        machine: "",
        orderNo: "",
        materialNo: "",
        materialName: "",
        orderComponent: "",
        quantity: "",
        startDate: "",
        expectedEndDate: "",
        reportedQuantity: "",
        isSubmitted: false,
      });
      setShowUrgentForm(false);
    } catch (err) {
      alert(`紧急插单失败: ${err.message}`);
    }
  }, [urgentOrder, addUrgentOrder]);

  // 报工处理
  const handleReportWork = useCallback((order, date) => {
    setReportWorkOrder(order);
    setReportWorkDate(date);
    setShowReportWorkModal(true);
  }, []);

  const handleConfirmReportWork = useCallback((orderId, dailyQuantity, delayReason) => {
    reportWork(orderId, reportWorkDate, dailyQuantity, delayReason);
    setShowReportWorkModal(false);
    setReportWorkOrder(null);
    setReportWorkDate('');
  }, [reportWork, reportWorkDate]);

  // 结束工单处理
  const handleFinishOrder = useCallback((order) => {
    setFinishingOrder(order);
    setShowFinishOrderModal(true);
  }, []);

  const handleConfirmFinishOrder = useCallback(async (finishData) => {
    try {
      await updateOrder({
        ...finishingOrder,
        ...finishData
      });
      setShowFinishOrderModal(false);
      setFinishingOrder(null);
    } catch (err) {
      alert(`结束工单失败: ${err.message}`);
    }
  }, [finishingOrder, updateOrder]);

  // 延期工单处理
  const handleDelayOrder = useCallback((order) => {
    setDelayingOrder(order);
    setShowDelayOrderModal(true);
  }, []);

  const handleConfirmDelayOrder = useCallback(async (delayData) => {
    try {
      await updateOrder({
        ...delayingOrder,
        ...delayData
      });
      setShowDelayOrderModal(false);
      setDelayingOrder(null);
    } catch (err) {
      alert(`设置延期失败: ${err.message}`);
    }
  }, [delayingOrder, updateOrder]);

  // 下达工单处理
  const handleSubmitWorkOrder = useCallback((order) => {
    setSubmittingOrder(order);
    setShowSubmitWorkOrderModal(true);
  }, []);

  // 生成工序报工单
  const handleGenerateWorkOrderReport = useCallback(async (order) => {
    try {
      const serverUrl = `http://${window.location.hostname}:12454`;
      const response = await fetch(`${serverUrl}/api/sap/work-order-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderNo: order.orderNo })
      });

      const result = await response.json();
      if (result.success) {
        const newWindow = window.open('', '_blank');
        newWindow.document.write(`
          <html>
            <head>
              <title>工序报工单 - ${order.orderNo}</title>
              <style>
                body { margin: 0; padding: 20px; text-align: center; background: #f5f5f5; }
                img { max-width: 100%; height: auto; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
                .header { margin-bottom: 20px; }
                .close-btn { 
                  position: fixed; top: 20px; right: 20px; 
                  padding: 10px 20px; background: #dc3545; color: white; 
                  border: none; border-radius: 5px; cursor: pointer;
                }
              </style>
            </head>
            <body>
              <button class="close-btn" onclick="window.close()">关闭</button>
              <div class="header">
                <h2>工序报工单预览</h2>
                <p>工单号: ${order.orderNo}</p>
              </div>
              <img src="data:image/png;base64,${result.image}" alt="工序报工单" />
            </body>
          </html>
        `);
        newWindow.document.close();
      } else {
        alert('生成工序报工单失败: ' + result.error);
      }
    } catch (error) {
      alert('生成工序报工单失败: ' + error.message);
    }
  }, []);

  const handleConfirmSubmitWorkOrder = useCallback(async (workOrderData) => {
    try {
      setSubmitLoading(true);
      await workOrderApi.submit(workOrderData);
      
      await updateOrder({
        ...submittingOrder,
        isSubmitted: true
      });
      
      setShowSubmitWorkOrderModal(false);
      setSubmittingOrder(null);
      alert('工单下达成功！');
    } catch (error) {
      alert('下达工单失败: ' + error.message);
    } finally {
      setSubmitLoading(false);
    }
  }, [submittingOrder, updateOrder]);

  // 物料处理函数
  const handleAddMaterial = useCallback(async () => {
    try {
      const errors = validateMaterial(newMaterial);
      if (errors.length > 0) {
        alert(`添加物料失败: ${errors.join(', ')}`);
        return;
      }
      await addMaterial(newMaterial);
      setNewMaterial({
        category: "",
        feature: "",
        modelThickness: "",
        actualTakt: "",
      });
      setShowMaterialForm(false);
    } catch (err) {
      alert(`添加物料失败: ${err.message}`);
    }
  }, [newMaterial, addMaterial, validateMaterial]);

  const handleEditMaterial = useCallback((material) => {
    setEditingMaterial(material);
    setNewMaterial(material);
    setShowMaterialForm(true);
  }, []);

  const handleSaveMaterial = useCallback(async () => {
    try {
      const errors = validateMaterial(newMaterial);
      if (errors.length > 0) {
        alert(`更新物料失败: ${errors.join(', ')}`);
        return;
      }
      await updateMaterial(newMaterial);
      setEditingMaterial(null);
      setNewMaterial({
        category: "",
        feature: "",
        modelThickness: "",
        actualTakt: "",
      });
      setShowMaterialForm(false);
    } catch (err) {
      alert(`更新物料失败: ${err.message}`);
    }
  }, [newMaterial, updateMaterial, validateMaterial]);

  const handleDeleteMaterial = useCallback(async (materialId) => {
    if (window.confirm('确定要删除这个物料吗？')) {
      try {
        await deleteMaterial(materialId);
      } catch (err) {
        alert(`删除物料失败: ${err.message}`);
      }
    }
  }, [deleteMaterial]);

  const handleImportMaterials = useCallback(async (pasteData) => {
    try {
      const count = await importMaterials(pasteData);
      return count;
    } catch (error) {
      throw error;
    }
  }, [importMaterials]);

  // 自定义日期处理
  const handleCustomDateChange = useCallback((startDate, endDate) => {
    setCustomStartDate(startDate);
    setCustomEndDate(endDate);
  }, []);

  // 导出功能
  const handleExportOrders = useCallback(() => {
    exportOrdersToExcel(orders);
  }, [orders]);

  const handleExportGantt = useCallback(() => {
    exportGanttChart();
  }, []);

  // WMS数量更新
  const handleUpdateWmsQuantities = useCallback(async () => {
    try {
      const serverUrl = `http://${window.location.hostname}:12454`;
      const response = await fetch(`${serverUrl}/api/wms/update-quantities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      if (result.success) {
        alert(result.message);
        await loadOrders();
      } else {
        alert('WMS数量更新失败: ' + result.error);
      }
    } catch (error) {
      alert('WMS数量更新失败: ' + error.message);
    }
  }, [loadOrders]);

  // 暂停/恢复工单
  const handlePauseOrder = useCallback((order) => {
    setPauseResumeOrder(order);
    setPauseResumeAction('pause');
    setShowPauseResumeModal(true);
  }, []);

  const handleResumeOrder = useCallback((order) => {
    setPauseResumeOrder(order);
    setPauseResumeAction('resume');
    setShowPauseResumeModal(true);
  }, []);

  const handleConfirmPauseResume = useCallback((orderId, date) => {
    if (pauseResumeAction === 'pause') {
      pauseOrder(orderId, date);
    } else {
      resumeOrder(orderId, date);
    }
    setShowPauseResumeModal(false);
    setPauseResumeOrder(null);
  }, [pauseResumeAction, pauseOrder, resumeOrder]);

  // Excel导入处理
  const handleImportOrders = useCallback(async () => {
    try {
      const count = await importOrders(pasteData);
      setPasteData("");
      setShowPasteDialog(false);
      alert(`成功导入 ${count} 条工单数据`);
    } catch (err) {
      alert(`导入失败: ${err.message}`);
    }
  }, [pasteData, importOrders]);

  // 拖拽处理
  const handleDragStart = useCallback((e, order) => {
    setDraggedOrder(order);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback((e, targetMachine, targetDateIndex) => {
    e.preventDefault();
    if (!draggedOrder) return;

    const orderDuration = new Date(draggedOrder.expectedEndDate || draggedOrder.startDate) - new Date(draggedOrder.startDate);
    const newStartDate = new Date(dateRange[targetDateIndex]);
    const newEndDate = new Date(newStartDate.getTime() + orderDuration);

    const updatedOrder = {
      ...draggedOrder,
      machine: targetMachine,
      startDate: newStartDate.toISOString().split("T")[0],
      expectedEndDate: newEndDate.toISOString().split("T")[0],
    };

    updateOrder(updatedOrder);
    setDraggedOrder(null);
  }, [draggedOrder, dateRange, updateOrder]);

  // 认证加载中
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }
  
  // 未认证显示登录页面
  if (!isAuthenticated) {
    return <Login />;
  }
  
  // 如果当前页面是生产看板
  if (currentPage === 'board') {
    return <ProductionBoard onBackToAdmin={() => setCurrentPage('admin')} />;
  }

  return (
    <Layout>
      <div className="p-6 bg-gray-50 min-h-screen">
      {error && <ErrorMessage message={error} onClose={() => {}} />}
      <LoadingSpinner loading={loading} />
      
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <Header
          onShowMachineForm={() => setShowMachineForm(true)}
          onShowPasteDialog={() => setShowPasteDialog(true)}
          onShowAddForm={() => setShowAddForm(true)}
          onShowUrgentForm={() => setShowUrgentForm(true)}
        />
        
        {/* 生产看板链接 */}
        <div className="p-4 border-b bg-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-800">🏭 生产看板</h3>
              <p className="text-blue-600 text-sm">现场人员专用 - 查看机台工单排产</p>
            </div>
            <button
              onClick={() => setCurrentPage('board')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center space-x-2"
            >
              <span>📺</span>
              <span>打开生产看板</span>
            </button>
          </div>
        </div>

        {/* 机台管理 */}
        <MachineManager 
          machines={machines}
          orders={orders}
          onEditMachine={handleEditMachine}
          onDeleteMachine={handleDeleteMachine}
        />

        {/* 工单管理 - 使用虚拟滚动组件 */}
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">工单管理 (已优化性能)</h2>
            <div className="flex gap-2">
              <button
                onClick={handleExportOrders}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                📊 导出Excel
              </button>
              <button
                onClick={handleUpdateWmsQuantities}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                🔄 更新WMS数量
              </button>
            </div>
          </div>
          
          {/* 使用虚拟滚动组件 */}
          <VirtualizedOrderTable
            orders={orders}
            onEditOrder={handleEditOrder}
            onDeleteOrder={handleDeleteOrder}
            onPauseOrder={handlePauseOrder}
            onResumeOrder={handleResumeOrder}
            onFinishOrder={handleFinishOrder}
            onDelayOrder={handleDelayOrder}
            onSubmitWorkOrder={handleSubmitWorkOrder}
            onGenerateWorkOrderReport={handleGenerateWorkOrderReport}
          />
        </div>

        {/* 当前工单生产时间分析 */}
        <CurrentOrdersAnalysis orders={orders} machines={machines} />

        {/* 甘特图 */}
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold mb-4">生产排程甘特图</h2>
          <DateRangeSelector
            selectedRange={selectedTimeRange}
            onRangeChange={setSelectedTimeRange}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
            onCustomDateChange={handleCustomDateChange}
          />
          <GanttChart
            machines={machines}
            orders={orders}
            dateRange={dateRange}
            draggedOrder={draggedOrder}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onReportWork={handleReportWork}
            onExportGantt={handleExportGantt}
          />
        </div>

        {/* 物料生产节拍表 - 使用虚拟滚动 */}
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">物料生产节拍表 (已优化性能)</h2>
            <button
              onClick={() => setShowMaterialForm(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              ➕ 添加物料
            </button>
          </div>
          
          {/* 使用虚拟滚动组件 */}
          <VirtualizedMaterialTable
            materials={materials}
            onEditMaterial={handleEditMaterial}
            onDeleteMaterial={handleDeleteMaterial}
          />
        </div>
      </div>

      {/* 所有弹窗组件 */}
      <MachineModal 
        show={showMachineForm}
        isEditing={false}
        machineData={newMachine}
        onMachineChange={setNewMachine}
        onSave={handleAddMachine}
        onClose={() => setShowMachineForm(false)}
      />

      <MachineModal 
        show={!!editingMachine}
        isEditing={true}
        machineData={editingMachine || { name: "", status: "正常", coefficient: 1.00 }}
        onMachineChange={setEditingMachine}
        onSave={handleSaveMachine}
        onClose={() => setEditingMachine(null)}
      />

      <PasteModal 
        show={showPasteDialog}
        pasteData={pasteData}
        onPasteDataChange={setPasteData}
        onImport={handleImportOrders}
        onClose={() => setShowPasteDialog(false)}
        loading={loading}
      />

      <OrderModal 
        show={showAddForm}
        isEditing={false}
        orderData={newOrder}
        machines={machines}
        onOrderChange={setNewOrder}
        onSave={handleAddOrder}
        onClose={() => setShowAddForm(false)}
      />

      <OrderModal
        show={!!editingOrder}
        isEditing={true}
        orderData={editingOrder || newOrder}
        machines={machines}
        onOrderChange={setEditingOrder}
        onSave={handleSaveOrder}
        onClose={() => setEditingOrder(null)}
      />

      <UrgentOrderModal
        show={showUrgentForm}
        orderData={urgentOrder}
        machines={machines}
        onOrderChange={setUrgentOrder}
        onSave={handleAddUrgentOrder}
        onClose={() => setShowUrgentForm(false)}
      />

      <PauseResumeModal
        show={showPauseResumeModal}
        order={pauseResumeOrder}
        action={pauseResumeAction}
        onConfirm={handleConfirmPauseResume}
        onClose={() => setShowPauseResumeModal(false)}
      />

      <ReportWorkModal
        show={showReportWorkModal}
        order={reportWorkOrder}
        date={reportWorkDate}
        onConfirm={handleConfirmReportWork}
        onClose={() => setShowReportWorkModal(false)}
      />

      <MaterialModal
        show={showMaterialForm}
        materialData={newMaterial}
        onMaterialChange={setNewMaterial}
        onConfirm={editingMaterial ? handleSaveMaterial : handleAddMaterial}
        onClose={() => {
          setShowMaterialForm(false);
          setEditingMaterial(null);
          setNewMaterial({
            category: "",
            feature: "",
            modelThickness: "",
            actualTakt: "",
          });
        }}
        isEdit={!!editingMaterial}
      />

      <FinishOrderModal
        show={showFinishOrderModal}
        order={finishingOrder}
        onConfirm={handleConfirmFinishOrder}
        onClose={() => setShowFinishOrderModal(false)}
      />

      <DelayOrderModal
        show={showDelayOrderModal}
        order={delayingOrder}
        onConfirm={handleConfirmDelayOrder}
        onClose={() => setShowDelayOrderModal(false)}
      />

      <SubmitWorkOrderModal
        show={showSubmitWorkOrderModal}
        order={submittingOrder}
        machines={machines}
        loading={submitLoading}
        onSubmit={handleConfirmSubmitWorkOrder}
        onClose={() => setShowSubmitWorkOrderModal(false)}
      />
      </div>
    </Layout>
  );
};

export default memo(App);

