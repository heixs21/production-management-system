require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const fetch = require('node-fetch');
const { getOrderQuantity, getWmsTokenStatus, clearWmsToken } = require('./wmsApi');

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

    // 添加下达状态字段
    try {
      await connection.execute(`
        ALTER TABLE orders ADD COLUMN isSubmitted BOOLEAN DEFAULT FALSE
      `);
      console.log('✅ 添加 isSubmitted 字段成功');
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ isSubmitted 字段可能已存在');
      }
    }

    // 添加组件描述字段
    try {
      await connection.execute(`
        ALTER TABLE orders ADD COLUMN componentDescription TEXT
      `);
      console.log('✅ 添加 componentDescription 字段成功');
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ componentDescription 字段可能已存在');
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
      orderComponent: row.orderComponent,
      componentDescription: row.componentDescription,
      isSubmitted: Boolean(row.isSubmitted)
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
      producedDays, remainingDays, originalOrderId, orderComponent, componentDescription, isSubmitted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

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
      order.componentDescription || null,
      order.isSubmitted ? 1 : 0
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
      producedDays = ?, remainingDays = ?, originalOrderId = ?, orderComponent = ?, componentDescription = ?, isSubmitted = ?
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
      order.componentDescription || null,
      order.isSubmitted ? 1 : 0,
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

const tokenSecurity = require('./tokenSecurity');

// 服务标识
const MES_SERVICE = 'mes_system';
const SAP_SERVICE = 'sap_system';

// MES配置
const MES_CONFIG = {
  tokenUrl: 'http://192.168.33.112:43352/connect/token',
  apiUrl: 'http://192.168.33.112:43352/api/ExRESTful/mESFrontEnd/workOrder',
  username: process.env.MES_USERNAME || '',
  password: process.env.MES_PASSWORD || '',
  clientId: 'AGVPlatform_App',
};

// 获取新的MES Token
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
    tokenSecurity.storeToken(MES_SERVICE, tokenData.access_token, 60); // MES Token有效期更长
    console.log('✅ MES Token刷新成功');
    return tokenData.access_token;
  } catch (error) {
    console.error('❌ MES Token刷新失败: [错误信息已隐藏]');
    throw new Error('MES认证失败');
  }
}

// 获取MES Token
function getMesToken() {
  const token = tokenSecurity.getToken(MES_SERVICE);
  return token;
}

// 确保MES认证有效
async function ensureMesAuth() {
  const token = getMesToken();
  if (token) {
    return token;
  }
  return await refreshMesToken();
}

