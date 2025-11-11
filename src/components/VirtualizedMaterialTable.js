import React, { memo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';

/**
 * 虚拟滚动物料表格组件
 */
const VirtualizedMaterialTable = memo(({ 
  materials, 
  onEditMaterial, 
  onDeleteMaterial
}) => {
  const ROW_HEIGHT = 48; // 每行高度
  const HEADER_HEIGHT = 44; // 表头高度
  const TABLE_HEIGHT = Math.min(materials.length * ROW_HEIGHT + HEADER_HEIGHT, 500); // 最大高度500px

  // 渲染单行物料
  const Row = useCallback(({ index, style }) => {
    const material = materials[index];

    return (
      <div 
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb',
          padding: '0 16px'
        }}
        className="hover:bg-blue-50 transition-colors"
      >
        {/* 序号 */}
        <div className="w-16 flex-shrink-0 text-gray-600">
          {index + 1}
        </div>

        {/* 种类 */}
        <div className="w-40 flex-shrink-0 truncate" title={material.category}>
          {material.category}
        </div>

        {/* 特征 */}
        <div className="w-48 flex-shrink-0 truncate" title={material.feature}>
          {material.feature || '-'}
        </div>

        {/* 型号/厚度 */}
        <div className="w-40 flex-shrink-0 truncate" title={material.modelThickness}>
          {material.modelThickness || '-'}
        </div>

        {/* 实际节拍(秒) */}
        <div className="w-32 flex-shrink-0 text-center">
          <span className="font-mono font-semibold text-blue-600">
            {material.actualTakt || 0}
          </span>
          <span className="text-xs text-gray-500 ml-1">秒</span>
        </div>

        {/* 操作按钮 */}
        <div className="flex-1 flex justify-end gap-2">
          <button
            onClick={() => onEditMaterial(material)}
            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            编辑
          </button>
          
          <button
            onClick={() => onDeleteMaterial(material.id)}
            className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            删除
          </button>
        </div>
      </div>
    );
  }, [materials, onEditMaterial, onDeleteMaterial]);

  if (materials.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        暂无物料数据
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden shadow-sm">
      {/* 表头 */}
      <div 
        className="flex items-center bg-gradient-to-r from-gray-100 to-gray-200 border-b font-semibold text-sm"
        style={{ height: HEADER_HEIGHT, padding: '0 16px' }}
      >
        <div className="w-16 flex-shrink-0">序号</div>
        <div className="w-40 flex-shrink-0">种类</div>
        <div className="w-48 flex-shrink-0">特征</div>
        <div className="w-40 flex-shrink-0">型号/厚度</div>
        <div className="w-32 flex-shrink-0 text-center">实际节拍</div>
        <div className="flex-1 text-right">操作</div>
      </div>

      {/* 虚拟滚动列表 */}
      <List
        height={TABLE_HEIGHT - HEADER_HEIGHT}
        itemCount={materials.length}
        itemSize={ROW_HEIGHT}
        width="100%"
      >
        {Row}
      </List>

      {/* 底部统计 */}
      <div className="bg-gray-50 border-t px-4 py-2 text-sm text-gray-600 flex justify-between">
        <span>共 {materials.length} 条物料数据</span>
        <span>
          平均节拍: {materials.length > 0 
            ? (materials.reduce((sum, m) => sum + (m.actualTakt || 0), 0) / materials.length).toFixed(1) 
            : 0} 秒
        </span>
      </div>
    </div>
  );
});

VirtualizedMaterialTable.displayName = 'VirtualizedMaterialTable';

export default VirtualizedMaterialTable;

