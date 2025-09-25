require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDatabase, pool } = require('./database');
const { getOrderQuantity } = require('./wmsApi');

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

// 定时更新WMS报工数量
async function updateWmsQuantities() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [orders] = await pool.execute(
      `SELECT id, orderNo FROM orders 
       WHERE orderNo IS NOT NULL 
         AND actualEndDate IS NULL 
         AND isPaused = 0 
         AND startDate <= ?`,
      [today]
    );
    
    for (const order of orders) {
      try {
        const quantity = await getOrderQuantity(order.orderNo);
        await pool.execute(
          'UPDATE orders SET reportedQuantity = ? WHERE id = ?',
          [quantity, order.id]
        );
      } catch (error) {
        // 忽略单个工单的错误
      }
    }
  } catch (error) {
    console.error('❌ WMS数量更新任务失败:', error);
  }
}

// 启动服务器
initDatabase();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 服务器运行在 http://0.0.0.0:${PORT}`);
  console.log(`💾 数据库: MySQL`);
  console.log(`👤 默认账户:`);
  console.log(`   - admin/admin123 (管理员)`);
  console.log(`   - user/user123 (只读)`);
  console.log(`   - operator/op123 (操作员)`);
  
  // 启动定时任务
  setInterval(updateWmsQuantities, 5 * 60 * 1000);
  setTimeout(updateWmsQuantities, 5000);
});

process.on('SIGINT', async () => {
  console.log('\n正在关闭服务器...');
  await pool.end();
  process.exit(0);
});