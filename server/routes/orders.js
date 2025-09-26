const express = require('express');
const { pool } = require('../database');
const { authenticateToken } = require('../auth');
const { addCompanyFilter } = require('../middleware/companyFilter');

const router = express.Router();

// 工单API
router.get('/orders', authenticateToken, addCompanyFilter, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM orders WHERE companyId = ? ORDER BY machine ASC, startDate ASC, priority ASC', [req.companyId]);
    
    let orders = rows.map(row => ({
      ...row,
      isUrgent: Boolean(row.isUrgent),
      isPaused: Boolean(row.isPaused),
      dailyReports: row.dailyReports || {},
      startDate: row.startDate,
      expectedEndDate: row.expectedEndDate,
      delayedExpectedEndDate: row.delayedExpectedEndDate,
      actualEndDate: row.actualEndDate,
      pausedDate: row.pausedDate,
      resumedDate: row.resumedDate,
      producedDays: row.producedDays || 0,
      remainingDays: row.remainingDays || 0,
      originalOrderId: row.originalOrderId || null,
      orderComponent: row.orderComponent,
      componentDescription: row.componentDescription,
      isSubmitted: Boolean(row.isSubmitted)
    }));
    
    if (req.user.role !== 'admin' && req.user.allowedMachines && !req.user.allowedMachines.includes('all')) {
      orders = orders.filter(order => req.user.allowedMachines.includes(order.machine));
    }
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/orders', authenticateToken, addCompanyFilter, async (req, res) => {
  try {
    const order = req.body;

    const sql = `INSERT INTO orders (
      machine, orderNo, materialNo, materialName, quantity, priority,
      startDate, expectedEndDate, delayedExpectedEndDate, actualEndDate, reportedQuantity,
      dailyReports, status, isUrgent, isPaused, pausedDate, resumedDate, delayReason,
      producedDays, remainingDays, originalOrderId, orderComponent, componentDescription, isSubmitted, companyId
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

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
      req.companyId
    ];

    const [result] = await pool.execute(sql, values);
    res.json({ id: result.insertId, ...order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/orders/:id', authenticateToken, addCompanyFilter, async (req, res) => {
  try {
    const order = req.body;
    const sql = `UPDATE orders SET
      machine = ?, orderNo = ?, materialNo = ?, materialName = ?, quantity = ?,
      priority = ?, startDate = ?, expectedEndDate = ?, delayedExpectedEndDate = ?, actualEndDate = ?,
      reportedQuantity = ?, dailyReports = ?, status = ?, isUrgent = ?,
      isPaused = ?, pausedDate = ?, resumedDate = ?, delayReason = ?,
      producedDays = ?, remainingDays = ?, originalOrderId = ?, orderComponent = ?, componentDescription = ?, isSubmitted = ?
      WHERE id = ? AND companyId = ?`;

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
      req.params.id,
      req.companyId
    ];

    await pool.execute(sql, values);
    res.json({ message: '更新成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/orders/:id', authenticateToken, addCompanyFilter, async (req, res) => {
  try {
    await pool.execute('DELETE FROM orders WHERE id = ? AND companyId = ?', [req.params.id, req.companyId]);
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;