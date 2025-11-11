import React, { useMemo } from 'react';
import { FileText, Activity, CheckCircle, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';

const KPICard = ({ title, value, subtitle, icon: Icon, gradient, trend }) => (
  <div className={`${gradient} rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-2xl`}>
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium opacity-90">{title}</p>
        <h3 className="text-4xl font-bold mt-2 mb-2">{value}</h3>
        {subtitle && (
          <div className="flex items-center text-sm opacity-90">
            {trend && (
              trend.direction === 'up' ? (
                <TrendingUp className="w-4 h-4 mr-1" />
              ) : trend.direction === 'down' ? (
                <TrendingDown className="w-4 h-4 mr-1" />
              ) : null
            )}
            <span>{subtitle}</span>
          </div>
        )}
      </div>
      <div className="bg-white bg-opacity-20 rounded-xl p-4 backdrop-blur-sm">
        <Icon className="w-10 h-10" />
      </div>
    </div>
  </div>
);

const KPICards = ({ orders = [], machines = [] }) => {
  const stats = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 当前工单（未完成）
    const activeOrders = orders.filter(order => !order.actualEndDate);
    
    // 生产中的工单
    const inProductionOrders = activeOrders.filter(order => 
      order.status === '生产中' || order.status === '延期生产中' || order.status === '紧急生产'
    ).filter(order => !order.isPaused);

    // 今天完成的工单
    const todayCompleted = orders.filter(order => 
      order.actualEndDate && order.actualEndDate.startsWith(today)
    );

    // 昨天完成的工单
    const yesterdayCompleted = orders.filter(order => 
      order.actualEndDate && order.actualEndDate.startsWith(yesterday)
    );

    // 延期工单（预计结束日期已过但未完成）
    const delayedOrders = activeOrders.filter(order => {
      if (!order.expectedEndDate) return false;
      const expectedEnd = new Date(order.expectedEndDate);
      expectedEnd.setHours(23, 59, 59, 999);
      return expectedEnd < now;
    });

    // 生产中工单的平均完成度
    const totalCompletion = inProductionOrders.reduce((sum, order) => {
      const completion = order.reportedQuantity && order.quantity 
        ? (order.reportedQuantity / order.quantity) * 100 
        : 0;
      return sum + completion;
    }, 0);
    const avgCompletion = inProductionOrders.length > 0 
      ? (totalCompletion / inProductionOrders.length).toFixed(1) 
      : 0;

    // 较昨日变化
    const todayIncrease = activeOrders.length - (activeOrders.length - todayCompleted.length + yesterdayCompleted.length);

    return {
      activeOrders: activeOrders.length,
      inProduction: inProductionOrders.length,
      todayCompleted: todayCompleted.length,
      delayedOrders: delayedOrders.length,
      avgCompletion,
      todayIncrease,
      yesterdayCompleted: yesterdayCompleted.length
    };
  }, [orders]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* 当前工单 */}
      <KPICard
        title="当前工单"
        value={stats.activeOrders}
        subtitle={
          stats.todayIncrease !== 0
            ? `${stats.todayIncrease > 0 ? '↑' : '↓'} 较昨日 ${Math.abs(stats.todayIncrease)}`
            : '与昨日持平'
        }
        icon={FileText}
        gradient="bg-gradient-to-br from-blue-500 to-blue-600"
        trend={stats.todayIncrease > 0 ? { direction: 'up' } : stats.todayIncrease < 0 ? { direction: 'down' } : null}
      />

      {/* 生产中 */}
      <KPICard
        title="生产中"
        value={stats.inProduction}
        subtitle={`平均完成度 ${stats.avgCompletion}%`}
        icon={Activity}
        gradient="bg-gradient-to-br from-green-500 to-green-600"
      />

      {/* 今日完成 */}
      <KPICard
        title="今日完成"
        value={stats.todayCompleted}
        subtitle={
          stats.yesterdayCompleted > 0
            ? `昨日 ${stats.yesterdayCompleted}个`
            : '昨日未完成工单'
        }
        icon={CheckCircle}
        gradient="bg-gradient-to-br from-purple-500 to-purple-600"
      />

      {/* 延期预警 */}
      <KPICard
        title="延期预警"
        value={stats.delayedOrders}
        subtitle={stats.delayedOrders > 0 ? '需立即处理' : '无延期工单'}
        icon={AlertCircle}
        gradient={
          stats.delayedOrders > 0
            ? "bg-gradient-to-br from-red-500 to-red-600"
            : "bg-gradient-to-br from-gray-400 to-gray-500"
        }
      />
    </div>
  );
};

export default KPICards;

