import React, { useState } from 'react';
import { Edit3, X, ChevronDown, ChevronUp } from 'lucide-react';
import { getMachineStatusColors } from '../utils/orderUtils';

const MachineManager = ({
  machines,
  orders,
  onEditMachine,
  onDeleteMachine
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
              <th className="p-2 text-left">产线代号</th>
              <th className="p-2 text-left">状态</th>
              <th className="p-2 text-left">OEE</th>
              <th className="p-2 text-left">系数</th>
              <th className="p-2 text-left">工单数量</th>
              <th className="p-2 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {machines.map((machine) => {
              const machineOrders = orders.filter(o => o.machine === machine.name);
              
              return (
                <tr key={machine.id} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-medium">{machine.name}</td>
                  <td className="p-2 text-blue-600 font-medium">{machine.lineCode || '-'}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[machine.status]}`}>
                      {machine.status}
                    </span>
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
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                      {machineOrders.length}
                    </span>
                  </td>
                  <td className="p-2">
                    <button
                      onClick={() => onEditMachine(machine)}
                      className="text-blue-600 hover:text-blue-800 mr-2"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteMachine(machine.id)}
                      className="text-red-600 hover:text-red-800"
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
