const express = require('express');
const router = express.Router();
const db = require('../utils/db');

// ===== CLIENTS =====

// GET /api/placement/clients
router.get('/clients', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM clients ORDER BY created_at DESC',
      []
    );
    res.json({ success: true, data: { clients: result.rows } });
  } catch (err) {
    console.error('Error get clients', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  }
});

// POST /api/placement/clients
router.post('/clients', async (req, res) => {
  try {
    const {
      name,
      email,
      contact_person,
      contact_address,
      contact_phone,
      taxid,
      tax_name,
      tax_address,
      lob,
      type_of_client,
      special_flag,
      remarks
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'name is required' }
      });
    }

    const result = await db.query(
      `INSERT INTO clients
       (name, email, contact_person, contact_address, contact_phone,
        taxid, tax_name, tax_address, lob, type_of_client, special_flag, remarks)
       VALUES
       ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        name,
        email,
        contact_person,
        contact_address,
        contact_phone,
        taxid,
        tax_name,
        tax_address,
        lob,
        type_of_client,
        !!special_flag,
        remarks
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error create client', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  }
});

// ===== INSURERS (simple) =====

router.get('/insurers', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM insurers ORDER BY created_at DESC',
      []
    );
    res.json({ success: true, data: { insurers: result.rows } });
  } catch (err) {
    console.error('Error get insurers', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  }
});

router.post('/insurers', async (req, res) => {
  try {
    const {
      name,
      email,
      contact_person,
      contact_address,
      contact_phone
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'name is required' }
      });
    }

    const result = await db.query(
      `INSERT INTO insurers
       (name, email, contact_person, contact_address, contact_phone)
       VALUES
       ($1,$2,$3,$4,$5)
       RETURNING *`,
      [name, email, contact_person, contact_address, contact_phone]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error create insurer', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  }
});

// ===== SOURCE OF BUSINESS =====

router.get('/source-business', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM source_business ORDER BY created_at DESC',
      []
    );
    res.json({ success: true, data: { source: result.rows } });
  } catch (err) {
    console.error('Error get source_business', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  }
});

router.post('/source-business', async (req, res) => {
  try {
    const { name, type, contact_person, contact_phone } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'name is required' }
      });
    }

    const result = await db.query(
      `INSERT INTO source_business
       (name, type, contact_person, contact_phone)
       VALUES
       ($1,$2,$3,$4)
       RETURNING *`,
      [name, type, contact_person, contact_phone]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error create source_business', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  }
});

// ===== CLASS OF BUSINESS & PRODUCTS (for dropdown) =====

router.get('/class-of-business', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM class_of_business ORDER BY code',
      []
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error get class_of_business', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  }
});

router.post('/class-of-business', async (req, res) => {
  try {
    const { code, name } = req.body;
    if (!code || !name) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'code and name are required' }
      });
    }

    const result = await db.query(
      `INSERT INTO class_of_business (code, name)
       VALUES ($1,$2)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
       RETURNING *`,
      [code, name]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error create class_of_business', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  }
});

router.get('/products', async (req, res) => {
  try {
    const { class_id } = req.query;
    let result;
    if (class_id) {
      result = await db.query(
        'SELECT * FROM products WHERE class_id = $1 ORDER BY code',
        [class_id]
      );
    } else {
      result = await db.query(
        'SELECT * FROM products ORDER BY class_id, code',
        []
      );
    }
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error get products', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  }
});

router.post('/products', async (req, res) => {
  try {
    const { class_id, code, name } = req.body;
    if (!class_id || !code || !name) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'class_id, code and name are required' }
      });
    }

    const result = await db.query(
      `INSERT INTO products (class_id, code, name)
       VALUES ($1,$2,$3)
       ON CONFLICT (class_id, code) DO UPDATE SET name = EXCLUDED.name
       RETURNING *`,
      [class_id, code, name]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error create product', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  }
});

// ===== POLICIES =====

router.get('/policies', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.*,
              c.name AS client_name,
              i.name AS insurance_name,
              sb.name AS source_business_name
       FROM policies p
       LEFT JOIN clients c ON c.id = p.client_id
       LEFT JOIN insurers i ON i.id = p.insurance_id
       LEFT JOIN source_business sb ON sb.id = p.source_business_id
       ORDER BY p.created_at DESC`,
      []
    );

    res.json({
      success: true,
      data: { policies: result.rows }
    });
  } catch (err) {
    console.error('Error get policies', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  }
});

