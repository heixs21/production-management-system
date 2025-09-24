import React, { useState, useEffect, useMemo } from 'react';
import { Play, Square, RefreshCw, AlertCircle } from 'lucide-react';

const MESWorkOrderManagement = () => {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [operationLoading, setOperationLoading] = useState({});

  // API配置 - 使用后端代理
  const API_BASE = `http://${window.location.hostname}:12454`;

  // 获取工单数据
  const fetchWorkOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/mes/workOrders`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setWorkOrders(data || []);
    } catch (err) {
      setError(`获取工单数据失败: ${err.message}`);
      console.error('获取工单数据失败:', err);
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

  // 取消工单
  const cancelWorkOrder = async (workOrderId) => {
    setOperationLoading(prev => ({ ...prev, [workOrderId]: 'canceling' }));
    try {
      const response = await fetch(`${API_BASE}/api/mes/cancelWorkOrder/${workOrderId}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        // 刷新工单列表
        await fetchWorkOrders();
        alert(`工单取消成功！`);
      } else {
        throw new Error(result.message || '取消工单失败');
      }
    } catch (err) {
      alert(`取消工单失败: ${err.message}`);
      console.error('取消工单失败:', err);
    } finally {
      setOperationLoading(prev => ({ ...prev, [workOrderId]: null }));
    }
  };

  // 按产线代号分组并排序
  const groupedWorkOrders = useMemo(() => {
    const groups = {};
    
    workOrders.forEach(order => {
      const lineCode = order.equipment || '未分配';
      if (!groups[lineCode]) {
        groups[lineCode] = [];
      }
      groups[lineCode].push(order);
    });

    // 对每个组内的工单进行排序：执行状态1在前，0在后，然后按优先级排序
    Object.keys(groups).forEach(lineCode => {
      groups[lineCode].sort((a, b) => {
        // 首先按执行状态排序（1在前，0在后）
        if (a.status !== b.status) {
          return b.status - a.status;
        }
        // 然后按优先级排序（数字越小优先级越高）
        return a.priority - b.priority;
      });
    });

    return groups;
  }, [workOrders]);

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

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <h1 className="text-xl font-bold text-gray-800">MES工单管理</h1>
          <button
            onClick={fetchWorkOrders}
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
            {Object.keys(groupedWorkOrders).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暂无工单数据
              </div>
            ) : (
              Object.entries(groupedWorkOrders).map(([lineCode, orders]) => (
                <div key={lineCode} className="mb-6">
                  {/* 产线标题 */}
                  <div className="flex items-center mb-3 p-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border-l-4 border-indigo-500">
                    <div className="w-3 h-3 bg-indigo-500 rounded-full mr-3"></div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      产线代号: {lineCode}
                    </h3>
                    <span className="ml-3 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                      {orders.length}个工单
                    </span>
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
                        {orders.map((order) => (
                          <tr key={order.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-blue-600">
                              {order.orderId}
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
                                ) : (
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
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MESWorkOrderManagement;