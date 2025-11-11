import { useState, useEffect, useCallback } from 'react';
import { machineApi } from '../services/api';

// 机台数据管理Hook - 使用后端API
export const useMachineData = () => {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 加载机台数据
  const loadMachines = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await machineApi.getAll();
      setMachines(data);
    } catch (err) {
      setError(err.message);
      console.error('加载机台数据失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    loadMachines();
  }, [loadMachines]);

  // 添加机台
  const addMachine = useCallback(async (machineData) => {
    try {
      if (!machineData.name?.trim()) {
        throw new Error('机台名称不能为空');
      }

      if (machines.some(m => m.name === machineData.name)) {
        throw new Error('机台名称已存在');
      }

      const newMachine = await machineApi.create(machineData);
      await loadMachines(); // 重新加载数据
      return newMachine;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [machines, loadMachines]);

  // 更新机台
  const updateMachine = useCallback(async (updatedMachine) => {
    try {
      if (!updatedMachine.name?.trim()) {
        throw new Error('机台名称不能为空');
      }

      if (machines.some(m => m.id !== updatedMachine.id && m.name === updatedMachine.name)) {
        throw new Error('机台名称已存在');
      }

      await machineApi.update(updatedMachine.id, updatedMachine);
      await loadMachines(); // 重新加载数据
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [machines, loadMachines]);

  // 删除机台
  const deleteMachine = useCallback(async (machineId, onDeleteOrders) => {
    try {
      const machine = machines.find(m => m.id === machineId);
      if (!machine) return;

      // 如果有关联的工单，调用回调函数处理
      if (onDeleteOrders) {
        onDeleteOrders(machine.name);
      }

      await machineApi.delete(machineId);
      await loadMachines(); // 重新加载数据
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [machines, loadMachines]);

  // 获取机台状态
  const getMachineStatus = useCallback((machineName) => {
    const machine = machines.find(m => m.name === machineName);
    return machine ? machine.status : '正常';
  }, [machines]);

  return {
    machines,
    loading,
    error,
    setMachines,
    addMachine,
    updateMachine,
    deleteMachine,
    getMachineStatus,
    loadMachines
  };
};
