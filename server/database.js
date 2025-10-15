const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Hota@123456',
  database: process.env.DB_NAME || 'gunt_db',
  charset: 'utf8mb4',
  timezone: '+00:00',
  dateStrings: true
};

const pool = mysql.createPool(dbConfig);

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

module.exports = { pool, initDatabase };