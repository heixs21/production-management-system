import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';

const ProductionReportModal = ({ isOpen, onClose, order, onSave, onFinishOrder }) => {
  const [reports, setReports] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [newShiftName, setNewShiftName] = useState('');
  const [loading, setLoading] = useState(false);
  const [totalQuantity, setTotalQuantity] = useState(0);

  useEffect(() => {
    if (isOpen && order) {
      loadData();
    }
  }, [isOpen, order]);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const serverUrl = `http://${window.location.hostname}:12454`;
      
      // 获取机台ID
      const machinesResponse = await fetch(`${serverUrl}/api/machines`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const machinesData = await machinesResponse.json();
      const machine = machinesData.find(m => m.name === order.machine);
      
      if (!machine) {
        throw new Error('未找到对应机台');
      }
      
      // 获取班次列表
      const shiftsResponse = await fetch(`${serverUrl}/api/shifts/${machine.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const shiftsData = await shiftsResponse.json();
      setShifts(Array.isArray(shiftsData) ? shiftsData : []);

      // 获取产量上报记录
      const reportsResponse = await fetch(`${serverUrl}/api/production-reports/${order.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const reportsData = await reportsResponse.json();
      
      // 确保reportsData是数组
      const reports = Array.isArray(reportsData) ? reportsData : [];
      
      // 生成日期范围（从工单开始日期到今天，排除暂停期间）
      const startDate = new Date(order.startDate);
      const today = new Date();
      const dateRange = [];
      
      // 获取暂停时间段
      const pausedStart = order.pausedDate ? new Date(order.pausedDate) : null;
      const resumedDate = order.resumedDate ? new Date(order.resumedDate) : null;
      
      for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
        const currentDate = new Date(d);
        
        // 如果有暂停时间段，跳过暂停期间的日期
        if (pausedStart && resumedDate) {
          // 如果当前日期在暂停时段内（pausedStart 到 resumedDate 之间，不含 resumedDate），则跳过
          if (currentDate >= pausedStart && currentDate < resumedDate) {
            continue;
          }
        }
        
        dateRange.push(new Date(d).toISOString().split('T')[0]);
      }

      // 构建报表数据结构
      const reportMap = {};
      reports.forEach(report => {
        const key = `${report.reportDate}_${report.shiftName}`;
        reportMap[key] = report.quantity;
      });

      const reportGrid = dateRange.map(date => {
        const row = { date };
        (shiftsData || []).forEach(shift => {
          const key = `${date}_${shift.name}`;
          row[shift.name] = reportMap[key] || 0;
        });
        return row;
      });

      setReports(reportGrid);
      
      // 计算总产量（从表格数据计算）
      const total = reportGrid.reduce((sum, report) => {
        return sum + (shiftsData || []).reduce((s, shift) => 
          s + (report[shift.name] || 0), 0
        );
      }, 0);
      setTotalQuantity(total);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (date, shiftName, quantity) => {
    setReports(prev => {
      const updated = prev.map(report => 
        report.date === date 
          ? { ...report, [shiftName]: parseInt(quantity) || 0 }
          : report
      );
      
      // 重新计算总产量（只计算班次列）
      const total = updated.reduce((sum, report) => {
        return sum + (shifts || []).reduce((s, shift) => 
          s + (report[shift.name] || 0), 0
        );
      }, 0);
      setTotalQuantity(total);
      
      return updated;
    });
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      const serverUrl = `http://${window.location.hostname}:12454`;
      
      // 构建所有请求
      const requests = [];
      for (const report of reports) {
        for (const shift of (shifts || [])) {
          const quantity = report[shift.name] || 0;
          requests.push(
            fetch(`${serverUrl}/api/production-reports`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                orderId: order.id,
                shiftName: shift.name,
                reportDate: report.date,
                quantity
              })
            })
          );
        }
      }
      
      // 并发执行所有请求
      await Promise.all(requests);
      
      onSave && onSave();
      onClose();
    } catch (error) {
      console.error('保存失败:', error);
    }
  };

  const handleAddShift = async () => {
    if (!newShiftName.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      const serverUrl = `http://${window.location.hostname}:12454`;
      
      // 获取机台ID
      const machinesResponse = await fetch(`${serverUrl}/api/machines`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const machinesData = await machinesResponse.json();
      const machine = machinesData.find(m => m.name === order.machine);
      
      if (!machine) {
        throw new Error('未找到对应机台');
        return;
      }
      
      const response = await fetch(`${serverUrl}/api/shifts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ machineId: machine.id, name: newShiftName.trim() })
      });
      
      if (response.ok) {
        setNewShiftName('');
        loadData();
      }
    } catch (error) {
      console.error('添加班次失败:', error);
    }
  };

  const handleDeleteShift = async (shiftId) => {
    if (!window.confirm('确定要删除这个班次吗？')) return;
    
    try {
      const token = localStorage.getItem('token');
      const serverUrl = `http://${window.location.hostname}:12454`;
      
      const response = await fetch(`${serverUrl}/api/shifts/${shiftId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        loadData();
      }
    } catch (error) {
      console.error('删除班次失败:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            产量上报 - {order?.orderNo}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 暂停信息提示 */}
        {order?.pausedDate && order?.resumedDate && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <div className="flex items-start">
              <span className="text-yellow-600 text-lg mr-2">⏸️</span>
              <div className="flex-1 text-sm">
                <div className="font-medium text-yellow-900">工单暂停记录</div>
                <div className="text-yellow-700 mt-1">
                  暂停时段：<span className="font-medium">{order.pausedDate}</span> 至 <span className="font-medium">{order.resumedDate}</span>（此期间日期已自动隐藏）
                </div>
                {order.delayReason && (
                  <div className="text-yellow-600 text-xs mt-1">
                    备注：{order.delayReason}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">加载中...</div>
        ) : (
          <>
            {/* 班次管理 */}
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  placeholder="新班次名称"
                  value={newShiftName}
                  onChange={(e) => setNewShiftName(e.target.value)}
                  className="px-3 py-1 border rounded text-sm"
                />
                <button
                  onClick={handleAddShift}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  添加班次
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(shifts || []).map(shift => (
                  <div key={shift.id} className="flex items-center bg-gray-100 rounded px-2 py-1 text-sm">
                    <span>{shift.name}</span>
                    <button
                      onClick={() => handleDeleteShift(shift.id)}
                      className="ml-2 text-red-600 hover:text-red-800"
                      title="删除班次"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 产量上报表格 */}
            <div className="overflow-auto max-h-96 border rounded">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="p-2 text-left border-r">日期</th>
                    {(shifts || []).map(shift => (
                      <th key={shift.id} className="p-2 text-center border-r">
                        {shift.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report, index) => (
                    <tr key={report.date} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="p-2 border-r font-medium">
                        {report.date}
                      </td>
                      {(shifts || []).map(shift => (
                        <td key={shift.id} className="p-2 border-r text-center">
                          <input
                            type="number"
                            min="0"
                            value={report[shift.name] || 0}
                            onChange={(e) => handleQuantityChange(report.date, shift.name, e.target.value)}
                            className="w-16 px-2 py-1 border rounded text-center"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center mt-4">
              <div className="flex items-center space-x-4">
                {!order?.actualEndDate && onFinishOrder && (
                  <button
                    onClick={async () => {
                      const quantity = window.prompt(`请输入完成数量：`, totalQuantity);
                      if (quantity !== null) {
                        const finalQuantity = parseInt(quantity) || 0;
                        if (window.confirm(`确定要结束工单吗？\n\n工单号：${order.orderNo}\n完成数量：${finalQuantity}`)) {
                          await handleSave();
                          await onFinishOrder(order, finalQuantity);
                          onClose();
                        }
                      }
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
                  >
                    ✅ 结束工单
                  </button>
                )}
                <div className="text-sm text-gray-600">
                  总产量：<span className="font-bold text-blue-600 text-lg">{totalQuantity}</span>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
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
          </>
        )}
      </div>
    </div>
  );
};

export default ProductionReportModal;