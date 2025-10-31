const express = require('express');
const { pool } = require('../database');
const { authenticateToken } = require('../auth');
const { addCompanyFilter } = require('../middleware/companyFilter');

const router = express.Router();

// 物料API（支持分页）
router.get('/materials', authenticateToken, addCompanyFilter, async (req, res) => {
  try {
    const { page, limit } = req.query;
    
    // 如果请求分页参数，返回分页数据
    if (page && limit) {
      const pageNum = parseInt(page) || 1;
      const pageSize = parseInt(limit) || 50;
      const offset = (pageNum - 1) * pageSize;
      
      // 查询总数
      const [countResult] = await pool.execute(
        'SELECT COUNT(*) as total FROM materials WHERE companyId = ?',
        [req.companyId]
      );
      const total = countResult[0].total;
      
      // 查询分页数据
      const [rows] = await pool.execute(
        'SELECT * FROM materials WHERE companyId = ? ORDER BY id LIMIT ? OFFSET ?',
        [req.companyId, pageSize, offset]
      );
      
      res.json({ 
        materials: rows, 
        total, 
        page: pageNum, 
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize)
      });
    } else {
      // 兼容旧版API，返回所有数据
    const [rows] = await pool.execute('SELECT * FROM materials WHERE companyId = ? ORDER BY id', [req.companyId]);
    res.json(rows);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/materials', authenticateToken, addCompanyFilter, async (req, res) => {
  try {
    const { category, feature, modelThickness, actualTakt } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO materials (category, feature, modelThickness, actualTakt, companyId) VALUES (?, ?, ?, ?, ?)',
      [category || null, feature || null, modelThickness || null, actualTakt || 0, req.companyId]
    );
    res.json({ id: result.insertId, category, feature, modelThickness, actualTakt: actualTakt || 0, companyId: req.companyId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/materials/:id', authenticateToken, addCompanyFilter, async (req, res) => {
  try {
    const { category, feature, modelThickness, actualTakt } = req.body;
    await pool.execute(
      'UPDATE materials SET category = ?, feature = ?, modelThickness = ?, actualTakt = ? WHERE id = ? AND companyId = ?',
      [category || null, feature || null, modelThickness || null, actualTakt || 0, req.params.id, req.companyId]
    );
    res.json({ message: '更新成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/materials/:id', authenticateToken, addCompanyFilter, async (req, res) => {
  try {
    await pool.execute('DELETE FROM materials WHERE id = ? AND companyId = ?', [req.params.id, req.companyId]);
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;