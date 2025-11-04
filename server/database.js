const mysql = require('mysql2/promise');

// ========================================
// 数据库连接配置（已优化）
// ========================================
const dbConfig = {
  // 基础配置
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Hota@123456',
  database: process.env.DB_NAME || 'gunt_db',
  port: process.env.DB_PORT || 3306,
  
  // 字符集和时区
  charset: 'utf8mb4',
  timezone: '+00:00',
  dateStrings: true,
  
  // ========================================
  // 连接池优化配置
  // ========================================
  
  // 连接池配置
  waitForConnections: true,              // 连接池满时等待而不是立即报错
  connectionLimit: 20,                    // 最大连接数（根据服务器配置调整）
  maxIdle: 10,                            // 最大空闲连接数
  idleTimeout: 60000,                     // 空闲连接超时时间（60秒）
  queueLimit: 0,                          // 等待队列长度限制（0=无限制）
  
  // 连接保活
  enableKeepAlive: true,                  // 启用TCP keepalive
  keepAliveInitialDelay: 0,               // keepalive初始延迟（0=立即开始）
  
  // 性能优化
  multipleStatements: false,              // 禁用多语句查询（安全考虑）
  namedPlaceholders: true,                // 启用命名占位符
  
  // 连接超时设置
  connectTimeout: 10000,                  // 连接超时（10秒）
  acquireTimeout: 10000,                  // 获取连接超时（10秒）
  timeout: 60000,                         // 查询超时（60秒）
  
  // SSL配置（生产环境建议启用）
  // ssl: {
  //   rejectUnauthorized: false
  // },
  
  // 调试模式（开发环境可启用）
  debug: process.env.DB_DEBUG === 'true' ? ['ComQueryPacket', 'RowDataPacket'] : false,
};

// 创建连接池
const pool = mysql.createPool(dbConfig);

// ========================================
// 连接池事件监听（监控和日志）
// ========================================

// 监听连接获取
pool.on('acquire', (connection) => {
  if (process.env.DB_DEBUG === 'true') {
    console.log('📊 [DB] 连接已获取, ID:', connection.threadId);
  }
});

// 监听连接释放
pool.on('release', (connection) => {
  if (process.env.DB_DEBUG === 'true') {
    console.log('📤 [DB] 连接已释放, ID:', connection.threadId);
  }
});

// 监听连接队列
pool.on('enqueue', () => {
  if (process.env.DB_DEBUG === 'true') {
    console.log('⏳ [DB] 等待可用连接...');
  }
});

// ========================================
// 连接池健康检查
// ========================================

async function checkPoolHealth() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ [DB] 连接池健康检查失败:', error.message);
    return false;
  }
}

// 定期健康检查（每30秒）
setInterval(async () => {
  const isHealthy = await checkPoolHealth();
  if (!isHealthy) {
    console.warn('⚠️ [DB] 连接池不健康，请检查数据库连接');
  }
}, 30000);

// ========================================
// 慢查询日志记录
// ========================================

