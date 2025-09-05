import React, { useState, useMemo } from 'react';
import {
  calculateEstimatedProductionTime,
  identifyMaterialType,
  identifyHoleType,
  extractThickness,
  formatProductionTime,
  getAvailableMaterialTypes,
  getAvailableHoleTypes,
  getAvailableThicknesses,
  calculateWithCustomParams,
  getMachineOEEFromData
} from '../utils/materialTaktUtils';

const CurrentOrdersAnalysis = ({ orders, machines }) => {
  const [manualOverrides, setManualOverrides] = useState({});
  const [isVisible, setIsVisible] = useState(true);

  // 获取所有未完成的工单
  const currentOrders = useMemo(() => {
    return orders.filter(order => !order.actualEndDate && order.status !== '暂停完成');
  }, [orders]);

  // 计算每个工单的生产时间信息
  const orderAnalysis = useMemo(() => {
    return currentOrders.map(order => {
      const orderId = order.id;
      const override = manualOverrides[orderId] || {};

      // 使用手动选择的值或自动识别的值
      const materialType = override.materialType || identifyMaterialType(order.materialName);
      const holeType = override.holeType || identifyHoleType(order.materialName);
      const thickness = override.thickness || extractThickness(order.materialName);

      // 检查是否需要手动选择
      const needsManualSelection = materialType === '其他' || holeType === '' || thickness === '';

      // 使用自定义参数重新计算生产时间
      const productionInfo = calculateWithCustomParams(
        materialType,
        holeType,
        thickness,
        order.quantity,
        order.machine,
        machines
      );

      return {
        ...order,
        materialType,
        holeType,
        thickness,
        needsManualSelection,
        productionInfo,
        override
      };
    });
  }, [currentOrders, manualOverrides, machines]);

  // 计算总预计生产时间（天）
  const totalEstimatedDays = useMemo(() => {
    return orderAnalysis.reduce((total, order) => {
      return total + parseFloat(order.productionInfo.estimatedDays);
    }, 0);
  }, [orderAnalysis]);

  // 处理手动选择
  const handleManualOverride = (orderId, field, value) => {
    setManualOverrides(prev => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        [field]: value
      }
    }));
  };



  if (currentOrders.length === 0) {
    return (
      <div className="p-4 border-b bg-gray-50">
        <h3 className="text-lg font-semibold mb-2">📊 当前工单生产时间分析</h3>
        <div className="text-gray-500 text-center py-4">
          暂无进行中的工单
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-b bg-gray-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">📊 当前工单生产时间分析</h3>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            总计: <span className="font-bold text-blue-600">{totalEstimatedDays.toFixed(2)}天</span>
          </div>
          <button
            onClick={() => setIsVisible(!isVisible)}
            className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {isVisible ? '隐藏' : '显示'}
          </button>
        </div>
      </div>

      {isVisible && (
        <>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left p-2 border">工单号</th>
              <th className="text-left p-2 border">机台</th>
              <th className="text-left p-2 border">物料名称</th>
              <th className="text-left p-2 border">数量</th>
              <th className="text-left p-2 border">物料类型</th>
              <th className="text-left p-2 border">孔型</th>
              <th className="text-left p-2 border">厚度</th>
              <th className="text-left p-2 border">节拍</th>
              <th className="text-left p-2 border">OEE</th>
              <th className="text-left p-2 border">预计时间(天)</th>
            </tr>
          </thead>
          <tbody>
            {orderAnalysis.map(order => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="p-2 border font-medium">{order.orderNo}</td>
                <td className="p-2 border">{order.machine}</td>
                <td className="p-2 border text-xs" title={order.materialName}>
                  {order.materialName.length > 20 
                    ? order.materialName.substring(0, 20) + '...' 
                    : order.materialName}
                </td>
                <td className="p-2 border text-center">{order.quantity}</td>
                
                {/* 物料类型选择 */}
                <td className="p-2 border">
                  {order.needsManualSelection ? (
                    <select
                      value={order.materialType}
                      onChange={(e) => handleManualOverride(order.id, 'materialType', e.target.value)}
                      className="w-full text-xs border rounded px-1 py-1"
                    >
                      {getAvailableMaterialTypes().map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-green-600">{order.materialType}</span>
                  )}
                </td>
                
                {/* 孔型选择 */}
                <td className="p-2 border">
                  {order.holeType === '' || order.needsManualSelection ? (
                    <select
                      value={order.holeType}
                      onChange={(e) => handleManualOverride(order.id, 'holeType', e.target.value)}
                      className="w-full text-xs border rounded px-1 py-1"
                    >
                      <option value="">请选择</option>
                      {getAvailableHoleTypes(order.materialType).map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-green-600">{order.holeType}</span>
                  )}
                </td>
                
                {/* 厚度选择 */}
                <td className="p-2 border">
                  {order.thickness === '' || order.needsManualSelection ? (
                    <select
                      value={order.thickness}
                      onChange={(e) => handleManualOverride(order.id, 'thickness', e.target.value)}
                      className="w-full text-xs border rounded px-1 py-1"
                    >
                      <option value="">请选择</option>
                      {getAvailableThicknesses(order.materialType, order.holeType).map(thickness => (
                        <option key={thickness} value={thickness}>{thickness}mm</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-green-600">{order.thickness}mm</span>
                  )}
                </td>
                
                <td className="p-2 border text-center">{order.productionInfo.takt}秒</td>

                {/* OEE显示 */}
                <td className="p-2 border text-center">
                  <span className="text-sm font-medium text-blue-600">
                    {(getMachineOEEFromData(order.machine, machines) * 100).toFixed(1)}%
                  </span>
                </td>

                <td className="p-2 border text-center font-medium text-blue-600">
                  {order.productionInfo.estimatedDays}天
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>

          <div className="mt-3 text-xs text-gray-500">
            * 绿色表示自动识别成功，下拉框表示需要手动选择
            * 预计时间已考虑机台OEE和系数，按16小时工作日计算天数
          </div>
        </>
      )}
    </div>
  );
};

export default CurrentOrdersAnalysis;
