import { useState, useEffect, useCallback } from 'react';
import { materialApi } from '../services/api';

// 物料数据管理Hook - 使用后端API
export const useMaterialData = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 加载物料数据
  const loadMaterials = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await materialApi.getAll();
      setMaterials(data);
    } catch (err) {
      setError(err.message);
      console.error('加载物料数据失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  // 添加物料
  const addMaterial = useCallback(async (materialData) => {
    try {
      const newMaterial = {
        ...materialData,
        actualTakt: parseInt(materialData.actualTakt) || 0
      };
      await materialApi.create(newMaterial);
      await loadMaterials(); // 重新加载数据
    } catch (error) {
      console.error('添加物料失败:', error);
      throw error;
    }
  }, [loadMaterials]);

  // 更新物料
  const updateMaterial = useCallback(async (updatedMaterial) => {
    try {
      await materialApi.update(updatedMaterial.id, updatedMaterial);
      await loadMaterials(); // 重新加载数据
    } catch (error) {
      console.error('更新物料失败:', error);
      throw error;
    }
  }, [loadMaterials]);

  // 删除物料
  const deleteMaterial = useCallback(async (materialId) => {
    try {
      await materialApi.delete(materialId);
      await loadMaterials(); // 重新加载数据
    } catch (error) {
      console.error('删除物料失败:', error);
      throw error;
    }
  }, [loadMaterials]);

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
        // 批量创建物料
        for (const material of newMaterials) {
          await materialApi.create(material);
        }
        await loadMaterials(); // 重新加载数据
        return newMaterials.length;
      }
      return 0;
    } catch (error) {
      console.error('导入物料失败:', error);
      throw new Error('导入数据格式错误');
    }
  }, [loadMaterials]);

  // 验证物料数据
  const validateMaterial = useCallback((materialData) => {
    const errors = [];
    
    if (!materialData.category?.trim()) {
      errors.push('种类不能为空');
    }
    if (!materialData.feature?.trim()) {
      errors.push('特征不能为空');
    }
    if (!materialData.modelThickness?.trim()) {
      errors.push('型号/厚度不能为空');
    }
    if (!materialData.actualTakt || materialData.actualTakt <= 0) {
      errors.push('实际节拍必须大于0');
    }

    return errors;
  }, []);

  return {
    materials,
    loading,
    error,
    setMaterials,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    importMaterials,
    validateMaterial,
    loadMaterials
  };
};
