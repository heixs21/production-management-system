import React from 'react';
import { Edit3, X } from 'lucide-react';
import { getStatusColors, formatDateOnly } from '../utils/orderUtils';

const OrderTable = ({
  orders,
  onEditOrder,
  onDeleteOrder,
  onPauseOrder,
  onResumeOrder,
  onFinishOrder,
  onDelayOrder
}) => {
  const statusColors = getStatusColors();

  return (
    <div className="p-4 border-b">
      <h2 className="text-lg font-semibold mb-3">工单数据表</h2>
      <div className="text-sm text-gray-600 mb-3">
        提示：可以从Excel复制数据（按列：机台、工单号、物料号、物料名称、数量、优先度、开始日期、预计结束日期、实际结束日期、报工数量）然后粘贴导入
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">机台</th>
              <th className="p-2 text-left">工单号</th>
              <th className="p-2 text-left">物料号</th>
              <th className="p-2 text-left">物料名称</th>
              <th className="p-2 text-left">数量</th>
              <th className="p-2 text-left">优先度</th>
              <th className="p-2 text-left">开始日期</th>
              <th className="p-2 text-left">预计结束日期</th>
              <th className="p-2 text-left">实际结束日期</th>
              <th className="p-2 text-left">报工数量</th>
              <th className="p-2 text-left">工单状态</th>
              <th className="p-2 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              return (
                <tr key={order.id} className="border-b hover:bg-gray-50">
                  <td className="p-2">{order.machine}</td>
                  <td className="p-2 font-medium">{order.orderNo}</td>
                  <td className="p-2">{order.materialNo}</td>
                  <td className="p-2">{order.materialName}</td>
                  <td className="p-2">{order.quantity}</td>
                  <td className="p-2">{order.priority}</td>
                  <td className="p-2">{formatDateOnly(order.startDate)}</td>
                  <td className="p-2">{formatDateOnly(order.expectedEndDate)}</td>
                  <td className="p-2">{formatDateOnly(order.actualEndDate) || '-'}</td>
                  <td className="p-2">
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
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => onEditOrder(order)}
                        className="text-blue-600 hover:text-blue-800"
                        title="编辑工单"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {/* 暂停/恢复按钮 */}
                      {!order.actualEndDate && (
                        <button
                          onClick={() => order.isPaused ? onResumeOrder(order) : onPauseOrder(order)}
                          className={`${order.isPaused ? 'text-green-600 hover:text-green-800' : 'text-orange-600 hover:text-orange-800'}`}
                          title={order.isPaused ? "恢复生产" : "暂停生产"}
                        >
                          {order.isPaused ? '▶️' : '⏸️'}
                        </button>
                      )}

                      {/* 结束工单按钮 */}
                      {!order.actualEndDate && (
                        <button
                          onClick={() => onFinishOrder(order)}
                          className="text-green-600 hover:text-green-800"
                          title="结束工单"
                        >
                          ✅
                        </button>
                      )}

                      {/* 延期按钮 */}
                      {!order.actualEndDate && (
                        <button
                          onClick={() => onDelayOrder(order)}
                          className="text-orange-600 hover:text-orange-800"
                          title="设置延期预计结束日期"
                        >
                          ⏰
                        </button>
                      )}

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
    </div>
  );
};

export default OrderTable;
