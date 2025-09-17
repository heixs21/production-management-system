import React, { useState, useEffect, useMemo } from 'react';
import { getStatusColors, formatDateOnly } from '../utils/orderUtils';

const ProductionBoard = ({ onBackToAdmin }) => {
  const [machines, setMachines] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // 获取数据
  useEffect(() => {
    const fetchData = async (isInitialLoad = false) => {
      try {
        const serverUrl = `http://${window.location.hostname}:12454`;
        const [machinesRes, ordersRes] = await Promise.all([
          fetch(`${serverUrl}/api/machines`),
          fetch(`${serverUrl}/api/orders`)
        ]);
        
        const machinesData = await machinesRes.json();
        const ordersData = await ordersRes.json();
        
        setMachines(machinesData);
        setOrders(ordersData);
        
        // 只在初次加载时设置默认机台
        if (isInitialLoad && machinesData.length > 0 && !selectedMachine) {
          setSelectedMachine(machinesData[0].name);
        }
      } catch (error) {
        console.error('获取数据失败:', error);
      } finally {
        if (isInitialLoad) {
          setLoading(false);
        }
      }
    };

    // 初次加载
    fetchData(true);
    
    // 每30秒刷新一次数据，但不重置选中的机台
    const interval = setInterval(() => fetchData(false), 30000);
    return () => clearInterval(interval);
  }, [selectedMachine]);

  // 更新当前时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 获取选中机台的工单（按排单顺序）
  const machineOrders = useMemo(() => {
    if (!selectedMachine) return [];
    
    return orders
      .filter(order => order.machine === selectedMachine && !order.actualEndDate)
      .sort((a, b) => {
        // 按机台、开始日期、优先度排序（与后端一致）
        if (a.startDate !== b.startDate) {
          return new Date(a.startDate) - new Date(b.startDate);
        }
        return a.priority - b.priority;
      });
  }, [orders, selectedMachine]);

  // 获取当前正在生产的工单
  const currentOrder = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return machineOrders.find(order => {
      const startDate = order.startDate;
      const endDate = order.actualEndDate || order.delayedExpectedEndDate || order.expectedEndDate;
      return startDate <= today && (!endDate || endDate >= today) && !order.isPaused;
    });
  }, [machineOrders]);

  const statusColors = getStatusColors();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">正在加载生产看板...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* 头部信息 */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            {onBackToAdmin && (
              <button
                onClick={onBackToAdmin}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center space-x-2"
              >
                <span>←</span>
                <span>返回管理</span>
              </button>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-800">🏭 生产看板</h1>
              <p className="text-gray-600 mt-2">实时工单排产信息</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono text-blue-600">
              {currentTime.toLocaleTimeString()}
            </div>
            <div className="text-gray-600">
              {currentTime.toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {/* 机台选择 */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">选择机台</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {machines.map(machine => (
            <button
              key={machine.id}
              onClick={() => setSelectedMachine(machine.name)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedMachine === machine.name
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold">{machine.name}</div>
              <div className={`text-sm mt-1 px-2 py-1 rounded ${
                machine.status === '正常' 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-red-100 text-red-600'
              }`}>
                {machine.status}
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedMachine && (
        <>
          {/* 当前生产工单 */}
          {currentOrder && (
            <div className="bg-green-50 border-2 border-green-200 rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-green-800 mb-4 flex items-center">
                🔄 当前生产工单
              </h2>
              <div className="bg-white rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">工单号</div>
                    <div className="text-lg font-semibold text-blue-600">{currentOrder.orderNo}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">物料名称</div>
                    <div className="font-medium">{currentOrder.materialName}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">数量</div>
                    <div className="text-lg font-semibold">{currentOrder.quantity}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">优先度</div>
                    <div className="text-lg font-semibold text-orange-600">P{currentOrder.priority}</div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">开始日期</div>
                    <div className="font-medium">{formatDateOnly(currentOrder.startDate)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">预计结束</div>
                    <div className="font-medium">{formatDateOnly(currentOrder.expectedEndDate)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">报工进度</div>
                    <div className="font-medium text-blue-600">
                      {currentOrder.reportedQuantity || 0} / {currentOrder.quantity}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 工单排产列表 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              📋 {selectedMachine} - 工单排产顺序
            </h2>
            
            {machineOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                该机台暂无待生产工单
              </div>
            ) : (
              <div className="space-y-3">
                {machineOrders.map((order, index) => (
                  <div
                    key={order.id}
                    className={`border rounded-lg p-4 transition-all ${
                      order.id === currentOrder?.id
                        ? 'border-green-400 bg-green-50'
                        : order.isPaused
                        ? 'border-orange-300 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          order.id === currentOrder?.id
                            ? 'bg-green-500'
                            : order.isPaused
                            ? 'bg-orange-500'
                            : 'bg-blue-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-semibold text-lg">{order.orderNo}</div>
                          <div className="text-gray-600">{order.materialName}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-6">
                        <div className="text-center">
                          <div className="text-sm text-gray-600">数量</div>
                          <div className="font-semibold">{order.quantity}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-600">优先度</div>
                          <div className="font-semibold text-orange-600">P{order.priority}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-600">开始日期</div>
                          <div className="font-medium">{formatDateOnly(order.startDate)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-600">状态</div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || 'text-gray-600 bg-gray-100'}`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {order.isPaused && (
                      <div className="mt-3 p-2 bg-orange-100 rounded text-orange-700 text-sm">
                        ⏸️ 工单已暂停 - 暂停日期: {formatDateOnly(order.pausedDate)}
                      </div>
                    )}
                    
                    {order.isUrgent && (
                      <div className="mt-3 p-2 bg-red-100 rounded text-red-700 text-sm">
                        🚨 紧急工单
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ProductionBoard;