const sqlite3 = require('sqlite3').verbose();
const mysql = require('mysql2/promise');
const path = require('path');

// MySQL配置
const mysqlConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root123@', // 请填入您的MySQL密码
  charset: 'utf8mb4'
};

const dbName = 'gunt_db';

async function migrateData() {
  let mysqlConnection;
  
  try {
    console.log('🚀 开始数据迁移...');
    
    // 连接MySQL
    mysqlConnection = await mysql.createConnection(mysqlConfig);
    
    // 创建数据库
    await mysqlConnection.query(`CREATE DATABASE IF NOT EXISTS ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await mysqlConnection.end();

    // 重新连接到指定数据库
    mysqlConnection = await mysql.createConnection({
      ...mysqlConfig,
      database: dbName
    });
    
    console.log('✅ MySQL数据库创建成功');
    
    // 创建表结构
    await createTables(mysqlConnection);
    
    // 迁移数据
    await migrateSQLiteData(mysqlConnection);
    
    console.log('🎉 数据迁移完成！');
    
  } catch (error) {
    console.error('❌ 迁移失败:', error);
  } finally {
    if (mysqlConnection) {
      await mysqlConnection.end();
    }
  }
}

async function createTables(connection) {
  console.log('📋 创建表结构...');
  
  // 创建machines表
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS machines (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      status VARCHAR(50) DEFAULT '正常',
      oee DECIMAL(3,2) DEFAULT 0.85,
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
  
  console.log('✅ 表结构创建完成');
}

async function migrateSQLiteData(mysqlConnection) {
  const sqliteDbPath = path.join(__dirname, 'gunt.db');
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(sqliteDbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      console.log('📂 连接SQLite数据库成功');
      
      // 迁移machines表
      db.all('SELECT * FROM machines', async (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        console.log(`📊 迁移 ${rows.length} 条机台数据...`);
        
        for (const row of rows) {
          try {
            await mysqlConnection.execute(
              'INSERT INTO machines (name, status, oee, created_at) VALUES (?, ?, ?, ?)',
              [row.name, row.status, row.oee, row.created_at]
            );
          } catch (error) {
            console.warn(`⚠️  机台数据迁移警告: ${error.message}`);
          }
        }
        
        // 迁移orders表
        db.all('SELECT * FROM orders', async (err, orderRows) => {
          if (err) {
            reject(err);
            return;
          }
          
          console.log(`📊 迁移 ${orderRows.length} 条工单数据...`);
          
          for (const row of orderRows) {
            try {
              await mysqlConnection.execute(`
                INSERT INTO orders (
                  machine, orderNo, materialNo, materialName, quantity, priority,
                  startDate, expectedEndDate, actualEndDate, reportedQuantity,
                  dailyReports, status, isUrgent, isPaused, pausedDate, resumedDate, delayReason, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `, [
                row.machine, row.orderNo, row.materialNo, row.materialName,
                row.quantity, row.priority, row.startDate, row.expectedEndDate,
                row.actualEndDate, row.reportedQuantity, row.dailyReports, row.status,
                row.isUrgent, row.isPaused, row.pausedDate, row.resumedDate, row.delayReason, row.created_at
              ]);
            } catch (error) {
              console.warn(`⚠️  工单数据迁移警告: ${error.message}`);
            }
          }
          
          // 迁移materials表
          db.all('SELECT * FROM materials', async (err, materialRows) => {
            if (err) {
              reject(err);
              return;
            }
            
            console.log(`📊 迁移 ${materialRows.length} 条物料数据...`);
            
            for (const row of materialRows) {
              try {
                await mysqlConnection.execute(
                  'INSERT INTO materials (category, feature, modelThickness, actualTakt, created_at) VALUES (?, ?, ?, ?, ?)',
                  [row.category, row.feature, row.modelThickness, row.actualTakt, row.created_at]
                );
              } catch (error) {
                console.warn(`⚠️  物料数据迁移警告: ${error.message}`);
              }
            }
            
            db.close();
            resolve();
          });
        });
      });
    });
  });
}

// 运行迁移
if (require.main === module) {
  migrateData();
}

module.exports = { migrateData };
