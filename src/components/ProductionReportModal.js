import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';

const ProductionReportModal = ({ isOpen, onClose, order, onSave }) => {
  const [reports, setReports] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [newShiftName, setNewShiftName] = useState('');
  const [loading, setLoading] = useState(false);

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
      
      // 生成日期范围（从工单开始日期到今天）
      const startDate = new Date(order.startDate);
      const today = new Date();
      const dateRange = [];
      
      for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
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
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (date, shiftName, quantity) => {
    setReports(prev => prev.map(report => 
      report.date === date 
        ? { ...report, [shiftName]: parseInt(quantity) || 0 }
        : report
    ));
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      const serverUrl = `http://${window.location.hostname}:12454`;
      
      for (const report of reports) {
        for (const shift of (shifts || [])) {
          const quantity = report[shift.name] || 0;
          await fetch(`${serverUrl}/api/production-reports`, {
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
          });
        }
      }
      
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

            <div className="flex justify-end space-x-2 mt-4">
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
          </>
        )}
      </div>
    </div>
  );
};

export default ProductionReportModal;