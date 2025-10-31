import { useState, useEffect, useCallback } from 'react';
import { orderApi, machineApi } from '../services/api';

// 工单数据管理Hook - 使用后端API
export const useOrderData = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 加载工单数据
  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await orderApi.getAll();
      setOrders(data);
    } catch (err) {
      setError(err.message);
      console.error('加载工单数据失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);
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
      await loadOrders(); // 重新加载数据
      return newOrder;
    } catch (error) {
      console.error('添加工单失败:', error);
      throw error;
    }

  }, [orders, validateOrder, loadOrders]);

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
      
      // 如果工单被结束（设置了actualEndDate），检查机台配置决定是否调整后续工单
      if (updatedOrder.actualEndDate && !originalOrder?.actualEndDate) {
        // 获取机台配置信息
        try {
          const machines = await machineApi.getAll();
          const machine = machines.find(m => m.name === updatedOrder.machine);
          
          // 只有当机台启用了自动调整功能时才执行调整逻辑
          if (machine && machine.autoAdjustOrders !== false) {
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
                newStartDate.setDate(newStartDate.getDate() + 1);
                
                const newEndDate = new Date(newStartDate);
                newEndDate.setDate(newEndDate.getDate() + orderDuration);
                
                await orderApi.update(nextOrder.id, {
                  ...nextOrder,
                  startDate: newStartDate.toISOString().split('T')[0],
                  expectedEndDate: newEndDate.toISOString().split('T')[0]
                });
                
                lastEndDate = newEndDate;
              }
            }
          }
        } catch (error) {
          console.error('获取机台配置失败:', error);
          // 如果获取机台配置失败，为了保持向后兼容性，仍然执行调整逻辑
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
              newStartDate.setDate(newStartDate.getDate() + 1);
              
              const newEndDate = new Date(newStartDate);
              newEndDate.setDate(newEndDate.getDate() + orderDuration);
              
              await orderApi.update(nextOrder.id, {
                ...nextOrder,
                startDate: newStartDate.toISOString().split('T')[0],
                expectedEndDate: newEndDate.toISOString().split('T')[0]
              });
              
              lastEndDate = newEndDate;
            }
          }
        }
      }

      await orderApi.update(updatedOrder.id, updatedOrder);
      await loadOrders();
    } catch (error) {
      console.error('更新工单失败:', error);
      throw error;
    }
  }, [orders, validateOrder, loadOrders]);

  // 删除工单
  const deleteOrder = useCallback(async (orderId) => {
    try {
      await orderApi.delete(orderId);
      await loadOrders(); // 重新加载数据
    } catch (error) {
      console.error('删除工单失败:', error);
      throw error;
    }
  }, [loadOrders]);

  // 批量导入工单
  const importOrders = useCallback(async (pasteData) => {
    try {
      const lines = pasteData.trim().split("\n");
      const newOrders = [];
      const errors = [];

      lines.forEach((line, index) => {
        const cells = line.split("\t");
        if (cells.length >= 8) {
          const startDate = cells[6]?.trim() || "";
          const expectedEndDate = cells[7]?.trim() || "";
          const actualEndDate = cells[8]?.trim() || "";

          // 调试日期解析
          console.log('导入日期调试:', {
            原始开始日期: startDate,
            原始结束日期: expectedEndDate,
            行号: index + 1
          });

          const order = {
            machine: cells[0]?.trim() || "",
            orderNo: cells[1]?.trim() || "",
            materialNo: cells[2]?.trim() || "",
            materialName: cells[3]?.trim() || "",
            quantity: parseInt(cells[4]) || 0,
            priority: parseInt(cells[5]) || 1,
            startDate: startDate,
            expectedEndDate: expectedEndDate,
            actualEndDate: actualEndDate,
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
      } else if (newOrders.length > 0) {
        // 批量创建工单
        for (const order of newOrders) {
          await orderApi.create(order);
        }
        await loadOrders(); // 重新加载数据
        return newOrders.length;
      } else {
        throw new Error('没有找到有效的数据行');
      }
    } catch (error) {
      console.error('批量导入工单失败:', error);
      throw error;
    }
  }, [validateOrder, loadOrders]);

  // 紧急插单功能
  const addUrgentOrder = useCallback(async (urgentOrderData, targetMachine, insertDate) => {
    try {
      const orderToAdd = {
        ...urgentOrderData,
        quantity: parseInt(urgentOrderData.quantity) || 0,
        isUrgent: true,
        priority: 0, // 紧急工单优先级最高
        status: "未开始"
      };

      const validationErrors = validateOrder(orderToAdd);
      if (validationErrors.length > 0) {
        throw new Error(`紧急插单失败: ${validationErrors.join(', ')}`);
      }

      // 找到需要暂停的工单
      const affectedOrders = orders.filter(order =>
        order.machine === targetMachine &&
        !order.actualEndDate && // 未完成的工单
        new Date(order.startDate) <= new Date(insertDate) &&
        new Date(order.expectedEndDate) >= new Date(insertDate)
      );

      // 先创建紧急工单
      const newUrgentOrder = await orderApi.create(orderToAdd);

      // 暂停受影响的工单
      for (const order of affectedOrders) {
        await orderApi.update(order.id, {
          ...order,
          isPaused: true,
          pausedDate: insertDate
        });
      }

      await loadOrders(); // 重新加载数据
      return { newOrder: newUrgentOrder, pausedOrders: affectedOrders };
    } catch (error) {
      console.error('紧急插单失败:', error);
      throw error;
    }
  }, [orders, validateOrder, loadOrders]);

  // 恢复暂停的工单 - 创建新的工单段
  const resumeOrder = useCallback(async (orderId, newStartDate) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order || !order.isPaused) return;

      // 根据剩余天数计算新的结束日期
      const resumeDate = new Date(newStartDate);
      const newEndDate = new Date(resumeDate);
      newEndDate.setDate(newEndDate.getDate() + (order.remainingDays || 1) - 1);

      // 创建新的工单段（恢复段）
      const resumeOrderData = {
        machine: order.machine,
        orderNo: `${order.orderNo}-续`, // 添加续字标识
        materialNo: order.materialNo,
        materialName: order.materialName,
        quantity: order.quantity - (order.reportedQuantity || 0), // 剩余数量
        priority: order.priority,
        startDate: newStartDate,
        expectedEndDate: newEndDate.toISOString().split('T')[0],
        actualEndDate: null,
        reportedQuantity: 0,
        dailyReports: {},
        status: "生产中",
        isUrgent: order.isUrgent,
        isPaused: false,
        pausedDate: null,
        resumedDate: newStartDate,
        delayReason: `从工单${order.orderNo}恢复生产`,
        originalOrderId: orderId // 记录原工单ID
      };

      // 添加新的恢复工单
      await orderApi.create(resumeOrderData);

      // 将原工单标记为已暂停完成
      await orderApi.update(orderId, {
        ...order,
        status: "暂停完成",
        actualEndDate: order.pausedDate // 实际结束日期设为暂停日期
      });

      await loadOrders(); // 重新加载数据
    } catch (error) {
      console.error('恢复工单失败:', error);
      throw error;
    }
  }, [orders, loadOrders]);

  // 暂停工单
  const pauseOrder = useCallback(async (orderId, pauseDate) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      // 计算已生产天数
      const startDate = new Date(order.startDate);
      const pauseDateTime = new Date(pauseDate);
      const producedDays = Math.ceil((pauseDateTime - startDate) / (1000 * 60 * 60 * 24)) + 1;

      // 计算剩余天数
      const totalDays = Math.ceil((new Date(order.expectedEndDate) - startDate) / (1000 * 60 * 60 * 24)) + 1;
      const remainingDays = Math.max(0, totalDays - producedDays);

      await orderApi.update(orderId, {
        ...order,
        isPaused: true,
        pausedDate: pauseDate,
        producedDays: producedDays,
        remainingDays: remainingDays,
        status: "暂停中"
      });

      await loadOrders(); // 重新加载数据
    } catch (error) {
      console.error('暂停工单失败:', error);
      throw error;
    }
  }, [orders, loadOrders]);
  // 报工功能 - 支持按日期记录
  const reportWork = useCallback(async (orderId, date, dailyQuantity, delayReason = "") => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const newDailyReports = {
        ...order.dailyReports,
        [date]: dailyQuantity
      };

      // 计算总报工数量
      const totalReported = Object.values(newDailyReports).reduce((sum, qty) => sum + qty, 0);

      await orderApi.update(orderId, {
        ...order,
        dailyReports: newDailyReports,
        reportedQuantity: totalReported,
        delayReason: delayReason
      });

      await loadOrders(); // 重新加载数据
    } catch (error) {
      console.error('报工失败:', error);
      throw error;
    }
  }, [orders, loadOrders]);

  return {
    orders,
    loading,
    error,
    setOrders,
    addOrder,
    updateOrder,
    deleteOrder,
    importOrders,
    validateOrder,
    loadOrders,
    addUrgentOrder,
    resumeOrder,
    pauseOrder,
    reportWork
  };
};
