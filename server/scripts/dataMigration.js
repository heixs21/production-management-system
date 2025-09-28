// 数据迁移脚本
const { pool } = require('../database');

async function migrateExistingData() {
  try {
    console.log('开始数据迁移...');
    
    // 将所有现有数据标记为和泰链运
    await pool.execute('UPDATE machines SET companyId = ? WHERE companyId IS NULL OR companyId = ""', ['hetai-logistics']);
    await pool.execute('UPDATE orders SET companyId = ? WHERE companyId IS NULL OR companyId = ""', ['hetai-logistics']);
    await pool.execute('UPDATE materials SET companyId = ? WHERE companyId IS NULL OR companyId = ""', ['hetai-logistics']);
    await pool.execute('UPDATE production_reports SET companyId = ? WHERE companyId IS NULL OR companyId = ""', ['hetai-logistics']);
    await pool.execute('UPDATE shifts SET companyId = ? WHERE companyId IS NULL OR companyId = ""', ['hetai-logistics']);
    await pool.execute('UPDATE users SET companyId = ?, companyName = ? WHERE companyId IS NULL OR companyId = ""', ['hetai-logistics', '和泰链运']);
    
    console.log('✅ 数据迁移完成');
    console.log('📊 所有现有数据已标记为"和泰链运"');
    
    // 显示迁移统计
    const [machines] = await pool.execute('SELECT COUNT(*) as count FROM machines WHERE companyId = ?', ['hetai-logistics']);
    const [orders] = await pool.execute('SELECT COUNT(*) as count FROM orders WHERE companyId = ?', ['hetai-logistics']);
    const [materials] = await pool.execute('SELECT COUNT(*) as count FROM materials WHERE companyId = ?', ['hetai-logistics']);
    
    console.log(`📈 迁移统计:`);
    console.log(`   - 机台: ${machines[0].count} 条`);
    console.log(`   - 工单: ${orders[0].count} 条`);
    console.log(`   - 物料: ${materials[0].count} 条`);
    
  } catch (error) {
    console.error('❌ 数据迁移失败:', error);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  migrateExistingData().then(() => {
    process.exit(0);
  });
}

module.exports = { migrateExistingData };