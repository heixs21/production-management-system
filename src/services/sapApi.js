// 获取服务器地址
const getServerUrl = () => {
  const hostname = window.location.hostname;
  return `http://${hostname}:12454`;
};

export const sapApi = {
  // 根据工单号获取物料信息
  async getOrderMaterial(orderNo) {
    try {
      const serverUrl = getServerUrl();
      const response = await fetch(`${serverUrl}/api/sap/order-material`, {
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
  },

  // 刷新SAP认证
  async refreshAuth() {
    try {
      const serverUrl = getServerUrl();
      const response = await fetch(`${serverUrl}/api/sap/refresh-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('SAP认证刷新失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};