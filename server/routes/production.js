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