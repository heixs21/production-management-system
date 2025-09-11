export const sapApi = {
  // 根据工单号获取物料信息
  async getOrderMaterial(orderNo) {
    try {
      const response = await fetch('http://localhost:12454/api/sap/order-material', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderNo })
      });

      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('SAP API调用失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};