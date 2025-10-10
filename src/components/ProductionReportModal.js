import React, { useState, useMemo } from 'react';
import { X, Plus, Edit3, Trash2 } from 'lucide-react';

// 单个工单的产量上报弹窗
export const SingleOrderProductionModal = ({ 
  isOpen, 
  order, 
  onClose, 
  onSave 
}) => {
  const [dailyReports, setDailyReports] = useState({});
  const [newDate, setNewDate] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [editingDate, setEditingDate] = useState(null);

  React.useEffect(() => {
    if (isOpen && order) {
      setDailyReports(order.dailyReports || {});
      setNewDate('');
      setNewQuantity('');
      setEditingDate(null);
    }
  }, [isOpen, order]);

  const totalReported = useMemo(() => {
    return Object.values(dailyReports).reduce((sum, qty) => sum + (parseInt(qty) || 0), 0);
  }, [dailyReports]);

  const handleAddReport = () => {
    if (!newDate || !newQuantity) {
      alert('请填写日期和数量');
      return;
    }
    
    const quantity = parseInt(newQuantity);
    if (quantity <= 0) {
      alert('数量必须大于0');
      return;
    }

    setDailyReports(prev => ({
      ...prev,
      [newDate]: quantity
    }));
    setNewDate('');
    setNewQuantity('');
  };

  const handleEditReport = (date, quantity) => {
    setEditingDate(date);
    setNewDate(date);
    setNewQuantity(quantity.toString());
  };

  const handleUpdateReport = () => {
    if (!newDate || !newQuantity) {
      alert('请填写日期和数量');
      return;
    }
    
    const quantity = parseInt(newQuantity);
    if (quantity <= 0) {
      alert('数量必须大于0');
      return;
    }

    const updatedReports = { ...dailyReports };
    
    // 如果日期改变了，删除旧的记录
    if (editingDate && editingDate !== newDate) {
      delete updatedReports[editingDate];
    }
    
    updatedReports[newDate] = quantity;
    setDailyReports(updatedReports);
    setEditingDate(null);
    setNewDate('');
    setNewQuantity('');
  };

  const handleDeleteReport = (date) => {
    if (window.confirm(`确定要删除 ${date} 的产量记录吗？`)) {
      const updatedReports = { ...dailyReports };
      delete updatedReports[date];
      setDailyReports(updatedReports);
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave(order.id, dailyReports, totalReported);
    }
    onClose();
  };

  if (!isOpen || !order) return null;

  const sortedDates = Object.keys(dailyReports).sort();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          📝 工单产量上报
        </h3>

        {/* 工单信息 */}
        <div className="bg-blue-50 p-3 rounded mb-4 text-sm">
          <div className="font-medium text-blue-800">工单信息：</div>
          <div className="text-blue-700">
            <div>工单号：{order.orderNo}</div>
            <div>机台：{order.machine}</div>
            <div>计划数量：{order.quantity}</div>
            <div>累计产量：{totalReported}</div>
            <div>物料名称：{order.materialName}</div>
          </div>
        </div>

        {/* 添加新记录 */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {editingDate ? '修改产量记录' : '添加产量记录'}
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full p-2 border rounded"
              />
              <input
                type="number"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                placeholder="当日产量"
                className="w-full p-2 border rounded"
                min="1"
              />
              <button
                onClick={editingDate ? handleUpdateReport : handleAddReport}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {editingDate ? '更新' : '添加'}
              </button>
              {editingDate && (
                <button
                  onClick={() => {
                    setEditingDate(null);
                    setNewDate('');
                    setNewQuantity('');
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  取消
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 产量记录列表 */}
        <div className="mt-4">
          {sortedDates.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              暂无产量记录
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="font-medium mb-3">产量记录</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-2 text-left">日期</th>
                      <th className="p-2 text-right">产量</th>
                      <th className="p-2 text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDates.map(date => (
                      <tr key={date} className="border-b hover:bg-gray-50">
                        <td className="p-2">
                          {date} ({['日', '一', '二', '三', '四', '五', '六'][new Date(date).getDay()]})
                        </td>
                        <td className="p-2 text-right font-medium text-green-600">
                          {dailyReports[date]}
                        </td>
                        <td className="p-2 text-center">
                          <div className="flex justify-center space-x-2">
                            <button
                              onClick={() => handleEditReport(date, dailyReports[date])}
                              className="text-blue-600 hover:text-blue-800"
                              title="编辑"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteReport(date)}
                              className="text-red-600 hover:text-red-800"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 text-right">
                <span className="font-medium text-blue-600">总计: {totalReported}</span>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

// 产量统计报表弹窗
const ProductionReportModal = ({ show, orders, onClose }) => {
  const [selectedDateRange, setSelectedDateRange] = useState('thisMonth');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // 生成日期范围
  const dateRange = useMemo(() => {
    const now = new Date();
    let start, end;

    switch (selectedDateRange) {
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'thisWeek':
        const today = now.getDay();
        start = new Date(now);
        start.setDate(now.getDate() - today + 1);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;
      case 'custom':
        start = customStartDate ? new Date(customStartDate) : new Date();
        end = customEndDate ? new Date(customEndDate) : new Date();
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const dates = [];
    const current = new Date(start);
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [selectedDateRange, customStartDate, customEndDate]);

  // 生成报表数据
  const reportData = useMemo(() => {
    const data = [];
    
    orders.forEach(order => {
      if (order.dailyReports && Object.keys(order.dailyReports).length > 0) {
        Object.entries(order.dailyReports).forEach(([date, quantity]) => {
          if (dateRange.includes(date) && quantity > 0) {
            data.push({
              date,
              orderNo: order.orderNo,
              materialName: order.materialName,
              machine: order.machine,
              quantity: quantity,
              totalQuantity: order.quantity,
              reportedQuantity: order.reportedQuantity || 0,
              status: order.status
            });
          }
        });
      }
    });

    // 按日期和工单号排序
    return data.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.orderNo.localeCompare(b.orderNo);
    });
  }, [orders, dateRange]);

  // 按日期分组的数据
  const groupedData = useMemo(() => {
    const grouped = {};
    reportData.forEach(item => {
      if (!grouped[item.date]) {
        grouped[item.date] = [];
      }
      grouped[item.date].push(item);
    });
    return grouped;
  }, [reportData]);

  // 统计数据
  const statistics = useMemo(() => {
    const totalQuantity = reportData.reduce((sum, item) => sum + item.quantity, 0);
    const uniqueOrders = new Set(reportData.map(item => item.orderNo)).size;
    const uniqueMachines = new Set(reportData.map(item => item.machine)).size;
    
    return {
      totalQuantity,
      uniqueOrders,
      uniqueMachines,
      totalDays: Object.keys(groupedData).length
    };
  }, [reportData, groupedData]);

  // 导出Excel
  const exportToExcel = () => {
    const headers = ['日期', '工单号', '物料名称', '机台', '当日产量', '计划总量', '累计产量', '状态'];
    const csvContent = [
      headers.join(','),
      ...reportData.map(item => [
        item.date,
        item.orderNo,
        `"${item.materialName}"`,
        item.machine,
        item.quantity,
        item.totalQuantity,
        item.reportedQuantity,
        item.status
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `产量统计报表_${selectedDateRange}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-5/6 h-5/6 flex flex-col">
        {/* 头部 */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">产量统计报表</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 控制面板 */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">时间范围:</label>
              <select
                value={selectedDateRange}
                onChange={(e) => setSelectedDateRange(e.target.value)}
                className="px-3 py-1 border rounded"
              >
                <option value="thisWeek">本周</option>
                <option value="thisMonth">本月</option>
                <option value="lastMonth">上月</option>
                <option value="custom">自定义</option>
              </select>
            </div>

            {selectedDateRange === 'custom' && (
              <>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-1 border rounded"
                />
                <span>至</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-1 border rounded"
                />
              </>
            )}

            <button
              onClick={exportToExcel}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              导出Excel
            </button>
          </div>

          {/* 统计信息 */}
          <div className="mt-3 flex items-center space-x-6 text-sm">
            <span className="text-gray-600">
              总产量: <span className="font-semibold text-blue-600">{statistics.totalQuantity}</span>
            </span>
            <span className="text-gray-600">
              工单数: <span className="font-semibold text-blue-600">{statistics.uniqueOrders}</span>
            </span>
            <span className="text-gray-600">
              机台数: <span className="font-semibold text-blue-600">{statistics.uniqueMachines}</span>
            </span>
            <span className="text-gray-600">
              生产天数: <span className="font-semibold text-blue-600">{statistics.totalDays}</span>
            </span>
          </div>
        </div>

        {/* 报表内容 */}
        <div className="flex-1 overflow-auto p-4">
          {Object.keys(groupedData).length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              所选时间范围内没有产量数据
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedData).map(([date, items]) => {
                const dayTotal = items.reduce((sum, item) => sum + item.quantity, 0);
                return (
                  <div key={date} className="border rounded-lg overflow-hidden">
                    {/* 日期标题 */}
                    <div className="bg-blue-50 px-4 py-2 border-b">
                      <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-blue-800">
                          {date} ({['日', '一', '二', '三', '四', '五', '六'][new Date(date).getDay()]})
                        </h3>
                        <span className="text-blue-600 font-medium">
                          当日总产量: {dayTotal}
                        </span>
                      </div>
                    </div>

                    {/* 当日数据表格 */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left">工单号</th>
                            <th className="px-3 py-2 text-left">物料名称</th>
                            <th className="px-3 py-2 text-left">机台</th>
                            <th className="px-3 py-2 text-right">当日产量</th>
                            <th className="px-3 py-2 text-right">计划总量</th>
                            <th className="px-3 py-2 text-right">累计产量</th>
                            <th className="px-3 py-2 text-center">完成率</th>
                            <th className="px-3 py-2 text-center">状态</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, index) => {
                            const completionRate = ((item.reportedQuantity / item.totalQuantity) * 100).toFixed(1);
                            return (
                              <tr key={index} className="border-b hover:bg-gray-50">
                                <td className="px-3 py-2 font-medium">{item.orderNo}</td>
                                <td className="px-3 py-2" title={item.materialName}>
                                  {item.materialName.length > 30 
                                    ? item.materialName.substring(0, 30) + '...' 
                                    : item.materialName}
                                </td>
                                <td className="px-3 py-2">{item.machine}</td>
                                <td className="px-3 py-2 text-right font-semibold text-green-600">
                                  {item.quantity}
                                </td>
                                <td className="px-3 py-2 text-right">{item.totalQuantity}</td>
                                <td className="px-3 py-2 text-right">{item.reportedQuantity}</td>
                                <td className="px-3 py-2 text-center">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    parseFloat(completionRate) >= 100 
                                      ? 'bg-green-100 text-green-600'
                                      : parseFloat(completionRate) >= 80
                                      ? 'bg-yellow-100 text-yellow-600'
                                      : 'bg-red-100 text-red-600'
                                  }`}>
                                    {completionRate}%
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    item.status === '正常完成' || item.status === '延期完成'
                                      ? 'bg-gray-100 text-gray-600'
                                      : item.status === '生产中'
                                      ? 'bg-green-100 text-green-600'
                                      : 'bg-blue-100 text-blue-600'
                                  }`}>
                                    {item.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductionReportModal;