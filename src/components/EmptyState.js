import React from 'react';
import { Inbox, FileText, Package, AlertCircle } from 'lucide-react';

const EmptyState = ({ 
  icon, 
  title, 
  description, 
  action,
  variant = 'default' 
}) => {
  const variants = {
    default: {
      bgColor: 'bg-gray-100',
      iconColor: 'text-gray-400',
      titleColor: 'text-gray-900',
      descColor: 'text-gray-500'
    },
    orders: {
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-400',
      titleColor: 'text-blue-900',
      descColor: 'text-blue-600'
    },
    materials: {
      bgColor: 'bg-green-100',
      iconColor: 'text-green-400',
      titleColor: 'text-green-900',
      descColor: 'text-green-600'
    },
    warning: {
      bgColor: 'bg-yellow-100',
      iconColor: 'text-yellow-400',
      titleColor: 'text-yellow-900',
      descColor: 'text-yellow-600'
    },
    error: {
      bgColor: 'bg-red-100',
      iconColor: 'text-red-400',
      titleColor: 'text-red-900',
      descColor: 'text-red-600'
    }
  };

  const colors = variants[variant] || variants.default;
  const IconComponent = icon || Inbox;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className={`w-32 h-32 ${colors.bgColor} rounded-full flex items-center justify-center mb-6 transform transition-all duration-300 hover:scale-110`}>
        <IconComponent className={`w-16 h-16 ${colors.iconColor}`} />
      </div>
      
      <h3 className={`text-xl font-semibold ${colors.titleColor} mb-3 text-center`}>
        {title}
      </h3>
      
      <p className={`text-sm ${colors.descColor} text-center max-w-md mb-8 leading-relaxed`}>
        {description}
      </p>
      
      {action && (
        <button
          onClick={action.onClick}
          className={`px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg 
                     hover:from-blue-700 hover:to-blue-800 transition-all duration-200 
                     transform hover:scale-105 shadow-lg hover:shadow-xl
                     flex items-center space-x-2 font-medium`}
        >
          {action.icon && <span>{action.icon}</span>}
          <span>{action.label}</span>
        </button>
      )}
    </div>
  );
};

// 预定义的空状态组件
export const OrdersEmptyState = ({ onCreateOrder }) => (
  <EmptyState
    icon={FileText}
    title="暂无工单"
    description="还没有任何工单记录。点击下方按钮创建第一个工单，开始管理您的生产流程。"
    variant="orders"
    action={onCreateOrder && {
      label: '创建第一个工单',
      onClick: onCreateOrder,
      icon: '➕'
    }}
  />
);

export const MaterialsEmptyState = ({ onCreateMaterial }) => (
  <EmptyState
    icon={Package}
    title="暂无物料"
    description="物料库为空。添加物料信息以便更好地管理生产节拍和工艺参数。"
    variant="materials"
    action={onCreateMaterial && {
      label: '添加物料',
      onClick: onCreateMaterial,
      icon: '➕'
    }}
  />
);

export const SearchEmptyState = ({ searchTerm }) => (
  <EmptyState
    icon={AlertCircle}
    title="未找到匹配结果"
    description={`没有找到与"${searchTerm}"相关的记录。请尝试使用其他关键词搜索。`}
    variant="warning"
  />
);

export const FilterEmptyState = ({ onClearFilters }) => (
  <EmptyState
    icon={AlertCircle}
    title="无匹配数据"
    description="当前筛选条件下没有找到任何记录。请调整筛选条件或清除筛选以查看所有数据。"
    variant="default"
    action={onClearFilters && {
      label: '清除筛选',
      onClick: onClearFilters
    }}
  />
);

export const ErrorEmptyState = ({ message, onRetry }) => (
  <EmptyState
    icon={AlertCircle}
    title="加载失败"
    description={message || '数据加载失败，请检查网络连接后重试。'}
    variant="error"
    action={onRetry && {
      label: '重新加载',
      onClick: onRetry,
      icon: '🔄'
    }}
  />
);

export default EmptyState;

