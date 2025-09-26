import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';
import { getErrorMessage } from '../utils/errorMessages';

// 全局强制退出功能
window.forceLogout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('selectedCompany');
  window.location.href = '/login';
};

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(userData);
        console.log('加载用户信息:', userData);
      } catch (error) {
        console.error('解析用户信息失败:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
    
    // 添加全局键盘快捷键：Ctrl+Shift+L 强制退出
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        window.forceLogout();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const login = async (username, password, companyId = 'hetai-logistics') => {
    try {
      const data = await authApi.login({ username, password, companyId });
      
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      return { success: true };
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    
    // 默认权限：所有用户都可以访问生产看板
    if (permission === 'board') return true;
    
    // 检查用户权限
    if (!user.permissions) return false;
    
    return user.permissions.includes('all') || user.permissions.includes(permission);
  };

  // 检查具体操作权限
  const canPerformAction = (action) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    
    const actionPermissions = {
      // 工单操作权限
      'order.create': ['orders.write', 'orders.all'],
      'order.edit': ['orders.write', 'orders.all'],
      'order.delete': ['orders.write', 'orders.all'],
      'order.pause': ['orders.write', 'orders.all'],
      'order.resume': ['orders.write', 'orders.all'],
      'order.finish': ['orders.write', 'orders.all'],
      'order.delay': ['orders.write', 'orders.all'],
      'order.submit': ['orders.write', 'orders.all'],
      'order.urgent': ['orders.write', 'orders.all'],
      'order.import': ['orders.write', 'orders.all'],
      'order.export': ['orders.read', 'orders.write', 'orders.all'],
      'order.report': ['orders.write', 'orders.all'],
      'order.write': ['orders.write', 'orders.all'],
      
      // 基础读取权限
      'orders.read': ['orders.read', 'orders.write', 'orders.all'],
      
      // 甘特图权限
      'gantt.view': ['orders.read', 'orders.write', 'orders.all'],
      'gantt.drag': ['orders.write', 'orders.all'],
      'gantt.export': ['orders.read', 'orders.write', 'orders.all'],
      
      // 机台操作权限
      'machine.create': ['machines.write', 'machines.all'],
      'machine.edit': ['machines.write', 'machines.all'],
      'machine.delete': ['machines.write', 'machines.all'],
      
      // WMS操作权限
      'wms.update': ['orders.write', 'orders.all']
    };
    
    const requiredPerms = actionPermissions[action] || [];
    if (requiredPerms.length === 0) return false;
    
    return user.permissions && requiredPerms.some(perm => 
      user.permissions.includes('all') || user.permissions.includes(perm)
    );
  };

  const canAccessMachine = (machineName) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.allowedMachines && (user.allowedMachines.includes('all') || user.allowedMachines.includes(machineName));
  };

  const value = {
    user,
    token,
    login,
    logout,
    hasPermission,
    canPerformAction,
    canAccessMachine,
    isAuthenticated: !!token,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};