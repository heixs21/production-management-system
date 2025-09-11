// 导出Excel工具函数
export const exportToExcel = (data, filename) => {
  // 创建CSV格式的数据
  const csvContent = convertToCSV(data);
  
  // 创建Blob对象
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // 创建下载链接
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// 转换为CSV格式
const convertToCSV = (data) => {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      // 处理包含逗号或引号的值
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value || '';
    }).join(',');
  });
  
  return [csvHeaders, ...csvRows].join('\n');
};

// 导出工单数据为XLSX格式
export const exportOrdersToExcel = async (orders) => {
  try {
    // 动态导入xlsx库
    const XLSX = await import('xlsx');

    const exportData = orders.map(order => ({
      '工单号': order.orderNo,
      '机台': order.machine,
      '物料编号': order.materialNo,
      '物料名称': order.materialName,
      '工单组件': order.orderComponent || '',
      '数量': order.quantity,
      '优先度': order.isUrgent ? '紧急' : order.priority,
      '开始日期': order.startDate,
      '预计结束日期': order.expectedEndDate,
      '实际结束日期': order.actualEndDate || '',
      '报工数量': order.reportedQuantity || 0,
      '工单状态': order.status,
      '延期原因': order.delayReason || ''
    }));

    // 创建工作簿
    const wb = XLSX.utils.book_new();

    // 创建工作表
    const ws = XLSX.utils.json_to_sheet(exportData);

    // 设置列宽
    const colWidths = [
      { wch: 15 }, // 工单号
      { wch: 10 }, // 机台
      { wch: 15 }, // 物料编号
      { wch: 20 }, // 物料名称
      { wch: 15 }, // 工单组件
      { wch: 8 },  // 数量
      { wch: 8 },  // 优先度
      { wch: 12 }, // 开始日期
      { wch: 12 }, // 预计结束日期
      { wch: 12 }, // 实际结束日期
      { wch: 10 }, // 报工数量
      { wch: 10 }, // 工单状态
      { wch: 20 }  // 延期原因
    ];
    ws['!cols'] = colWidths;

    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(wb, ws, '工单数据');

    // 生成文件名
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const fileName = `工单数据_${timestamp}.xlsx`;

    // 导出文件
    XLSX.writeFile(wb, fileName);

  } catch (error) {
    console.error('导出Excel失败:', error);
    alert('导出Excel失败，请确保网络连接正常');
  }
};

// 导出甘特图为图片 - 最简单直接的方法
export const exportGanttChart = async () => {
  try {
    // 查找甘特图容器
    const ganttContainer = document.querySelector('.gantt-chart-container');
    if (!ganttContainer) {
      alert('未找到甘特图');
      return;
    }

    // 临时移除滚动条和高度限制
    const ganttContent = ganttContainer.querySelector('.gantt-content');
    const originalStyles = {};

    if (ganttContent) {
      originalStyles.maxHeight = ganttContent.style.maxHeight;
      originalStyles.overflow = ganttContent.style.overflow;
      ganttContent.style.maxHeight = 'none';
      ganttContent.style.overflow = 'visible';
    }

    // 等待DOM更新
    await new Promise(resolve => setTimeout(resolve, 200));

    // 动态导入html2canvas
    const html2canvas = (await import('html2canvas')).default;

    // 截图
    const canvas = await html2canvas(ganttContainer, {
      backgroundColor: '#ffffff',
      scale: 1,
      useCORS: true,
      allowTaint: true,
      logging: false,
      width: ganttContainer.scrollWidth,
      height: ganttContainer.scrollHeight,
      scrollX: 0,
      scrollY: 0
    });

    // 恢复原始样式
    if (ganttContent) {
      ganttContent.style.maxHeight = originalStyles.maxHeight || '';
      ganttContent.style.overflow = originalStyles.overflow || '';
    }

    // 下载图片
    const link = document.createElement('a');
    link.download = `甘特图_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

  } catch (error) {
    console.error('导出失败:', error);
    alert('导出失败，请重试');
  }
};

// 导出物料数据
export const exportMaterialsToExcel = (materials) => {
  const exportData = materials.map(material => ({
    '种类': material.category,
    '特征': material.feature,
    '型号/厚度': material.modelThickness,
    '实际节拍(秒/件)': material.actualTakt
  }));
  
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  exportToExcel(exportData, `物料节拍表_${timestamp}.csv`);
};

// 导出机台数据
export const exportMachinesToExcel = (machines) => {
  const exportData = machines.map(machine => ({
    '机台编号': machine.name,
    '状态': machine.status,
    'OEE': machine.oee ? (machine.oee * 100).toFixed(1) + '%' : '未设置'
  }));
  
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  exportToExcel(exportData, `机台数据_${timestamp}.csv`);
};
