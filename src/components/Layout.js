import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = [
    {
      name: '工单管理',
      path: '/orders',
      icon: '📋',
      permission: 'orders'
    },
    {
      name: '机台监控',
      path: '/machine-monitoring',
      icon: '🔧',
      permission: 'orders'
    },
    {
      name: '机台管理',
      path: '/machines',
      icon: '🏭',
      permission: 'machines'
    },
    {
      name: '生产看板',
      path: '/board',
      icon: '📺',
      permission: 'board'
    }
  ];

  // 只有管理员能看到用户管理
  if (user?.role === 'admin') {
    menuItems.push({
      name: '用户管理',
      path: '/users',
      icon: '👥',
      permission: 'admin'
    });
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 侧边栏 */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-white shadow-lg transition-all duration-300`}>
        <div className="flex items-center justify-between p-4 border-b">
          <h1 className={`font-bold text-lg ${sidebarOpen ? 'block' : 'hidden'}`}>
            和泰机电
          </h1>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 rounded hover:bg-gray-100"
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav className="mt-4">
          {menuItems.map((item) => {
            // 检查权限：只要有读或写权限就可以访问
            const canAccess = item.permission === 'orders' 
              ? hasPermission('orders.read') || hasPermission('orders.write')
              : item.permission === 'machines'
              ? hasPermission('machines.read') || hasPermission('machines.write')
              : hasPermission(item.permission);
            
            if (!canAccess) return null;
            
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center px-4 py-3 text-left hover:bg-gray-100 ${
                  isActive ? 'bg-blue-50 border-r-2 border-blue-500 text-blue-600' : 'text-gray-700'
                }`}
              >
                <span className="text-xl mr-3">{item.icon}</span>
                {sidebarOpen && <span>{item.name}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部导航 */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">
              生产管理系统
            </h2>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                欢迎，{user?.username} ({user?.role === 'admin' ? '管理员' : '用户'})
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                退出登录
              </button>
            </div>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;