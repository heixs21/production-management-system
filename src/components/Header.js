import React from 'react';
import { Calendar, Plus, Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getCompanyConfig } from '../config/companies';

const Header = ({
  onShowPasteDialog,
  onShowAddForm,
  onShowUrgentForm,
  canImport = true,
  canCreate = true,
  canUrgent = true
}) => {
  const { user } = useAuth();
  const companyConfig = getCompanyConfig(user?.companyId);
  return (
    <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Calendar className="w-6 h-6" />
{companyConfig.name}生产管理系统
      </h1>
      <div className="flex gap-2">
        {canImport && onShowPasteDialog && (
          <button
            onClick={onShowPasteDialog}
            className="bg-green-500 hover:bg-green-400 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Upload className="w-4 h-4" />
            粘贴Excel数据
          </button>
        )}
        {canUrgent && onShowUrgentForm && (
          <button
            onClick={onShowUrgentForm}
            className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors border-2 border-red-300"
          >
            🚨
            紧急插单
          </button>
        )}
        {canCreate && onShowAddForm && (
          <button
            onClick={onShowAddForm}
            className="bg-blue-500 hover:bg-blue-400 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加工单
          </button>
        )}
      </div>
    </div>
  );
};

export default Header;
