const express = require('express');
const fetch = require('node-fetch');
const https = require('https');
const { getOrderQuantity, getWmsTokenStatus, clearWmsToken } = require('../wmsApi');
const { pool } = require('../database');
const tokenSecurity = require('../tokenSecurity');

const router = express.Router();

// MES配置
const MES_CONFIG = {
  tokenUrl: 'http://192.168.33.112:43352/connect/token',
  apiUrl: 'http://192.168.33.112:43352/api/ExRESTful/mESFrontEnd/workOrder',
  username: process.env.MES_USERNAME || '',
  password: process.env.MES_PASSWORD || '',
  clientId: 'AGVPlatform_App',
};

const MES_SERVICE = 'mes_system';
const SAP_SERVICE = 'sap_system';

// SAP配置
const SAP_CONFIG = {
  username: process.env.SAP_USERNAME,
  password: process.env.SAP_PASSWORD,
  client: '100',
  language: 'ZH'
};

// MES Token管理
async function refreshMesToken() {
  try {
    const body = `scope=AGVPlatform&username=${MES_CONFIG.username}&password=${MES_CONFIG.password}&client_id=${MES_CONFIG.clientId}&client_secret=${MES_CONFIG.clientSecret}&grant_type=password`;
    
    const response = await fetch(MES_CONFIG.tokenUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-Hans',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'Pragma': 'no-cache',
      },
      body
    });

    if (!response.ok) {
      throw new Error(`获取token失败: ${response.status}`);
    }

    const tokenData = await response.json();
    tokenSecurity.storeToken(MES_SERVICE, tokenData.access_token, 60);
    return tokenData.access_token;
  } catch (error) {
    throw new Error('MES认证失败');
  }
}

function getMesToken() {
  return tokenSecurity.getToken(MES_SERVICE);
}

async function ensureMesAuth() {
  const token = getMesToken();
  if (token) {
    return token;
  }
  return await refreshMesToken();
}

// WMS数量更新
router.post('/wms/update-quantities', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [orders] = await pool.execute(
      `SELECT id, orderNo, startDate, expectedEndDate, actualEndDate, isPaused 
       FROM orders 
       WHERE orderNo IS NOT NULL 
         AND actualEndDate IS NULL 
         AND isPaused = 0 
         AND startDate <= ?`,
      [today]
    );
    
    let successCount = 0;
    let errorCount = 0;
    const results = [];
    
    for (const order of orders) {
      try {
        const quantity = await getOrderQuantity(order.orderNo);
        await pool.execute(
          'UPDATE orders SET reportedQuantity = ? WHERE id = ?',
          [quantity, order.id]
        );
        results.push({ orderNo: order.orderNo, quantity, success: true });
        successCount++;
      } catch (error) {
        results.push({ orderNo: order.orderNo, error: '[错误信息已隐藏]', success: false });
        errorCount++;
      }
    }
    
    res.json({
      success: true,
      message: `更新完成：成功${successCount}个，失败${errorCount}个`,
      results: results.map(r => ({ orderNo: r.orderNo, quantity: r.quantity, success: r.success }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '[错误信息已隐藏]'
    });
  }
});

// WMS Token状态
router.get('/wms/token-status', (req, res) => {
  const status = getWmsTokenStatus();
  res.json(status);
});

router.post('/wms/clear-token', (req, res) => {
  clearWmsToken();
  res.json({ success: true, message: 'WMS Token已清除' });
});

// MES API
router.post('/mes/refresh-token', async (req, res) => {
  try {
    await refreshMesToken();
    res.json({
      success: true,
      message: 'MES Token刷新成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'MES Token刷新失败'
    });
  }
});

router.get('/mes/token-status', (req, res) => {
  const status = tokenSecurity.getTokenStatus(MES_SERVICE);
  res.json(status);
});

router.post('/mes/clear-token', (req, res) => {
  tokenSecurity.clearToken(MES_SERVICE);
  res.json({ success: true, message: 'MES Token已清除' });
});

