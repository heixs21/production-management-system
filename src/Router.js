import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './components/Login';
import OrderManagementPage from './pages/OrderManagementPage';
import MachineManagementPage from './pages/MachineManagementPage';
import ProductionBoard from './components/ProductionBoard';
import UserManagement from './components/UserManagement';

// 受保护的路由组件
const ProtectedRoute = ({ children, permission }) => {
  const { isAuthenticated, hasPermission } = useAuth();
  
  if (!isAuthenticated) {
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
  const { isAuthenticated } = useAuth();
  
  if (isAuthenticated) {
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