import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Edit3, X, Download } from 'lucide-react';
import { getStatusColors, formatDateOnly } from '../utils/orderUtils';

const OrderManagement = ({
  orders,
  onEditOrder,
  onDeleteOrder,
  onPauseOrder,
  onResumeOrder,
  onFinishOrder,
  onDelayOrder,
  onSubmitWorkOrder,
  onExportOrders
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const statusColors = getStatusColors();

  // 分离已完成和未完成的工单
  const { completedOrders, activeOrders } = useMemo(() => {
    const completed = orders.filter(order => order.actualEndDate);
    const active = orders.filter(order => !order.actualEndDate);
    return { completedOrders: completed, activeOrders: active };
  }, [orders]);

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

  return (
    <div className="p-4 border-b">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">工单管理</h2>
        <button
          onClick={() => onExportOrders && onExportOrders()}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center"
        >
          <Download className="w-4 h-4 mr-1" />
          导出Excel
        </button>
      </div>
      
      {/* 历史已完成工单 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-md font-medium text-gray-700">
            历史已完成工单 ({filteredCompletedOrders.length})
          </h3>
          <div className="flex items-center space-x-2">
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
        </div>

        <div className="overflow-x-auto bg-gray-50 rounded">
          <table className="w-full text-sm">
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
                <th className="p-2 text-left">报工数量</th>
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
                        <button
                          onClick={() => onEditOrder(order)}
                          className="text-blue-600 hover:text-blue-800"
                          title="编辑工单"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteOrder(order.id)}
                          className="text-red-600 hover:text-red-800"
                          title="删除工单"
                        >
                          <X className="w-4 h-4" />
                        </button>
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

      {/* 当前工单区域 */}
      <div>
        <h3 className="text-md font-medium text-gray-700 mb-3">
          当前工单 ({activeOrders.length})
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-50">
                <th className="p-2 text-left">工单号</th>
                <th className="p-2 text-left">机台</th>
                <th className="p-2 text-left">物料名称</th>
                <th className="p-2 text-left">数量</th>
                <th className="p-2 text-left">优先度</th>
                <th className="p-2 text-left">开始日期</th>
                <th className="p-2 text-left">预计结束日期</th>
                <th className="p-2 text-left">报工数量</th>
                <th className="p-2 text-left">工单状态</th>
                <th className="p-2 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {activeOrders.map((order) => (
                <tr key={order.id} className={`border-b hover:bg-gray-50 ${
                  order.status === '生产中' ? 'bg-yellow-50' : ''
                }`}>
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
                      <button
                        onClick={() => onEditOrder(order)}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                        title="编辑"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteOrder(order.id)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                        title="删除"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      {order.isPaused ? (
                        <button
                          onClick={() => onResumeOrder(order)}
                          className="p-1 text-green-600 hover:bg-green-100 rounded"
                          title="恢复"
                        >
                          ▶️
                        </button>
                      ) : (
                        <button
                          onClick={() => onPauseOrder(order)}
                          className="p-1 text-orange-600 hover:bg-orange-100 rounded"
                          title="暂停"
                        >
                          ⏸️
                        </button>
                      )}
                      <button
                        onClick={() => onFinishOrder(order)}
                        className="p-1 text-green-600 hover:bg-green-100 rounded"
                        title="结束工单"
                      >
                        ✅
                      </button>
                      <button
                        onClick={() => onDelayOrder(order)}
                        className="p-1 text-orange-600 hover:bg-orange-100 rounded"
                        title="设置延期预计结束日期"
                      >
                        ⏰
                      </button>
                      <button
                        onClick={() => onSubmitWorkOrder && onSubmitWorkOrder(order)}
                        disabled={order.isSubmitted}
                        className={`p-1 rounded ${
                          order.isSubmitted 
                            ? 'text-gray-400 bg-gray-100 cursor-not-allowed' 
                            : 'text-blue-600 hover:bg-blue-100'
                        }`}
                        title={order.isSubmitted ? '已下达' : '下达工单'}
                      >
                        {order.isSubmitted ? '✓' : '📤'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrderManagement;
