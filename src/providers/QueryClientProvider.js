import React from 'react';
import { QueryClient, QueryClientProvider as ReactQueryClientProvider } from '@tanstack/react-query';

// 创建 QueryClient 实例
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 数据30秒内视为新鲜
      cacheTime: 5 * 60 * 1000, // 缓存5分钟
      refetchOnWindowFocus: false, // 窗口重新聚焦时不自动刷新
      refetchOnMount: true, // 组件挂载时刷新
      retry: 1, // 失败重试1次
    },
    mutations: {
      retry: 0, // 修改操作不重试
    },
  },
});

/**
 * React Query Provider 包装器
 */
export const QueryClientProvider = ({ children }) => {
  return (
    <ReactQueryClientProvider client={queryClient}>
      {children}
    </ReactQueryClientProvider>
  );
};

export { queryClient };

