import React from 'react';

// 基础骨架屏组件
export const Skeleton = ({ width = '100%', height = '20px', className = '', rounded = 'rounded' }) => (
  <div
    className={`animate-pulse bg-gray-200 ${rounded} ${className}`}
    style={{ width, height }}
  />
);

// KPI卡片骨架屏
export const KPICardSkeleton = () => (
  <div className="bg-white rounded-xl shadow-lg p-6">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <Skeleton width="60%" height="16px" className="mb-3" />
        <Skeleton width="40%" height="32px" className="mb-2" />
        <Skeleton width="50%" height="12px" />
      </div>
      <Skeleton width="48px" height="48px" rounded="rounded-lg" />
    </div>
  </div>
);

// 表格骨架屏
export const TableSkeleton = ({ rows = 5, columns = 6 }) => (
  <div className="bg-white rounded-xl shadow-lg overflow-hidden">
    {/* 表头 */}
    <div className="bg-gray-50 p-4 border-b">
      <div className="flex items-center justify-between mb-4">
        <Skeleton width="150px" height="24px" />
        <div className="flex space-x-2">
          <Skeleton width="100px" height="36px" rounded="rounded-lg" />
          <Skeleton width="100px" height="36px" rounded="rounded-lg" />
        </div>
      </div>
    </div>

    {/* 表格内容 */}
    <div className="p-4">
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center space-x-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={colIndex} className="flex-1">
                <Skeleton height="40px" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
);

// 甘特图骨架屏
export const GanttChartSkeleton = () => (
  <div className="bg-white rounded-xl shadow-lg p-6">
    <div className="flex items-center justify-between mb-4">
      <Skeleton width="150px" height="24px" />
      <div className="flex space-x-2">
        <Skeleton width="100px" height="36px" rounded="rounded-lg" />
        <Skeleton width="100px" height="36px" rounded="rounded-lg" />
      </div>
    </div>

    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center space-x-2">
          <Skeleton width="100px" height="60px" />
          <div className="flex-1 flex space-x-1">
            {Array.from({ length: 15 }).map((_, cellIndex) => (
              <Skeleton key={cellIndex} width="60px" height="60px" />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// 工单管理页面骨架屏
export const OrderManagementSkeleton = () => (
  <div className="space-y-6">
    {/* KPI卡片 */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <KPICardSkeleton key={index} />
      ))}
    </div>

    {/* 表格 */}
    <TableSkeleton />

    {/* 甘特图 */}
    <GanttChartSkeleton />
  </div>
);

// 卡片列表骨架屏
export const CardListSkeleton = ({ count = 6 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between mb-3">
          <Skeleton width="40%" height="20px" />
          <Skeleton width="60px" height="24px" rounded="rounded-full" />
        </div>
        <div className="space-y-2 mb-3">
          <Skeleton width="100%" height="16px" />
          <Skeleton width="80%" height="16px" />
          <Skeleton width="60%" height="16px" />
        </div>
        <Skeleton width="100%" height="8px" className="mb-2" rounded="rounded-full" />
        <div className="flex space-x-2">
          <Skeleton width="50%" height="36px" rounded="rounded-lg" />
          <Skeleton width="50%" height="36px" rounded="rounded-lg" />
        </div>
      </div>
    ))}
  </div>
);

export default Skeleton;

