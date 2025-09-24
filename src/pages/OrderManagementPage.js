import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import Header from "../components/Header";
import OrderManagement from "../components/OrderManagement";
import CurrentOrdersAnalysis from "../components/CurrentOrdersAnalysis";
import DateRangeSelector from "../components/DateRangeSelector";
import GanttChart from "../components/GanttChart";
import MaterialTaktTable from "../components/MaterialTaktTable";
import {
  ErrorMessage,
  LoadingSpinner,
  PasteModal,
  OrderModal,
  UrgentOrderModal,
  PauseResumeModal,
  ReportWorkModal,
  MaterialModal,
  FinishOrderModal,
  DelayOrderModal,
  SubmitWorkOrderModal
} from "../components/Modals";

// 导入数据管理hooks
import { useOrderData } from "../hooks/useOrderData";
import { useMachineData } from "../hooks/useMachineData";
import { useMaterialData } from "../hooks/useMaterialData";
import { workOrderApi } from "../services/api";

// 导入工具函数
import { calculateOrderStatus } from "../utils/orderUtils";
import { exportOrdersToExcel, exportGanttChart } from "../utils/exportUtils";

const OrderManagementPage = () => {
  const { user, canPerformAction } = useAuth();
  
  // 使用自定义hooks管理数据
  const {
    orders,
    loading: ordersLoading,
    error: ordersError,
    setOrders,
    addOrder,
    updateOrder,
    deleteOrder,
    importOrders,
    loadOrders,
    addUrgentOrder,
    resumeOrder,
    pauseOrder,
    reportWork
  } = useOrderData();

  const {
    machines,
    loading: machinesLoading,
    error: machinesError
  } = useMachineData();

  const {
    materials,
    loading: materialsLoading,
    error: materialsError,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    importMaterials,
    validateMaterial
  } = useMaterialData();

  // UI状态管理
  const loading = ordersLoading || machinesLoading || materialsLoading;
  const error = ordersError || machinesError || materialsError;
  const [draggedOrder, setDraggedOrder] = useState(null);

  // 弹窗状态
  const [showAddForm, setShowAddForm] = useState(false);
  const [showUrgentForm, setShowUrgentForm] = useState(false);
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [showPauseResumeModal, setShowPauseResumeModal] = useState(false);
  const [showReportWorkModal, setShowReportWorkModal] = useState(false);
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

  // 动态生成日期范围
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

  // 更新工单状态
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

  // 结束工单处理函数
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

  // 延期工单处理函数
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

  // 下达工单处理函数
  const handleSubmitWorkOrder = useCallback((order) => {
    setSubmittingOrder(order);
    setShowSubmitWorkOrderModal(true);
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

  // 生成工序报工单处理函数
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

  // 暂停工单
  const handlePauseOrder = useCallback((order) => {
    setPauseResumeOrder(order);
    setPauseResumeAction('pause');
    setShowPauseResumeModal(true);
  }, []);

  // 恢复工单
  const handleResumeOrder = useCallback((order) => {
    setPauseResumeOrder(order);
    setPauseResumeAction('resume');
    setShowPauseResumeModal(true);
  }, []);

  // 确认暂停或恢复
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

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* 错误提示和加载状态 */}
      {error && <ErrorMessage message={error} onClose={() => {}} />}
      <LoadingSpinner loading={loading} />
      
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* 头部 */}
        <Header
          onShowPasteDialog={canPerformAction('order.import') ? () => setShowPasteDialog(true) : null}
          onShowAddForm={canPerformAction('order.create') ? () => setShowAddForm(true) : null}
          onShowUrgentForm={canPerformAction('order.urgent') ? () => setShowUrgentForm(true) : null}
          canImport={canPerformAction('order.import')}
          canCreate={canPerformAction('order.create')}
          canUrgent={canPerformAction('order.urgent')}
        />

        {/* 工单管理 */}
        <OrderManagement
          orders={orders}
          machines={machines}
          onEditOrder={canPerformAction('order.edit') ? handleEditOrder : null}
          onDeleteOrder={canPerformAction('order.delete') ? handleDeleteOrder : null}
          onPauseOrder={canPerformAction('order.pause') ? handlePauseOrder : null}
          onResumeOrder={canPerformAction('order.resume') ? handleResumeOrder : null}
          onFinishOrder={handleFinishOrder}
          onDelayOrder={canPerformAction('order.delay') ? handleDelayOrder : null}
          onSubmitWorkOrder={canPerformAction('order.submit') ? handleSubmitWorkOrder : null}
          onExportOrders={canPerformAction('order.export') ? handleExportOrders : null}
          onUpdateWmsQuantities={canPerformAction('wms.update') ? handleUpdateWmsQuantities : null}
          onGenerateWorkOrderReport={handleGenerateWorkOrderReport}
          permissions={{
            canEdit: canPerformAction('order.edit'),
            canDelete: canPerformAction('order.delete'),
            canPause: canPerformAction('order.pause'),
            canResume: canPerformAction('order.resume'),
            canFinish: true,
            canDelay: canPerformAction('order.delay'),
            canSubmit: canPerformAction('order.submit'),
            canExport: canPerformAction('order.export'),
            canUpdateWms: canPerformAction('wms.update'),
            canReport: true
          }}
        />

        {/* 当前工单生产时间分析 */}
        <CurrentOrdersAnalysis orders={orders} machines={machines} />

        {/* 甘特图 */}
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold mb-4">生产甘特图</h2>
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
            onDragStart={canPerformAction('gantt.drag') ? handleDragStart : null}
            onDragOver={canPerformAction('gantt.drag') ? handleDragOver : null}
            onDrop={canPerformAction('gantt.drag') ? handleDrop : null}
            onReportWork={canPerformAction('order.report') ? handleReportWork : null}
            onExportGantt={canPerformAction('gantt.export') ? handleExportGantt : null}
            canDrag={canPerformAction('gantt.drag')}
            canReport={canPerformAction('order.report')}
            canExport={canPerformAction('gantt.export')}
          />
        </div>

        {/* 物料生产节拍表 */}
        <MaterialTaktTable
          materials={materials}
          onAddMaterial={canPerformAction('order.write') ? () => setShowMaterialForm(true) : null}
          onEditMaterial={canPerformAction('order.write') ? handleEditMaterial : null}
          onDeleteMaterial={canPerformAction('order.write') ? handleDeleteMaterial : null}
          onImportMaterials={canPerformAction('order.write') ? handleImportMaterials : null}
          permissions={{
            canAdd: canPerformAction('order.write'),
            canEdit: canPerformAction('order.write'),
            canDelete: canPerformAction('order.write'),
            canImport: canPerformAction('order.write')
          }}
        />
      </div>

      {/* 弹窗组件 */}
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
  );
};

export default OrderManagementPage;