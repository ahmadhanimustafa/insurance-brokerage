
// backend/src/routes/placement.js
// DB-based Placement module: Clients, Proposals, Policies

const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const numbering = require('../utils/numbering');

// =========================
// Helpers
// =========================

function getClientPrefix(type) {
  if (!type) return 'CL';
  const t = String(type).toLowerCase();
  if (t.includes('policy')) return 'PH';
  if (t.includes('insurance')) return 'IN';
  if (t.includes('source')) return 'SOB';
  if (t.includes('partner')) return 'PCO';
  return 'CL';
}

async function generateClientId(type_of_client) {
  const prefix = getClientPrefix(type_of_client);
  const sql = `
    SELECT COALESCE(
      MAX(CAST(SPLIT_PART(client_id, '-', 2) AS INT)),
      0
    ) AS max_seq
    FROM clients
    WHERE client_id LIKE $1
  `;
  const result = await db.query(sql, [`${prefix}-%`]);
  const maxSeq = result.rows[0]?.max_seq || 0;
  const next = String(maxSeq + 1).padStart(6, '0');
  return `${prefix}-${next}`;
}

function parseNumber(val, def = 0) {
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : def;
}

// =========================
// Clients
// =========================

// GET /api/placement/clients
router.get('/clients', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, client_id, name, email, phone, address, tax_id, industry,
              type_of_client, special_flag, remarks, created_at, updated_at
       FROM clients
       ORDER BY created_at DESC`
    );

    res.json({
      success: true,
      data: { clients: result.rows }
    });
  } catch (err) {
    console.error('Error loading clients', err);
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
      phone,
      address,
      tax_id,
      industry,
      type_of_client,
      special_flag,
      remarks
    } = req.body;

    if (!name || !type_of_client) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'name and type_of_client are required' }
      });
    }

    const client_id = await generateClientId(type_of_client);

    const result = await db.query(
      `INSERT INTO clients
       (client_id, name, email, phone, address, tax_id, industry,
        type_of_client, special_flag, remarks)
       VALUES
       ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        client_id,
        name,
        email || null,
        phone || null,
        address || null,
        tax_id || null,
        industry || null,
        type_of_client,
        !!special_flag,
        remarks || null
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error creating client', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  }
});

// PUT /api/placement/clients/:id
router.put('/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      phone,
      address,
      tax_id,
      industry,
      type_of_client,
      special_flag,
      remarks
    } = req.body;

    const result = await db.query(
      `UPDATE clients
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           phone = COALESCE($3, phone),
           address = COALESCE($4, address),
           tax_id = COALESCE($5, tax_id),
           industry = COALESCE($6, industry),
           type_of_client = COALESCE($7, type_of_client),
           special_flag = COALESCE($8, special_flag),
           remarks = COALESCE($9, remarks),
           updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [
        name || null,
        email || null,
        phone || null,
        address || null,
        tax_id || null,
        industry || null,
        type_of_client || null,
        typeof special_flag === 'boolean' ? special_flag : null,
        remarks || null,
        id
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Client not found' }
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating client', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  }
});

// =========================
// Class of Business & Products
// =========================

// GET /api/placement/class-of-business
router.get('/class-of-business', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, code, name
       FROM class_of_business
       ORDER BY code`
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error('Error loading class_of_business', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  }
});

// GET /api/placement/products?class_id=ID
router.get('/products', async (req, res) => {
  try {
    const { class_id } = req.query;

    let sql = `SELECT id, class_id, code, name FROM products`;
    const params = [];
    if (class_id) {
      sql += ` WHERE class_id = $1`;
      params.push(class_id);
    }
    sql += ` ORDER BY code`;

    const result = await db.query(sql, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error('Error loading products', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  }
});

// =========================
// Proposals
// =========================

// GET /api/placement/proposals
router.get('/proposals', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.*,
              c.name  AS client_name,
              sb.name AS source_business_name,
              cob.code AS cob_code,
              cob.name AS cob_name,
              pr.code  AS product_code,
              pr.name  AS product_name
       FROM proposals p
       JOIN clients c ON c.id = p.client_id
       LEFT JOIN clients sb ON sb.id = p.source_business_id
       JOIN class_of_business cob ON cob.id = p.class_of_business_id
       LEFT JOIN products pr ON pr.id = p.product_id
       ORDER BY p.created_at DESC`
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error('Error loading proposals', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  }
});

// POST /api/placement/proposals
router.post('/proposals', async (req, res) => {
  try {
    const {
      type_of_case,
      type_of_business,
      client_id,
      source_business_id,
      class_of_business_id,
      product_id,
      sales_team_name,
      request_date
    } = req.body;

    if (!type_of_case || !type_of_business || !client_id || !class_of_business_id || !request_date) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'Missing required fields' }
      });
    }

    const result = await db.query(
      `INSERT INTO proposals
       (type_of_case, type_of_business, client_id, source_business_id,
        class_of_business_id, product_id, sales_team_name, request_date)
       VALUES
       ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        type_of_case,
        type_of_business,
        client_id,
        source_business_id || null,
        class_of_business_id,
        product_id || null,
        sales_team_name || null,
        request_date
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error creating proposal', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  }
});

// PATCH /api/placement/proposals/:id/status
router.patch('/proposals/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Open', 'Won', 'Lost'].includes(status)) {
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

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating proposal status', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  }
});

