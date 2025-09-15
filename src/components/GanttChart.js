import React, { useState } from 'react';
import { getDateDisplay, getOrdersForMachineAndDate, isDateInDelayedPortion, getPriorityColors, getOrderGroupColor } from '../utils/orderUtils';

const GanttChart = ({
  machines,
  orders,
  dateRange,
  draggedOrder,
  onDragStart,
  onDragOver,
  onDrop,
  onReportWork,
  onExportGantt
}) => {
  const colors = getPriorityColors();
  const [zoomLevel, setZoomLevel] = useState(100); // 缩放比例，100为默认
  
  // 调试信息
  console.log('甘特图组件调试:', {
    machines: machines?.length || 0,
    orders: orders?.length || 0,
    dateRange: dateRange?.length || 0,
    firstDate: dateRange?.[0],
    lastDate: dateRange?.[dateRange?.length - 1]
  });
  
  if (!machines || !orders || !dateRange) {
    return <div className="p-4 text-center text-gray-500">正在加载甘特图数据...</div>;
  }

  return (
    <div className="gantt-chart-container p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">甘特图视图</h2>
        <div className="flex items-center space-x-3">
          {/* 缩放控制 */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setZoomLevel(Math.max(50, zoomLevel - 25))}
              className="px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
              disabled={zoomLevel <= 50}
            >
              -
            </button>
            <select
              value={zoomLevel}
              onChange={(e) => setZoomLevel(parseInt(e.target.value))}
              className="px-2 py-1 border rounded"
            >
              <option value={50}>50%</option>
              <option value={75}>75%</option>
              <option value={100}>100%</option>
              <option value={125}>125%</option>
              <option value={150}>150%</option>
              <option value={200}>200%</option>
            </select>
            <button
              onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}
              className="px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
              disabled={zoomLevel >= 200}
            >
              +
            </button>
          </div>
          <button
            onClick={onExportGantt}
            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center"
          >
            📊 导出甘特图
          </button>
        </div>
      </div>
      
      {/* 统一滚动的甘特图 */}
      <div className="border rounded-lg overflow-x-auto bg-white gantt-content">
        <div style={{
          minWidth: `${128 * zoomLevel / 100 + dateRange.length * 128 * zoomLevel / 100}px`,
          width: 'fit-content',
          transform: `scale(${zoomLevel / 100})`,
          transformOrigin: 'top left'
        }}>
          {/* 表头 */}
          <div className="bg-gray-50 border-b sticky top-0 z-20">
            <div className="flex">
              <div className="w-32 p-3 font-semibold text-gray-700 border-r sticky left-0 bg-gray-50 z-30 flex items-center" style={{minWidth: '128px', maxWidth: '128px'}}>
                机台
              </div>
              {dateRange.map((date, index) => {
                const isWeekend = new Date(date).getDay() === 0 || new Date(date).getDay() === 6;
                return (
                  <div
                    key={date}
                    className={`w-32 p-2 text-center text-xs font-medium border-r flex-shrink-0 ${
                      isWeekend ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-700'
                    }`}
                    style={{minWidth: '128px', maxWidth: '128px'}}
                  >
                    <div className="font-semibold">{getDateDisplay(date)}</div>
                    <div className="text-xs opacity-75">
                      {['日', '一', '二', '三', '四', '五', '六'][new Date(date).getDay()]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 机台行 */}
          <div className="divide-y">
            {machines.map((machine, machineIndex) => (
              <div key={machine.id} className="flex">
                {/* 机台名称 */}
                <div className="w-32 p-3 bg-gray-50 border-r font-medium text-gray-700 sticky left-0 z-10 flex items-center" style={{minWidth: '128px', maxWidth: '128px'}}>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-sm">{machine.name}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        machine.status === '正常' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {machine.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {orders.filter(o => o.machine === machine.name).length}个工单
                    </div>
                  </div>
                </div>

                {/* 日期格子 */}
                {dateRange.map((date, dateIndex) => {
                  const isWeekend = new Date(date).getDay() === 0 || new Date(date).getDay() === 6;
                  const ordersInCell = getOrdersForMachineAndDate(orders, machine.name, date);
                  
                  return (
                    <div
                      key={`${machine.name}-${date}`}
                      className={`w-32 min-h-16 border-r flex-shrink-0 p-2 ${
                        isWeekend ? 'bg-red-25' : 'bg-white'
                      } hover:bg-blue-25 transition-colors`}
                      style={{minWidth: '128px', maxWidth: '128px'}}
                      onDragOver={onDragOver}
                      onDrop={(e) => onDrop(e, machine.name, dateIndex)}
                    >
                      {/* 工单卡片 - 优化排序和分组 */}
                      <div className="space-y-1">
                        {(() => {
                          // 先按工单编号分组
                          const groupedOrders = ordersInCell.reduce((groups, order) => {
                            const orderNo = order.orderNo;
                            if (!groups[orderNo]) {
                              groups[orderNo] = [];
                            }
                            groups[orderNo].push(order);
                            return groups;
                          }, {});

                          // 对每个工单组内的订单进行排序：紧急 > 优先级 > 状态
                          Object.keys(groupedOrders).forEach(orderNo => {
                            groupedOrders[orderNo].sort((a, b) => {
                              // 紧急工单优先
                              if (a.isUrgent && !b.isUrgent) return -1;
                              if (!a.isUrgent && b.isUrgent) return 1;

                              // 按优先级排序（数字越小优先级越高）
                              if (a.priority !== b.priority) return a.priority - b.priority;

                              // 已完成的排在后面
                              const aCompleted = !!a.actualEndDate;
                              const bCompleted = !!b.actualEndDate;
                              if (aCompleted && !bCompleted) return 1;
                              if (!aCompleted && bCompleted) return -1;

                              return 0;
                            });
                          });

                          // 对工单组进行排序：先按开始日期，再按优先级
                          const sortedGroups = Object.entries(groupedOrders).sort(([, groupA], [, groupB]) => {
                            // 获取每组最早的开始日期
                            const earliestStartA = Math.min(...groupA.map(o => new Date(o.startDate).getTime()));
                            const earliestStartB = Math.min(...groupB.map(o => new Date(o.startDate).getTime()));
                            
                            // 先按开始日期排序
                            if (earliestStartA !== earliestStartB) {
                              return earliestStartA - earliestStartB;
                            }
                            
                            // 开始日期相同时，按优先级排序
                            const minPriorityA = Math.min(...groupA.map(o => o.isUrgent ? 0 : o.priority));
                            const minPriorityB = Math.min(...groupB.map(o => o.isUrgent ? 0 : o.priority));
                            return minPriorityA - minPriorityB;
                          });

                          return sortedGroups.map(([orderNo, orderGroup]) => {
                            const groupColor = getOrderGroupColor(orderNo);

                            return (
                              <div
                                key={orderNo}
                                className="order-group border rounded-lg p-1 shadow-sm"
                              >
                                {/* 工单编号标签 - 始终显示 */}
                                <div className="text-xs font-semibold text-gray-700 mb-1 text-center bg-white bg-opacity-50 rounded px-1">
                                  {orderNo}
                                </div>

                                {/* 该工单的所有卡片 - 水平排列 */}
                                <div className="flex flex-wrap gap-1">
                                  {orderGroup.map((order, idx) => {
                                    const colors = getPriorityColors();
                                    const isDelayed = isDateInDelayedPortion(order, date);
                                    const isCompleted = !!order.actualEndDate;

                                    // 确定颜色
                                    let cardColor;
                                    if (isDelayed) {
                                      cardColor = 'bg-red-400';
                                    } else if (isCompleted) {
                                      cardColor = 'bg-gray-400';
                                    } else if (order.isPaused) {
                                      cardColor = 'bg-orange-400';
                                    } else if (order.status === '生产中') {
                                      cardColor = 'bg-green-400';
                                    } else if (order.status === '未开始') {
                                      cardColor = 'bg-blue-300 opacity-60';
                                    } else {
                                      cardColor = 'bg-blue-400';
                                    }

                                    return (
                                      <div
                                        key={order.id}
                                        draggable={!isCompleted}
                                        onDragStart={(e) => !isCompleted && onDragStart(e, order)}
                                        className={`order-card ${cardColor} text-white p-1 rounded text-xs min-w-8 flex-1
                                          ${isCompleted ? 'cursor-default' : 'cursor-move'}
                                          transition-all duration-200 ${
                                            draggedOrder?.id === order.id ? 'opacity-50' : ''
                                          }`}
                                        title={`${order.orderNo} - ${order.materialName}\n优先度: ${order.isUrgent ? '紧急' : order.priority}\n状态: ${order.status}\n计划: ${order.startDate} 至 ${order.expectedEndDate}${order.delayedExpectedEndDate ? `\n延期预计: ${order.delayedExpectedEndDate}` : ''}${order.actualEndDate ? `\n实际结束: ${order.actualEndDate}` : ''}${order.reportedQuantity ? `\n报工数量: ${order.reportedQuantity}/${order.quantity}` : ''}`}
                                      >
                                        {/* 简化显示：优先级 + 状态图标 + 报工按钮 */}
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center space-x-1">
                                            <span className="font-bold">P{order.priority}</span>
                                            {order.dailyReports && order.dailyReports[date] && order.dailyReports[date] > 0 && (
                                              <span className="bg-white bg-opacity-30 px-1 rounded">
                                                {order.dailyReports[date]}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center space-x-1">
                                            {order.isUrgent && <span>🚨</span>}
                                            {isDelayed && <span>⚠️</span>}
                                            {isCompleted && <span>✅</span>}
                                            {order.isPaused && <span>⏸️</span>}
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onReportWork && onReportWork(order, date);
                                              }}
                                              className="w-3 h-3 bg-white bg-opacity-30 rounded hover:bg-opacity-50 flex items-center justify-center transition-all"
                                              title="报工"
                                            >
                                              📝
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 工单状态信息 */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">工单状态信息</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
          {orders.map(order => (
            <div key={order.id} className="flex items-center justify-between p-2 bg-white rounded border">
              <div className="flex items-center space-x-2">
                <span className="font-medium">{order.orderNo}</span>
                <div className="flex items-center space-x-1">
                  {order.isUrgent && <span>🚨</span>}
                  {order.actualEndDate && new Date(order.actualEndDate) > new Date(order.expectedEndDate) && <span>⚠️</span>}
                  {order.actualEndDate && <span>✅</span>}
                  {order.isPaused && <span>⏸️</span>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-gray-600">{order.status}</div>
                {order.reportedQuantity > 0 && (
                  <div className="text-blue-600">
                    {order.reportedQuantity}/{order.quantity}
                  </div>
                )}
                {order.delayReason && (
                  <div className="text-red-600 text-xs">
                    延期原因: {order.delayReason}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 详细的图例 */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <span className="font-medium text-gray-700">状态:</span>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-blue-300 opacity-60 rounded"></div>
                <span className="text-xs">未开始</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-400 rounded"></div>
                <span className="text-xs">生产中</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-orange-400 rounded"></div>
                <span className="text-xs">暂停中</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-gray-400 rounded"></div>
                <span className="text-xs">已完成</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-red-400 rounded"></div>
                <span className="text-xs">延期部分</span>
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            拖拽未完成工单可调整时间和机台
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;
