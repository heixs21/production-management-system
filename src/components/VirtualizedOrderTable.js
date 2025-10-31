import React, { memo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';

/**
 * 虚拟滚动工单表格组件
 * 优化大量数据渲染性能
 */
const VirtualizedOrderTable = memo(({ 
  orders, 
  onEditOrder, 
  onDeleteOrder,
  onPauseOrder,
  onResumeOrder,
  onFinishOrder,
  onDelayOrder,
  onSubmitWorkOrder,
  onGenerateWorkOrderReport
}) => {
  const ROW_HEIGHT = 56; // 每行高度
  const HEADER_HEIGHT = 48; // 表头高度
  const TABLE_HEIGHT = Math.min(orders.length * ROW_HEIGHT + HEADER_HEIGHT, 600); // 最大高度600px

  // 渲染单行工单
  const Row = useCallback(({ index, style }) => {
    const order = orders[index];
    const isDelayed = order.expectedEndDate && new Date(order.expectedEndDate) < new Date() && !order.actualEndDate;

    return (
      <div 
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb',
          padding: '0 16px'
        }}
        className={`${isDelayed ? 'bg-red-50' : ''} hover:bg-blue-50 transition-colors`}
      >
        {/* 机台 */}
        <div className="w-24 flex-shrink-0 truncate">
          {order.machine}
        </div>

        {/* 工单号 */}
        <div className="w-32 flex-shrink-0 truncate">
          {order.isUrgent && <span className="text-red-600 font-bold mr-1">🚨</span>}
          {order.orderNo}
        </div>

        {/* 物料号 */}
        <div className="w-32 flex-shrink-0 truncate" title={order.materialNo}>
          {order.materialNo || '-'}
        </div>

        {/* 物料名称 */}
        <div className="w-40 flex-shrink-0 truncate" title={order.materialName}>
          {order.materialName}
        </div>

        {/* 工单组件 */}
        <div className="w-32 flex-shrink-0 truncate" title={order.orderComponent}>
          {order.orderComponent || '-'}
        </div>

        {/* 数量 */}
        <div className="w-20 flex-shrink-0 text-center">
          {order.quantity}
        </div>

        {/* 已报工 */}
        <div className="w-24 flex-shrink-0 text-center">
          <span className={order.reportedQuantity >= order.quantity ? 'text-green-600 font-bold' : ''}>
            {order.reportedQuantity || 0}
          </span>
        </div>

        {/* 优先级 */}
        <div className="w-16 flex-shrink-0 text-center">
          {order.priority}
        </div>

        {/* 开始日期 */}
        <div className="w-28 flex-shrink-0">
          {order.startDate}
        </div>

        {/* 预计结束 */}
        <div className="w-28 flex-shrink-0">
          {order.delayedExpectedEndDate || order.expectedEndDate || '-'}
          {order.delayedExpectedEndDate && (
            <span className="ml-1 text-xs text-orange-600">延</span>
          )}
        </div>

        {/* 实际结束 */}
        <div className="w-28 flex-shrink-0">
          {order.actualEndDate || '-'}
        </div>

        {/* 状态 */}
        <div className="w-20 flex-shrink-0">
          <span className={`px-2 py-1 rounded text-xs ${
            order.status === '完成' ? 'bg-green-100 text-green-800' :
            order.status === '生产中' ? 'bg-blue-100 text-blue-800' :
            order.status === '暂停中' ? 'bg-yellow-100 text-yellow-800' :
            order.status === '延期' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {order.status}
          </span>
        </div>

        {/* 操作按钮 */}
        <div className="flex-1 flex justify-end gap-1">
          <button
            onClick={() => onEditOrder(order)}
            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            编辑
          </button>
          
          {!order.actualEndDate && (
            <>
              {!order.isPaused ? (
                <button
                  onClick={() => onPauseOrder(order)}
                  className="px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  暂停
                </button>
              ) : (
                <button
                  onClick={() => onResumeOrder(order)}
                  className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                >
                  恢复
                </button>
              )}
              
              <button
                onClick={() => onFinishOrder(order)}
                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
              >
                结束
              </button>
              
              {isDelayed && (
                <button
                  onClick={() => onDelayOrder(order)}
                  className="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
                >
                  延期
                </button>
              )}
            </>
          )}
          
          {!order.isSubmitted && (
            <button
              onClick={() => onSubmitWorkOrder(order)}
              className="px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              下达
            </button>
          )}
          
          <button
            onClick={() => onGenerateWorkOrderReport(order)}
            className="px-2 py-1 text-xs bg-indigo-500 text-white rounded hover:bg-indigo-600"
          >
            报工单
          </button>
          
          <button
            onClick={() => onDeleteOrder(order.id)}
            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
          >
            删除
          </button>
        </div>
      </div>
    );
  }, [
    orders,
    onEditOrder,
    onDeleteOrder,
    onPauseOrder,
    onResumeOrder,
    onFinishOrder,
    onDelayOrder,
    onSubmitWorkOrder,
    onGenerateWorkOrderReport
  ]);

  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        暂无工单数据
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* 表头 */}
      <div 
        className="flex items-center bg-gray-100 border-b font-semibold text-sm"
        style={{ height: HEADER_HEIGHT, padding: '0 16px' }}
      >
        <div className="w-24 flex-shrink-0">机台</div>
        <div className="w-32 flex-shrink-0">工单号</div>
        <div className="w-32 flex-shrink-0">物料号</div>
        <div className="w-40 flex-shrink-0">物料名称</div>
        <div className="w-32 flex-shrink-0">工单组件</div>
        <div className="w-20 flex-shrink-0 text-center">数量</div>
        <div className="w-24 flex-shrink-0 text-center">已报工</div>
        <div className="w-16 flex-shrink-0 text-center">优先级</div>
        <div className="w-28 flex-shrink-0">开始日期</div>
        <div className="w-28 flex-shrink-0">预计结束</div>
        <div className="w-28 flex-shrink-0">实际结束</div>
        <div className="w-20 flex-shrink-0">状态</div>
        <div className="flex-1 text-right">操作</div>
      </div>

      {/* 虚拟滚动列表 */}
      <List
        height={TABLE_HEIGHT - HEADER_HEIGHT}
        itemCount={orders.length}
        itemSize={ROW_HEIGHT}
        width="100%"
      >
        {Row}
      </List>
    </div>
  );
});

VirtualizedOrderTable.displayName = 'VirtualizedOrderTable';

export default VirtualizedOrderTable;

