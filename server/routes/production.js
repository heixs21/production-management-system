const express = require('express');
const { pool } = require('../database');
const { authenticateToken } = require('../auth');

const router = express.Router();

// 产量上报API
router.get('/production-reports/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const [reports] = await pool.execute(`
      SELECT * FROM production_reports 
      WHERE orderId = ? 
      ORDER BY reportDate DESC, shiftName
    `, [orderId]);
    res.json(reports || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 检查产量上报情况（整个工单）
router.get('/production-reports/:orderId/check', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const [reports] = await pool.execute(`
      SELECT COUNT(*) as reportCount, SUM(quantity) as totalQuantity 
      FROM production_reports 
      WHERE orderId = ? AND quantity > 0
    `, [orderId]);
    
    const hasReports = reports[0].reportCount > 0;
    const totalQuantity = reports[0].totalQuantity || 0;
    
    res.json({ 
      hasReports, 
      reportCount: reports[0].reportCount,
      totalQuantity 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 检查指定日期的产量上报情况
router.get('/production-reports/:orderId/check-date', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: '缺少日期参数' });
    }
    
    const [reports] = await pool.execute(`
      SELECT COUNT(*) as reportCount, SUM(quantity) as totalQuantity 
      FROM production_reports 
      WHERE orderId = ? AND reportDate = ? AND quantity > 0
    `, [orderId, date]);
    
    const hasReports = reports[0].reportCount > 0;
    const totalQuantity = reports[0].totalQuantity || 0;
    
    res.json({ 
      hasReports, 
      reportCount: reports[0].reportCount,
      totalQuantity,
      date 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/production-reports', authenticateToken, async (req, res) => {
  try {
    const { orderId, shiftName, reportDate, quantity } = req.body;
    await pool.execute(`
      INSERT INTO production_reports (orderId, shiftName, reportDate, quantity) 
      VALUES (?, ?, ?, ?) 
      ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), updated_at = CURRENT_TIMESTAMP
    `, [orderId, shiftName, reportDate, quantity]);
    res.json({ message: '产量上报成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/shifts/:machineId', authenticateToken, async (req, res) => {
  try {
    const { machineId } = req.params;
    const [shifts] = await pool.execute('SELECT * FROM shifts WHERE machineId = ? ORDER BY sortOrder, name', [machineId]);
    res.json(shifts || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/shifts', authenticateToken, async (req, res) => {
  try {
    const { machineId, name } = req.body;
    const [maxOrder] = await pool.execute('SELECT COALESCE(MAX(sortOrder), 0) + 1 as nextOrder FROM shifts WHERE machineId = ?', [machineId]);
    const [result] = await pool.execute('INSERT INTO shifts (machineId, name, sortOrder) VALUES (?, ?, ?)', [machineId, name, maxOrder[0].nextOrder]);
    res.json({ id: result.insertId, machineId, name, sortOrder: maxOrder[0].nextOrder });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/shifts/:shiftId', authenticateToken, async (req, res) => {
  try {
    const { shiftId } = req.params;
    await pool.execute('DELETE FROM shifts WHERE id = ?', [shiftId]);
    res.json({ message: '班次删除成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;