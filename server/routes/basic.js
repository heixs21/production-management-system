const express = require('express');
const jwt = require('jsonwebtoken');
const { pool } = require('../database');
const { authenticateToken, requireAdmin, JWT_SECRET } = require('../auth');
const { addCompanyFilter } = require('../middleware/companyFilter');

const router = express.Router();

// 用户认证
router.post('/auth/login', async (req, res) => {
  try {
    const { username, password, companyId = 'hetai-logistics' } = req.body;
    const [users] = await pool.execute(
      'SELECT id, username, role, permissions, allowedMachines, companyId, companyName FROM users WHERE username = ? AND password = ?',
      [username, password]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    const user = users[0];
    
    // 更新用户的公司信息
    await pool.execute(
      'UPDATE users SET companyId = ? WHERE id = ?',
      [companyId, user.id]
    );
    
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role,
        permissions: user.permissions,
        allowedMachines: user.allowedMachines,
        companyId: companyId
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        permissions: user.permissions,
        allowedMachines: user.allowedMachines,
        companyId: companyId
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 机台管理
router.get('/machines', authenticateToken, addCompanyFilter, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM machines WHERE companyId = ? ORDER BY id', [req.companyId]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/machines', authenticateToken, addCompanyFilter, async (req, res) => {
  try {
    const { name, machineGroup, lineCode, status, oee, coefficient, autoAdjustOrders } = req.body;
    const autoAdjustValue = autoAdjustOrders === false ? 0 : 1;
    const [result] = await pool.execute(
      'INSERT INTO machines (name, machineGroup, lineCode, status, oee, coefficient, autoAdjustOrders, companyId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, machineGroup || null, lineCode || null, status || '正常', oee || 0.85, coefficient || 1.00, autoAdjustValue, req.companyId]
    );
    
    // 为新机台创建默认班次
    await pool.execute('INSERT INTO shifts (machineId, name, sortOrder, companyId) VALUES (?, ?, ?, ?)', [result.insertId, '白班', 1, req.companyId]);
    await pool.execute('INSERT INTO shifts (machineId, name, sortOrder, companyId) VALUES (?, ?, ?, ?)', [result.insertId, '夜班', 2, req.companyId]);
    
    res.json({
      id: result.insertId,
      name,
      machineGroup: machineGroup || null,
      lineCode: lineCode || null,
      status: status || '正常',
      oee: oee || 0.85,
      coefficient: coefficient || 1.00,
      autoAdjustOrders: autoAdjustValue === 1
    });
  } catch (error) {
    console.error('添加机台失败:', error);
    res.status(500).json({ error: '添加机台失败' });
  }
});

router.put('/machines/:id', authenticateToken, addCompanyFilter, async (req, res) => {
  try {
    const { name, machineGroup, lineCode, status, oee, coefficient, autoAdjustOrders } = req.body;
    const autoAdjustValue = autoAdjustOrders === false ? 0 : 1;
    await pool.execute(
      'UPDATE machines SET name = ?, machineGroup = ?, lineCode = ?, status = ?, oee = ?, coefficient = ?, autoAdjustOrders = ? WHERE id = ? AND companyId = ?',
      [name, machineGroup || null, lineCode || null, status, oee, coefficient || 1.00, autoAdjustValue, req.params.id, req.companyId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('更新机台失败:', error);
    res.status(500).json({ error: '更新机台失败' });
  }
});

router.delete('/machines/:id', authenticateToken, addCompanyFilter, async (req, res) => {
  try {
    await pool.execute('DELETE FROM machines WHERE id = ? AND companyId = ?', [req.params.id, req.companyId]);
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 用户管理
router.get('/users', authenticateToken, requireAdmin, addCompanyFilter, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, username, role, permissions, allowedMachines, companyId, created_at FROM users WHERE companyId = ? ORDER BY id', [req.companyId]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/users', authenticateToken, requireAdmin, addCompanyFilter, async (req, res) => {
  try {
    const { username, password, role, permissions, allowedMachines } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO users (username, password, role, permissions, allowedMachines, companyId) VALUES (?, ?, ?, ?, ?, ?)',
      [username, password, role || 'user', JSON.stringify(permissions || []), JSON.stringify(allowedMachines || []), req.companyId]
    );
    res.json({ id: result.insertId, username, role: role || 'user', companyId: req.companyId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/users/:id', authenticateToken, requireAdmin, addCompanyFilter, async (req, res) => {
  try {
    const { username, password, role, permissions, allowedMachines } = req.body;
    await pool.execute(
      'UPDATE users SET username = ?, password = ?, role = ?, permissions = ?, allowedMachines = ? WHERE id = ? AND companyId = ?',
      [username, password, role, JSON.stringify(permissions), JSON.stringify(allowedMachines), req.params.id, req.companyId]
    );
    res.json({ message: '更新成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/users/:id', authenticateToken, requireAdmin, addCompanyFilter, async (req, res) => {
  try {
    await pool.execute('DELETE FROM users WHERE id = ? AND companyId = ?', [req.params.id, req.companyId]);
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;