// SAP RFC API
router.post('/sap/work-order-report', async (req, res) => {
  try {
    const { orderNo } = req.body;
    
    if (!orderNo) {
      return res.status(400).json({
        success: false,
        error: '工单号不能为空'
      });
    }

    const { spawn } = require('child_process');
    const path = require('path');
    const fs = require('fs');
    
    const pythonScript = path.join(__dirname, '../sap_rfc_extended.py');
    
    if (!fs.existsSync(pythonScript)) {
      return res.status(500).json({
        success: false,
        error: 'Python脚本不存在: ' + pythonScript
      });
    }
    
    const pythonCmd = process.env.PYTHON_PATH || (process.platform === 'win32' ? 'python' : 'python3');
    const python = spawn(pythonCmd, [pythonScript, orderNo], {
      env: {
        ...process.env,
        SAP_RFC_USERNAME: process.env.SAP_RFC_USERNAME || 'H11974',
        SAP_RFC_PASSWORD: process.env.SAP_RFC_PASSWORD || 'Hota@20251313',
        PYTHONIOENCODING: 'utf-8',
        PYTHONUNBUFFERED: '1'
      },
      encoding: 'utf8'
    });

    let output = '';
    let errorOutput = '';

    python.stdout.on('data', (data) => {
      output += data.toString();
    });

    python.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        return res.status(500).json({
          success: false,
          error: 'SAP RFC连接失败: ' + (errorOutput || '未知错误')
        });
      }

      try {
        const result = JSON.parse(output);
        res.json(result);
      } catch (parseError) {
        res.status(500).json({
          success: false,
          error: '数据解析失败'
        });
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'SAP RFC系统连接失败'
    });
  }
});

router.post('/sap/order-material', async (req, res) => {
  try {
    const { orderNo } = req.body;
    
    if (!orderNo) {
      return res.status(400).json({
        success: false,
        error: '工单号不能为空'
      });
    }

    const { spawn } = require('child_process');
    const path = require('path');
    const fs = require('fs');
    
    const pythonScript = path.join(__dirname, '../sap_rfc.py');
    
    if (!fs.existsSync(pythonScript)) {
      return res.status(500).json({
        success: false,
        error: 'Python脚本不存在: ' + pythonScript
      });
    }
    
    const pythonCmd = process.env.PYTHON_PATH || (process.platform === 'win32' ? 'python' : 'python3');
    const python = spawn(pythonCmd, [pythonScript, orderNo], {
      env: {
        ...process.env,
        SAP_RFC_USERNAME: process.env.SAP_RFC_USERNAME || 'H11974',
        SAP_RFC_PASSWORD: process.env.SAP_RFC_PASSWORD || 'Hota@20251313',
        PYTHONIOENCODING: 'utf-8',
        PYTHONUNBUFFERED: '1'
      },
      encoding: 'utf8'
    });

    let output = '';
    let errorOutput = '';

    python.stdout.on('data', (data) => {
      output += data.toString();
    });

    python.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        return res.status(500).json({
          success: false,
          error: 'SAP RFC连接失败: ' + (errorOutput || '未知错误')
        });
      }

      try {
        const result = JSON.parse(output);
        
        if (result.success) {
          let componentDescription = '';
          if (result.components && result.components.length > 0) {
            componentDescription = result.components.map(comp => 
              `${comp.matnr}: ${comp.description} (${comp.required_qty}${comp.unit})`
            ).join('; ');
          }
          
          res.json({
            success: true,
            data: {
              orderNo: result.order_number,
              materialNo: result.finished_product.matnr,
              materialName: result.finished_product.description || '无描述',
              quantity: result.finished_product.quantity,
              orderComponent: result.components.map(c => c.matnr).join(','),
              componentDescription: componentDescription
            }
          });
        } else {
          res.json({
            success: false,
            error: result.error || '未找到工单信息'
          });
        }
      } catch (parseError) {
        res.status(500).json({
          success: false,
          error: '数据解析失败'
        });
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'SAP RFC系统连接失败'
    });
  }
});

module.exports = router;