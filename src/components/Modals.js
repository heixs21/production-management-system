import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { sapApi } from '../services/sapApi';

// 错误提示组件
export const ErrorMessage = ({ message, onClose }) => {
  if (!message) return null;
  return (
    <div className="fixed top-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-md">
      <div className="flex justify-between items-start">
        <div className="flex-1 whitespace-pre-line">{message}</div>
        <button onClick={onClose} className="ml-2 text-white hover:text-gray-200">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// 加载状态组件
export const LoadingSpinner = ({ loading }) => {
  if (!loading) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span>处理中...</span>
        </div>
      </div>
    </div>
  );
};

// 机台管理弹窗
export const MachineModal = ({ 
  show, 
  isEditing, 
  machineData, 
  onMachineChange, 
  onSave, 
  onClose 
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96">
        <h3 className="text-lg font-semibold mb-4">
          {isEditing ? '编辑机台' : '添加机台'}
        </h3>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="机台名称"
            value={machineData.name}
            onChange={(e) => onMachineChange({ ...machineData, name: e.target.value })}
            className="w-full p-2 border rounded"
          />
          <input
            type="text"
            placeholder="产线代号"
            value={machineData.lineCode || ''}
            onChange={(e) => onMachineChange({ ...machineData, lineCode: e.target.value })}
            className="w-full p-2 border rounded"
          />
          <select
            value={machineData.status}
            onChange={(e) => onMachineChange({ ...machineData, status: e.target.value })}
            className="w-full p-2 border rounded"
          >
            <option value="正常">正常</option>
            <option value="维修">维修</option>
            <option value="停机">停机</option>
          </select>
          <input
            type="number"
            step="0.01"
            min="0"
            max="1"
            placeholder="OEE (0-1之间的小数，可选)"
            value={machineData.oee || ''}
            onChange={(e) => onMachineChange({ ...machineData, oee: parseFloat(e.target.value) || null })}
            className="w-full p-2 border rounded"
          />
          <input
            type="number"
            step="0.01"
            min="0.1"
            max="10"
            placeholder="时间系数 (默认1.00)"
            value={machineData.coefficient || ''}
            onChange={(e) => onMachineChange({ ...machineData, coefficient: parseFloat(e.target.value) || 1.00 })}
            className="w-full p-2 border rounded"
          />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            取消
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            {isEditing ? '保存' : '添加'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Excel粘贴弹窗
export const PasteModal = ({ 
  show, 
  pasteData, 
  onPasteDataChange, 
  onImport, 
  onClose, 
  loading 
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96">
        <h3 className="text-lg font-semibold mb-4">粘贴Excel数据</h3>
        <p className="text-sm text-gray-600 mb-3">
          请从Excel复制数据（包含表头），然后粘贴到下方文本框：
          <br />
          格式：机台 | 工单号 | 物料号 | 物料名称 | 数量 | 优先度 | 开始日期 | 预计结束日期 | 实际结束日期
        </p>
        <textarea
          value={pasteData}
          onChange={(e) => onPasteDataChange(e.target.value)}
          placeholder="在此粘贴从Excel复制的数据..."
          className="w-full p-3 border rounded h-32 text-sm font-mono"
          rows="6"
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            取消
          </button>
          <button
            onClick={onImport}
            disabled={!pasteData.trim() || loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300"
          >
            {loading ? '导入中...' : '导入数据'}
          </button>
        </div>
      </div>
    </div>
  );
};

// 工单表单弹窗
export const OrderModal = ({
  show,
  isEditing,
  orderData,
  machines,
  onOrderChange,
  onSave,
  onClose
}) => {
  const [loading, setLoading] = useState(false);

  // 处理工单号输入完成事件
  const handleOrderNoKeyPress = async (e) => {
    if (e.key === 'Enter' && orderData.orderNo && !isEditing) {
      setLoading(true);
      try {
        const result = await sapApi.getOrderMaterial(orderData.orderNo);
        if (result.success) {
          onOrderChange({
            ...orderData,
            materialNo: result.data.materialNo,
            materialName: result.data.materialName,
            quantity: result.data.quantity
          });
        } else {
          alert('获取物料信息失败: ' + result.error);
        }
      } catch (error) {
        alert('获取物料信息失败: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96 max-h-96 overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">
          {isEditing ? '编辑工单' : '添加新工单'}
        </h3>
        <div className="space-y-3">
          <select
            value={orderData.machine}
            onChange={(e) => onOrderChange({ ...orderData, machine: e.target.value })}
            className="w-full p-2 border rounded"
          >
            <option value="">选择机台</option>
            {machines.map(machine => (
              <option key={machine.id} value={machine.name}>
                {machine.name} ({machine.status})
              </option>
            ))}
          </select>

          <div className="relative">
            <input
              type="text"
              placeholder="工单号（输入后按回车自动获取物料信息）"
              value={orderData.orderNo}
              onChange={(e) => onOrderChange({ ...orderData, orderNo: e.target.value })}
              onKeyPress={handleOrderNoKeyPress}
              className="w-full p-2 border rounded"
              disabled={loading}
            />
            {loading && (
              <div className="absolute right-2 top-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>

          <input
            type="text"
            placeholder="物料号"
            value={orderData.materialNo || ''}
            onChange={(e) => onOrderChange({ ...orderData, materialNo: e.target.value })}
            className="w-full p-2 border rounded bg-gray-50"
            title="从SAP自动获取"
          />

          <input
            type="text"
            placeholder="物料名称"
            value={orderData.materialName || ''}
            onChange={(e) => onOrderChange({ ...orderData, materialName: e.target.value })}
            className="w-full p-2 border rounded bg-gray-50"
            title="从SAP自动获取"
          />

          <input
            type="text"
            placeholder="工单组件"
            value={orderData.orderComponent || ''}
            onChange={(e) => onOrderChange({ ...orderData, orderComponent: e.target.value })}
            className="w-full p-2 border rounded"
          />

          <input
            type="number"
            placeholder="数量"
            value={orderData.quantity || ''}
            onChange={(e) => onOrderChange({ ...orderData, quantity: e.target.value })}
            className="w-full p-2 border rounded bg-gray-50"
            title="从SAP自动获取"
          />

          <input
            type="number"
            placeholder="优先度"
            value={orderData.priority}
            onChange={(e) => onOrderChange({ ...orderData, priority: parseInt(e.target.value) || 1 })}
            className="w-full p-2 border rounded"
          />

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">开始日期</label>
            <input
              type="date"
              value={orderData.startDate}
              onChange={(e) => onOrderChange({ ...orderData, startDate: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">预计结束日期</label>
            <input
              type="date"
              value={orderData.expectedEndDate}
              onChange={(e) => onOrderChange({ ...orderData, expectedEndDate: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">延期预计结束日期</label>
            <input
              type="date"
              value={orderData.delayedExpectedEndDate}
              onChange={(e) => onOrderChange({ ...orderData, delayedExpectedEndDate: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>

          {orderData.actualEndDate && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">实际结束日期</label>
              <input
                type="date"
                value={orderData.actualEndDate}
                onChange={(e) => onOrderChange({ ...orderData, actualEndDate: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            取消
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {isEditing ? '保存' : '添加'}
          </button>
        </div>
      </div>
    </div>
  );
};

// 紧急插单弹窗
export const UrgentOrderModal = ({
  show,
  orderData,
  machines,
  onOrderChange,
  onSave,
  onClose
}) => {
  const [loading, setLoading] = useState(false);

  // 处理工单号输入完成事件
  const handleOrderNoKeyPress = async (e) => {
    if (e.key === 'Enter' && orderData.orderNo) {
      setLoading(true);
      try {
        const result = await sapApi.getOrderMaterial(orderData.orderNo);
        if (result.success) {
          onOrderChange({
            ...orderData,
            materialNo: result.data.materialNo,
            materialName: result.data.materialName,
            quantity: result.data.quantity
          });
        } else {
          alert('获取物料信息失败: ' + result.error);
        }
      } catch (error) {
        alert('获取物料信息失败: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96 max-h-96 overflow-y-auto border-2 border-red-300">
        <h3 className="text-lg font-semibold mb-4 text-red-600 flex items-center">
          🚨 紧急插单
        </h3>
        <div className="bg-red-50 p-3 rounded mb-4 text-sm text-red-700">
          <p>⚠️ 紧急插单将暂停同机台同时间段的其他工单</p>
        </div>

        <div className="space-y-3">
          <select
            value={orderData.machine}
            onChange={(e) => onOrderChange({ ...orderData, machine: e.target.value })}
            className="w-full p-2 border rounded border-red-200"
          >
            <option value="">选择机台</option>
            {machines.map(machine => (
              <option key={machine.id} value={machine.name}>
                {machine.name} ({machine.status})
              </option>
            ))}
          </select>

          <div className="relative">
            <input
              type="text"
              placeholder="工单号（输入后按回车自动获取物料信息）"
              value={orderData.orderNo}
              onChange={(e) => onOrderChange({ ...orderData, orderNo: e.target.value })}
              onKeyPress={handleOrderNoKeyPress}
              className="w-full p-2 border rounded border-red-200"
              disabled={loading}
            />
            {loading && (
              <div className="absolute right-2 top-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
              </div>
            )}
          </div>

          <input
            type="text"
            placeholder="物料号"
            value={orderData.materialNo || ''}
            onChange={(e) => onOrderChange({ ...orderData, materialNo: e.target.value })}
            className="w-full p-2 border rounded border-red-200 bg-red-50"
            title="从SAP自动获取"
          />

          <input
            type="text"
            placeholder="物料名称"
            value={orderData.materialName || ''}
            onChange={(e) => onOrderChange({ ...orderData, materialName: e.target.value })}
            className="w-full p-2 border rounded border-red-200 bg-red-50"
            title="从SAP自动获取"
          />

          <input
            type="text"
            placeholder="工单组件"
            value={orderData.orderComponent || ''}
            onChange={(e) => onOrderChange({ ...orderData, orderComponent: e.target.value })}
            className="w-full p-2 border rounded border-red-200"
          />

          <input
            type="number"
            placeholder="数量"
            value={orderData.quantity || ''}
            onChange={(e) => onOrderChange({ ...orderData, quantity: e.target.value })}
            className="w-full p-2 border rounded border-red-200 bg-red-50"
            title="从SAP自动获取"
          />

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">开始日期</label>
            <input
              type="date"
              value={orderData.startDate}
              onChange={(e) => onOrderChange({ ...orderData, startDate: e.target.value })}
              className="w-full p-2 border rounded border-red-200"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">预计结束日期</label>
            <input
              type="date"
              value={orderData.expectedEndDate}
              onChange={(e) => onOrderChange({ ...orderData, expectedEndDate: e.target.value })}
              className="w-full p-2 border rounded border-red-200"
            />
          </div>

          <input
            type="number"
            placeholder="报工数量"
            value={orderData.reportedQuantity}
            onChange={(e) => onOrderChange({ ...orderData, reportedQuantity: e.target.value })}
            className="w-full p-2 border rounded border-red-200"
          />
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            取消
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            🚨 紧急插单
          </button>
        </div>
      </div>
    </div>
  );
};

// 工单暂停恢复弹窗
export const PauseResumeModal = ({
  show,
  order,
  action, // 'pause' 或 'resume'
  onConfirm,
  onClose
}) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  if (!show || !order) return null;

  const isPause = action === 'pause';
  const today = new Date().toISOString().split('T')[0];

  // 计算已生产天数（暂停时）
  const getProducedDays = () => {
    if (!isPause) return order.producedDays || 0;
    const startDate = new Date(order.startDate);
    const pauseDate = new Date(date);
    return Math.max(0, Math.ceil((pauseDate - startDate) / (1000 * 60 * 60 * 24)));
  };

  const handleConfirm = () => {
    onConfirm(order.id, date);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          {isPause ? '⏸️ 暂停工单' : '▶️ 恢复工单'}
        </h3>

        <div className="bg-blue-50 p-3 rounded mb-4 text-sm">
          <div className="font-medium text-blue-800">工单信息：</div>
          <div className="text-blue-700">
            <div>工单号：{order.orderNo}</div>
            <div>物料：{order.materialName}</div>
            <div>原计划：{order.startDate} 至 {order.expectedEndDate}</div>
            {!isPause && (
              <div className="mt-2 p-2 bg-yellow-50 rounded">
                <div className="text-orange-700">
                  已生产：{order.producedDays || 0} 天
                </div>
                <div className="text-orange-700">
                  剩余：{order.remainingDays || 1} 天
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isPause ? '暂停日期' : '恢复生产日期'}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={isPause ? order.startDate : today}
              className="w-full p-2 border rounded"
            />
          </div>

          {isPause && (
            <div className="text-sm text-gray-600">
              <div>已生产天数：{getProducedDays()} 天</div>
              <div>剩余天数：{Math.max(0, Math.ceil((new Date(order.expectedEndDate) - new Date(order.startDate)) / (1000 * 60 * 60 * 24)) - getProducedDays())} 天</div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 text-white rounded ${
              isPause ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isPause ? '⏸️ 确认暂停' : '▶️ 确认恢复'}
          </button>
        </div>
      </div>
    </div>
  );
};

// 报工弹窗
export const ReportWorkModal = ({
  show,
  order,
  date,
  onConfirm,
  onClose
}) => {
  const [reportedQuantity, setReportedQuantity] = useState('');
  const [delayReason, setDelayReason] = useState('');

  if (!show || !order) return null;

  const isDelayed = order.actualEndDate && new Date(order.actualEndDate) > new Date(order.expectedEndDate);

  const handleConfirm = () => {
    onConfirm(order.id, parseInt(reportedQuantity) || 0, delayReason);
    setReportedQuantity('');
    setDelayReason('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          📝 工单报工
        </h3>

        <div className="bg-blue-50 p-3 rounded mb-4 text-sm">
          <div className="font-medium text-blue-800">工单信息：</div>
          <div className="text-blue-700">
            <div>工单号：{order.orderNo}</div>
            <div>物料：{order.materialName}</div>
            <div>报工日期：{date}</div>
            <div>计划数量：{order.quantity}</div>
            <div>总已报工：{order.reportedQuantity || 0}</div>
            <div>当日已报工：{order.dailyReports && order.dailyReports[date] ? order.dailyReports[date] : 0}</div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              当日报工数量
            </label>
            <input
              type="number"
              value={reportedQuantity}
              onChange={(e) => setReportedQuantity(e.target.value)}
              min="0"
              max={order.quantity}
              className="w-full p-2 border rounded"
              placeholder="输入当日完成数量"
            />
          </div>

          {isDelayed && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                延期原因
              </label>
              <textarea
                value={delayReason}
                onChange={(e) => setDelayReason(e.target.value)}
                className="w-full p-2 border rounded h-20"
                placeholder="请说明延期原因..."
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            📝 确认报工
          </button>
        </div>
      </div>
    </div>
  );
};

// 物料弹窗
export const MaterialModal = ({
  show,
  materialData,
  onMaterialChange,
  onConfirm,
  onClose,
  isEdit = false
}) => {
  if (!show) return null;

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96">
        <h3 className="text-lg font-semibold mb-4">
          {isEdit ? '编辑物料' : '添加物料'}
        </h3>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="种类"
            value={materialData.category}
            onChange={(e) => onMaterialChange({ ...materialData, category: e.target.value })}
            className="w-full p-2 border rounded"
          />
          <input
            type="text"
            placeholder="特征"
            value={materialData.feature}
            onChange={(e) => onMaterialChange({ ...materialData, feature: e.target.value })}
            className="w-full p-2 border rounded"
          />
          <input
            type="text"
            placeholder="型号/厚度"
            value={materialData.modelThickness}
            onChange={(e) => onMaterialChange({ ...materialData, modelThickness: e.target.value })}
            className="w-full p-2 border rounded"
          />
          <input
            type="number"
            placeholder="实际节拍(秒/件)"
            value={materialData.actualTakt}
            onChange={(e) => onMaterialChange({ ...materialData, actualTakt: e.target.value })}
            className="w-full p-2 border rounded"
          />
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {isEdit ? '保存' : '添加'}
          </button>
        </div>
      </div>
    </div>
  );
};

// 工单结束模态框
export const FinishOrderModal = ({ show, order, onConfirm, onClose }) => {
  const [actualEndDate, setActualEndDate] = useState('');
  const [totalReportedQuantity, setTotalReportedQuantity] = useState(0);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    if (show && order) {
      // 默认设置为今天
      const today = new Date().toISOString().split('T')[0];
      setActualEndDate(today);

      // 设置当前已报工数量
      setTotalReportedQuantity(order.reportedQuantity || 0);
      setErrors([]);
    }
  }, [show, order]);

  const validateAndSubmit = () => {
    const newErrors = [];

    if (!actualEndDate) {
      newErrors.push('请选择实际结束日期');
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    // 确定工单状态
    const expectedEnd = new Date(order.expectedEndDate);
    const actualEnd = new Date(actualEndDate);
    const status = actualEnd > expectedEnd ? '延期完成' : '正常完成';

    onConfirm({
      actualEndDate,
      reportedQuantity: totalReportedQuantity,
      status
    });
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96 max-h-96 overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          ✅ 结束工单
        </h3>

        <div className="bg-blue-50 p-3 rounded mb-4 text-sm">
          <div className="font-medium text-blue-800">工单信息：</div>
          <div className="text-blue-700">
            <div>工单号：{order?.orderNo}</div>
            <div>物料：{order?.materialName}</div>
            <div>数量：{order?.quantity}</div>
            <div>计划：{order?.startDate} 至 {order?.expectedEndDate}</div>
          </div>
        </div>

        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 p-3 rounded mb-4">
            {errors.map((error, index) => (
              <div key={index} className="text-red-600 text-sm">{error}</div>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              实际结束日期
            </label>
            <input
              type="date"
              value={actualEndDate}
              onChange={(e) => setActualEndDate(e.target.value)}
              min={order?.startDate}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              总报工数量
            </label>
            <input
              type="number"
              value={totalReportedQuantity}
              onChange={(e) => {
                setTotalReportedQuantity(parseInt(e.target.value) || 0);
                setErrors([]); // 清除错误信息
              }}
              min="0"
              className="w-full p-2 border rounded"
              placeholder={`计划数量: ${order?.quantity}（可多做或少做）`}
            />
            <div className="text-xs text-gray-500 mt-1">
              计划数量: {order?.quantity}，实际可以多做或少做
            </div>
          </div>
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={validateAndSubmit}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            确认结束
          </button>
        </div>
      </div>
    </div>
  );
};

// 延期预计结束日期模态框
export const DelayOrderModal = ({ show, order, onConfirm, onClose }) => {
  const [delayedExpectedEndDate, setDelayedExpectedEndDate] = useState('');
  const [delayReason, setDelayReason] = useState('');

  useEffect(() => {
    if (show && order) {
      setDelayedExpectedEndDate(order.delayedExpectedEndDate || '');
      setDelayReason(order.delayReason || '');
    }
  }, [show, order]);

  const handleConfirm = () => {
    if (!delayedExpectedEndDate) {
      alert('请选择延期预计结束日期');
      return;
    }

    onConfirm({
      delayedExpectedEndDate,
      delayReason,
      status: '延期生产中'
    });
  };

  const handleCancelDelay = () => {
    onConfirm({
      delayedExpectedEndDate: null,
      delayReason: '',
      status: '生产中'
    });
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          ⏰ 设置延期预计结束日期
        </h3>

        <div className="bg-blue-50 p-3 rounded mb-4 text-sm">
          <div className="font-medium text-blue-800">工单信息：</div>
          <div className="text-blue-700">
            <div>工单号：{order?.orderNo}</div>
            <div>物料：{order?.materialName}</div>
            <div>原预计结束：{order?.expectedEndDate}</div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              延期预计结束日期
            </label>
            <input
              type="date"
              value={delayedExpectedEndDate}
              onChange={(e) => setDelayedExpectedEndDate(e.target.value)}
              min={order?.expectedEndDate}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              延期原因
            </label>
            <textarea
              value={delayReason}
              onChange={(e) => setDelayReason(e.target.value)}
              className="w-full p-2 border rounded h-20"
              placeholder="请说明延期原因..."
            />
          </div>
        </div>

        <div className="flex space-x-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            取消
          </button>
          {order?.delayedExpectedEndDate && (
            <button
              onClick={handleCancelDelay}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              取消延期
            </button>
          )}
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            确认延期
          </button>
        </div>
      </div>
    </div>
  );
};

// 下达工单模态框
export const SubmitWorkOrderModal = ({
  show,
  order,
  machines,
  loading,
  onSubmit,
  onClose
}) => {
  const [formData, setFormData] = useState({
    orderId: '',
    materialId: '',
    nextmaterialId: '',
    quantity: '',
    equipment: '',
    priority: '',
    radio: 0
  });

  // 当order变化时，自动填充表单
  React.useEffect(() => {
    if (order) {
      const machine = machines.find(m => m.name === order.machine);
      setFormData({
        orderId: order.orderNo || '',
        materialId: order.orderComponent || '', // 工单组件自动带入物料编码
        nextmaterialId: order.materialNo || '', // 物料号自动带入产成品编码
        quantity: order.quantity || '',
        equipment: machine?.lineCode || '',
        priority: order.priority || '',
        radio: 0
      });
    }
  }, [order, machines]);

  const handleSubmit = () => {
    // 验证必填字段
    if (!formData.orderId) {
      alert('请填写工单编号');
      return;
    }
    if (!formData.materialId) {
      alert('请填写物料编码（来源：工单组件字段）');
      return;
    }
    if (!formData.nextmaterialId) {
      alert('请填写产成品编码（来源：物料号字段）');
      return;
    }

    onSubmit(formData);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96">
        <h3 className="text-lg font-semibold mb-4">下达工单</h3>

        <div className="bg-blue-50 p-3 rounded mb-4 text-sm">
          <div className="font-medium text-blue-800">工单信息：</div>
          <div className="text-blue-700">
            <div>工单号：{order?.orderNo}</div>
            <div>物料名称：{order?.materialName}</div>
            <div>工单组件：{order?.orderComponent || '未设置'}</div>
            <div>物料号：{order?.materialNo || '未设置'}</div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">工单编号</label>
            <input
              type="text"
              placeholder="请输入"
              value={formData.orderId}
              onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">物料编码</label>
            <input
              type="text"
              placeholder="自动带入工单组件"
              value={formData.materialId}
              onChange={(e) => setFormData({ ...formData, materialId: e.target.value })}
              className="w-full p-2 border rounded bg-gray-50"
              title="来源：工单组件字段"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">产成品编码</label>
            <input
              type="text"
              placeholder="自动带入物料号"
              value={formData.nextmaterialId}
              onChange={(e) => setFormData({ ...formData, nextmaterialId: e.target.value })}
              className="w-full p-2 border rounded bg-gray-50"
              title="来源：物料号字段"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">产成品数量</label>
            <input
              type="number"
              placeholder="请输入"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || '' })}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">产线代号</label>
            <input
              type="text"
              placeholder="请输入"
              value={formData.equipment}
              onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
            <input
              type="number"
              placeholder="请输入"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || '' })}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? '下达中...' : '下达'}
          </button>
        </div>
      </div>
    </div>
  );
};
