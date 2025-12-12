import React, { useState, useEffect, useMemo } from 'react';
import { Play, Square, RefreshCw, AlertCircle, Trash2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getCompanyConfig } from '../config/companies';
import { orderApi } from '../services/api';

const MachineMonitoring = () => {
  const { user } = useAuth();
  const companyConfig = getCompanyConfig(user?.companyId);
  const [workOrders, setWorkOrders] = useState([]);
  const [machines, setMachines] = useState([]);
  const [localOrders, setLocalOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [operationLoading, setOperationLoading] = useState({});
  const [selectedGroup, setSelectedGroup] = useState('all');

  // API配置 - 使用后端代理
  const API_BASE = `http://${window.location.hostname}:12454`;

  // 获取机台数据
  const fetchMachines = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/machines`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMachines(data || []);
      }
    } catch (err) {
      console.error('获取机台数据失败:', err);
    }
  };

  // 获取本地工单数据
  const fetchLocalOrders = async () => {
    try {
      const data = await orderApi.getAll();
      setLocalOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('获取本地工单数据失败:', err);
    }
  };

  // 获取工单数据
  const fetchWorkOrders = async () => {
    // 机电公司不显示MES工单数据
    if (user?.companyId === 'hetai-mechanical') {
      setWorkOrders([]);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/mes/workOrders`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // 处理不同的响应格式
      if (data.items) {
        setWorkOrders(data.items || []);
      } else if (Array.isArray(data)) {
        setWorkOrders(data);
      } else {
        setWorkOrders([]);
      }
      
      // 如果MES系统不可用，显示提示
      if (data.error) {
        console.log('[MES]', data.error);
      }
    } catch (err) {
      setError(`获取工单数据失败: ${err.message}`);
      console.error('获取工单数据失败:', err);
      setWorkOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // 开始工单
  const startWorkOrder = async (orderId) => {
    setOperationLoading(prev => ({ ...prev, [orderId]: 'starting' }));
    try {
      const response = await fetch(`${API_BASE}/api/mes/startWorkOrder/${orderId}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        // 刷新工单列表
        await fetchWorkOrders();
        alert(`工单 ${orderId} 开始成功！`);
      } else {
        throw new Error(result.message || '开始工单失败');
      }
    } catch (err) {
      alert(`开始工单失败: ${err.message}`);
      console.error('开始工单失败:', err);
    } finally {
      setOperationLoading(prev => ({ ...prev, [orderId]: null }));
    }
  };

  // 取消工单（支持静默模式）
  const cancelWorkOrder = async (workOrderId, silent = false) => {
    if (!silent) {
      setOperationLoading(prev => ({ ...prev, [workOrderId]: 'canceling' }));
    }
    try {
      const response = await fetch(`${API_BASE}/api/mes/cancelWorkOrder/${workOrderId}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        if (!silent) {
          await fetchWorkOrders();
          alert(`工单取消成功！`);
        }
        return true;
      } else {
        throw new Error(result.message || '取消工单失败');
      }
    } catch (err) {
      if (!silent) {
        alert(`取消工单失败: ${err.message}`);
      }
      console.error('取消工单失败:', err);
      throw err;
    } finally {
      if (!silent) {
        setOperationLoading(prev => ({ ...prev, [workOrderId]: null }));
      }
    }
  };

  // 获取机台名称
  const getMachineName = (lineCode) => {
    const machine = machines.find(m => m.lineCode === lineCode);
    return machine ? machine.name : `产线${lineCode}`;
  };

  // 获取机台分组列表
  const machineGroups = useMemo(() => {
    const groups = new Set();
    machines.forEach(m => {
      if (m.machineGroup) groups.add(m.machineGroup);
    });
    return ['all', ...Array.from(groups)];
  }, [machines]);

  // 过滤机台
  const filteredMachines = useMemo(() => {
    if (selectedGroup === 'all') return machines;
    return machines.filter(m => m.machineGroup === selectedGroup);
  }, [machines, selectedGroup]);

  // 按产线代号分组并排序
  const groupedWorkOrders = useMemo(() => {
    const groups = {};
    
    workOrders.forEach(order => {
      const lineCode = order.equipment || '未分配';
      const machineName = getMachineName(lineCode);
      const groupKey = `${lineCode}-${machineName}`;
      
      if (!groups[groupKey]) {
        groups[groupKey] = {
          lineCode,
          machineName,
          orders: []
        };
      }
      groups[groupKey].orders.push(order);
    });

    // 对每个组内的工单进行排序：执行状态1在前，0在后，然后按优先级排序
    Object.keys(groups).forEach(groupKey => {
      groups[groupKey].orders.sort((a, b) => {
        // 首先按执行状态排序（1在前，0在后）
        if (a.status !== b.status) {
          return b.status - a.status;
        }
        // 然后按优先级排序（数字越小优先级越高）
        return a.priority - b.priority;
      });
    });

    return groups;
  }, [workOrders, machines]);

  // 过滤分组后的工单
  const filteredGroupedWorkOrders = useMemo(() => {
    if (selectedGroup === 'all') return groupedWorkOrders;
    
    const filtered = {};
    Object.entries(groupedWorkOrders).forEach(([key, group]) => {
      const machine = filteredMachines.find(m => m.name === group.machineName);
      if (machine) {
        filtered[key] = group;
      }
    });
    return filtered;
  }, [groupedWorkOrders, filteredMachines]);

  // 格式化日期
  const formatDate = (dateString) => {
    if (!dateString || dateString === '0001-01-01T00:00:00+08:00') {
      return '-';
    }
    try {
      return new Date(dateString).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  // 获取执行状态显示
  const getStatusDisplay = (status) => {
    return status === '1' ? '执行中' : '未执行';
  };

  // 获取状态样式
  const getStatusStyle = (status) => {
    return status === '1' 
      ? 'px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800'
      : 'px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800';
  };

  // 删除机台所有MES工单
  const deleteAllMachineOrders = async (machineName, lineCode) => {
    // 找到该机台的所有MES工单
    const machineOrders = workOrders.filter(o => {
      const orderMachineName = getMachineName(o.equipment);
      return orderMachineName === machineName;
    });
    
    if (machineOrders.length === 0) {
      alert(`机台 ${machineName} 没有MES工单`);
      return;
    }
    
    if (!window.confirm(`确定要删除机台 ${machineName} 的 ${machineOrders.length} 个MES工单吗？此操作不可恢复！`)) {
      return;
    }
    
    try {
      let successCount = 0;
      let failCount = 0;
      
      // 静默模式批量删除
      for (const order of machineOrders) {
        try {
          await cancelWorkOrder(order.id, true);
          successCount++;
        } catch (err) {
          console.error(`删除工单 ${order.orderId} 失败:`, err);
          failCount++;
        }
      }
      
      // 批量删除完成后统一刷新
      await fetchWorkOrders();
      
      if (failCount === 0) {
        alert(`✅ 已成功删除机台 ${machineName} 的 ${successCount} 个MES工单`);
      } else {
        alert(`⚠️ 删除完成：成功 ${successCount} 个，失败 ${failCount} 个`);
      }
    } catch (err) {
      alert(`❌ 删除失败: ${err.message}`);
      console.error('删除机台工单失败:', err);
    }
  };

  // 检查工单执行顺序是否正确
  const checkOrderSequence = (machineName, currentOrderId) => {
    const machineOrders = localOrders
      .filter(o => o.machine === machineName && !o.actualEndDate)
      .sort((a, b) => {
        if (a.startDate !== b.startDate) {
          return new Date(a.startDate) - new Date(b.startDate);
        }
        return a.priority - b.priority;
      });
    
    if (machineOrders.length === 0) return false;
    const firstOrder = machineOrders[0];
    return firstOrder.orderNo !== currentOrderId;
  };

  useEffect(() => {
    fetchMachines();
    fetchWorkOrders();
    fetchLocalOrders();
  }, []);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-gray-800">机台监控</h1>
            {/* 机台分组切换 */}
            <div className="flex items-center space-x-2">
              {machineGroups.map(group => (
                <button
                  key={group}
                  onClick={() => setSelectedGroup(group)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    selectedGroup === group
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {group === 'all' ? '全部' : group}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => {
              fetchWorkOrders();
              fetchLocalOrders();
            }}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* 加载状态 */}
        {loading && (
          <div className="p-8 text-center">
            <div className="inline-flex items-center">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              <span>加载中...</span>
            </div>
          </div>
        )}

        {/* 工单列表 */}
        {!loading && !error && (
          <div className="p-4">
            {user?.companyId === 'hetai-mechanical' ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-sm">机电公司不使用此页面，请使用工单管理功能</p>
              </div>
            ) : Object.keys(filteredGroupedWorkOrders).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暂无工单数据
              </div>
            ) : (
              Object.entries(filteredGroupedWorkOrders)
                .sort(([, a], [, b]) => a.machineName.localeCompare(b.machineName))
                .map(([groupKey, group]) => {
                  const hasSequenceError = group.orders.some(order => 
                    order.status === '1' && checkOrderSequence(group.machineName, order.orderId)
                  );
                  
                  return (
                <div key={groupKey} className="mb-6">
                  {/* 机台标题 */}
                  <div className={`flex items-center mb-3 p-3 rounded-lg border-l-4 ${
                    hasSequenceError 
                      ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-500'
                      : 'bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-500'
                  }`}>
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      hasSequenceError ? 'bg-red-500 animate-pulse' : 'bg-indigo-500'
                    }`}></div>
                    {hasSequenceError && (
                      <AlertTriangle className="w-5 h-5 text-red-600 mr-2 animate-pulse" />
                    )}
                    <h3 className="text-lg font-semibold text-gray-800">
                      {group.machineName}
                    </h3>
                    <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">
                      {group.lineCode}
                    </span>
                    <span className="ml-3 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                      {group.orders.length}个工单
                    </span>
                    {hasSequenceError && (
                      <span className="ml-3 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium animate-pulse">
                        ⚠️ 工单顺序异常
                      </span>
                    )}
                    <button
                      onClick={() => deleteAllMachineOrders(group.machineName, group.lineCode)}
                      className="ml-auto flex items-center px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                      title="删除该机台所有MES工单"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      删除所有MES工单
                    </button>
                  </div>

                  {/* 工单表格 */}
                  <div className="overflow-x-auto bg-white rounded-lg shadow-sm border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="px-4 py-3 text-left font-medium text-gray-700">工单号</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">组件号</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">物料号</th>
                          <th className="px-4 py-3 text-center font-medium text-gray-700">优先级</th>
                          <th className="px-4 py-3 text-center font-medium text-gray-700">执行状态</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">创建时间</th>
                          <th className="px-4 py-3 text-center font-medium text-gray-700">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.orders.map((order, index) => {
                          const isSequenceError = order.status === '1' && checkOrderSequence(group.machineName, order.orderId);
                          
                          return (
                          <tr key={order.id} className={`border-b hover:bg-gray-50 ${
                            isSequenceError ? 'bg-red-50' : ''
                          }`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center">
                                {isSequenceError && (
                                  <AlertTriangle className="w-4 h-4 text-red-600 mr-2 animate-pulse" title="工单执行顺序异常" />
                                )}
                                <span className={`font-medium ${
                                  isSequenceError ? 'text-red-600' : 'text-blue-600'
                                }`}>
                                  {order.orderId}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {order.materialId || '-'}
                            </td>
                            <td className="px-4 py-3">
                              {order.nextMaterialId || '-'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                                {order.priority}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={getStatusStyle(order.status)}>
                                {getStatusDisplay(order.status)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {formatDate(order.creationTime)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex justify-center space-x-2">
                                {order.status === '0' ? (
                                  <>
                                    <button
                                      onClick={() => startWorkOrder(order.orderId)}
                                      disabled={operationLoading[order.orderId] === 'starting'}
                                      className="flex items-center px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                                    >
                                      {operationLoading[order.orderId] === 'starting' ? (
                                        <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                                      ) : (
                                        <Play className="w-3 h-3 mr-1" />
                                      )}
                                      开始
                                    </button>
                                    <button
                                      onClick={() => cancelWorkOrder(order.id)}
                                      disabled={operationLoading[order.id] === 'canceling'}
                                      className="flex items-center px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50"
                                    >
                                      {operationLoading[order.id] === 'canceling' ? (
                                        <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                                      ) : (
                                        <Square className="w-3 h-3 mr-1" />
                                      )}
                                      删除
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => cancelWorkOrder(order.id)}
                                      disabled={operationLoading[order.id] === 'canceling'}
                                      className="flex items-center px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50"
                                    >
                                      {operationLoading[order.id] === 'canceling' ? (
                                        <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                                      ) : (
                                        <Square className="w-3 h-3 mr-1" />
                                      )}
                                      取消
                                    </button>
                                    <div className="w-16"></div>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                  );
                })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MachineMonitoring;