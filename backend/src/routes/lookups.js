const express = require('express');
const router = express.Router();
const db = require('../utils/db');

router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    if (!category) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'category is required' }
      });
    }

    const result = await db.query(
      'SELECT id, code, label, sort_order FROM lookup_values WHERE category = $1 AND is_active = TRUE ORDER BY sort_order, label',
      [category]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error('Error in /api/lookups', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  }
});

module.exports = router;
