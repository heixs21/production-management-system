// 物料节拍识别和生产时间计算工具

// 物料节拍表 - 根据您的实际数据配置
const MATERIAL_TAKT_TABLE = {
  // 内外板类型 - 只有圆孔和扁孔
  '内外板': {
    '圆孔': {
      '6': 16,   // 6mm厚度，16秒节拍
      '8': 16,   // 8mm厚度，16秒节拍
      '10': 19,  // 10mm厚度，19秒节拍
      '12': 22,  // 12mm厚度，22秒节拍
      '14': 26,  // 14mm厚度，26秒节拍
      '16': 30   // 16mm厚度，30秒节拍
    },
    '扁孔': {
      '6': 14,
      '8': 14,
      '10': 17,
      '12': 20,
      '14': 24,
      '16': 28
    }
  },
  // 套筒类型
  '套筒': {
    '20-30': {
      '无需无孔': 85
    },
    '30-40': {
      '无需无孔': 90
    },
    '40-50': {
      '无需无孔': 100
    },
    '50-58': {
      '无需无孔': 115
    }
  },
  // 滚子类型
  '滚子': {
    '0-20': {
      '无需无孔': 68
    },
    '20-30': {
      '无需无孔': 82
    },
    '30-40': {
      '无需无孔': 95
    },
    '40-50': {
      '无需无孔': 105
    },
    '50-58': {
      '无需无孔': 113
    }
  },
  // 销轴类型
  '销轴': {
    '0-20': {
      '无需无孔': 22
    },
    '20-30': {
      '无需无孔': 24
    },
    '30-40': {
      '无需无孔': 26
    },
    '40-50': {
      '无需无孔': 28
    },
    '50-58': {
      '无需无孔': 34
    }
  },
  // 其他物料类型
  '其他': {
    '默认': {
      '默认': 25
    }
  }
};

// 默认OEE值
const DEFAULT_OEE = 0.85;

/**
 * 识别物料类型
 * @param {string} materialName - 物料名称
 * @returns {string} - 物料类型
 */
export const identifyMaterialType = (materialName) => {
  if (!materialName) return '其他';

  const name = materialName.toLowerCase();

  // 检查是否包含"粗加工"和"链板"
  if (name.includes('粗加工') && name.includes('链板')) {
    return '内外板';
  }

  // 检查是否包含"金加工"和"套筒"
  if (name.includes('金加工') && name.includes('套筒')) {
    return '套筒';
  }

  // 检查是否包含"金加工"和"滚子"
  if (name.includes('金加工') && name.includes('滚子')) {
    return '滚子';
  }

  // 检查是否包含"金加工"和"销轴"
  if (name.includes('金加工') && name.includes('销轴')) {
    return '销轴';
  }

  return '其他';
};

/**
 * 提取套筒滚子型号
 * @param {string} materialName - 物料名称
 * @returns {string} - 型号数字
 */
export const extractRollerModel = (materialName) => {
  if (!materialName) return '';

  // 匹配"金加工 012滚子"、"金加工 042套筒"等模式，提取数字
  const modelMatch = materialName.match(/金加工\s*(\d{3})[滚套]/);

  if (modelMatch && modelMatch[1]) {
    const model = parseInt(modelMatch[1]);
    return model.toString();
  }

  return '';
};

/**
 * 将型号映射到尺寸范围
 * @param {string} model - 型号数字
 * @returns {string} - 尺寸范围
 */
