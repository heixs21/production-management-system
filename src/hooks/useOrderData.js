import { useCallback } from 'react';
import { orderApi, machineApi } from '../services/api';
import useOrderStore from '../stores/useOrderStore';
import { calculateOrderStatus } from '../utils/orderUtils';

/**
 * 工单数据管理Hook - 使用Zustand状态管理
 * 这是重构后的版本，使用Zustand store
 */
export const useOrderData = () => {
  // 从Zustand store获取状态和actions
  const {
    orders,
    loading,
    error,
    totalCount,
    currentPage,
    pageSize,
    filters,
    setOrders,
    setOrdersWithPagination,
    addOrder: addOrderToStore,
    updateOrder: updateOrderInStore,
    deleteOrder: deleteOrderFromStore,
    setLoading,
    setError,
    setPage,
    setPageSize,
    setFilters,
    clearFilters,
    importOrders: importOrdersToStore,
    addUrgentOrder: addUrgentOrderToStore,
    pauseOrder: pauseOrderInStore,
    resumeOrder: resumeOrderInStore,
    reportWork: reportWorkInStore,
  } = useOrderStore();

  // 验证工单数据
  const validateOrder = useCallback((order) => {
    const errors = [];
    if (!order.machine?.trim()) errors.push('机台不能为空');
    if (!order.orderNo?.trim()) errors.push('工单号不能为空');
    if (!order.materialName?.trim()) errors.push('物料名称不能为空');
    if (!order.quantity || order.quantity <= 0) errors.push('数量必须大于0');
    if (!order.startDate) errors.push('开始日期不能为空');
    if (order.startDate && order.expectedEndDate && new Date(order.startDate) > new Date(order.expectedEndDate)) {
      errors.push('开始日期不能晚于预计结束日期');
    }
    if (order.actualEndDate && order.startDate && new Date(order.actualEndDate) < new Date(order.startDate)) {
      errors.push('实际结束日期不能早于开始日期');
    }
    return errors;
  }, []);

  // 加载工单数据（支持分页，默认加载全部）
  const loadOrders = useCallback(async (usePagination = false, page = 1, size = 50, filterOptions = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      // 如果不使用分页，不传page和limit参数（后端会返回所有数据）
      const params = usePagination ? {
        page,
        limit: size,
        ...filterOptions
      } : filterOptions;
      
      const data = await orderApi.getAll(params);
      
      // 获取机台数据用于状态计算
      let machines = [];
      try {
        machines = await machineApi.getAll();
      } catch (error) {
        console.warn('获取机台数据失败，使用空数组:', error);
      }
      
      // 处理返回的数据
      let loadedOrders = [];
      if (data.orders && data.total !== undefined) {
        loadedOrders = data.orders;
      } else {
        loadedOrders = Array.isArray(data) ? data : [];
      }
      
      // 🔥 修复状态丢失bug：重新计算所有工单的status
      const ordersWithStatus = loadedOrders.map(order => ({
        ...order,
        status: calculateOrderStatus(order, machines, loadedOrders)
      }));
      
      // 保存到store
      if (data.orders && data.total !== undefined) {
        setOrdersWithPagination(ordersWithStatus, data.total, page);
      } else {
        setOrders(ordersWithStatus);
      }
    } catch (err) {
      setError(err.message);
      console.error('加载工单数据失败:', err);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setOrders, setOrdersWithPagination]);

  // 添加工单
  const addOrder = useCallback(async (orderData) => {
    try {
      const orderToAdd = { ...orderData, quantity: parseInt(orderData.quantity) || 0 };
      const validationErrors = validateOrder(orderToAdd);

      if (validationErrors.length > 0) {
        throw new Error(`添加失败: ${validationErrors.join(', ')}`);
      }

      if (orders.some(order => order.orderNo === orderToAdd.orderNo)) {
        throw new Error('工单号已存在，请使用不同的工单号');
      }

      const newOrder = await orderApi.create(orderToAdd);
      addOrderToStore(newOrder);
      return newOrder;
    } catch (error) {
      console.error('添加工单失败:', error);
      throw error;
    }
  }, [orders, validateOrder, addOrderToStore]);

  // 更新工单
  const updateOrder = useCallback(async (updatedOrder) => {
    try {
      const validationErrors = validateOrder(updatedOrder);

      if (validationErrors.length > 0) {
        throw new Error(`保存失败: ${validationErrors.join(', ')}`);
      }

      if (orders.some(order => order.id !== updatedOrder.id && order.orderNo === updatedOrder.orderNo)) {
        throw new Error('工单号已存在，请使用不同的工单号');
      }

      const originalOrder = orders.find(o => o.id === updatedOrder.id);
      
      // 获取机台数据
      const machines = await machineApi.getAll();
      
      // 如果工单被结束，检查机台配置决定是否调整后续工单
      if (updatedOrder.actualEndDate && !originalOrder?.actualEndDate) {
        try {
          const machine = machines.find(m => m.name === updatedOrder.machine);
          
          if (machine && (machine.autoAdjustOrders === true || machine.autoAdjustOrders === 1)) {
            const sameMachineOrders = orders
              .filter(o => 
                o.machine === updatedOrder.machine && 
                !o.actualEndDate && 
                o.id !== updatedOrder.id &&
                new Date(o.startDate) >= new Date(originalOrder.startDate)
              )
              .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

            if (sameMachineOrders.length > 0) {
              let lastEndDate = new Date(updatedOrder.actualEndDate);
              
              for (const nextOrder of sameMachineOrders) {
                const orderDuration = Math.ceil(
                  (new Date(nextOrder.expectedEndDate) - new Date(nextOrder.startDate)) / (1000 * 60 * 60 * 24)
                );
                
                const newStartDate = new Date(lastEndDate);
                
                const newEndDate = new Date(newStartDate);
                newEndDate.setDate(newEndDate.getDate() + orderDuration);
                
                const adjustedOrder = {
                  ...nextOrder,
                  startDate: newStartDate.toISOString().split('T')[0],
                  expectedEndDate: newEndDate.toISOString().split('T')[0]
                };
                
                await orderApi.update(nextOrder.id, adjustedOrder);
                
                // 🔥 重新计算调整后的工单状态
                const adjustedOrderWithStatus = {
                  ...adjustedOrder,
                  status: calculateOrderStatus(adjustedOrder, machines, orders)
                };
                updateOrderInStore(adjustedOrderWithStatus);
                
                lastEndDate = newEndDate;
              }
            }
          }
        } catch (error) {
          console.error('调整后续工单失败:', error);
        }
      }

      await orderApi.update(updatedOrder.id, updatedOrder);
      
      // 🔥 重新计算更新后的工单状态
      const updatedOrderWithStatus = {
        ...updatedOrder,
        status: calculateOrderStatus(updatedOrder, machines, orders)
      };
      updateOrderInStore(updatedOrderWithStatus);
    } catch (error) {
      console.error('更新工单失败:', error);
      throw error;
    }
  }, [orders, validateOrder, updateOrderInStore]);

  // 删除工单
  const deleteOrder = useCallback(async (orderId) => {
    try {
      await orderApi.delete(orderId);
      deleteOrderFromStore(orderId);
    } catch (error) {
      console.error('删除工单失败:', error);
      throw error;
    }
  }, [deleteOrderFromStore]);

  // 批量导入工单
  const importOrders = useCallback(async (pasteData) => {
    try {
      const lines = pasteData.trim().split("\n");
      const newOrders = [];
      const errors = [];

      lines.forEach((line, index) => {
        const cells = line.split("\t");
        if (cells.length >= 8) {
          const order = {
            machine: cells[0]?.trim() || "",
            orderNo: cells[1]?.trim() || "",
            materialNo: cells[2]?.trim() || "",
            materialName: cells[3]?.trim() || "",
            quantity: parseInt(cells[4]) || 0,
            priority: parseInt(cells[5]) || 1,
            startDate: cells[6]?.trim() || "",
            expectedEndDate: cells[7]?.trim() || "",
            actualEndDate: cells[8]?.trim() || "",
            reportedQuantity: parseInt(cells[9]) || 0,
            dailyReports: {},
            status: "未开始"
          };

          const validationErrors = validateOrder(order);
          if (validationErrors.length === 0) {
            newOrders.push(order);
          } else {
            errors.push(`第${index + 1}行: ${validationErrors.join(', ')}`);
          }
        } else {
          errors.push(`第${index + 1}行: 数据格式不正确，需要至少8列数据`);
        }
      });

      if (errors.length > 0) {
        throw new Error(`导入失败:\n${errors.join('\n')}`);
      }
      
      if (newOrders.length > 0) {
        const createdOrders = [];
        for (const order of newOrders) {
          const created = await orderApi.create(order);
          createdOrders.push(created);
        }
        importOrdersToStore(createdOrders);
        return createdOrders.length;
      }
      
      throw new Error('没有找到有效的数据行');
    } catch (error) {
      console.error('批量导入工单失败:', error);
      throw error;
    }
  }, [validateOrder, importOrdersToStore]);

  // 紧急插单功能
  const addUrgentOrder = useCallback(async (urgentOrderData, targetMachine, insertDate) => {
    try {
      const orderToAdd = {
        ...urgentOrderData,
        quantity: parseInt(urgentOrderData.quantity) || 0,
        isUrgent: true,
        priority: 0,
        status: "未开始"
      };

      const validationErrors = validateOrder(orderToAdd);
      if (validationErrors.length > 0) {
        throw new Error(`紧急插单失败: ${validationErrors.join(', ')}`);
      }

      const affectedOrders = orders.filter(order =>
        order.machine === targetMachine &&
        !order.actualEndDate &&
        new Date(order.startDate) <= new Date(insertDate) &&
        new Date(order.expectedEndDate) >= new Date(insertDate)
      );

      const newUrgentOrder = await orderApi.create(orderToAdd);

      const pausedOrders = [];
      for (const order of affectedOrders) {
        const pausedOrder = { ...order, isPaused: true, pausedDate: insertDate };
        await orderApi.update(order.id, pausedOrder);
        pausedOrders.push(pausedOrder);
      }

      addUrgentOrderToStore(newUrgentOrder, pausedOrders);
      return { newOrder: newUrgentOrder, pausedOrders };
    } catch (error) {
      console.error('紧急插单失败:', error);
      throw error;
    }
  }, [orders, validateOrder, addUrgentOrderToStore]);

  // 恢复暂停的工单（优化版：直接更新原工单，不创建新工单，保留原始开始日期）
  const resumeOrder = useCallback(async (orderId, resumeDate) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order || !order.isPaused) return;

      // 计算新的结束日期（基于剩余天数）
      const newResumeDate = new Date(resumeDate);
      const newEndDate = new Date(newResumeDate);
      newEndDate.setDate(newEndDate.getDate() + (order.remainingDays || 1) - 1);

      // 直接更新原工单，恢复生产
      // 关键：保持原始 startDate 不变！
      const updatedOrder = {
        ...order,
        isPaused: false,
        // pausedDate: 保留暂停日期，用于标记暂停时间段
        resumedDate: resumeDate, // 记录恢复日期
        expectedEndDate: newEndDate.toISOString().split('T')[0],
        status: "生产中",
        delayReason: `暂停时段: ${order.pausedDate} 至 ${resumeDate}` + (order.delayReason ? ` | 原因: ${order.delayReason}` : ''),
        // 保留原始 startDate、已报工数据和剩余天数
      };
      
      await orderApi.update(orderId, updatedOrder);
      resumeOrderInStore(orderId, resumeDate);
    } catch (error) {
      console.error('恢复工单失败:', error);
      throw error;
    }
  }, [orders, resumeOrderInStore]);

  // 暂停工单
  const pauseOrder = useCallback(async (orderId, pauseDate) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const startDate = new Date(order.startDate);
      const pauseDateTime = new Date(pauseDate);
      const producedDays = Math.ceil((pauseDateTime - startDate) / (1000 * 60 * 60 * 24)) + 1;
      const totalDays = Math.ceil((new Date(order.expectedEndDate) - startDate) / (1000 * 60 * 60 * 24)) + 1;
      const remainingDays = Math.max(0, totalDays - producedDays);

      const updatedOrder = {
        ...order,
        isPaused: true,
        pausedDate: pauseDate,
        producedDays: producedDays,
        remainingDays: remainingDays,
        status: "暂停中"
      };

      await orderApi.update(orderId, updatedOrder);
      pauseOrderInStore(orderId, pauseDate);
    } catch (error) {
      console.error('暂停工单失败:', error);
      throw error;
    }
  }, [orders, pauseOrderInStore]);

  // 报工功能
  const reportWork = useCallback(async (orderId, date, dailyQuantity, delayReason = "") => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const newDailyReports = {
        ...order.dailyReports,
        [date]: dailyQuantity
      };

      const totalReported = Object.values(newDailyReports).reduce((sum, qty) => sum + qty, 0);

      const updatedOrder = {
        ...order,
        dailyReports: newDailyReports,
        reportedQuantity: totalReported,
        delayReason: delayReason
      };

      await orderApi.update(orderId, updatedOrder);
      reportWorkInStore(orderId, date, dailyQuantity, delayReason);
    } catch (error) {
      console.error('报工失败:', error);
      throw error;
    }
  }, [orders, reportWorkInStore]);

  return {
    // 状态
    orders,
    loading,
    error,
    totalCount,
    currentPage,
    pageSize,
    filters,
    
    // 基本操作
    setOrders,
    addOrder,
    updateOrder,
    deleteOrder,
    
    // 高级操作
    importOrders,
    validateOrder,
    loadOrders,
    addUrgentOrder,
    resumeOrder,
    pauseOrder,
    reportWork,
    
    // 分页和过滤
    setPage,
    setPageSize,
    setFilters,
    clearFilters,
  };
};
