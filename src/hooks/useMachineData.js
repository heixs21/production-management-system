import { useCallback } from 'react';
import { machineApi } from '../services/api';
import useMachineStore from '../stores/useMachineStore';

/**
 * 机台数据管理Hook - 使用Zustand状态管理
 */
export const useMachineData = () => {
  const {
    machines,
    loading,
    error,
    setMachines,
    addMachine: addMachineToStore,
    updateMachine: updateMachineInStore,
    deleteMachine: deleteMachineFromStore,
    setLoading,
    setError,
    getMachineStatus,
    updateRealtimeData,
  } = useMachineStore();

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
  }, [setLoading, setError, setMachines]);

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
      addMachineToStore(newMachine);
      return newMachine;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [machines, addMachineToStore, setError]);

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
      updateMachineInStore(updatedMachine);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [machines, updateMachineInStore, setError]);

  // 删除机台
  const deleteMachine = useCallback(async (machineId, onDeleteOrders) => {
    try {
      const machine = machines.find(m => m.id === machineId);
      if (!machine) return;

      if (onDeleteOrders) {
        onDeleteOrders(machine.name);
      }

      await machineApi.delete(machineId);
      deleteMachineFromStore(machineId);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [machines, deleteMachineFromStore, setError]);

  return {
    machines,
    loading,
    error,
    setMachines,
    addMachine,
    updateMachine,
    deleteMachine,
    getMachineStatus,
    updateRealtimeData,
    loadMachines
  };
};