export const mapModelToSizeRange = (model) => {
  if (!model) return '';

  const modelNum = parseInt(model);

  console.log('映射型号到尺寸范围:', {
    型号: model,
    数字: modelNum
  });

  if (modelNum >= 0 && modelNum <= 20) {
    console.log('映射为0-20');
    return '0-20';
  } else if (modelNum > 20 && modelNum <= 30) {
    console.log('映射为20-30');
    return '20-30';
  } else if (modelNum > 30 && modelNum <= 40) {
    console.log('映射为30-40');
    return '30-40';
  } else if (modelNum > 40 && modelNum <= 50) {
    console.log('映射为40-50');
    return '40-50';
  } else if (modelNum > 50 && modelNum <= 60) {
    console.log('映射为50-60');
    return '50-60';
  } else if (modelNum > 60 && modelNum <= 70) {
    console.log('映射为60-70');
    return '60-70';
  } else if (modelNum > 70 && modelNum <= 80) {
    console.log('映射为70-80');
    return '70-80';
  }

  console.log('无法映射尺寸范围');
  return '';
};

/**
 * 识别孔型
 * @param {string} materialName - 物料名称
 * @returns {string} - 孔型（圆孔/扁孔）或空字符串表示需要手动选择
 */
export const identifyHoleType = (materialName) => {
  if (!materialName) return '';

  const name = materialName.toLowerCase();

  // 对于套筒、滚子、销轴，直接返回型号范围
  if (name.includes('金加工') && (name.includes('滚子') || name.includes('套筒') || name.includes('销轴'))) {
    const model = extractRollerModel(materialName);
    const sizeRange = mapModelToSizeRange(model);
    return sizeRange;
  }

  if (name.includes('圆')) {
    return '圆孔';
  } else if (name.includes('扁')) {
    return '扁孔';
  }

  return '';
};

/**
 * 提取厚度信息
 * @param {string} materialName - 物料名称
 * @returns {string} - 厚度值或空字符串表示需要手动选择
 */
export const extractThickness = (materialName) => {
  if (!materialName) return '';

  const name = materialName.toLowerCase();

  // 对于套筒、滚子、销轴，返回无需无孔
  if (name.includes('金加工') && (name.includes('滚子') || name.includes('套筒') || name.includes('销轴'))) {
    return '无需无孔';
  }

  // 匹配类似 "100x12" 的模式，提取第二个数字
  const thicknessMatch = materialName.match(/(\d+)x(\d+)/);

  if (thicknessMatch && thicknessMatch[2]) {
    return thicknessMatch[2];
  }

  return '';
};

/**
 * 获取物料节拍
 * @param {string} materialName - 物料名称
 * @returns {number} - 节拍时间（秒）
 */
export const getMaterialTakt = (materialName) => {
  const materialType = identifyMaterialType(materialName);
  const holeType = identifyHoleType(materialName);
  const thickness = extractThickness(materialName);
  
  const taktTable = MATERIAL_TAKT_TABLE[materialType] || MATERIAL_TAKT_TABLE['其他'];
  const holeTable = taktTable[holeType] || taktTable['默认'] || taktTable[Object.keys(taktTable)[0]];
  const takt = holeTable[thickness] || holeTable['默认'] || 30;
  
  return takt;
};

/**
 * 从机台数据获取OEE
 * @param {string} machineName - 机台名称
 * @param {Array} machines - 机台数据数组
 * @returns {number} - OEE值（0-1之间）
 */
export const getMachineOEEFromData = (machineName, machines) => {
  const machine = machines.find(m => m.name === machineName);
  if (!machine || !machine.oee) {
    return DEFAULT_OEE;
  }

  // 如果OEE已经是小数形式（0-1），直接返回
  // 如果是百分比形式（0-100），转换为小数
  const oee = parseFloat(machine.oee);
  return oee > 1 ? oee / 100 : oee;
};

/**
 * 计算预计生产时间
 * @param {string} materialName - 物料名称
 * @param {number} quantity - 工单数量
 * @param {string} machineName - 机台名称
 * @param {Array} machines - 机台数据数组
 * @returns {object} - 包含详细计算信息的对象
 */
