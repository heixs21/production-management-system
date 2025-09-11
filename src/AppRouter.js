import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import App from './App';
import ProductionBoard from './components/ProductionBoard';

const AppRouter = () => {
  return (
    <Router>
      <Routes>
        {/* 主管理页面 */}
        <Route path="/" element={<App />} />
        
        {/* 生产看板页面 */}
        <Route path="/board" element={<ProductionBoard />} />
        
        {/* 添加导航链接到主页面 */}
        <Route path="/admin" element={<App />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;