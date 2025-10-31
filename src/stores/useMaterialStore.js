import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useMaterialStore = create(
  devtools(
    (set, get) => ({
      // 状态
      materials: [],
      loading: false,
      error: null,
      totalCount: 0,
      currentPage: 1,
      pageSize: 50,

      // Actions
      setMaterials: (materials) => set({ materials }),
      
      setMaterialsWithPagination: (materials, totalCount, currentPage) => 
        set({ materials, totalCount, currentPage }),
      
      addMaterial: (material) => set((state) => ({ 
        materials: [...state.materials, material],
        totalCount: state.totalCount + 1
      })),
      
      updateMaterial: (updatedMaterial) => set((state) => ({
        materials: state.materials.map((material) =>
          material.id === updatedMaterial.id ? updatedMaterial : material
        ),
      })),
      
      deleteMaterial: (materialId) => set((state) => ({
        materials: state.materials.filter((material) => material.id !== materialId),
        totalCount: state.totalCount - 1
      })),
      
      setLoading: (loading) => set({ loading }),
      
      setError: (error) => set({ error }),
      
      setPage: (page) => set({ currentPage: page }),
      
      setPageSize: (pageSize) => set({ pageSize, currentPage: 1 }),

      // 批量导入
      importMaterials: (newMaterials) => set((state) => ({
        materials: [...state.materials, ...newMaterials],
        totalCount: state.totalCount + newMaterials.length
      })),

      // 验证物料
      validateMaterial: (material) => {
        const errors = [];
        if (!material.category) errors.push('类别不能为空');
        if (!material.actualTakt || material.actualTakt <= 0) {
          errors.push('实际节拍必须大于0');
        }
        return errors;
      },

      // 重置状态
      reset: () => set({
        materials: [],
        loading: false,
        error: null,
        totalCount: 0,
        currentPage: 1,
      }),
    }),
    { name: 'MaterialStore' }
  )
);

export default useMaterialStore;

