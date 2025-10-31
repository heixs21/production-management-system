import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useOrderStore = create(
  devtools(
    (set, get) => ({
      // 状态
      orders: [],
      loading: false,
      error: null,
      totalCount: 0,
      currentPage: 1,
      pageSize: 50,
      filters: {
        status: null,
        machine: null,
        searchText: '',
      },

      // Actions
      setOrders: (orders) => set({ orders }),
      
      setOrdersWithPagination: (orders, totalCount, currentPage) => 
        set({ orders, totalCount, currentPage }),
      
      addOrder: (order) => set((state) => ({ 
        orders: [...state.orders, order],
        totalCount: state.totalCount + 1
      })),
      
      updateOrder: (updatedOrder) => set((state) => ({
        orders: state.orders.map((order) =>
          order.id === updatedOrder.id ? updatedOrder : order
        ),
      })),
      
      deleteOrder: (orderId) => set((state) => ({
        orders: state.orders.filter((order) => order.id !== orderId),
        totalCount: state.totalCount - 1
      })),
      
      setLoading: (loading) => set({ loading }),
      
      setError: (error) => set({ error }),
      
      setPage: (page) => set({ currentPage: page }),
      
      setPageSize: (pageSize) => set({ pageSize, currentPage: 1 }),
      
      setFilters: (filters) => set({ 
        filters: { ...get().filters, ...filters },
        currentPage: 1 
      }),
      
      clearFilters: () => set({ 
        filters: { status: null, machine: null, searchText: '' },
        currentPage: 1
      }),

      // 批量操作
      importOrders: (newOrders) => set((state) => ({
        orders: [...state.orders, ...newOrders],
        totalCount: state.totalCount + newOrders.length
      })),

      // 紧急插单
      addUrgentOrder: (urgentOrder, pausedOrders) => set((state) => ({
        orders: state.orders.map((order) => {
          const pausedOrder = pausedOrders.find(po => po.id === order.id);
          return pausedOrder ? { ...order, isPaused: true } : order;
        }).concat(urgentOrder),
        totalCount: state.totalCount + 1
      })),

      // 暂停/恢复工单
      pauseOrder: (orderId, pausedDate) => set((state) => ({
        orders: state.orders.map((order) =>
          order.id === orderId 
            ? { ...order, isPaused: true, pausedDate } 
            : order
        ),
      })),

      resumeOrder: (orderId, resumedDate) => set((state) => ({
        orders: state.orders.map((order) =>
          order.id === orderId 
            ? { ...order, isPaused: false, resumedDate, pausedDate: null } 
            : order
        ),
      })),

      // 报工
      reportWork: (orderId, date, dailyQuantity, delayReason) => set((state) => ({
        orders: state.orders.map((order) => {
          if (order.id !== orderId) return order;
          
          const dailyReports = order.dailyReports || {};
          dailyReports[date] = { quantity: dailyQuantity, delayReason };
          
          const reportedQuantity = Object.values(dailyReports).reduce(
            (sum, report) => sum + (report.quantity || 0), 
            0
          );
          
          return {
            ...order,
            dailyReports,
            reportedQuantity,
            delayReason: delayReason || order.delayReason,
          };
        }),
      })),

      // 重置状态
      reset: () => set({
        orders: [],
        loading: false,
        error: null,
        totalCount: 0,
        currentPage: 1,
        filters: { status: null, machine: null, searchText: '' },
      }),
    }),
    { name: 'OrderStore' }
  )
);

export default useOrderStore;

