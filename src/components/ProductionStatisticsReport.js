import React, { useState, useEffect } from 'react';
import { BarChart3, Download, ChevronDown, ChevronRight, Search, Calendar } from 'lucide-react';

const ProductionStatisticsReport = () => {
  const [statistics, setStatistics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState({});
  const [activeTab, setActiveTab] = useState('current');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMachine, setSelectedMachine] = useState('all');

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const serverUrl = `http://${window.location.hostname}:12454`;
      
      const ordersResponse = await fetch(`${serverUrl}/api/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const orders = await ordersResponse.json();
      
      const statsData = [];
      
      for (const order of orders) {
        const reportsResponse = await fetch(`${serverUrl}/api/production-reports/${order.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const reports = await reportsResponse.json();
        
        const totalReported = Array.isArray(reports) 
          ? reports.reduce((sum, r) => sum + (r.quantity || 0), 0)
          : 0;
        
        const dailyData = {};
        if (Array.isArray(reports)) {
          reports.forEach(r => {
            if (!dailyData[r.reportDate]) {
              dailyData[r.reportDate] = [];
            }
            dailyData[r.reportDate].push({
              shift: r.shiftName,
              quantity: r.quantity || 0
            });
          });
        }
        
        statsData.push({
          orderNo: order.orderNo,
          materialName: order.materialName,
          machine: order.machine,
          plannedQuantity: order.quantity,
          reportedQuantity: totalReported,
          completionRate: ((totalReported / order.quantity) * 100).toFixed(1),
          status: order.status,
          dailyReports: dailyData,
          isCompleted: !!order.actualEndDate,
          actualEndDate: order.actualEndDate
        });
      }
      
      setStatistics(statsData);
    } catch (error) {
      console.error('加载统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (orderNo) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderNo]: !prev[orderNo]
    }));
  };

  const exportToCSV = () => {
    const rows = [];
    rows.push(['工单号', '物料名称', '机台', '计划数量', '已报数量', '完成率(%)', '状态', '日期', '班次', '产量']);
    
    statistics.forEach(s => {
      const dates = Object.keys(s.dailyReports).sort();
      if (dates.length === 0) {
        rows.push([s.orderNo, s.materialName, s.machine, s.plannedQuantity, s.reportedQuantity, s.completionRate, s.status, '', '', '']);
      } else {
        dates.forEach((date, idx) => {
          s.dailyReports[date].forEach((shift, shiftIdx) => {
            if (idx === 0 && shiftIdx === 0) {
              rows.push([s.orderNo, s.materialName, s.machine, s.plannedQuantity, s.reportedQuantity, s.completionRate, s.status, date, shift.shift, shift.quantity]);
            } else {
              rows.push(['', '', '', '', '', '', '', date, shift.shift, shift.quantity]);
            }
          });
        });
      }
    });
    
    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `产量统计报表_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const currentOrders = statistics.filter(s => !s.isCompleted);
  const completedOrders = statistics.filter(s => s.isCompleted);

  const filteredOrders = (activeTab === 'current' ? currentOrders : completedOrders).filter(order => {
    const matchSearch = searchTerm === '' || 
      order.orderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.materialName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchMachine = selectedMachine === 'all' || order.machine === selectedMachine;
    
    const matchDate = !startDate || !endDate || !order.actualEndDate ||
      (new Date(order.actualEndDate) >= new Date(startDate) && 
       new Date(order.actualEndDate) <= new Date(endDate));
    
    return matchSearch && matchMachine && matchDate;
  });

  const machines = [...new Set(statistics.map(s => s.machine))].sort();
  const totalPlanned = filteredOrders.reduce((sum, s) => sum + s.plannedQuantity, 0);
  const totalReported = filteredOrders.reduce((sum, s) => sum + s.reportedQuantity, 0);
  const overallRate = totalPlanned > 0 ? ((totalReported / totalPlanned) * 100).toFixed(1) : 0;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold">产量统计报表</h2>
        </div>
        <button
          onClick={exportToCSV}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>导出报表</span>
        </button>
      </div>

      <div className="flex border-b mb-4">
        <button
          onClick={() => setActiveTab('current')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'current'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          当前工单 ({currentOrders.length})
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

      {activeTab === 'completed' && (
        <div className="mb-4 grid grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="搜索工单号、物料..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 border rounded w-full text-sm"
            />
          </div>
          <select
            value={selectedMachine}
            onChange={(e) => setSelectedMachine(e.target.value)}
            className="px-3 py-2 border rounded text-sm"
          >
            <option value="all">全部产线</option>
            {machines.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border rounded text-sm"
            placeholder="开始日期"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border rounded text-sm"
            placeholder="结束日期"
          />
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">总计划产量</div>
          <div className="text-2xl font-bold text-blue-600">{totalPlanned}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">总已报产量</div>
          <div className="text-2xl font-bold text-green-600">{totalReported}</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">总体完成率</div>
          <div className="text-2xl font-bold text-purple-600">{overallRate}%</div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">加载中...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left w-8"></th>
                <th className="p-3 text-left">工单号</th>
                <th className="p-3 text-left">物料名称</th>
                <th className="p-3 text-left">机台</th>
                <th className="p-3 text-center">计划数量</th>
                <th className="p-3 text-center">已报数量</th>
                <th className="p-3 text-center">完成率</th>
                <th className="p-3 text-center">状态</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((stat, index) => (
                <React.Fragment key={stat.orderNo}>
                  <tr className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 cursor-pointer`}
                      onClick={() => toggleExpand(stat.orderNo)}>
                    <td className="p-3">
                      {expandedOrders[stat.orderNo] ? 
                        <ChevronDown className="w-4 h-4" /> : 
                        <ChevronRight className="w-4 h-4" />
                      }
                    </td>
                    <td className="p-3 font-medium">{stat.orderNo}</td>
                    <td className="p-3">{stat.materialName}</td>
                    <td className="p-3">{stat.machine}</td>
                    <td className="p-3 text-center">{stat.plannedQuantity}</td>
                    <td className="p-3 text-center font-medium text-blue-600">{stat.reportedQuantity}</td>
                    <td className="p-3 text-center">
                      <span className={`font-medium ${
                        stat.completionRate >= 100 ? 'text-green-600' :
                        stat.completionRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {stat.completionRate}%
                      </span>
                    </td>
                    <td className="p-3 text-center">{stat.status}</td>
                  </tr>
                  {expandedOrders[stat.orderNo] && (
                    <tr className="bg-blue-50">
                      <td colSpan="8" className="p-0">
                        <div className="p-4">
                          <h4 className="font-semibold mb-2 text-gray-700">每日产量明细</h4>
                          {Object.keys(stat.dailyReports).length === 0 ? (
                            <p className="text-gray-500 text-sm">暂无产量上报记录</p>
                          ) : (
                            <table className="w-full text-sm">
                              <thead className="bg-white">
                                <tr>
                                  <th className="p-2 text-left">日期</th>
                                  <th className="p-2 text-left">班次</th>
                                  <th className="p-2 text-center">产量</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.keys(stat.dailyReports).sort().map(date => (
                                  stat.dailyReports[date].map((shift, idx) => (
                                    <tr key={`${date}-${idx}`} className="border-t">
                                      {idx === 0 && (
                                        <td className="p-2 font-medium" rowSpan={stat.dailyReports[date].length}>
                                          {date}
                                        </td>
                                      )}
                                      <td className="p-2">{shift.shift}</td>
                                      <td className="p-2 text-center font-medium text-blue-600">{shift.quantity}</td>
                                    </tr>
                                  ))
                                ))}
                                <tr className="bg-gray-100 font-semibold">
                                  <td colSpan="2" className="p-2 text-right">小计：</td>
                                  <td className="p-2 text-center text-blue-600">{stat.reportedQuantity}</td>
                                </tr>
                              </tbody>
                            </table>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ProductionStatisticsReport;
