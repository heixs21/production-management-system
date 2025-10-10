// API服务层 - 连接后端数据库
// 根据环境自动选择API地址
const getApiBaseUrl = () => {
  // 如果是开发环境或本地访问
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:12454/api';
  }
  
  // 生产环境，使用当前主机名
  return `http://${window.location.hostname}:12454/api`;
};

const API_BASE_URL = getApiBaseUrl();

console.log('API Base URL:', API_BASE_URL); // 调试信息

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
      // 如果是401或403错误，清理本地存储并重定向到登录页
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('selectedCompany');
        window.location.href = '/login';
        return;
      }
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
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
  // 用户登录（不使用通用请求函数，避免自动重定向）
  login: async (credentials) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = '登录失败';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      return await response.json();
    } catch (error) {
      throw error;
    }
  },
  
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
