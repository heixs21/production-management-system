import React, { useState } from 'react';
import { getDateDisplay, getOrdersForMachineAndDate, isDateInDelayedPortion, getPriorityColors } from '../utils/orderUtils';

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
                      {/* 工单卡片 - 垂直堆叠 */}
                      <div className="space-y-1">
                        {ordersInCell.map((order, idx) => {
                          const colors = getPriorityColors();
                          const isDelayed = isDateInDelayedPortion(order, date);
                          const isCompleted = !!order.actualEndDate;

                          // 确定颜色
                          let cardColor;
                          if (isDelayed) {
                            cardColor = 'bg-red-500'; // 延期部分红色
                          } else if (isCompleted) {
                            cardColor = 'bg-gray-400'; // 已完成灰色
                          } else if (order.isPaused) {
                            cardColor = 'bg-orange-400'; // 暂停橙色
                          } else if (order.status === '延期生产中') {
                            cardColor = 'bg-red-400'; // 延期生产中红色
                          } else if (order.isUrgent) {
                            cardColor = 'bg-red-600'; // 紧急红色
                          } else {
                            cardColor = colors[(order.priority - 1) % colors.length]; // 正常优先级颜色
                          }

                          return (
                            <div
                              key={order.id}
                              draggable={!isCompleted}
                              onDragStart={(e) => !isCompleted && onDragStart(e, order)}
                              className={`${cardColor} text-white p-1 rounded mb-1 min-h-10
                                ${isCompleted ? 'cursor-default' : 'cursor-move'}
                                hover:shadow-md transition-all duration-200 ${
                                  draggedOrder?.id === order.id ? 'opacity-50' : ''
                                } ${order.isUrgent ? 'border-2 border-red-300' : ''}`}
                              title={`${order.orderNo} - ${order.materialName}\n优先度: ${order.isUrgent ? '紧急' : order.priority}\n状态: ${order.status}\n计划: ${order.startDate} 至 ${order.expectedEndDate}${order.delayedExpectedEndDate ? `\n延期预计: ${order.delayedExpectedEndDate}` : ''}${order.actualEndDate ? `\n实际结束: ${order.actualEndDate}` : ''}${order.reportedQuantity ? `\n报工数量: ${order.reportedQuantity}/${order.quantity}` : ''}`}
                            >
                              {/* 工单号 */}
                              <div className="text-center mb-1">
                                <span className="font-bold text-xs">
                                  {order.orderNo}
                                </span>
                              </div>

                              {/* 底部一行：P2 + 当日报工数量 + 状态图标 + 报工按钮 */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-1 text-xs">
                                  <span>P{order.priority}</span>
                                  {/* 显示当日报工数量 - 这里需要根据日期获取当日报工数据 */}
                                  {order.dailyReports && order.dailyReports[date] && order.dailyReports[date] > 0 && (
                                    <span className="opacity-90">
                                      {order.dailyReports[date]}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-1">
                                  {order.isUrgent && <span className="text-xs">🚨</span>}
                                  {isDelayed && <span className="text-xs">⚠️</span>}
                                  {isCompleted && <span className="text-xs">✅</span>}
                                  {order.isPaused && <span className="text-xs">⏸️</span>}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onReportWork && onReportWork(order, date);
                                    }}
                                    className="w-4 h-4 bg-white bg-opacity-25 rounded text-xs hover:bg-opacity-40 flex items-center justify-center transition-all ml-1"
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
            <span className="font-medium text-gray-700">优先级:</span>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="text-xs">P1</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-xs">P2</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                <span className="text-xs">P3</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-red-600 border-2 border-red-300 rounded"></div>
                <span className="text-xs">🚨紧急</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center space-x-6">
            <span className="font-medium text-gray-700">状态:</span>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-gray-400 rounded"></div>
                <span className="text-xs">✅已完成</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span className="text-xs">⚠️延期部分</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-orange-400 rounded"></div>
                <span className="text-xs">⏸️暂停中</span>
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
