const express = require('express');
const { pool, checkPoolHealth } = require('../database');
const { authenticateToken } = require('../auth');

const router = express.Router();

// ========================================
// 数据库性能监控API
// ========================================

/**
 * 获取数据库连接池状态
 */
router.get('/database/pool-status', authenticateToken, async (req, res) => {
  try {
    // 需要管理员权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: '权限不足' });
    }

    // 获取连接池状态
    const poolInfo = {
      totalConnections: pool.pool._allConnections.length,
      activeConnections: pool.pool._allConnections.length - pool.pool._freeConnections.length,
      idleConnections: pool.pool._freeConnections.length,
      queuedRequests: pool.pool._connectionQueue.length,
      config: {
        connectionLimit: pool.pool.config.connectionLimit,
        waitForConnections: pool.pool.config.waitForConnections,
        queueLimit: pool.pool.config.queueLimit
      }
    };

    // 健康检查
    const isHealthy = await checkPoolHealth();

    res.json({
      success: true,
      pool: poolInfo,
      healthy: isHealthy,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * 获取数据库表大小和行数统计
 */
router.get('/database/table-stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: '权限不足' });
    }

    const [tables] = await pool.execute(`
      SELECT 
        TABLE_NAME as tableName,
        TABLE_ROWS as rowCount,
        ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS totalSize,
        ROUND(DATA_LENGTH / 1024 / 1024, 2) AS dataSize,
        ROUND(INDEX_LENGTH / 1024 / 1024, 2) AS indexSize,
        ROUND(DATA_FREE / 1024 / 1024, 2) AS fragmentedSize,
        ENGINE as engine,
        CREATE_TIME as createdAt,
        UPDATE_TIME as updatedAt
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC
    `);

    res.json({
      success: true,
      tables,
      totalTables: tables.length,
      totalSize: tables.reduce((sum, t) => sum + parseFloat(t.totalSize || 0), 0).toFixed(2) + ' MB',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * 获取索引使用情况
 */
router.get('/database/index-stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: '权限不足' });
    }

    const [indexes] = await pool.execute(`
      SELECT 
        TABLE_NAME as tableName,
        INDEX_NAME as indexName,
        GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as columns,
        INDEX_TYPE as indexType,
        NON_UNIQUE as nonUnique,
        CARDINALITY as cardinality
      FROM information_schema.STATISTICS 
      WHERE TABLE_SCHEMA = DATABASE()
      GROUP BY TABLE_NAME, INDEX_NAME, INDEX_TYPE, NON_UNIQUE
      ORDER BY TABLE_NAME, INDEX_NAME
    `);

    res.json({
      success: true,
      indexes,
      totalIndexes: indexes.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * 获取最近的慢查询（如果启用）
 */
router.get('/database/slow-queries', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: '权限不足' });
    }

    // 检查是否启用慢查询日志
    const [slowLogStatus] = await pool.execute(`
      SHOW VARIABLES LIKE 'slow_query_log'
    `);

    const [longQueryTime] = await pool.execute(`
      SHOW VARIABLES LIKE 'long_query_time'
    `);

    res.json({
      success: true,
      slowQueryLog: {
        enabled: slowLogStatus[0]?.Value === 'ON',
        threshold: parseFloat(longQueryTime[0]?.Value || 10)
      },
      message: slowLogStatus[0]?.Value === 'ON' 
        ? '慢查询日志已启用，请查看服务器日志文件' 
        : '慢查询日志未启用，建议在my.cnf中配置',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * 优化表（OPTIMIZE TABLE）
 */
router.post('/database/optimize-table', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: '权限不足' });
    }

    const { tableName } = req.body;

    if (!tableName) {
      return res.status(400).json({ 
        success: false, 
        error: '请指定表名' 
      });
    }

    // 安全检查：验证表名
    const [tables] = await pool.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    `, [tableName]);

    if (tables.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: '表不存在' 
      });
    }

    // 执行优化
    const startTime = Date.now();
    await pool.execute(`OPTIMIZE TABLE \`${tableName}\``);
    const duration = Date.now() - startTime;

    res.json({
      success: true,
      tableName,
      duration: `${duration}ms`,
      message: '表优化完成',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * 分析表（ANALYZE TABLE）
 */
router.post('/database/analyze-table', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: '权限不足' });
    }

    const { tableName } = req.body;

    if (!tableName) {
      return res.status(400).json({ 
        success: false, 
        error: '请指定表名' 
      });
    }

    // 安全检查
    const [tables] = await pool.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    `, [tableName]);

    if (tables.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: '表不存在' 
      });
    }

    // 执行分析
    const startTime = Date.now();
    await pool.execute(`ANALYZE TABLE \`${tableName}\``);
    const duration = Date.now() - startTime;

    res.json({
      success: true,
      tableName,
      duration: `${duration}ms`,
      message: '表分析完成，统计信息已更新',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * 获取数据库综合健康报告
 */
router.get('/database/health-report', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: '权限不足' });
    }

    // 1. 连接池状态
    const poolHealthy = await checkPoolHealth();

    // 2. 表统计
    const [tables] = await pool.execute(`
      SELECT COUNT(*) as count, 
             SUM(TABLE_ROWS) as totalRows,
             ROUND(SUM(DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) as totalSizeMB
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
    `);

    // 3. 索引统计
    const [indexes] = await pool.execute(`
      SELECT COUNT(DISTINCT CONCAT(TABLE_NAME, '.', INDEX_NAME)) as count
      FROM information_schema.STATISTICS 
      WHERE TABLE_SCHEMA = DATABASE()
    `);

    // 4. 检查碎片
    const [fragmented] = await pool.execute(`
      SELECT COUNT(*) as count
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND DATA_FREE > 0 
        AND ENGINE = 'InnoDB'
    `);

    res.json({
      success: true,
      health: {
        poolHealthy,
        database: {
          tables: tables[0].count,
          totalRows: tables[0].totalRows,
          totalSize: tables[0].totalSizeMB + ' MB'
        },
        indexes: {
          total: indexes[0].count
        },
        maintenance: {
          fragmentedTables: fragmented[0].count,
          needOptimize: fragmented[0].count > 0
        }
      },
      recommendations: [
        fragmented[0].count > 0 ? '建议优化有碎片的表' : null,
        tables[0].totalRows > 100000 ? '数据量较大，建议定期清理历史数据' : null,
      ].filter(Boolean),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;

