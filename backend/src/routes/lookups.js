const express = require('express');
const router = express.Router();
const db = require('../utils/db');

router.get('/', async (req, res) => {
  try {
    const { category, class_of_business_id } = req.query;

    if (!category) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'category is required' }
      });
    }

    let query;
    let params = [];

    // 1) Class of Business
    if (category === 'CLASS_OF_BUSINESS') {
      // 🚨 ganti nama kolom kalau beda:
      // misal kalau namanya 'cob_name', pakai: cob_name AS label
      query = `
        SELECT
          id,
          code,
          name AS label
        FROM class_of_business
        ORDER BY name
      `;
    }

    // 2) Product (optional filter by COB)
    else if (category === 'PRODUCT') {
      // 🚨 asumsikan kolom FK: class_of_business_id
      // kalau di schema lo 'class_id', ganti di WHERE
      if (class_of_business_id) {
        query = `
          SELECT
            id,
            code,
            name AS label
          FROM products
          WHERE class_id = $1
          ORDER BY name
        `;
        params = [class_of_business_id];
      } else {
        query = `
          SELECT
            id,
            code,
            name AS label
          FROM products
          ORDER BY name
        `;
      }
    }

    // 3) Category lain → untuk sekarang kosongin aja
    else {
      return res.json({
        success: true,
        data: []
      });
    }

    const result = await db.query(query, params);

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
