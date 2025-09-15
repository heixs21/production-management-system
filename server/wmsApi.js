const fetch = require('node-fetch');
const tokenSecurity = require('./tokenSecurity');

const WMS_SERVICE = 'wms_system';

// WMS配置
const WMS_CONFIG = {
  baseUrl: process.env.WMS_BASE_URL || 'http://192.168.33.20:9000/wms',
  username: process.env.WMS_USERNAME || 'admin2',
  password: process.env.WMS_PASSWORD || 'admin2'
};

// 获取WMS Token
async function getWmsToken() {
  try {
    const response = await fetch(`${WMS_CONFIG.baseUrl}/sys/login`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Connection': 'keep-alive',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: new URLSearchParams({
        userName: WMS_CONFIG.username,
        password: WMS_CONFIG.password
      })
    });

    if (response.status === 200) {
      const result = await response.json();
      if (result.code === 200 && result.success) {
        // 使用安全存储
        tokenSecurity.storeToken(WMS_SERVICE, result.token, 30);
        console.log('✅ WMS Token获取成功');
        return result.token;
      } else {
        console.error('❌ WMS登录失败: [认证信息已隐藏]');
        return null;
      }
    } else {
      console.error('❌ WMS请求失败，状态码:', response.status);
      return null;
    }
  } catch (error) {
    console.error('❌ WMS Token获取异常: [详细信息已隐藏]');
    return null;
  }
}

// 确保WMS认证有效
async function ensureWmsAuth() {
  const token = tokenSecurity.getToken(WMS_SERVICE);
  if (token) {
    return token;
  }
  // Token不存在或已过期，重新获取
  return await getWmsToken();
}

// 获取工单入库数量
async function getOrderQuantity(mainCode) {
  try {
    const token = await ensureWmsAuth();
    if (!token) {
      throw new Error('无法获取WMS认证');
    }

    const params = new URLSearchParams({
      pageNo: '1',
      pageSize: '1000',
      type: '1',
      mainCode: mainCode,
      token: token
    });
    
    const response = await fetch(`${WMS_CONFIG.baseUrl}/checkinoutlog/tblOperateMaterialCheckinOutLog/list?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Connection': 'keep-alive',
      }
    });

    if (response.status === 200) {
      const result = await response.json();
      if (result.code === 200 && result.success) {
        const items = result.page?.list || [];
        let total = 0;
        
        for (const item of items) {
          try {
            const number = parseFloat(item.number || 0);
            total += number;
          } catch (e) {
            console.warn('WMS数量转换失败:', item.number);
          }
        }
        
        return total;
      } else {
        console.error('WMS数据获取失败:', result.msg);
        return 0;
      }
    } else {
      console.error('WMS请求失败，状态码:', response.status);
      return 0;
    }
  } catch (error) {
    console.error('WMS获取工单数量异常:', error);
    return 0;
  }
}

// 清除WMS Token
function clearWmsToken() {
  tokenSecurity.clearToken(WMS_SERVICE);
}

// 获取WMS Token状态
function getWmsTokenStatus() {
  return tokenSecurity.getTokenStatus(WMS_SERVICE);
}

module.exports = {
  getWmsToken,
  getOrderQuantity,
  clearWmsToken,
  getWmsTokenStatus
};