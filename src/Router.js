import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './components/Login';
import OrderManagementPage from './pages/OrderManagementPage';
import MachineManagementPage from './pages/MachineManagementPage';
import MachineMonitoringPage from './pages/MachineMonitoringPage';
import ProductionBoard from './components/ProductionBoard';
import UserManagement from './components/UserManagement';

// 受保护的路由组件
const ProtectedRoute = ({ children, permission }) => {
  const { isAuthenticated, hasPermission, user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  
  // 所有登录用户都可以访问基本页面，权限控制在组件内部
  if (permission && !hasPermission(permission)) {
    return <Navigate to="/orders" replace />;
  }
  
  return <Layout>{children}</Layout>;
};

// 登录路由组件
const LoginRoute = () => {
  const { isAuthenticated, user } = useAuth();
  
  if (isAuthenticated && user) {
    return <Navigate to="/orders" replace />;
  }
  
  return <Login />;
};

// 创建路由配置
const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginRoute />
  },
  {
    path: "/",
    element: <Navigate to="/orders" replace />
  },
  {
    path: "/orders",
    element: (
      <ProtectedRoute>
        <OrderManagementPage />
      </ProtectedRoute>
    )
  },
  {
    path: "/machines",
    element: (
      <ProtectedRoute>
        <MachineManagementPage />
      </ProtectedRoute>
    )
  },
  {
    path: "/board",
    element: (
      <ProtectedRoute permission="board">
        <ProductionBoard />
      </ProtectedRoute>
    )
  },
  {
    path: "/machine-monitoring",
    element: (
      <ProtectedRoute>
        <MachineMonitoringPage />
      </ProtectedRoute>
    )
  },
  {
    path: "/users",
    element: (
      <ProtectedRoute permission="admin">
        <UserManagement />
      </ProtectedRoute>
    )
  }
]);

const AppRouter = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;