router.post('/policies', async (req, res) => {
  try {
    const {
      transaction_number,
      policy_number,
      // from frontend
      placing_slip_number,
      qs_number,
      client_id,
      insurance_id,
      source_business_id,
      class_of_business_id, // actually a NAME string now
      product_id,           // actually a NAME string now
      type_of_case,
      type_of_business,
      currency,
      premium_amount,
      commission_gross,
      commission_to_source,
      effective_date,
      expiry_date
    } = req.body;

    // Map ke nama kolom di DB
    const placing_number = placing_slip_number || null;
    const quotation_number = qs_number || null;
    const case_type = type_of_case || null;

    // Karena di DB kolomnya sekarang text: class_of_business_name & product_name
    const class_of_business_name = class_of_business_id || null;
    const product_name = product_id || null;

    if (!client_id || !insurance_id || !class_of_business_name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION',
          message:
            'client_id, insurance_id, class_of_business_name are required'
        }
      });
    }

    const result = await db.query(
      `INSERT INTO policies
       (transaction_number, policy_number, placing_number, quotation_number,
        client_id, insurance_id, source_business_id,
        class_of_business_name, product_name,
        case_type, type_of_business, currency,
        premium_amount, commission_gross, commission_to_source,
        effective_date, expiry_date)
       VALUES
       ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [
        transaction_number,
        policy_number,
        placing_number,
        quotation_number,
        client_id,
        insurance_id,
        source_business_id || null,
        class_of_business_name,
        product_name,
        case_type,
        type_of_business,
        currency || 'IDR',
        premium_amount || 0,
        commission_gross || 0,
        commission_to_source || 0,
        effective_date || null,
        expiry_date || null
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error create policy', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  }
});


router.patch('/policies/:id/sent-to-finance', async (req, res) => {
    try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'invalid id' }
      });
    }

    const result = await db.query(
      `UPDATE policies
       SET sent_to_finance = TRUE,
           finance_status = COALESCE(finance_status, 'Pending'),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Policy not found' }
      });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error mark sent_to_finance', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  }
});

// ===== PROPOSALS =====
router.get('/proposals', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.*,
              c.name  AS client_name,
              sb.name AS source_business_name
       FROM proposals p
       LEFT JOIN clients c  ON c.id  = p.client_id
       LEFT JOIN source_business sb ON sb.id = p.source_business_id
       ORDER BY p.created_at DESC`
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error('Error load proposals', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  }
});

router.post('/proposals', async (req, res) => {
  try {
    const {
      type_of_case,
      type_of_business,
      client_id,
      source_business_id,
      class_of_business_name,
      product_name,
      sales_team_name,
      request_date
    } = req.body;

    if (!type_of_case || !type_of_business || !client_id || !class_of_business_name || !request_date) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'Missing required fields' }
      });
    }

    const result = await db.query(
      `INSERT INTO proposals
       (type_of_case, type_of_business, client_id, source_business_id,
        class_of_business_name, product_name, sales_team_name, request_date)
       VALUES
       ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        type_of_case,
        type_of_business,
        client_id,
        source_business_id || null,
        class_of_business_name,
        product_name || null,
        sales_team_name || null,
        request_date
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error create proposal', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  }
});

router.patch('/proposals/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'Open' | 'Won' | 'Lost'

    if (!['Open','Won','Lost'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'Invalid status' }
      });
    }

    const result = await db.query(
      `UPDATE proposals
       SET status = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Proposal not found' }
      });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error update proposal status', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  }
});
router.post('/proposals/:id/convert-to-policy', async (req, res) => {
  try {
    const { id } = req.params;

    // 1) Ambil proposal
    const propRes = await db.query(
      `SELECT * FROM proposals WHERE id = $1`,
      [id]
    );
    if (propRes.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Proposal not found' }
      });
    }

    const prop = propRes.rows[0];
    if (prop.status !== 'Won') {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'Only Won proposals can be converted' }
      });
    }

    // 2) Build policy minimal dari proposal
    // premium, commission, dates bisa null dulu → nanti diisi via edit Policy
    const trx = `TRX-${Date.now()}`; // optional: atau pakai generator kamu sendiri

    const polRes = await db.query(
      `INSERT INTO policies
       (transaction_number,
        type_of_case,
        type_of_business,
        client_id,
        source_business_id,
        class_of_business_name,
        product_name,
        request_date)
       VALUES
       ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        trx,
        prop.type_of_case,
        prop.type_of_business,
        prop.client_id,
        prop.source_business_id,
        prop.class_of_business_name,
        prop.product_name,
        prop.request_date
      ]
    );

    const policy = polRes.rows[0];

    res.status(201).json({ success: true, data: policy });
  } catch (err) {
    console.error('Error convert proposal to policy', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  }
});



module.exports = router;
