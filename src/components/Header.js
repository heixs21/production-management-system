import React from 'react';
import { Calendar, Plus, Upload } from 'lucide-react';

const Header = ({
  onShowMachineForm,
  onShowPasteDialog,
  onShowAddForm,
  onShowUrgentForm,
  onRefreshToken,
  tokenRefreshing
}) => {
  return (
    <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Calendar className="w-6 h-6" />
        生产甘特图管理系统
      </h1>
      <div className="flex gap-2">
        <button
          onClick={onRefreshToken}
          disabled={tokenRefreshing}
          className="bg-green-600 hover:bg-green-500 px-3 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:bg-gray-500"
          title="刷新MES系统Token"
        >
          🔄
          {tokenRefreshing ? '刷新中...' : 'Token'}
        </button>
        <button
          onClick={onShowMachineForm}
          className="bg-purple-500 hover:bg-purple-400 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          管理机台
        </button>
        <button
          onClick={onShowPasteDialog}
          className="bg-green-500 hover:bg-green-400 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Upload className="w-4 h-4" />
          粘贴Excel数据
        </button>
        <button
          onClick={onShowUrgentForm}
          className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors border-2 border-red-300"
        >
          🚨
          紧急插单
        </button>
        <button
          onClick={onShowAddForm}
          className="bg-blue-500 hover:bg-blue-400 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          添加工单
        </button>
      </div>
    </div>
  );
};

export default Header;