export const calculateEstimatedProductionTime = (materialName, quantity, machineName, machines = []) => {
  const materialType = identifyMaterialType(materialName);
  const holeType = identifyHoleType(materialName);
  const thickness = extractThickness(materialName);
  const takt = getMaterialTakt(materialName);
  const oee = getMachineOEEFromData(machineName, machines);

  // 计算理论生产时间（秒）
  const theoreticalTime = takt * quantity;

  // 考虑OEE的实际生产时间（秒）
  const actualTime = theoreticalTime / oee;

  // 转换为小时
  const hours = actualTime / 3600;

  return {
    materialType,
    holeType,
    thickness: thickness === '无需无孔' ? thickness : thickness + 'mm',
    takt: takt + '秒',
    oee: (oee * 100).toFixed(1) + '%',
    theoreticalTime: Math.round(theoreticalTime),
    actualTime: Math.round(actualTime),
    estimatedHours: hours.toFixed(2),
    estimatedDays: (hours / 16).toFixed(2) // 按16小时工作日计算
  };
};

/**
 * 获取所有可用的物料类型
 * @returns {Array} - 物料类型数组
 */
export const getAvailableMaterialTypes = () => {
  return Object.keys(MATERIAL_TAKT_TABLE);
};

/**
 * 获取指定物料类型的所有孔型
 * @param {string} materialType - 物料类型
 * @returns {Array} - 孔型数组
 */
export const getAvailableHoleTypes = (materialType) => {
  const taktTable = MATERIAL_TAKT_TABLE[materialType];
  return taktTable ? Object.keys(taktTable) : [];
};

/**
 * 获取指定物料类型和孔型的所有厚度
 * @param {string} materialType - 物料类型
 * @param {string} holeType - 孔型
 * @returns {Array} - 厚度数组
 */
export const getAvailableThicknesses = (materialType, holeType) => {
  const taktTable = MATERIAL_TAKT_TABLE[materialType];
  if (!taktTable) return [];

  const holeTable = taktTable[holeType];
  return holeTable ? Object.keys(holeTable) : [];
};

/**
 * 根据选择的参数计算节拍和生产时间
 * @param {string} materialType - 物料类型
 * @param {string} holeType - 孔型
 * @param {string} thickness - 厚度
 * @param {number} quantity - 数量
 * @param {string} machineName - 机台名称
 * @param {Array} machines - 机台数据数组
 * @returns {object} - 计算结果
 */
export const calculateWithCustomParams = (materialType, holeType, thickness, quantity, machineName, machines = []) => {
  // 如果关键参数为空，返回默认值
  if (!materialType || !holeType || !thickness) {
    return {
      takt: 0,
      taktDisplay: '请选择参数',
      oee: (getMachineOEEFromData(machineName, machines) * 100).toFixed(1) + '%',
      theoreticalTime: 0,
      actualTime: 0,
      estimatedHours: '0.00',
      estimatedDays: '0.00'
    };
  }

  const taktTable = MATERIAL_TAKT_TABLE[materialType] || MATERIAL_TAKT_TABLE['其他'];
  const holeTable = taktTable[holeType] || taktTable['默认'] || taktTable[Object.keys(taktTable)[0]];
  const takt = holeTable[thickness] || holeTable['默认'] || 25;

  const oee = getMachineOEEFromData(machineName, machines);

  // 计算理论生产时间（秒）
  const theoreticalTime = takt * quantity;

  // 考虑OEE的实际生产时间（秒）
  const actualTime = theoreticalTime / oee;

  // 转换为小时
  const hours = actualTime / 3600;

  return {
    takt: takt,
    taktDisplay: takt + '秒',
    oee: (oee * 100).toFixed(1) + '%',
    theoreticalTime: Math.round(theoreticalTime),
    actualTime: Math.round(actualTime),
    estimatedHours: hours.toFixed(2),
    estimatedDays: (hours / 16).toFixed(2)
  };
};

/**
 * 格式化生产时间显示
 * @param {number} seconds - 秒数
 * @returns {string} - 格式化的时间字符串
 */
export const formatProductionTime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}小时${minutes}分钟`;
  } else if (minutes > 0) {
    return `${minutes}分钟${remainingSeconds}秒`;
  } else {
    return `${remainingSeconds}秒`;
  }
};
