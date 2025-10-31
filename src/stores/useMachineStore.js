import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useMachineStore = create(
  devtools(
    (set, get) => ({
      // 状态
      machines: [],
      loading: false,
      error: null,

      // Actions
      setMachines: (machines) => set({ machines }),
      
      addMachine: (machine) => set((state) => ({ 
        machines: [...state.machines, machine] 
      })),
      
      updateMachine: (updatedMachine) => set((state) => ({
        machines: state.machines.map((machine) =>
          machine.id === updatedMachine.id ? updatedMachine : machine
        ),
      })),
      
      deleteMachine: (machineId) => set((state) => ({
        machines: state.machines.filter((machine) => machine.id !== machineId),
      })),
      
      setLoading: (loading) => set({ loading }),
      
      setError: (error) => set({ error }),
      
      // 获取机台状态
      getMachineStatus: (machineName, orders) => {
        const machine = get().machines.find(m => m.name === machineName);
        if (!machine) return '未知';
        
        const today = new Date().toISOString().split('T')[0];
        const machineOrders = orders.filter(
          o => o.machine === machineName && 
               o.startDate <= today && 
               (!o.actualEndDate || o.actualEndDate >= today)
        );
        
        if (machineOrders.length === 0) return '空闲';
        if (machineOrders.some(o => o.isPaused)) return '暂停';
        if (machineOrders.some(o => o.status === '生产中')) return '生产中';
        
        return '待开始';
      },

      // 更新机台实时数据（OPC UA）
      updateRealtimeData: (machineId, realtimeData) => set((state) => ({
        machines: state.machines.map((machine) =>
          machine.id === machineId 
            ? { ...machine, realtimeData, lastOpcuaUpdate: new Date().toISOString() } 
            : machine
        ),
      })),

      // 重置状态
      reset: () => set({
        machines: [],
        loading: false,
        error: null,
      }),
    }),
    { name: 'MachineStore' }
  )
);

export default useMachineStore;

