// 工单相关工具函数

// 计算工单状态
export const calculateOrderStatus = (order, machines) => {
  const machine = machines.find(m => m.name === order.machine);
  const today = new Date();
  const startDate = new Date(order.startDate);
  
  // 设置时间为当天开始，避免时间部分影响比较
  today.setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);

  // 如果工单被手动暂停
  if (order.isPaused) {
    return "暂停中";
  }

  // 如果机台维修中，工单状态为暂停中
  if (machine && machine.status === "维修") {
    return "暂停中";
  }

  // 如果有实际结束日期
  if (order.actualEndDate) {
    // 如果没有预计结束日期，则不能判断延期，直接返回正常完成
    if (!order.expectedEndDate) {
      return "正常完成";
    }
    
    const expectedEnd = new Date(order.expectedEndDate);
    const actualEnd = new Date(order.actualEndDate);

    if (actualEnd > expectedEnd) {
      return "延期完成";
    } else {
      return "正常完成";
    }
  }

  // 如果当前日期早于开始日期，状态为未开始
  if (today < startDate) {
    return "未开始";
  }

  // 紧急工单
  if (order.isUrgent) {
    return "紧急生产";
  }

  // 当前日期在开始日期当天及之后，状态为生产中
  return "生产中";
};

// 获取日期显示格式 (8/30)
export const getDateDisplay = (date) => {
  const dateObj = new Date(date);
  const day = dateObj.getDate();
  const month = dateObj.getMonth() + 1;
  return `${month}/${day}`;
};

// 格式化日期为 YYYY-MM-DD 格式（只显示日期，不显示时间）
export const formatDateOnly = (date) => {
  if (!date) return '';

  // 如果是字符串，先转换为Date对象
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // 检查是否是有效日期
  if (isNaN(dateObj.getTime())) return '';

  // 返回 YYYY-MM-DD 格式
  return dateObj.toISOString().split('T')[0];
};

// 生成日期范围
export const generateDateRange = (orders) => {
  let minDate = null;
  let maxDate = null;

  orders.forEach((order) => {
    const startDate = new Date(order.startDate);
    const endDate = new Date(order.expectedEndDate || order.actualEndDate || order.startDate);

    if (!minDate || startDate < minDate) minDate = startDate;
    if (!maxDate || endDate > maxDate) maxDate = endDate;
  });

  if (!minDate || !maxDate) {
    minDate = new Date("2025-08-28");
    maxDate = new Date("2025-09-05");
  }

  minDate.setDate(minDate.getDate() - 2);
  maxDate.setDate(maxDate.getDate() + 2);

  const dates = [];
  for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
    dates.push(new Date(d).toISOString().split("T")[0]);
  }
  return dates;
};

// 获取指定机台和日期的工单，并按优先级排序
export const getOrdersForMachineAndDate = (orders, machine, date) => {
  const currentDate = new Date(date);

  return orders
    .filter((order) => {
      if (order.machine !== machine) return false;

      const startDate = new Date(order.startDate);
      // 如果没有预计结束日期，使用开始日期作为默认结束日期
      const expectedEndDate = order.expectedEndDate ? new Date(order.expectedEndDate) : new Date(order.startDate);
      const delayedExpectedEndDate = order.delayedExpectedEndDate ? new Date(order.delayedExpectedEndDate) : null;
      const actualEndDate = order.actualEndDate ? new Date(order.actualEndDate) : null;

      // 工单的结束日期优先级：实际结束日期 > 延期预计结束日期 > 原预计结束日期
      const endDate = actualEndDate || delayedExpectedEndDate || expectedEndDate;

      // 检查当前日期是否在工单时间范围内
      return currentDate >= startDate && currentDate <= endDate;
    })
    .sort((a, b) => {
      // 紧急工单优先级最高
      if (a.isUrgent && !b.isUrgent) return -1;
      if (!a.isUrgent && b.isUrgent) return 1;
      return a.priority - b.priority;
    });
};

// 判断当前日期是否在工单的延期部分
export const isDateInDelayedPortion = (order, date) => {
  // 如果没有预计结束日期，不算延期
  if (!order.expectedEndDate) return false;
  
  const currentDate = new Date(date);
  const expectedEndDate = new Date(order.expectedEndDate);

  // 如果工单已完成，检查是否在延期完成的部分
  if (order.actualEndDate) {
    const actualEndDate = new Date(order.actualEndDate);
    return currentDate > expectedEndDate && currentDate <= actualEndDate;
  }

  // 如枟工单还在进行中，检查是否超过了原预计结束日期
  // 或者是否在延期预计结束日期范围内
  if (order.delayedExpectedEndDate) {
    const delayedExpectedEndDate = new Date(order.delayedExpectedEndDate);
    return currentDate > expectedEndDate && currentDate <= delayedExpectedEndDate;
  }

  // 如果没有设置延期预计结束日期，但当前日期超过了原预计结束日期，也算延期
  return currentDate > expectedEndDate;
};

