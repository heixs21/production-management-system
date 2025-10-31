import { useCallback } from 'react';
import { materialApi } from '../services/api';
import useMaterialStore from '../stores/useMaterialStore';

/**
 * 物料数据管理Hook - 使用Zustand状态管理
 */
export const useMaterialData = () => {
  const {
    materials,
    loading,
    error,
    totalCount,
    currentPage,
    pageSize,
    setMaterials,
    setMaterialsWithPagination,
    addMaterial: addMaterialToStore,
    updateMaterial: updateMaterialInStore,
    deleteMaterial: deleteMaterialFromStore,
    setLoading,
    setError,
    setPage,
    setPageSize,
    importMaterials: importMaterialsToStore,
    validateMaterial,
  } = useMaterialStore();

  // 加载物料数据（支持分页，默认加载全部）
  const loadMaterials = useCallback(async (usePagination = false, page = 1, size = 50) => {
    try {
      setLoading(true);
      setError(null);
      
      // 如果不使用分页，不传page和limit参数（后端会返回所有数据）
      const params = usePagination ? { page, limit: size } : {};
      
      const data = await materialApi.getAll(params);
      
      // 如果后端返回分页数据
      if (data.materials && data.total !== undefined) {
        setMaterialsWithPagination(data.materials, data.total, page);
      } else {
        // 兼容旧的API格式（返回全部数据）
        setMaterials(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setError(err.message);
      console.error('加载物料数据失败:', err);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setMaterials, setMaterialsWithPagination]);

  // 添加物料
  const addMaterial = useCallback(async (materialData) => {
    try {
      const newMaterial = {
        ...materialData,
        actualTakt: parseInt(materialData.actualTakt) || 0
      };
      
      const created = await materialApi.create(newMaterial);
      addMaterialToStore(created);
      return created;
    } catch (error) {
      console.error('添加物料失败:', error);
      throw error;
    }
  }, [addMaterialToStore]);

  // 更新物料
  const updateMaterial = useCallback(async (updatedMaterial) => {
    try {
      await materialApi.update(updatedMaterial.id, updatedMaterial);
      updateMaterialInStore(updatedMaterial);
    } catch (error) {
      console.error('更新物料失败:', error);
      throw error;
    }
  }, [updateMaterialInStore]);

  // 删除物料
  const deleteMaterial = useCallback(async (materialId) => {
    try {
      await materialApi.delete(materialId);
      deleteMaterialFromStore(materialId);
    } catch (error) {
      console.error('删除物料失败:', error);
      throw error;
    }
  }, [deleteMaterialFromStore]);

  // 导入物料数据
  const importMaterials = useCallback(async (pasteData) => {
    try {
      const lines = pasteData.trim().split('\n');
      const newMaterials = [];

      lines.forEach((line, index) => {
        const cells = line.split('\t');
        if (cells.length >= 4) {
          const material = {
            category: cells[0]?.trim() || "",
            feature: cells[1]?.trim() || "",
            modelThickness: cells[2]?.trim() || "",
            actualTakt: parseInt(cells[3]) || 0,
          };

          if (material.category && material.feature) {
            newMaterials.push(material);
          }
        }
      });

      if (newMaterials.length > 0) {
        const createdMaterials = [];
        for (const material of newMaterials) {
          const created = await materialApi.create(material);
          createdMaterials.push(created);
        }
        importMaterialsToStore(createdMaterials);
        return createdMaterials.length;
      }
      
      return 0;
    } catch (error) {
      console.error('导入物料失败:', error);
      throw new Error('导入数据格式错误');
    }
  }, [importMaterialsToStore]);

  return {
    // 状态
    materials,
    loading,
    error,
    totalCount,
    currentPage,
    pageSize,
    
    // 基本操作
    setMaterials,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    
    // 高级操作
    importMaterials,
    validateMaterial,
    loadMaterials,
    
    // 分页
    setPage,
    setPageSize,
  };
};