// 手动刷新MES token的API
app.post('/api/mes/refresh-token', async (req, res) => {
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

// MES Token状态查询API
app.get('/api/mes/token-status', (req, res) => {
  const status = tokenSecurity.getTokenStatus(MES_SERVICE);
  res.json(status);
});

// 清除MES Token API
app.post('/api/mes/clear-token', (req, res) => {
  tokenSecurity.clearToken(MES_SERVICE);
  res.json({ success: true, message: 'MES Token已清除' });
});

// SAP认证信息结构
const sapAuthStructure = {
  csrfToken: null,
  sessionCookie: null
};

// SAP认证配置
const SAP_CONFIG = {
  username: process.env.SAP_USERNAME,
  password: process.env.SAP_PASSWORD,
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
    
    if (response.status === 200) {
      const csrfToken = response.headers.get('x-csrf-token');
      
      let sessionCookie = null;
      const cookieHeader = response.headers.get('set-cookie');
      
      if (cookieHeader) {
        const cookies = Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader];
        for (const cookie of cookies) {
          if (cookie.includes('SAP_SESSIONID_PS4_100')) {
            const match = cookie.match(/SAP_SESSIONID_PS4_100=([^;]+)/);
            if (match) {
              sessionCookie = `SAP_SESSIONID_PS4_100=${match[1]}`;
              break;
            }
          }
        }
      }
      
      if (csrfToken && sessionCookie) {
        const authData = JSON.stringify({ csrfToken, sessionCookie });
        tokenSecurity.storeToken(SAP_SERVICE, authData, 30);
        console.log('✅ SAP认证信息更新成功');
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('❌ 获取SAP认证失败: [错误信息已隐藏]');
    return false;
  }
}

// 获取SAP认证信息
function getSapAuthData() {
  const authData = tokenSecurity.getToken(SAP_SERVICE);
  if (authData) {
    try {
      return JSON.parse(authData);
    } catch (e) {
      return null;
    }
  }
  return null;
}

// 检查并刷新SAP认证
async function ensureSapAuth() {
  const authData = getSapAuthData();
  if (authData && authData.csrfToken && authData.sessionCookie) {
    return true;
  }
  return await getSapAuth();
}

// SAP RFC系统代理API
app.post('/api/sap/order-material', async (req, res) => {
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
    
    // 调用Python脚本
    const pythonScript = path.join(__dirname, 'sap_rfc.py');
    const python = spawn('python', [pythonScript, orderNo], {
      env: {
        ...process.env,
        SAP_RFC_USERNAME: process.env.SAP_RFC_USERNAME,
        SAP_RFC_PASSWORD: process.env.SAP_RFC_PASSWORD,
        PYTHONIOENCODING: 'utf-8'
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
        console.error('Python脚本执行失败:', errorOutput);
        return res.status(500).json({
          success: false,
          error: 'SAP RFC连接失败'
        });
      }

      try {
        const result = JSON.parse(output);
        
        if (result.success) {
          // 构建组件描述字符串
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
        console.error('JSON解析失败:', parseError);
        res.status(500).json({
          success: false,
          error: '数据解析失败'
        });
      }
    });

  } catch (error) {
    console.error('SAP RFC请求失败:', error);
    res.status(500).json({
      success: false,
      error: 'SAP RFC系统连接失败'
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
      error: 'SAP认证刷新失败'
    });
  }
});

// SAP Token状态查询API
app.get('/api/sap/token-status', (req, res) => {
  const status = tokenSecurity.getTokenStatus(SAP_SERVICE);
  res.json(status);
});

// 清除SAP Token API
app.post('/api/sap/clear-token', (req, res) => {
  tokenSecurity.clearToken(SAP_SERVICE);
  res.json({ success: true, message: 'SAP Token已清除' });
});

// 手动更新WMS报工数量的API
app.post('/api/wms/update-quantities', async (req, res) => {
  try {
    const [orders] = await pool.execute(
      "SELECT id, orderNo FROM orders WHERE status IN ('生产中', '延期生产中') AND orderNo IS NOT NULL"
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

// WMS Token状态查询API
app.get('/api/wms/token-status', (req, res) => {
  const status = getWmsTokenStatus();
  res.json(status);
});

// 清除WMS Token API
app.post('/api/wms/clear-token', (req, res) => {
  clearWmsToken();
  res.json({ success: true, message: 'WMS Token已清除' });
});

// MES系统代理API
app.post('/api/mes/workOrder', async (req, res) => {
  try {
    const workOrderData = req.body;

    // 确保有有效的MES Token
    let mesToken = await ensureMesAuth();
    
    // 尝试使用当前token下达工单
    let response = await fetch(MES_CONFIG.apiUrl, {
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
        mesToken = await refreshMesToken();
        response = await fetch(MES_CONFIG.apiUrl, {
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
        console.error('Token刷新失败: [错误信息已隐藏]');
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MES系统响应错误: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    res.json(result);
  } catch (error) {
    console.error('MES代理请求失败: [错误信息已隐藏]');
    res.status(500).json({
      error: 'MES系统连接失败',
      details: '请检查MES系统是否正常运行'
    });
  }
});

// 定时更新WMS报工数量
async function updateWmsQuantities() {
  try {
    const [orders] = await pool.execute(
      "SELECT id, orderNo FROM orders WHERE status IN ('生产中', '延期生产中') AND orderNo IS NOT NULL"
    );
    
    for (const order of orders) {
      try {
        const quantity = await getOrderQuantity(order.orderNo);
        await pool.execute(
          'UPDATE orders SET reportedQuantity = ? WHERE id = ?',
          [quantity, order.id]
        );
        console.log(`✅ 更新工单 ${order.orderNo} 报工数量: ${quantity}`);
      } catch (error) {
        console.error(`❌ 更新工单 ${order.orderNo} 失败: [错误信息已隐藏]`);
      }
    }
  } catch (error) {
    console.error('❌ WMS数量更新任务失败:', error);
  }
}

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 GUNT后端服务启动成功！`);
  console.log(`📡 服务地址: http://localhost:${PORT}`);
  console.log(`💾 数据库: MySQL (${dbConfig.host}:${dbConfig.database})`);
  
  // 启动定时任务，每5分钟更新一次WMS数量
  setInterval(updateWmsQuantities, 5 * 60 * 1000);
  console.log('⏰ WMS数量同步任务已启动 (每5分钟执行一次)');
  
  // 立即执行一次
  setTimeout(updateWmsQuantities, 5000);
});

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n正在关闭数据库连接池...');
  await pool.end();
  console.log('数据库连接池已关闭。');
  process.exit(0);
});
