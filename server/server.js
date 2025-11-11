require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { initDatabase, pool } = require('./database');
const { getOrderQuantity } = require('./wmsApi');
const websocketService = require('./websocketService');
const opcuaManager = require('./opcuaService');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 12454;

// 中间件
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://192.168.1.114:3000',
    'http://192.168.1.114',
    'http://192.168.36.9:3000',
    'http://192.168.100.30:3000',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// 路由
app.use('/api', require('./routes/basic'));
app.use('/api', require('./routes/orders'));
app.use('/api', require('./routes/materials'));
app.use('/api', require('./routes/production'));
app.use('/api', require('./routes/external'));
app.use('/api', require('./routes/opcua'));
app.use('/api', require('./routes/database-monitor')); // 数据库监控API

// 定时更新WMS报工数量（仅针对和泰链运）
async function updateWmsQuantities() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [orders] = await pool.execute(
      `SELECT id, orderNo FROM orders 
       WHERE orderNo IS NOT NULL 
         AND actualEndDate IS NULL 
         AND isPaused = 0 
         AND startDate <= ?
         AND companyId = 'hetai-logistics'`,
      [today]
    );
    
    if (orders.length === 0) {
      return; // 没有需要更新的工单
    }
    
    for (const order of orders) {
      try {
        const quantity = await getOrderQuantity(order.orderNo);
        await pool.execute(
          'UPDATE orders SET reportedQuantity = ? WHERE id = ?',
          [quantity, order.id]
        );
      } catch (error) {
        // 静默忽略单个工单的错误
      }
    }
  } catch (error) {
    // 静默处理错误，不输出日志
  }
}

// 启动服务器
initDatabase();

// 初始化 WebSocket 服务
websocketService.initialize(server);

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 服务器运行在 http://0.0.0.0:${PORT}`);
  console.log(`💾 数据库: MySQL`);
  console.log(`🔌 WebSocket: ws://0.0.0.0:${PORT}/ws/machine-status`);
  console.log(`👤 默认账户:`);
  console.log(`   🚚 和泰链运:`);
  console.log(`     - admin/admin123 (管理员)`);
  console.log(`     - user/user123 (只读)`);
  console.log(`     - operator/op123 (操作员)`);
  console.log(`   ⚙️ 和泰机电:`);
  console.log(`     - mech-admin/admin123 (管理员)`);
  console.log(`     - mech-user/admin123 (用户)`);
  
  // 启动定时任务（仅针对和泰链运）
  setInterval(updateWmsQuantities, 5 * 60 * 1000);
  setTimeout(updateWmsQuantities, 5000); // 延迟5秒启动
  
  // 延迟10秒后自动连接所有已启用 OPC UA 的机台
  setTimeout(async () => {
    try {
      const [machines] = await pool.execute(
        'SELECT id, name, opcuaEnabled, opcuaEndpoint, opcuaNodeId FROM machines WHERE opcuaEnabled = TRUE'
      );
      
      if (machines.length > 0) {
        console.log(`\n🔄 正在自动连接 ${machines.length} 台启用了 OPC UA 的机台...`);
        for (const machine of machines) {
          try {
            await opcuaManager.connectMachine(machine);
          } catch (error) {
            console.error(`❌ 自动连接机台 ${machine.name} 失败:`, error.message);
          }
        }
      }
    } catch (error) {
      console.error('❌ 自动连接 OPC UA 机台失败:', error);
    }
  }, 10000);
});

process.on('SIGINT', async () => {
  console.log('\n正在关闭服务器...');
  
  // 断开所有 OPC UA 连接
  try {
    await opcuaManager.disconnectAll();
    console.log('✅ 已断开所有 OPC UA 连接');
  } catch (error) {
    console.error('❌ 断开 OPC UA 连接失败:', error);
  }
  
  await pool.end();
  process.exit(0);
});