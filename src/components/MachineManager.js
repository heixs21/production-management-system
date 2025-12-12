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
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const statusColors = getMachineStatusColors();

  // 按机台组分组
  const machinesByGroup = React.useMemo(() => {
    const groups = {};
    machines.forEach(machine => {
      const group = machine.machineGroup || '未分组';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(machine);
    });
    return groups;
  }, [machines]);

  const toggleGroup = (group) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(group)) {
      newCollapsed.delete(group);
    } else {
      newCollapsed.add(group);
    }
    setCollapsedGroups(newCollapsed);
  };

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
          {Object.entries(machinesByGroup).map(([groupName, groupMachines]) => {
            const isGroupCollapsed = collapsedGroups.has(groupName);
            return (
              <div key={groupName} className="mb-4 border rounded-lg overflow-hidden">
                {/* 分组标题 */}
                <div 
                  className="flex items-center justify-between p-2 bg-indigo-50 cursor-pointer hover:bg-indigo-100 border-l-4 border-indigo-500"
                  onClick={() => toggleGroup(groupName)}
                >
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-semibold text-gray-800">{groupName}</h4>
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-xs">
                      {groupMachines.length}
                    </span>
                  </div>
                  {isGroupCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </div>

                {/* 机台表格 */}
                {!isGroupCollapsed && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">机台名称</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">产线代号</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700">状态</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700">OEE</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700">系数</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700">自动调整</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700">一键下达</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700">产量上报</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700">OPC UA</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700">工单数</th>
                          <th className="px-4 py-3 text-center font-semibold text-gray-700">操作</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {groupMachines.map((machine) => {
                          const machineOrders = orders.filter(o => o.machine === machine.name);
                          const realtimeStatus = realtimeStatuses[machine.id];
                          
                          return (
                            <tr key={machine.id} className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                              <td className="px-4 py-3 font-semibold text-gray-800">{machine.name}</td>
                              <td className="px-4 py-3">
                                <span className="text-blue-600 font-medium">{machine.lineCode || '-'}</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[machine.status]}`}>
                                  {machine.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                {machine.oee ? (
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                    machine.oee >= 0.85 ? 'bg-green-100 text-green-700' :
                                    machine.oee >= 0.70 ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {(machine.oee * 100).toFixed(0)}%
                                  </span>
                                ) : <span className="text-gray-400">-</span>}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                                  ×{machine.coefficient || 1.00}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                {(machine.autoAdjustOrders === true || machine.autoAdjustOrders === 1) ? (
                                  <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                    ✓ 已启用
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-xs">未启用</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {(machine.enableBatchSubmit === true || machine.enableBatchSubmit === 1) ? (
                                  <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                    ✓ 已启用
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-xs">未启用</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {(machine.requiresProductionReport === true || machine.requiresProductionReport === 1) ? (
                                  <span className="inline-flex items-center px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                                    ✓ 需要
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-xs">不需要</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {machine.opcuaEnabled ? (
                                  realtimeStatus?.connected ? (
                                    <div className="flex items-center justify-center space-x-1">
                                      <Wifi className="w-4 h-4 text-green-600" />
                                      <span className="text-xs text-green-600 font-medium">已连接</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center space-x-1">
                                      <WifiOff className="w-4 h-4 text-gray-400" />
                                      <span className="text-xs text-gray-400">未连接</span>
                                    </div>
                                  )
                                ) : (
                                  <span className="text-gray-400 text-xs">未启用</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                                  {machineOrders.length}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex justify-center space-x-1">
                                  {machine.opcuaEnabled ? (
                                    <button
                                      onClick={() => onConfigureOPCUA && onConfigureOPCUA(machine)}
                                      className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                      title="配置 OPC UA"
                                    >
                                      <Settings className="w-4 h-4" />
                                    </button>
                                  ) : null}
                                  <button
                                    onClick={() => onEditMachine(machine)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                    title="编辑机台"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => onDeleteMachine(machine.id)}
                                    className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                                    title="删除机台"
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
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MachineManager;
