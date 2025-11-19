import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { getCompanyConfig } from "../config/companies";
import logo from "../pic/logo.jpg";

const Layout = ({ children }) => {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const companyConfig = getCompanyConfig(user?.companyId);

  const menuItems = [
    {
      name: "工单管理",
      path: "/orders",
      icon: "📋",
      permission: "orders",
    },
    {
      name: "机台监控",
      path: "/machine-monitoring",
      icon: "🔧",
      permission: "orders",
    },
    {
      name: "机台管理",
      path: "/machines",
      icon: "🏭",
      permission: "machines",
    },
    {
      name: "机台日报",
      path: "/machine-daily-report",
      icon: "🗓️",
      permission: "orders",
    },
    {
      name: "生产看板",
      path: "/board",
      icon: "📺",
      permission: "board",
    },

  ];

  // 只有管理员能看到用户管理
  if (user?.role === "admin") {
    menuItems.push({
      name: "用户管理",
      path: "/users",
      icon: "👥",
      permission: "admin",
    });
  }

  const handleLogout = () => {
    try {
      logout();
      // 使用 window.location 而不是 navigate 来确保完全重新加载
      window.location.href = "/login";
    } catch (error) {
      console.error("退出登录失败:", error);
      // 强制清理并重定向
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
  };

  const themeColors = {
    blue: {
      primary: "bg-blue-600",
      secondary: "bg-blue-50",
      border: "border-blue-500",
      text: "text-blue-600",
      hover: "hover:bg-blue-100",
    },
    green: {
      primary: "bg-green-600",
      secondary: "bg-green-50",
      border: "border-green-500",
      text: "text-green-600",
      hover: "hover:bg-green-100",
    },
  };

  const theme = themeColors[companyConfig.theme.primary] || themeColors.blue;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 侧边栏 */}
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-16"
        } bg-white shadow-lg transition-all duration-300`}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h1
            className={`font-bold text-lg ${sidebarOpen ? "block" : "hidden"}`}
          >
            {companyConfig.shortName}
          </h1>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 rounded hover:bg-gray-100"
          >
            {sidebarOpen ? "◀" : "▶"}
          </button>
        </div>

        <nav className="mt-4">
          {menuItems.map((item) => {
            // 检查权限：只要有读或写权限就可以访问
            const canAccess =
              item.permission === "orders"
                ? hasPermission("orders.read") ||
                  hasPermission("orders.write") ||
                  hasPermission("orders.all")
                : item.permission === "machines"
                ? hasPermission("machines.read") ||
                  hasPermission("machines.write") ||
                  hasPermission("machines.all")
                : hasPermission(item.permission);

            if (!canAccess) return null;

            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center px-4 py-3 text-left hover:bg-gray-100 ${
                  isActive
                    ? `${theme.secondary} border-r-2 ${theme.border} ${theme.text}`
                    : "text-gray-700"
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
            <div className="flex items-center space-x-3">
              <img
                src={logo}
                alt="Logo"
                className="h-8 w-auto object-contain rounded"
              />
              <h2 className="text-xl font-semibold text-gray-800">
                {companyConfig.name}生产管理系统
              </h2>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                欢迎，{user?.username} (
                {user?.role === "admin" ? "管理员" : "用户"}) -{" "}
                {companyConfig.shortName}
              </span>
              <button
                onClick={handleLogout}
                className={`px-3 py-1 ${theme.primary} text-white rounded text-sm hover:opacity-90`}
              >
                退出登录
              </button>
            </div>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
