// 错误信息映射
export const ERROR_MESSAGES = {
  // HTTP状态码错误
  400: '请求参数错误',
  401: '用户名或密码错误',
  403: '权限不足，无法访问',
  404: '请求的资源不存在',
  500: '服务器内部错误',
  502: '网关错误',
  503: '服务暂时不可用',
  
  // 网络错误
  'NetworkError': '网络连接失败，请检查网络',
  'TimeoutError': '请求超时，请重试',
  'AbortError': '请求被取消',
  
  // 默认错误
  'default': '操作失败，请重试'
};

export const getErrorMessage = (error) => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error.message) {
    // 检查是否是HTTP错误
    const httpMatch = error.message.match(/HTTP (\d+):/);
    if (httpMatch) {
      const statusCode = parseInt(httpMatch[1]);
      return ERROR_MESSAGES[statusCode] || ERROR_MESSAGES.default;
    }
    
    // 检查是否是已知的网络错误
    if (ERROR_MESSAGES[error.message]) {
      return ERROR_MESSAGES[error.message];
    }
    
    return error.message;
  }
  
  return ERROR_MESSAGES.default;
};