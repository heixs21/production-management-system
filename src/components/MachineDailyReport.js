import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Calendar,
  RefreshCcw,
  Download,
  ChevronDown,
  ChevronUp,
  Factory,
  AlertCircle,
} from 'lucide-react';
import { productionApi } from '../services/api';

const getTodayString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const quickRanges = [
  {
    key: 'today',
    label: '今日',
    getRange: () => {
      const today = getTodayString();
      return { start: today, end: today };
    },
  },
  {
    key: 'yesterday',
    label: '昨日',
    getRange: () => {
      const now = new Date();
      now.setDate(now.getDate() - 1);
      const date = now.toISOString().split('T')[0];
      return { start: date, end: date };
    },
  },
  {
    key: 'last7',
    label: '近7天',
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 6);
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      };
    },
  },
  {
    key: 'last30',
    label: '近30天',
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 29);
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      };
    },
  },
  {
    key: 'thisMonth',
    label: '本月',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      };
    },
  },
  {
    key: 'custom',
    label: '自定义',
    getRange: () => null,
  },
];

const formatNumber = (value) => Number(value || 0).toLocaleString('zh-CN');

const MachineDailyReport = () => {
  const today = getTodayString();
  const [selectedRange, setSelectedRange] = useState('today');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [selectedMachine, setSelectedMachine] = useState('all');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedDates, setExpandedDates] = useState({});
  const [expandedMachines, setExpandedMachines] = useState({});

  const updateRange = (rangeKey) => {
    setSelectedRange(rangeKey);
    const range = quickRanges.find((item) => item.key === rangeKey);
    if (range && range.getRange) {
      const computed = range.getRange();
      if (computed) {
        setStartDate(computed.start);
        setEndDate(computed.end);
      }
    }
  };

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await productionApi.getDailyMachineReport({
        startDate,
        endDate,
        machine: selectedMachine,
      });
      setReport(data);
      const dateState = {};
      data.days.forEach((day, index) => {
        dateState[day.date] = index === 0;
      });
      setExpandedDates(dateState);
      setExpandedMachines({});
    } catch (err) {
      setError(err.message || '加载机台日报失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedMachine]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleStartDateChange = (value) => {
    setStartDate(value);
    setSelectedRange('custom');
    if (value && endDate && new Date(value) > new Date(endDate)) {
      setEndDate(value);
    }
  };

  const handleEndDateChange = (value) => {
    setEndDate(value);
    setSelectedRange('custom');
    if (value && startDate && new Date(startDate) > new Date(value)) {
      setStartDate(value);
    }
  };

  const toggleDate = (date) => {
    setExpandedDates((prev) => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  const toggleMachine = (date, machineName) => {
    const key = `${date}__${machineName}`;
    setExpandedMachines((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleExport = () => {
    if (!report || !report.days) {
      return;
    }
    const rows = [];
    rows.push([
      '日期',
      '机台',
      '机台组',
      '产线',
      '机台状态',
      '工单号',
      '物料编码',
      '物料名称',
      '工单状态',
      '班次',
      '产量',
    ]);
    report.days.forEach((day) => {
      day.machines.forEach((machine) => {
        if (machine.orders.length === 0) {
          rows.push([
            day.date,
            machine.machineName,
            machine.machineGroup || '',
            machine.lineCode || '',
            machine.machineStatus || '',
            '',
            '',
            '',
            '',
            '',
            formatNumber(machine.totalQuantity),
          ]);
        } else {
          machine.orders.forEach((order, orderIndex) => {
            if (order.shiftDetails.length === 0) {
              rows.push([
                day.date,
                machine.machineName,
                machine.machineGroup || '',
                machine.lineCode || '',
                machine.machineStatus || '',
                order.orderNo || '',
                order.materialNo || '',
                order.materialName || '',
                order.orderStatus || '',
                '',
                formatNumber(order.totalQuantity),
              ]);
            } else {
              order.shiftDetails.forEach((shift, shiftIndex) => {
                rows.push([
                  day.date,
                  machine.machineName,
                  machine.machineGroup || '',
                  machine.lineCode || '',
                  machine.machineStatus || '',
                  order.orderNo || '',
                  order.materialNo || '',
                  order.materialName || '',
                  order.orderStatus || '',
                  shift.shiftName || '',
                  formatNumber(shift.quantity),
                ]);
              });
            }
          });
        }
      });
    });

    const csvContent = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `机台生产日报_${report.startDate}_${report.endDate}.csv`;
    link.click();
  };

  const summary = report?.summary || {
    totalQuantity: 0,
    machineCount: 0,
    orderCount: 0,
    averagePerMachine: 0,
    averagePerDay: 0,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded-full bg-blue-100 text-blue-600">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">机台生产日报</h1>
            <p className="text-sm text-gray-500 mt-1">
              统计所选日期范围内每台机台的生产执行情况，包含工单、班次与产量分布
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
            disabled={!report || loading}
          >
            <Download className="w-4 h-4" />
            <span>导出报表</span>
          </button>
          <button
            onClick={loadReport}
            className="flex items-center space-x-2 px-4 py-2 rounded border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors"
            disabled={loading}
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>刷新数据</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {quickRanges.map((range) => (
            <button
              key={range.key}
              onClick={() => updateRange(range.key)}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                selectedRange === range.key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'text-blue-600 border-blue-200 hover:bg-blue-50'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <label className="flex flex-col text-sm text-gray-600">
            <span className="flex items-center mb-1 font-medium">
              <Calendar className="w-4 h-4 mr-2 text-blue-500" />
              开始日期
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="border rounded px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="flex flex-col text-sm text-gray-600">
            <span className="flex items-center mb-1 font-medium">
              <Calendar className="w-4 h-4 mr-2 text-blue-500" />
              结束日期
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="border rounded px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="flex flex-col text-sm text-gray-600 md:col-span-2">
            <span className="flex items-center mb-1 font-medium">
              <Factory className="w-4 h-4 mr-2 text-blue-500" />
              机台筛选
            </span>
            <select
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
              className="border rounded px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部机台</option>
              {report?.availableMachines?.map((machine) => (
                <option key={machine.machineName} value={machine.machineName}>
                  {machine.machineName}
                  {machine.machineGroup ? `（${machine.machineGroup}）` : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error && (
        <div className="flex items-center space-x-3 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {report && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <div className="text-sm text-blue-700">总产量</div>
            <div className="text-2xl font-bold text-blue-900 mt-2">
              {formatNumber(summary.totalQuantity)}
            </div>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-lg p-4">
            <div className="text-sm text-green-700">覆盖机台数</div>
            <div className="text-2xl font-bold text-green-900 mt-2">
              {formatNumber(summary.machineCount)}
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
            <div className="text-sm text-purple-700">涉及工单数</div>
            <div className="text-2xl font-bold text-purple-900 mt-2">
              {formatNumber(summary.orderCount)}
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
            <div className="text-sm text-amber-700">机均日产量</div>
            <div className="text-2xl font-bold text-amber-900 mt-2">
              {Number(summary.averagePerMachine || 0).toLocaleString('zh-CN')}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {loading && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            正在加载机台日报数据，请稍候...
          </div>
        )}
        {!loading && report && report.days.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            所选日期范围内没有机台产量上报信息。
          </div>
        )}
        {!loading &&
          report &&
          report.days.map((day) => {
            const isExpanded = expandedDates[day.date];
            return (
              <div key={day.date} className="bg-white rounded-lg shadow overflow-hidden">
                <button
                  onClick={() => toggleDate(day.date)}
                  className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-6">
                    <div>
                      <div className="text-sm text-gray-500">日期</div>
                      <div className="text-lg font-semibold text-gray-900">{day.date}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">机台数量</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {formatNumber(day.machineCount)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">总产量</div>
                      <div className="text-lg font-semibold text-blue-600">
                        {formatNumber(day.totalQuantity)}
                      </div>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                </button>
                {isExpanded && (
                  <div className="divide-y">
                    {day.machines.map((machine) => {
                      const key = `${day.date}__${machine.machineName}`;
                      const machineExpanded = expandedMachines[key];
                      const shiftSummary = machine.shiftSummary || [];
                      const orderList = machine.orders || [];
                      return (
                        <div key={key} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                          <button
                            onClick={() => toggleMachine(day.date, machine.machineName)}
                            className="w-full flex items-center justify-between"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 text-left">
                              <div className="text-lg font-semibold text-gray-900">
                                {machine.machineName}
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500 mt-2 sm:mt-0">
                                {machine.machineGroup && <span>机台组：{machine.machineGroup}</span>}
                                {machine.lineCode && <span>产线：{machine.lineCode}</span>}
                                {machine.machineStatus && (
                                  <span>状态：{machine.machineStatus}</span>
                                )}
                                <span>
                                  工单数：{formatNumber(orderList.length)}，产量：
                                  <span className="text-blue-600 font-medium">
                                    {formatNumber(machine.totalQuantity)}
                                  </span>
                                </span>
                              </div>
                            </div>
                            {machineExpanded ? (
                              <ChevronUp className="w-5 h-5 text-gray-500" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-500" />
                            )}
                          </button>

                          {machineExpanded && (
                            <div className="mt-4 grid gap-6 lg:grid-cols-2">
                              <div>
                                <div className="text-sm font-semibold text-gray-700 mb-2">
                                  班次产量分布
                                </div>
                                <div className="border rounded-lg overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead className="bg-gray-100">
                                      <tr>
                                        <th className="p-2 text-left">班次</th>
                                        <th className="p-2 text-right">产量</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {shiftSummary.length === 0 && (
                                        <tr>
                                          <td className="p-3 text-gray-400 text-center" colSpan={2}>
                                            暂无班次数据
                                          </td>
                                        </tr>
                                      )}
                                      {shiftSummary.map((shift) => (
                                        <tr key={shift.shiftName} className="border-t">
                                          <td className="p-2">{shift.shiftName}</td>
                                          <td className="p-2 text-right text-blue-600 font-medium">
                                            {formatNumber(shift.quantity)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-700 mb-2">
                                  工单执行明细
                                </div>
                                <div className="border rounded-lg overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead className="bg-gray-100">
                                      <tr>
                                        <th className="p-2 text-left">工单号</th>
                                        <th className="p-2 text-left">产品/物料</th>
                                        <th className="p-2 text-right">产量</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {orderList.length === 0 && (
                                        <tr>
                                          <td className="p-3 text-gray-400 text-center" colSpan={3}>
                                            暂无工单数据
                                          </td>
                                        </tr>
                                      )}
                                      {orderList.map((order) => (
                                        <tr key={`${order.orderId || order.orderNo}`} className="border-t">
                                          <td className="p-2 font-medium text-gray-900">
                                            {order.orderNo || '-'}
                                          </td>
                                          <td className="p-2">
                                            <div className="text-gray-800">{order.materialName || '-'}</div>
                                            {order.materialNo && (
                                              <div className="text-xs text-gray-400">
                                                编码：{order.materialNo}
                                              </div>
                                            )}
                                            {order.orderStatus && (
                                              <div className="text-xs text-gray-400">
                                                状态：{order.orderStatus}
                                              </div>
                                            )}
                                          </td>
                                          <td className="p-2 text-right text-blue-600 font-medium">
                                            {formatNumber(order.totalQuantity)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default MachineDailyReport;

