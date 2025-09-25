const express = require('express');
const { pool } = require('../database');

const router = express.Router();

// 物料API
router.get('/materials', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM materials ORDER BY id');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/materials', async (req, res) => {
  try {
    const { category, feature, modelThickness, actualTakt } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO materials (category, feature, modelThickness, actualTakt) VALUES (?, ?, ?, ?)',
      [category || null, feature || null, modelThickness || null, actualTakt || 0]
    );
    res.json({ id: result.insertId, category, feature, modelThickness, actualTakt: actualTakt || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/materials/:id', async (req, res) => {
  try {
    const { category, feature, modelThickness, actualTakt } = req.body;
    await pool.execute(
      'UPDATE materials SET category = ?, feature = ?, modelThickness = ?, actualTakt = ? WHERE id = ?',
      [category || null, feature || null, modelThickness || null, actualTakt || 0, req.params.id]
    );
    res.json({ message: '更新成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/materials/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM materials WHERE id = ?', [req.params.id]);
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;