// POST /api/placement/proposals/:id/convert-to-policy
router.post('/proposals/:id/convert-to-policy', async (req, res) => {
  try {
    const { id } = req.params;

    const propRes = await db.query(
      `SELECT p.*,
              cob.code AS cob_code,
              cob.name AS cob_name,
              pr.code  AS product_code,
              pr.name  AS product_name
       FROM proposals p
       JOIN class_of_business cob ON cob.id = p.class_of_business_id
       LEFT JOIN products pr ON pr.id = p.product_id
       WHERE p.id = $1`,
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

    const eff = prop.request_date || new Date().toISOString().slice(0, 10);

    const policy_number = await numbering.generatePolicyNumber({
      cobCode: prop.cob_code,
      productName: prop.product_name || prop.cob_name,
      effectiveDate: eff
    });

    const placing_number = await numbering.generatePlacingNumber({
      caseType: prop.type_of_case,
      productCode: prop.product_code || prop.cob_code,
      effectiveDate: eff
    });

    const quotation_number = await numbering.generateQuotationNumber({
      caseType: prop.type_of_case,
      productCode: prop.product_code || prop.cob_code,
      effectiveDate: eff
    });

    const policyRes = await db.query(
      `INSERT INTO policies
       (transaction_number,
        policy_number,
        placing_number,
        quotation_number,
        client_id,
        insurance_id,
        source_business_id,
        class_of_business_id,
        product_id,
        case_type,
        type_of_business,
        currency,
        premium_amount,
        commission_gross,
        commission_to_source,
        commission_net_percent,
        effective_date,
        expiry_date,
        request_date,
        sent_to_finance)
       VALUES
       ($1,$2,$3,$4,$5,$6,$7,$8,$9,
        $10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING *`,
      [
        `TRX-${Date.now()}`,
        policy_number,
        placing_number,
        quotation_number,
        prop.client_id,
        null,
        prop.source_business_id,
        prop.class_of_business_id,
        prop.product_id,
        prop.type_of_case,
        prop.type_of_business,
        'IDR',
        0,
        0,
        0,
        0,
        eff,
        null,
        prop.request_date,
        false
      ]
    );

    res.status(201).json({
      success: true,
      data: policyRes.rows[0]
    });
  } catch (err) {
    console.error('Error convert proposal to policy', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  }
});

// =========================
// Policies
// =========================

// GET /api/placement/policies
router.get('/policies', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.*,
              c.name  AS client_name,
              c.client_id AS client_code,
              ic.name AS insurance_name,
              ic.client_id AS insurance_code,
              sb.name AS source_business_name,
              sb.client_id AS source_business_code,
              cob.code AS cob_code,
              cob.name AS cob_name,
              pr.code  AS product_code,
              pr.name  AS product_name,
              COALESCE(p.commission_net_percent,
                       p.commission_gross - p.commission_to_source) AS commission_net_percent_calc
       FROM policies p
       LEFT JOIN clients c  ON c.id  = p.client_id
       LEFT JOIN clients ic ON ic.id = p.insurance_id
       LEFT JOIN clients sb ON sb.id = p.source_business_id
       LEFT JOIN class_of_business cob ON cob.id = p.class_of_business_id
       LEFT JOIN products pr ON pr.id = p.product_id
       ORDER BY p.created_at DESC`
    );

    const rows = result.rows.map(r => ({
      ...r,
      commission_net_percent:
        r.commission_net_percent != null
          ? r.commission_net_percent
          : r.commission_net_percent_calc
    }));

    res.json({
      success: true,
      data: rows
    });
  } catch (err) {
    console.error('Error loading policies', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  }
});

// POST /api/placement/policies (manual create / edit flow)
router.post('/policies', async (req, res) => {
  try {
    const {
      transaction_number,
      policy_number,
      placing_number,
      quotation_number,
      client_id,
      insurance_id,
      source_business_id,
      class_of_business_id,
      product_id,
      case_type,
      type_of_business,
      currency,
      premium_amount,
      commission_gross,
      commission_to_source,
      effective_date,
      expiry_date
    } = req.body;

    if (!client_id || !class_of_business_id) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'client_id and class_of_business_id are required' }
      });
    }

    const metaRes = await db.query(
      `SELECT cob.code AS cob_code,
              cob.name AS cob_name,
              pr.code  AS product_code,
              pr.name  AS product_name
       FROM class_of_business cob
       LEFT JOIN products pr ON pr.id = $2
       WHERE cob.id = $1`,
      [class_of_business_id, product_id || null]
    );

    if (metaRes.rowCount === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'Invalid class_of_business_id' }
      });
    }

    const meta = metaRes.rows[0];
    const eff = effective_date || new Date().toISOString().slice(0, 10);

    let finalPolicyNumber = policy_number;
    let finalPlacingNumber = placing_number;
    let finalQuotationNumber = quotation_number;

    if (!finalPolicyNumber) {
      finalPolicyNumber = await numbering.generatePolicyNumber({
        cobCode: meta.cob_code,
        productName: meta.product_name || meta.cob_name,
        effectiveDate: eff
      });
    }

    if (!finalPlacingNumber) {
      finalPlacingNumber = await numbering.generatePlacingNumber({
        caseType: case_type,
        productCode: meta.product_code || meta.cob_code,
        effectiveDate: eff
      });
    }

    if (!finalQuotationNumber) {
      finalQuotationNumber = await numbering.generateQuotationNumber({
        caseType: case_type,
        productCode: meta.product_code || meta.cob_code,
        effectiveDate: eff
      });
    }

    const gross = parseNumber(commission_gross, 0);
    const source = parseNumber(commission_to_source, 0);
    const net = gross - source;

    const result = await db.query(
      `INSERT INTO policies
       (transaction_number,
        policy_number,
        placing_number,
        quotation_number,
        client_id,
        insurance_id,
        source_business_id,
        class_of_business_id,
        product_id,
        case_type,
        type_of_business,
        currency,
        premium_amount,
        commission_gross,
        commission_to_source,
        commission_net_percent,
        effective_date,
        expiry_date,
        request_date,
        sent_to_finance)
       VALUES
       ($1,$2,$3,$4,$5,$6,$7,$8,$9,
        $10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING *`,
      [
        transaction_number || `TRX-${Date.now()}`,
        finalPolicyNumber,
        finalPlacingNumber,
        finalQuotationNumber,
        client_id,
        insurance_id || null,
        source_business_id || null,
        class_of_business_id,
        product_id || null,
        case_type || 'New',
        type_of_business || 'Direct',
        currency || 'IDR',
        parseNumber(premium_amount, 0),
        gross,
        source,
        net,
        eff,
        expiry_date || null,
        null,
        false
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error creating policy', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  }
});

// PATCH /api/placement/policies/:id
router.patch('/policies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      policy_number,
      placing_number,
      quotation_number,
      client_id,
      insurance_id,
      source_business_id,
      class_of_business_id,
      product_id,
      case_type,
      type_of_business,
      currency,
      premium_amount,
      commission_gross,
      commission_to_source,
      effective_date,
      expiry_date
    } = req.body;

    const gross = parseNumber(commission_gross, null);
    const source = parseNumber(commission_to_source, null);

    const result = await db.query(
      `UPDATE policies
       SET policy_number = COALESCE($1, policy_number),
           placing_number = COALESCE($2, placing_number),
           quotation_number = COALESCE($3, quotation_number),
           client_id = COALESCE($4, client_id),
           insurance_id = COALESCE($5, insurance_id),
           source_business_id = COALESCE($6, source_business_id),
           class_of_business_id = COALESCE($7, class_of_business_id),
           product_id = COALESCE($8, product_id),
           case_type = COALESCE($9, case_type),
           type_of_business = COALESCE($10, type_of_business),
           currency = COALESCE($11, currency),
           premium_amount = COALESCE($12, premium_amount),
           commission_gross = COALESCE($13, commission_gross),
           commission_to_source = COALESCE($14, commission_to_source),
           commission_net_percent = COALESCE($15, commission_net_percent),
           effective_date = COALESCE($16, effective_date),
           expiry_date = COALESCE($17, expiry_date),
           updated_at = NOW()
       WHERE id = $18
       RETURNING *`,
      [
        policy_number || null,
        placing_number || null,
        quotation_number || null,
        client_id || null,
        insurance_id || null,
        source_business_id || null,
        class_of_business_id || null,
        product_id || null,
        case_type || null,
        type_of_business || null,
        currency || null,
        premium_amount != null ? parseNumber(premium_amount, 0) : null,
        gross,
        source,
        gross != null && source != null ? gross - source : null,
        effective_date || null,
        expiry_date || null,
        id
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Policy not found' }
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating policy', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  }
});

// PATCH /api/placement/policies/:id/sent-to-finance
router.patch('/policies/:id/sent-to-finance', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `UPDATE policies
       SET sent_to_finance = TRUE,
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

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error mark sent_to_finance', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  }
});

module.exports = router;
