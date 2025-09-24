import React, { useState, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import MachineManager from "../components/MachineManager";
import {
  ErrorMessage,
  LoadingSpinner,
  MachineModal
} from "../components/Modals";

// 导入数据管理hooks
import { useOrderData } from "../hooks/useOrderData";
import { useMachineData } from "../hooks/useMachineData";

const MachineManagementPage = () => {
  const { user } = useAuth();
  
  // 使用自定义hooks管理数据
  const {
    orders,
    setOrders
  } = useOrderData();

  const {
    machines,
    loading: machinesLoading,
    error: machinesError,
    addMachine,
    updateMachine,
    deleteMachine
  } = useMachineData();

  // UI状态管理
  const loading = machinesLoading;
  const error = machinesError;

  // 弹窗状态
  const [showMachineForm, setShowMachineForm] = useState(false);
  const [editingMachine, setEditingMachine] = useState(null);

  // 表单数据
  const [newMachine, setNewMachine] = useState({ 
    name: "", 
    status: "正常", 
    coefficient: 1.00 
  });

  // 机台管理处理函数
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
      // 删除相关工单
      setOrders(orders.filter(o => o.machine !== machine.name));
    }
    
    deleteMachine(machineId);
  }, [machines, orders, deleteMachine, setOrders]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* 错误提示和加载状态 */}
      {error && <ErrorMessage message={error} onClose={() => {}} />}
      <LoadingSpinner loading={loading} />
      
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* 页面标题 */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">机台管理</h1>
              <p className="text-gray-600 mt-1">管理生产线机台设备信息</p>
            </div>
            <button
              onClick={() => setShowMachineForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <span>➕</span>
              <span>添加机台</span>
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

        {/* 统计信息 */}
        <div className="p-6 border-t bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-blue-600">
                {machines.length}
              </div>
              <div className="text-sm text-gray-600">总机台数</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-green-600">
                {machines.filter(m => m.status === '正常').length}
              </div>
              <div className="text-sm text-gray-600">正常运行</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-yellow-600">
                {machines.filter(m => m.status === '维修').length}
              </div>
              <div className="text-sm text-gray-600">维修中</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-red-600">
                {machines.filter(m => m.status === '停机').length}
              </div>
              <div className="text-sm text-gray-600">停机</div>
            </div>
          </div>
        </div>
      </div>

      {/* 弹窗组件 */}
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
    </div>
  );
};

export default MachineManagementPage;