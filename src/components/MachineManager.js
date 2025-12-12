import React, { useState } from 'react';
import { Edit3, X, ChevronDown, ChevronUp, Settings, Wifi, WifiOff, Activity } from 'lucide-react';
import { getMachineStatusColors } from '../utils/orderUtils';

const MachineManager = ({
  machines,
  orders,
  onEditMachine,
  onDeleteMachine,
  onConfigureOPCUA,
  realtimeStatuses = {}
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const statusColors = getMachineStatusColors();

  return (
    <div className="border-b bg-gray-25">
      <div
        className="p-4 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center">
            机台管理
            <span className="ml-2 text-sm text-gray-500">
              ({machines.length}台机台)
            </span>
          </h2>
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">机台名称</th>
              <th className="p-2 text-left">机台组</th>
              <th className="p-2 text-left">产线代号</th>
              <th className="p-2 text-left">状态</th>
              <th className="p-2 text-left">OPC UA</th>
              <th className="p-2 text-left">实时状态</th>
              <th className="p-2 text-left">OEE</th>
              <th className="p-2 text-left">系数</th>
              <th className="p-2 text-left">自动调整工单</th>
              <th className="p-2 text-left">启用一键下达</th>
              <th className="p-2 text-left">产量上报</th>
              <th className="p-2 text-left">工单数量</th>
              <th className="p-2 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {machines.map((machine) => {
              const machineOrders = orders.filter(o => o.machine === machine.name);
              const realtimeStatus = realtimeStatuses[machine.id];
              
              return (
                <tr key={machine.id} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-medium">{machine.name}</td>
                  <td className="p-2">
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium">
                      {machine.machineGroup || '未分组'}
                    </span>
                  </td>
                  <td className="p-2 text-blue-600 font-medium">{machine.lineCode || '-'}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[machine.status]}`}>
                      {machine.status}
                    </span>
                  </td>
                  {/* OPC UA 连接状态 */}
                  <td className="p-2 text-center">
                    {machine.opcuaEnabled ? (
                      <div className="flex items-center justify-center space-x-1">
                        {realtimeStatus?.connected ? (
                          <Wifi className="w-4 h-4 text-green-600" title="已连接" />
                        ) : (
                          <WifiOff className="w-4 h-4 text-gray-400" title="未连接" />
                        )}
                        <button
                          onClick={() => onConfigureOPCUA && onConfigureOPCUA(machine)}
                          className="text-blue-600 hover:text-blue-800"
                          title="配置 OPC UA"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => onConfigureOPCUA && onConfigureOPCUA(machine)}
                        className="text-gray-400 hover:text-blue-600"
                        title="启用 OPC UA"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                  {/* 实时状态数据 */}
                  <td className="p-2">
                    {realtimeStatus?.realtimeData ? (
                      <div className="flex items-center space-x-2">
                        <Activity className="w-4 h-4 text-green-600" />
                        <div className="text-xs">
                          <div className="font-medium">{realtimeStatus.realtimeData.status || '-'}</div>
                          {realtimeStatus.lastUpdate && (
                            <div className="text-gray-500">
                              {new Date(realtimeStatus.lastUpdate).toLocaleTimeString('zh-CN')}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="p-2 text-center">
                    {machine.oee ? (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        machine.oee >= 0.85 ? 'bg-green-100 text-green-800' :
                        machine.oee >= 0.70 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {(machine.oee * 100).toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">未设置</span>
                    )}
                  </td>
                  <td className="p-2 text-center">
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                      {machine.coefficient || 1.00}
                    </span>
                  </td>
                  <td className="p-2 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      (machine.autoAdjustOrders === true || machine.autoAdjustOrders === 1) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {(machine.autoAdjustOrders === true || machine.autoAdjustOrders === 1) ? '已启用' : '已禁用'}
                    </span>
                  </td>
                  <td className="p-2 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      (machine.enableBatchSubmit === true || machine.enableBatchSubmit === 1) ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {(machine.enableBatchSubmit === true || machine.enableBatchSubmit === 1) ? '已启用' : '已禁用'}
                    </span>
                  </td>
                  <td className="p-2 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      (machine.requiresProductionReport === true || machine.requiresProductionReport === 1) ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {(machine.requiresProductionReport === true || machine.requiresProductionReport === 1) ? '需要上报' : '无需上报'}
                    </span>
                  </td>
                  <td className="p-2 text-center">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                      {machineOrders.length}
                    </span>
                  </td>
                  <td className="p-2">
                    <button
                      onClick={() => onEditMachine(machine)}
                      className="text-blue-600 hover:text-blue-800 mr-2"
                      title="编辑机台"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteMachine(machine.id)}
                      className="text-red-600 hover:text-red-800"
                      title="删除机台"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MachineManager;
