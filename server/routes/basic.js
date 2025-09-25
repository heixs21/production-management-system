const express = require('express');
const jwt = require('jsonwebtoken');
const { pool } = require('../database');
const { authenticateToken, requireAdmin, JWT_SECRET } = require('../auth');

const router = express.Router();

// 用户认证
router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [users] = await pool.execute(
      'SELECT id, username, role, permissions, allowedMachines FROM users WHERE username = ? AND password = ?',
      [username, password]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    const user = users[0];
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role,
        permissions: user.permissions,
        allowedMachines: user.allowedMachines
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
        allowedMachines: user.allowedMachines
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 机台管理
router.get('/machines', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM machines ORDER BY id');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/machines', async (req, res) => {
  try {
    const { name, machineGroup, lineCode, status, oee, coefficient } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO machines (name, machineGroup, lineCode, status, oee, coefficient) VALUES (?, ?, ?, ?, ?, ?)',
      [name, machineGroup || null, lineCode || null, status || '正常', oee || 0.85, coefficient || 1.00]
    );
    
    // 为新机台创建默认班次
    await pool.execute('INSERT INTO shifts (machineId, name, sortOrder) VALUES (?, ?, ?)', [result.insertId, '白班', 1]);
    await pool.execute('INSERT INTO shifts (machineId, name, sortOrder) VALUES (?, ?, ?)', [result.insertId, '夜班', 2]);
    
    res.json({
      id: result.insertId,
      name,
      machineGroup: machineGroup || null,
      lineCode: lineCode || null,
      status: status || '正常',
      oee: oee || 0.85,
      coefficient: coefficient || 1.00
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/machines/:id', async (req, res) => {
  try {
    const { name, machineGroup, lineCode, status, oee, coefficient } = req.body;
    await pool.execute(
      'UPDATE machines SET name = ?, machineGroup = ?, lineCode = ?, status = ?, oee = ?, coefficient = ? WHERE id = ?',
      [name, machineGroup || null, lineCode || null, status, oee, coefficient || 1.00, req.params.id]
    );
    res.json({ message: '更新成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/machines/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM machines WHERE id = ?', [req.params.id]);
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 用户管理
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, username, role, permissions, allowedMachines, created_at FROM users ORDER BY id');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { username, password, role, permissions, allowedMachines } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO users (username, password, role, permissions, allowedMachines) VALUES (?, ?, ?, ?, ?)',
      [username, password, role || 'user', JSON.stringify(permissions || []), JSON.stringify(allowedMachines || [])]
    );
    res.json({ id: result.insertId, username, role: role || 'user' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { username, password, role, permissions, allowedMachines } = req.body;
    await pool.execute(
      'UPDATE users SET username = ?, password = ?, role = ?, permissions = ?, allowedMachines = ? WHERE id = ?',
      [username, password, role, JSON.stringify(permissions), JSON.stringify(allowedMachines), req.params.id]
    );
    res.json({ message: '更新成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;