const originalExecute = pool.execute.bind(pool);
pool.execute = async function(...args) {
  const startTime = Date.now();
  try {
    const result = await originalExecute(...args);
    const duration = Date.now() - startTime;
    
    // 记录慢查询（超过1秒）
    if (duration > 1000) {
      console.warn(`⚠️ [DB] 慢查询 (${duration}ms):`, args[0].substring(0, 100));
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [DB] 查询失败 (${duration}ms):`, error.message);
    throw error;
  }
};

async function initDatabase() {
  try {
    const connection = await pool.getConnection();

    // 创建基础表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS machines (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        machineGroup VARCHAR(255),
        lineCode VARCHAR(255),
        status VARCHAR(50) DEFAULT '正常',
        oee DECIMAL(3,2) DEFAULT 0.85,
        coefficient DECIMAL(5,2) DEFAULT 1.00,
        requiresProductionReport BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

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
        producedDays INT DEFAULT 0,
        remainingDays INT DEFAULT 0,
        originalOrderId INT,
        orderComponent VARCHAR(255),
        componentDescription TEXT,
        isSubmitted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_machine_order (machine, orderNo)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

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

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        permissions JSON,
        allowedMachines JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS production_reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        orderId INT NOT NULL,
        shiftName VARCHAR(50) NOT NULL,
        reportDate DATE NOT NULL,
        quantity INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_report (orderId, shiftName, reportDate)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS shifts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        machineId INT NOT NULL,
        name VARCHAR(50) NOT NULL,
        sortOrder INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_machine_shift (machineId, name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 添加公司字段（安全方式）
    const addColumnSafely = async (table, column, definition) => {
      try {
        await connection.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      } catch (error) {
        if (error.code !== 'ER_DUP_FIELDNAME') {
          throw error;
        }
      }
    };

    await addColumnSafely('users', 'companyId', 'VARCHAR(50) DEFAULT "hetai-logistics"');
    await addColumnSafely('users', 'companyName', 'VARCHAR(100) DEFAULT "和泰链运"');
    await addColumnSafely('machines', 'companyId', 'VARCHAR(50) DEFAULT "hetai-logistics"');
    await addColumnSafely('orders', 'companyId', 'VARCHAR(50) DEFAULT "hetai-logistics"');
    await addColumnSafely('materials', 'companyId', 'VARCHAR(50) DEFAULT "hetai-logistics"');
    await addColumnSafely('production_reports', 'companyId', 'VARCHAR(50) DEFAULT "hetai-logistics"');
    await addColumnSafely('shifts', 'companyId', 'VARCHAR(50) DEFAULT "hetai-logistics"');
    
    // OPC UA 相关字段
    await addColumnSafely('machines', 'opcuaEnabled', 'BOOLEAN DEFAULT FALSE');
    await addColumnSafely('machines', 'opcuaEndpoint', 'VARCHAR(500)');
    await addColumnSafely('machines', 'opcuaNodeId', 'VARCHAR(255)');
    await addColumnSafely('machines', 'opcuaUsername', 'VARCHAR(100)');
    await addColumnSafely('machines', 'opcuaPassword', 'VARCHAR(255)');
    await addColumnSafely('machines', 'realtimeData', 'JSON');
  await addColumnSafely('machines', 'lastOpcuaUpdate', 'TIMESTAMP NULL');
  await addColumnSafely('machines', 'autoAdjustOrders', 'BOOLEAN DEFAULT TRUE');

    // 创建默认用户 - 和泰链运
    const [existingAdmin] = await connection.execute('SELECT id FROM users WHERE username = ?', ['admin']);
    if (existingAdmin.length === 0) {
      await connection.execute(
        'INSERT INTO users (username, password, role, permissions, allowedMachines, companyId, companyName) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['admin', 'admin123', 'admin', JSON.stringify(['all']), JSON.stringify(['all']), 'hetai-logistics', '和泰链运']
      );
    }

    const [existingUser] = await connection.execute('SELECT id FROM users WHERE username = ?', ['user']);
    if (existingUser.length === 0) {
      await connection.execute(
        'INSERT INTO users (username, password, role, permissions, allowedMachines, companyId, companyName) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['user', 'user123', 'user', JSON.stringify(['orders.read', 'machines.read', 'board']), JSON.stringify(['all']), 'hetai-logistics', '和泰链运']
      );
    }

    const [existingOperator] = await connection.execute('SELECT id FROM users WHERE username = ?', ['operator']);
    if (existingOperator.length === 0) {
      await connection.execute(
        'INSERT INTO users (username, password, role, permissions, allowedMachines, companyId, companyName) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['operator', 'op123', 'user', JSON.stringify(['orders.write', 'machines.read', 'board']), JSON.stringify(['all']), 'hetai-logistics', '和泰链运']
      );
    }

    // 创建和泰机电的初始管理员账户
    const [existingMechAdmin] = await connection.execute('SELECT id FROM users WHERE username = ? AND companyId = ?', ['mech-admin', 'hetai-mechanical']);
    if (existingMechAdmin.length === 0) {
      await connection.execute(
        'INSERT INTO users (username, password, role, permissions, allowedMachines, companyId, companyName) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['mech-admin', 'admin123', 'admin', JSON.stringify(['all']), JSON.stringify(['all']), 'hetai-mechanical', '和泰机电']
      );
    }

    const [existingMechUser] = await connection.execute('SELECT id FROM users WHERE username = ? AND companyId = ?', ['mech-user', 'hetai-mechanical']);
    if (existingMechUser.length === 0) {
      await connection.execute(
        'INSERT INTO users (username, password, role, permissions, allowedMachines, companyId, companyName) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['mech-user', 'admin123', 'user', JSON.stringify(['orders.read', 'machines.read', 'board']), JSON.stringify(['all']), 'hetai-mechanical', '和泰机电']
      );
    }



    // 添加 requiresProductionReport 字段（如果不存在）
    try {
      await connection.execute(`
        ALTER TABLE machines 
        ADD COLUMN IF NOT EXISTS requiresProductionReport BOOLEAN DEFAULT FALSE
      `);
    } catch (error) {
      // 忽略字段已存在的错误
      if (!error.message.includes('Duplicate column')) {
        console.log('添加 requiresProductionReport 字段:', error.message);
      }
    }

    // 为现有机台创建默认班次（只在不存在时创建）
    const [machines] = await connection.execute('SELECT id FROM machines');
    for (const machine of machines) {
      await connection.execute('INSERT IGNORE INTO shifts (machineId, name, sortOrder) VALUES (?, ?, ?)', [machine.id, '白班', 1]);
      await connection.execute('INSERT IGNORE INTO shifts (machineId, name, sortOrder) VALUES (?, ?, ?)', [machine.id, '夜班', 2]);
    }

    connection.release();
    console.log('✅ 数据库初始化完成');
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
  }
}

module.exports = { 
  pool, 
  initDatabase,
  checkPoolHealth 
};