// 计算工单在甘特图中的显示信息
export const getOrderDisplayInfo = (order) => {
  const startDate = new Date(order.startDate);
  // 如果没有预计结束日期，使用开始日期作为默认结束日期
  const expectedEndDate = order.expectedEndDate ? new Date(order.expectedEndDate) : new Date(order.startDate);
  const delayedExpectedEndDate = order.delayedExpectedEndDate ? new Date(order.delayedExpectedEndDate) : null;
  const actualEndDate = order.actualEndDate ? new Date(order.actualEndDate) : null;

  // 确定工单条的结束日期：实际结束日期 > 延期预计结束日期 > 原预计结束日期
  const displayEndDate = actualEndDate || delayedExpectedEndDate || expectedEndDate;

  // 基础颜色
  let baseColor;
  if (order.isPaused) {
    baseColor = 'bg-orange-400';
  } else if (order.isUrgent) {
    baseColor = 'bg-red-600';
  } else {
    baseColor = getPriorityColors()[(order.priority - 1) % getPriorityColors().length];
  }

  // 如果已完成，使用灰色
  if (actualEndDate) {
    baseColor = 'bg-gray-400';
  }

  return {
    startDate: order.startDate,
    endDate: displayEndDate.toISOString().split('T')[0],
    expectedEndDate: order.expectedEndDate,
    delayedExpectedEndDate: order.delayedExpectedEndDate,
    actualEndDate: order.actualEndDate,
    isCompleted: !!actualEndDate,
    isDelayed: actualEndDate && actualEndDate > expectedEndDate,
    isDelayedPlanned: !!delayedExpectedEndDate, // 是否设置了延期预计结束日期
    isPaused: order.isPaused,
    isUrgent: order.isUrgent,
    baseColor: baseColor,
    // 延期的额外信息
    delayedDays: actualEndDate && actualEndDate > expectedEndDate ?
      Math.ceil((actualEndDate - expectedEndDate) / (1000 * 60 * 60 * 24)) : 0
  };
};

// 工单状态颜色配置
export const getStatusColors = () => ({
  "未开始": "text-gray-600 bg-gray-100",
  "生产中": "text-blue-600 bg-blue-100",
  "延期生产中": "text-red-600 bg-red-100",
  "紧急生产": "text-red-600 bg-red-100",
  "正常完成": "text-green-600 bg-green-100",
  "延期完成": "text-red-600 bg-red-100",
  "暂停中": "text-orange-600 bg-orange-100"
});

// 优化的颜色方案 - 更柔和，更易区分
export const getPriorityColors = () => [
  "bg-blue-400",    // P1 - 蓝色
  "bg-green-400",   // P2 - 绿色
  "bg-amber-400",   // P3 - 琥珀色
  "bg-purple-400",  // P4 - 紫色
  "bg-cyan-400",    // P5 - 青色
  "bg-rose-400",    // P6 - 玫瑰色
  "bg-indigo-400",  // P7 - 靛蓝色
  "bg-emerald-400"  // P8 - 翠绿色
];

// 根据工单编号获取一致的颜色组
export const getOrderGroupColor = (orderNo) => {
  const colors = [
    { bg: 'bg-blue-50', border: 'border-blue-300', shadow: 'shadow-blue-200' },
    { bg: 'bg-green-50', border: 'border-green-300', shadow: 'shadow-green-200' },
    { bg: 'bg-amber-50', border: 'border-amber-300', shadow: 'shadow-amber-200' },
    { bg: 'bg-purple-50', border: 'border-purple-300', shadow: 'shadow-purple-200' },
    { bg: 'bg-cyan-50', border: 'border-cyan-300', shadow: 'shadow-cyan-200' },
    { bg: 'bg-rose-50', border: 'border-rose-300', shadow: 'shadow-rose-200' },
  ];

  // 根据工单编号生成一致的颜色
  let hash = 0;
  for (let i = 0; i < orderNo.length; i++) {
    hash = orderNo.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// 机台状态颜色配置
export const getMachineStatusColors = () => ({
  "正常": "text-green-600 bg-green-100",
  "维修": "text-red-600 bg-red-100"
});
