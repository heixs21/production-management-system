import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Edit3, X, Download, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { getStatusColors, formatDateOnly } from '../utils/orderUtils';
import ProductionReportModal from './ProductionReportModal';

const OrderManagement = ({
  orders,
  machines = [],
  selectedGroup,
  onGroupChange,
  onEditOrder,
  onDeleteOrder,
  onPauseOrder,
  onResumeOrder,
  onFinishOrder,
  onSubmitWorkOrder,
  onExportOrders,
  onUpdateWmsQuantities,
  onGenerateWorkOrderReport,
  permissions = {}
}) => {
  const [activeTab, setActiveTab] = useState('current'); // 'current' 或 'completed'
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [collapsedMachines, setCollapsedMachines] = useState(new Set());
  const [productionReportModal, setProductionReportModal] = useState({ isOpen: false, order: null });
  // 使用外部传入的分组状态
  const itemsPerPage = 10;
  
  const statusColors = getStatusColors();

  // 分离已完成和未完成的工单
  const { completedOrders, activeOrders } = useMemo(() => {
    const completed = orders.filter(order => order.actualEndDate);
    const active = orders.filter(order => !order.actualEndDate);
    return { completedOrders: completed, activeOrders: active };
  }, [orders]);

  // 获取机台组信息
  const machineGroups = useMemo(() => {
    const groups = new Map();
    
    // 从工单中获取机台名称
    const machineNames = [...new Set(activeOrders.map(order => order.machine))];
    
    // 从 machines 数据中获取真实的机台组信息
    machineNames.forEach(machineName => {
      const machine = machines.find(m => m.name === machineName);
      const group = machine?.machineGroup || '未分组';
      
      if (!groups.has(group)) {
        groups.set(group, []);
      }
      groups.get(group).push(machineName);
    });
    
    return groups;
  }, [activeOrders, machines]);

  // 根据选中的组过滤工单
  const filteredActiveOrders = useMemo(() => {
    if (selectedGroup === 'all') {
      return activeOrders;
    }
    
    const groupMachines = machineGroups.get(selectedGroup) || [];
    return activeOrders.filter(order => groupMachines.includes(order.machine));
  }, [activeOrders, selectedGroup, machineGroups]);

  // 搜索过滤
  const filteredCompletedOrders = useMemo(() => {
    return completedOrders.filter(order =>
      order.orderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.machine.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [completedOrders, searchTerm]);

  // 分页
  const totalPages = Math.ceil(filteredCompletedOrders.length / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCompletedOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCompletedOrders, currentPage]);

  const handlePageChange = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const toggleMachineCollapse = (machine) => {
    const newCollapsed = new Set(collapsedMachines);
    if (newCollapsed.has(machine)) {
      newCollapsed.delete(machine);
    } else {
      newCollapsed.add(machine);
    }
    setCollapsedMachines(newCollapsed);
  };

  const handleProductionReport = (order) => {
    setProductionReportModal({ isOpen: true, order });
  };

  const handleCloseProductionReport = () => {
    setProductionReportModal({ isOpen: false, order: null });
  };

  return (
    <div className="p-4 border-b">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">工单管理</h2>
        <div className="flex space-x-2">
          {permissions.canUpdateWms && onUpdateWmsQuantities && (
            <button
              onClick={onUpdateWmsQuantities}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center"
            >
              🔄 更新WMS数量
            </button>
          )}
          {permissions.canExport && onExportOrders && (
            <button
              onClick={onExportOrders}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center"
            >
              <Download className="w-4 h-4 mr-1" />
              导出Excel
            </button>
          )}
        </div>
      </div>
      
      {/* 标签切换 */}
      <div className="flex border-b mb-4">
        <button
          onClick={() => setActiveTab('current')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'current'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          当前工单 ({activeOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'completed'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          历史已完成 ({completedOrders.length})
        </button>
      </div>

      {/* 机台组标签 */}
      {activeTab === 'current' && machineGroups.size > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onGroupChange('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedGroup === 'all'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              全部 ({activeOrders.length})
            </button>
            {Array.from(machineGroups.entries()).map(([group, machines]) => {
              const groupOrderCount = activeOrders.filter(order => machines.includes(order.machine)).length;
              return (
                <button
                  key={group}
                  onClick={() => onGroupChange(group)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedGroup === group
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                  }`}
                >
                  {group} ({groupOrderCount})
                </button>
              );
            })}
          </div>
        </div>
      )}
      
      {/* 历史已完成工单 */}
      {activeTab === 'completed' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索工单号、物料、机台..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-2 border rounded text-sm w-64"
              />
            </div>
          </div>

          <div className="overflow-x-auto bg-gray-50 rounded">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col className="w-24" />
                <col className="w-20" />
                <col className="w-40" />
                <col className="w-16" />
                <col className="w-16" />
                <col className="w-24" />
                <col className="w-24" />
                <col className="w-24" />
                <col className="w-20" />
                <col className="w-16" />
                <col className="w-24" />
              </colgroup>
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">工单号</th>
                  <th className="p-2 text-left">机台</th>
                  <th className="p-2 text-left">物料名称</th>
                  <th className="p-2 text-left">数量</th>
                  <th className="p-2 text-left">优先度</th>
                  <th className="p-2 text-left">开始日期</th>
                  <th className="p-2 text-left">预计结束</th>
                  <th className="p-2 text-left">实际结束</th>
                  <th className="p-2 text-left">入库数量</th>
                  <th className="p-2 text-left">状态</th>
                  <th className="p-2 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((order) => {
                  const isDelayed = new Date(order.actualEndDate) > new Date(order.expectedEndDate);
                  return (
                    <tr key={order.id} className="border-b hover:bg-white">
                      <td className="p-2 font-medium">{order.orderNo}</td>
                      <td className="p-2">{order.machine}</td>
                      <td className="p-2">{order.materialName}</td>
                      <td className="p-2 text-center">{order.quantity}</td>
                      <td className="p-2 text-center">
                        {order.isUrgent ? (
                          <span className="text-red-600 font-bold">紧急</span>
                        ) : (
                          order.priority
                        )}
                      </td>
                      <td className="p-2">{formatDateOnly(order.startDate)}</td>
                      <td className="p-2">{formatDateOnly(order.expectedEndDate)}</td>
                      <td className="p-2">
                        <span className={isDelayed ? 'text-red-600 font-medium' : ''}>
                          {formatDateOnly(order.actualEndDate)}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <span className="text-blue-600 font-medium">
                          {order.reportedQuantity || 0}
                        </span>
                        <span className="text-gray-400 text-xs ml-1">
                          / {order.quantity}
                        </span>
                      </td>
                      <td className="p-2">
                        <span className="px-2 py-1 rounded-full text-xs font-medium text-green-600 bg-green-100">
                          已完成
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex justify-center space-x-1">
                          {permissions.canEdit && onEditOrder && (
                            <button
                              onClick={() => onEditOrder(order)}
                              className="text-blue-600 hover:text-blue-800"
                              title="编辑工单"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                          {permissions.canDelete && onDeleteOrder && (
                            <button
                              onClick={() => onDeleteOrder(order.id)}
                              className="text-red-600 hover:text-red-800"
                              title="删除工单"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 分页控件 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3">
              <div className="text-sm text-gray-600">
                第 {currentPage} 页，共 {totalPages} 页，总计 {filteredCompletedOrders.length} 条记录
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + Math.max(1, currentPage - 2);
                  if (page > totalPages) return null;
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-2 py-1 rounded text-sm ${
                        page === currentPage 
                          ? 'bg-blue-600 text-white' 
                          : 'hover:bg-gray-200'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 当前工单区域 */}
      {activeTab === 'current' && (
        <div>
          {(() => {
            // 按机台分组
            const ordersByMachine = filteredActiveOrders.reduce((groups, order) => {
              if (!groups[order.machine]) {
                groups[order.machine] = [];
              }
              groups[order.machine].push(order);
              return groups;
            }, {});

            return Object.entries(ordersByMachine).map(([machine, orders]) => {
              const isCollapsed = collapsedMachines.has(machine);
              return (
                <div key={machine} className="mb-4 border rounded-lg">
                  <div 
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 cursor-pointer hover:from-blue-100 hover:to-indigo-100 rounded-t-lg border-l-4 border-blue-500 transition-all"
                    onClick={() => toggleMachineCollapse(machine)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <h4 className="text-lg font-semibold text-gray-800">
                        {machine}
                      </h4>
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        {orders.length}个工单
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600 font-medium">
                        {isCollapsed ? '展开' : '折叠'}
                      </span>
                      <div className={`p-1 rounded-full transition-transform ${
                        isCollapsed ? 'bg-blue-100' : 'bg-blue-200'
                      }`}>
                        {isCollapsed ? (
                          <ChevronDown className="w-5 h-5 text-blue-600" />
                        ) : (
                          <ChevronUp className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                    </div>
                  </div>
                {!isCollapsed && (
                  <div className="overflow-x-auto border-t bg-white shadow-sm">
                  <table className="w-full text-sm table-fixed">
                    <colgroup>
                      <col className="w-24" />
                      <col className="w-40" />
                      <col className="w-16" />
                      <col className="w-16" />
                      <col className="w-24" />
                      <col className="w-24" />
                      <col className="w-20" />
                      <col className="w-16" />
                      <col className="w-32" />
                    </colgroup>
                    <thead>
                      <tr className="bg-blue-50">
                        <th className="p-2 text-left">工单号</th>
                        <th className="p-2 text-left">物料名称</th>
                        <th className="p-2 text-left">数量</th>
                        <th className="p-2 text-left">优先度</th>
                        <th className="p-2 text-left">开始日期</th>
                        <th className="p-2 text-left">预计结束日期</th>
                        <th className="p-2 text-left">入库数量</th>
                        <th className="p-2 text-left">工单状态</th>
                        <th className="p-2 text-left">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id} className={`border-b hover:bg-gray-50 ${
                          order.status === '生产中' ? 'bg-yellow-50' : ''
                        }`}>
                          <td className="p-2 font-medium">{order.orderNo}</td>
                          <td className="p-2">{order.materialName}</td>
                          <td className="p-2 text-center">{order.quantity}</td>
                          <td className="p-2 text-center">
                            {order.isUrgent ? (
                              <span className="text-red-600 font-bold">紧急</span>
                            ) : (
                              order.priority
                            )}
                          </td>
                          <td className="p-2">{formatDateOnly(order.startDate)}</td>
                          <td className="p-2">{formatDateOnly(order.expectedEndDate)}</td>
                          <td className="p-2 text-center">
                            <span className="text-blue-600 font-medium">
                              {order.reportedQuantity || 0}
                            </span>
                            <span className="text-gray-400 text-xs ml-1">
                              / {order.quantity}
                            </span>
                          </td>
                          <td className="p-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || 'text-gray-600 bg-gray-100'}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="p-2">
                            <div className="flex space-x-1">
                              {permissions.canEdit && onEditOrder && (
                                <button
                                  onClick={() => onEditOrder(order)}
                                  className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                  title="编辑"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                              )}
                              {permissions.canDelete && onDeleteOrder && (
                                <button
                                  onClick={() => onDeleteOrder(order.id)}
                                  className="p-1 text-red-600 hover:bg-red-100 rounded"
                                  title="删除"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                              {order.isPaused ? (
                                permissions.canResume && onResumeOrder && (
                                  <button
                                    onClick={() => onResumeOrder(order)}
                                    className="p-1 text-green-600 hover:bg-green-100 rounded"
                                    title="恢复"
                                  >
                                    ▶️
                                  </button>
                                )
                              ) : (
                                permissions.canPause && onPauseOrder && (
                                  <button
                                    onClick={() => onPauseOrder(order)}
                                    className="p-1 text-orange-600 hover:bg-orange-100 rounded"
                                    title="暂停"
                                  >
                                    ⏸️
                                  </button>
                                )
                              )}
                              {/* 结束和预览按钮对所有用户可见 */}
                              <button
                                onClick={() => onFinishOrder && onFinishOrder(order)}
                                className={`p-1 rounded ${
                                  onFinishOrder 
                                    ? 'text-green-600 hover:bg-green-100' 
                                    : 'text-gray-400 cursor-not-allowed'
                                }`}
                                title="结束工单"
                                disabled={!onFinishOrder}
                              >
                                ✅
                              </button>
                              {permissions.canProductionReport && (
                                <button
                                  onClick={() => handleProductionReport(order)}
                                  className="p-1 text-green-600 hover:bg-green-100 rounded"
                                  title="产量上报"
                                >
                                  <BarChart3 className="w-4 h-4" />
                                </button>
                              )}
                              {permissions.canSubmit && onSubmitWorkOrder && (
                                <button
                                  onClick={() => onSubmitWorkOrder(order)}
                                  className={`p-1 rounded ${
                                    order.isSubmitted 
                                      ? 'text-gray-500 hover:bg-gray-100' 
                                      : 'text-blue-600 hover:bg-blue-100'
                                  }`}
                                  title={order.isSubmitted ? '重新下达工单' : '下达工单'}
                                >
                                  {order.isSubmitted ? '🔄' : '📤'}
                                </button>
                              )}
                              {/* 预览按钮对所有用户可见 */}
                              <button
                                onClick={() => onGenerateWorkOrderReport && onGenerateWorkOrderReport(order)}
                                className={`p-1 rounded ${
                                  onGenerateWorkOrderReport 
                                    ? 'text-purple-600 hover:bg-purple-100' 
                                    : 'text-gray-400 cursor-not-allowed'
                                }`}
                                title="生成工序报工单预览"
                                disabled={!onGenerateWorkOrderReport}
                              >
                                📋
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                )}
                </div>
              );
            });
          })()}
        </div>
      )}
      
      {/* 产量上报弹窗 */}
      <ProductionReportModal
        isOpen={productionReportModal.isOpen}
        onClose={handleCloseProductionReport}
        order={productionReportModal.order}
        onSave={() => {
          // 可以在这里刷新数据或执行其他操作
          console.log('产量上报保存成功');
        }}
      />
    </div>
  );
};

export default OrderManagement;