// API服务层 - 连接后端数据库
const API_BASE_URL = `http://${window.location.hostname}:12454/api`;

// 通用请求函数
const apiRequest = async (url, options = {}) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API请求失败:', error);
    throw error;
  }
};

// 机台API
export const machineApi = {
  // 获取所有机台
  getAll: () => apiRequest('/machines'),
  
  // 添加机台
  create: (machine) => apiRequest('/machines', {
    method: 'POST',
    body: JSON.stringify(machine),
  }),
  
  // 更新机台
  update: (id, machine) => apiRequest(`/machines/${id}`, {
    method: 'PUT',
    body: JSON.stringify(machine),
  }),
  
  // 删除机台
  delete: (id) => apiRequest(`/machines/${id}`, {
    method: 'DELETE',
  }),
};

// 工单API
export const orderApi = {
  // 获取所有工单
  getAll: () => apiRequest('/orders'),
  
  // 添加工单
  create: (order) => apiRequest('/orders', {
    method: 'POST',
    body: JSON.stringify(order),
  }),
  
  // 更新工单
  update: (id, order) => apiRequest(`/orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(order),
  }),
  
  // 删除工单
  delete: (id) => apiRequest(`/orders/${id}`, {
    method: 'DELETE',
  }),
};

// 物料API
export const materialApi = {
  // 获取所有物料
  getAll: () => apiRequest('/materials'),

  // 添加物料
  create: (material) => apiRequest('/materials', {
    method: 'POST',
    body: JSON.stringify(material),
  }),

  // 更新物料
  update: (id, material) => apiRequest(`/materials/${id}`, {
    method: 'PUT',
    body: JSON.stringify(material),
  }),

  // 删除物料
  delete: (id) => apiRequest(`/materials/${id}`, {
    method: 'DELETE',
  }),
};

// 下达工单API
export const workOrderApi = {
  // 下达工单到MES系统（通过我们的后端代理）
  submit: (workOrderData) => apiRequest('/mes/workOrder', {
    method: 'POST',
    body: JSON.stringify(workOrderData),
  })
};

// 认证API
export const authApi = {
  // 用户登录
  login: (credentials) => apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  
  // 验证token
  verify: () => apiRequest('/auth/verify'),
  
  // 获取用户信息
  getProfile: () => apiRequest('/auth/profile'),
};

// 用户管理API
export const userApi = {
  // 获取所有用户
  getAll: () => apiRequest('/users'),
  
  // 创建用户
  create: (user) => apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify(user),
  }),
  
  // 更新用户
  update: (id, user) => apiRequest(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(user),
  }),
  
  // 删除用户
  delete: (id) => apiRequest(`/users/${id}`, {
    method: 'DELETE',
  }),
};
