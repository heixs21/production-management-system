require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 12454;

// 中间件
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://192.168.1.114:3000',
    'http://192.168.1.114',
    'http://192.168.36.9:3000',
    'http://192.168.100.30:3000'  // 添加其他可能的IP地址
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// MySQL数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Hota@123456',
  database: process.env.DB_NAME || 'gunt_db',
  charset: 'utf8mb4',
  timezone: '+00:00', // 使用UTC时区，避免时区转换问题
  dateStrings: true   // 将日期作为字符串返回，避免JavaScript Date对象的时区问题
};

// 创建数据库连接池
const pool = mysql.createPool(dbConfig);



// 初始化数据库表
async function initDatabase() {
  try {
    const connection = await pool.getConnection();

    // 创建machines表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS machines (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        lineCode VARCHAR(255),
        status VARCHAR(50) DEFAULT '正常',
        oee DECIMAL(3,2) DEFAULT 0.85,
        coefficient DECIMAL(5,2) DEFAULT 1.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 创建orders表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        machine VARCHAR(255) NOT NULL,
        orderNo VARCHAR(255) NOT NULL,
        materialNo VARCHAR(255),
        materialName VARCHAR(255) NOT NULL,
        quantity INT NOT NULL,
        priority INT DEFAULT 1,
        startDate DATE NOT NULL,
        expectedEndDate DATE,
        delayedExpectedEndDate DATE,
        actualEndDate DATE,
        reportedQuantity INT DEFAULT 0,
        dailyReports JSON,
        status VARCHAR(50) DEFAULT '未开始',
        isUrgent BOOLEAN DEFAULT FALSE,
        isPaused BOOLEAN DEFAULT FALSE,
        pausedDate DATE,
        resumedDate DATE,
        delayReason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 创建materials表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS materials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category VARCHAR(255) NOT NULL,
        feature VARCHAR(255),
        modelThickness VARCHAR(255),
        actualTakt INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 添加新字段（如果不存在）
    try {
      await connection.execute(`
        ALTER TABLE orders ADD COLUMN delayedExpectedEndDate DATE
      `);
      console.log('✅ 添加 delayedExpectedEndDate 字段成功');
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ delayedExpectedEndDate 字段可能已存在');
      }
    }

    // 添加机台产线代号字段
    try {
      await connection.execute(`
        ALTER TABLE machines ADD COLUMN lineCode VARCHAR(255)
      `);
      console.log('✅ 添加 lineCode 字段成功');
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ lineCode 字段可能已存在');
      }
    }

    // 添加机台系数字段
    try {
      await connection.execute(`
        ALTER TABLE machines ADD COLUMN coefficient DECIMAL(5,2) DEFAULT 1.00
      `);
      console.log('✅ 添加 coefficient 字段成功');
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ coefficient 字段可能已存在');
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE orders ADD COLUMN producedDays INT DEFAULT 0
      `);
      console.log('✅ 添加 producedDays 字段成功');
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ producedDays 字段可能已存在');
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE orders ADD COLUMN remainingDays INT DEFAULT 0
      `);
      console.log('✅ 添加 remainingDays 字段成功');
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ remainingDays 字段可能已存在');
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE orders ADD COLUMN originalOrderId INT
      `);
      console.log('✅ 添加 originalOrderId 字段成功');
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ originalOrderId 字段可能已存在');
      }
    }

    // 添加工单组件字段
    try {
      await connection.execute(`
        ALTER TABLE orders ADD COLUMN orderComponent VARCHAR(255)
      `);
      console.log('✅ 添加 orderComponent 字段成功');
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ orderComponent 字段可能已存在');
      }
    }

    connection.release();
    console.log('✅ 数据库表初始化完成');
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
  }
}

// 启动时初始化数据库
initDatabase();

// 机台API
app.get('/api/machines', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM machines ORDER BY id');
    res.json(rows);
  } catch (error) {
    console.error('获取机台数据失败:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/machines', async (req, res) => {
  try {
    const { name, lineCode, status, oee, coefficient } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO machines (name, lineCode, status, oee, coefficient) VALUES (?, ?, ?, ?, ?)',
      [name, lineCode || null, status || '正常', oee || 0.85, coefficient || 1.00]
    );
    res.json({
      id: result.insertId,
      name,
      lineCode: lineCode || null,
      status: status || '正常',
      oee: oee || 0.85,
      coefficient: coefficient || 1.00
    });
  } catch (error) {
    console.error('添加机台失败:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/machines/:id', async (req, res) => {
  try {
    const { name, lineCode, status, oee, coefficient } = req.body;
    await pool.execute(
      'UPDATE machines SET name = ?, lineCode = ?, status = ?, oee = ?, coefficient = ? WHERE id = ?',
      [name, lineCode || null, status, oee, coefficient || 1.00, req.params.id]
    );
    res.json({ message: '更新成功' });
  } catch (error) {
    console.error('更新机台失败:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/machines/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM machines WHERE id = ?', [req.params.id]);
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除机台失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 工单API
app.get('/api/orders', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM orders ORDER BY machine ASC, startDate ASC, priority ASC');
    // 转换数据格式
    const orders = rows.map(row => ({
      ...row,
      isUrgent: Boolean(row.isUrgent),
      isPaused: Boolean(row.isPaused),
      dailyReports: row.dailyReports || {},
      // 日期已经是字符串格式，直接使用
      startDate: row.startDate,
      expectedEndDate: row.expectedEndDate,
      delayedExpectedEndDate: row.delayedExpectedEndDate,
      actualEndDate: row.actualEndDate,
      pausedDate: row.pausedDate,
      resumedDate: row.resumedDate,
      // 新增字段
      producedDays: row.producedDays || 0,
      remainingDays: row.remainingDays || 0,
      originalOrderId: row.originalOrderId,
      orderComponent: row.orderComponent
    }));
    res.json(orders);
  } catch (error) {
    console.error('获取工单数据失败:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const order = req.body;

    // 调试日期信息
    console.log('后端接收到的日期数据:', {
      startDate: order.startDate,
      expectedEndDate: order.expectedEndDate,
      actualEndDate: order.actualEndDate
    });

    const sql = `INSERT INTO orders (
      machine, orderNo, materialNo, materialName, quantity, priority,
      startDate, expectedEndDate, delayedExpectedEndDate, actualEndDate, reportedQuantity,
      dailyReports, status, isUrgent, isPaused, pausedDate, resumedDate, delayReason,
      producedDays, remainingDays, originalOrderId, orderComponent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [
      order.machine || null,
      order.orderNo || null,
      order.materialNo || null,
      order.materialName || null,
      order.quantity || 0,
      order.priority || 1,
      order.startDate || null,
      order.expectedEndDate || null,
      order.delayedExpectedEndDate || null,
      order.actualEndDate || null,
      order.reportedQuantity || 0,
      JSON.stringify(order.dailyReports || {}),
      order.status || '未开始',
      order.isUrgent ? 1 : 0,
      order.isPaused ? 1 : 0,
      order.pausedDate || null,
      order.resumedDate || null,
      order.delayReason || null,
      order.producedDays || 0,
      order.remainingDays || 0,
      order.originalOrderId || null,
      order.orderComponent || null
    ];

    const [result] = await pool.execute(sql, values);
    res.json({ id: result.insertId, ...order });
  } catch (error) {
    console.error('添加工单失败:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/orders/:id', async (req, res) => {
  try {
    const order = req.body;
    const sql = `UPDATE orders SET
      machine = ?, orderNo = ?, materialNo = ?, materialName = ?, quantity = ?,
      priority = ?, startDate = ?, expectedEndDate = ?, delayedExpectedEndDate = ?, actualEndDate = ?,
      reportedQuantity = ?, dailyReports = ?, status = ?, isUrgent = ?,
      isPaused = ?, pausedDate = ?, resumedDate = ?, delayReason = ?,
      producedDays = ?, remainingDays = ?, originalOrderId = ?, orderComponent = ?
      WHERE id = ?`;

    const values = [
      order.machine || null,
      order.orderNo || null,
      order.materialNo || null,
      order.materialName || null,
      order.quantity || 0,
      order.priority || 1,
      order.startDate || null,
      order.expectedEndDate || null,
      order.delayedExpectedEndDate || null,
      order.actualEndDate || null,
      order.reportedQuantity || 0,
      JSON.stringify(order.dailyReports || {}),
      order.status || '未开始',
      order.isUrgent ? 1 : 0,
      order.isPaused ? 1 : 0,
      order.pausedDate || null,
      order.resumedDate || null,
      order.delayReason || null,
      order.producedDays || 0,
      order.remainingDays || 0,
      order.originalOrderId || null,
      order.orderComponent || null,
      req.params.id
    ];

    await pool.execute(sql, values);
    res.json({ message: '更新成功' });
  } catch (error) {
    console.error('更新工单失败:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/orders/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM orders WHERE id = ?', [req.params.id]);
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除工单失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 物料API
app.get('/api/materials', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM materials ORDER BY id');
    res.json(rows);
  } catch (error) {
    console.error('获取物料数据失败:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/materials', async (req, res) => {
  try {
    const { category, feature, modelThickness, actualTakt } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO materials (category, feature, modelThickness, actualTakt) VALUES (?, ?, ?, ?)',
      [category || null, feature || null, modelThickness || null, actualTakt || 0]
    );
    res.json({ id: result.insertId, category, feature, modelThickness, actualTakt: actualTakt || 0 });
  } catch (error) {
    console.error('添加物料失败:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/materials/:id', async (req, res) => {
  try {
    const { category, feature, modelThickness, actualTakt } = req.body;
    await pool.execute(
      'UPDATE materials SET category = ?, feature = ?, modelThickness = ?, actualTakt = ? WHERE id = ?',
      [category || null, feature || null, modelThickness || null, actualTakt || 0, req.params.id]
    );
    res.json({ message: '更新成功' });
  } catch (error) {
    console.error('更新物料失败:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/materials/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM materials WHERE id = ?', [req.params.id]);
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除物料失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// MES系统Token管理
let mesToken = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjkyMEZCRkE3MkM2NzM2Rjk0ODY4NzFBQTg1MDJFMEExIiwidHlwIjoiYXQrand0In0.eyJuYmYiOjE3NTY3OTk1NTMsImV4cCI6MTc4ODMzNTU1MywiaXNzIjoiaHR0cDovLzE5Mi4xNjguMzMuMTEyOjQzMzUyIiwiYXVkIjoiQUdWUGxhdGZvcm0iLCJjbGllbnRfaWQiOiJBR1ZQbGF0Zm9ybV9BcHAiLCJzdWIiOiI4MzQ0YzFkNC1hNDNkLWUwMjItMmQwNy0zYTAyNzQ5NWM1OGQiLCJhdXRoX3RpbWUiOjE3NTY3OTk1NTMsImlkcCI6ImxvY2FsIiwicm9sZSI6ImFkbWluIiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvZ2l2ZW5uYW1lIjoiYWRtaW4iLCJwaG9uZV9udW1iZXJfdmVyaWZpZWQiOiJGYWxzZSIsImVtYWlsIjoiYWRtaW5AYWJwLmlvIiwiZW1haWxfdmVyaWZpZWQiOiJGYWxzZSIsIm5hbWUiOiJhZG1pbiIsImlhdCI6MTc1Njc5OTU1Mywic2NvcGUiOlsiQUdWUGxhdGZvcm0iXSwiYW1yIjpbInB3ZCJdfQ.Lt7hL6IWcw3QIoGJeP2jW9OHdlwcZi4XtXF99kw4CGSGVRbuTfRpZLWCqohCUYaMqHI3xCVOBeT-mGnDfbElMkH7c-RPVrF5iTS2isUEtnjlueNuBibvNyccNt-uqOt-_rvsE_2593fyZ9KwnfpvzABxLFBpBjx-48Tt8tQ96t5-1tgj-41GNaSGVEWDZoZwOfxS82Y5nXHlX1NGochHKqaikswgMCkKu8LZbX8ThbFCe_V8vDX5nZyiVGWmCcHM8lDRBOSgpy6-AzGBIylqkUMlLB7Er9Q7KjCIzdErGintlPT0UG41WxrcTnOywHg9RGigXPLBdacfx9_Ug4vyMw';

// 获取新的MES Token
async function refreshMesToken() {
  try {
    const response = await fetch('http://192.168.33.112:43352/connect/token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-Hans',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'Origin': 'http://192.168.33.112:9527',
        'Pragma': 'no-cache',
        'Referer': 'http://192.168.33.112:9527/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
      },
      body: 'scope=AGVPlatform&username=admin&password=1q2w3E*&client_id=AGVPlatform_App&client_secret=1q2w3e*&grant_type=password'
    });

    if (!response.ok) {
      throw new Error(`获取token失败: ${response.status}`);
    }

    const tokenData = await response.json();
    mesToken = tokenData.access_token;
    console.log('✅ MES Token刷新成功');
    return mesToken;
  } catch (error) {
    console.error('❌ MES Token刷新失败:', error);
    throw error;
  }
}

// 手动刷新token的API
app.post('/api/mes/refresh-token', async (req, res) => {
  try {
    const newToken = await refreshMesToken();
    res.json({
      success: true,
      message: 'Token刷新成功',
      token: newToken.substring(0, 50) + '...' // 只返回前50个字符用于确认
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// SAP认证信息缓存
let sapAuth = {
  csrfToken: null,
  sessionCookie: null,
  lastUpdate: null
};

// SAP认证配置
const SAP_CONFIG = {
  username: process.env.SAP_USERNAME || 'HS040005',
  password: process.env.SAP_PASSWORD || 'Hota@654321',
  client: '100',
  language: 'ZH'
};

// 获取SAP认证信息
async function getSapAuth() {
  try {
    const https = require('https');
    const agent = new https.Agent({ rejectUnauthorized: false });
    
    const auth = Buffer.from(`${SAP_CONFIG.username}:${SAP_CONFIG.password}`).toString('base64');
    
    const response = await fetch('https://192.168.202.40:44300/sap/opu/odata/sap/ZODATA01_SRV/', {
      method: 'GET',
      headers: {
        'x-csrf-token': 'fetch',
        'Authorization': `Basic ${auth}`
      },
      agent
    });
    
    console.log('SAP认证响应状态:', response.status);
    
    if (response.status === 200) {
      const csrfToken = response.headers.get('x-csrf-token');
      console.log('CSRF Token:', csrfToken);
      
      // 获取cookies
      let sessionCookie = null;
      const cookieHeader = response.headers.get('set-cookie');
      console.log('Set-Cookie header:', cookieHeader);
      
      if (cookieHeader) {
        const cookies = Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader];
        for (const cookie of cookies) {
          if (cookie.includes('SAP_SESSIONID_PS4_100')) {
            const match = cookie.match(/SAP_SESSIONID_PS4_100=([^;]+)/);
            if (match) {
              sessionCookie = `SAP_SESSIONID_PS4_100=${match[1]}`;
              console.log('Session Cookie:', sessionCookie);
              break;
            }
          }
        }
      }
      
      if (csrfToken && sessionCookie) {
        sapAuth = {
          csrfToken,
          sessionCookie,
          lastUpdate: Date.now()
        };
        console.log('✅ SAP认证信息更新成功');
        return true;
      } else {
        console.log('❌ 未获取到完整认证信息');
        console.log('CSRF Token:', csrfToken);
        console.log('Session Cookie:', sessionCookie);
      }
    } else {
      const errorText = await response.text();
      console.log('SAP认证失败响应:', errorText.substring(0, 200));
    }
    return false;
  } catch (error) {
    console.error('❌ 获取SAP认证失败:', error);
    return false;
  }
}

// 检查并刷新SAP认证
async function ensureSapAuth() {
  const now = Date.now();
  // 如果没有认证信息或超过30分钟，重新获取
  if (!sapAuth.csrfToken || !sapAuth.lastUpdate || (now - sapAuth.lastUpdate) > 30 * 60 * 1000) {
    return await getSapAuth();
  }
  return true;
}

// SAP系统代理API
app.post('/api/sap/order-material', async (req, res) => {
  try {
    const { orderNo } = req.body;
    
    // 确保有有效的认证信息
    const authValid = await ensureSapAuth();
    if (!authValid) {
      return res.status(500).json({
        success: false,
        error: '无法获取SAP认证信息'
      });
    }
    
    const data = {
      "Code": "MM_BARCODE_PROWH_READ",
      "UserId": "12552",
      "ReturnCode": 0,
      "ReturnMessage": "",
      "np_code2migo": [{
        "IvInput": `{"AUFNR":"${orderNo}"}`,
        "EvOutput": ""
      }]
    };

    const https = require('https');
    const agent = new https.Agent({ rejectUnauthorized: false });

    const response = await fetch('https://192.168.202.40:44300/sap/opu/odata/sap/ZODATA01_SRV/codeSet', {
      method: 'POST',
      headers: {
        "accept": "application/json",
        "accept-language": "zh-CN",
        "content-type": "application/json",
        "dataserviceversion": "2.0",
        "maxdataserviceversion": "2.0",
        "x-csrf-token": sapAuth.csrfToken,
        "Cookie": `sap-usercontext=sap-language=ZH&sap-client=100; ${sapAuth.sessionCookie}`
      },
      body: JSON.stringify(data),
      agent
    });

    if (!response.ok) {
      throw new Error(`SAP请求失败: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.d?.np_code2migo?.results?.[0]?.EvOutput) {
      const outputData = JSON.parse(result.d.np_code2migo.results[0].EvOutput);
      res.json({
        success: true,
        data: {
          orderNo: outputData.AUFNR,
          materialNo: outputData.MATNR,
          materialName: outputData.MAKTX,
          quantity: outputData.GAMNG,
          plant: outputData.WERKS,
          plantName: outputData.WERKSNAME
        }
      });
    } else {
      console.log('SAP返回数据结构:', JSON.stringify(result, null, 2));
      res.json({
        success: false,
        error: '未找到工单信息'
      });
    }
  } catch (error) {
    console.error('SAP代理请求失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 手动刷新SAP认证的API
app.post('/api/sap/refresh-auth', async (req, res) => {
  try {
    const success = await getSapAuth();
    res.json({
      success,
      message: success ? 'SAP认证刷新成功' : 'SAP认证刷新失败'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// MES系统代理API
app.post('/api/mes/workOrder', async (req, res) => {
  try {
    const workOrderData = req.body;

    // 尝试使用当前token下达工单
    let response = await fetch('http://192.168.33.112:43352/api/ExRESTful/mESFrontEnd/workOrder', {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-Hans',
        'Authorization': `Bearer ${mesToken}`,
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Content-Type': 'application/json',
        'Origin': 'http://192.168.33.112:9527',
        'Pragma': 'no-cache',
        'Referer': 'http://192.168.33.112:9527/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
      },
      body: JSON.stringify(workOrderData)
    });

    // 如果返回401或403，尝试刷新token并重试
    if (response.status === 401 || response.status === 403) {
      console.log('Token可能过期，尝试刷新...');
      try {
        await refreshMesToken();

        // 使用新token重试
        response = await fetch('http://192.168.33.112:43352/api/ExRESTful/mESFrontEnd/workOrder', {
          method: 'POST',
          headers: {
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'zh-Hans',
            'Authorization': `Bearer ${mesToken}`,
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Content-Type': 'application/json',
            'Origin': 'http://192.168.33.112:9527',
            'Pragma': 'no-cache',
            'Referer': 'http://192.168.33.112:9527/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
          },
          body: JSON.stringify(workOrderData)
        });
      } catch (refreshError) {
        console.error('Token刷新失败:', refreshError);
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MES系统响应错误: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    res.json(result);
  } catch (error) {
    console.error('MES代理请求失败:', error);
    res.status(500).json({
      error: error.message,
      details: '请检查MES系统是否正常运行'
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 GUNT后端服务启动成功！`);
  console.log(`📡 服务地址: http://localhost:${PORT}`);
  console.log(`💾 数据库: MySQL (${dbConfig.host}:${dbConfig.database})`);
});

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n正在关闭数据库连接池...');
  await pool.end();
  console.log('数据库连接池已关闭。');
  process.exit(0);
});
