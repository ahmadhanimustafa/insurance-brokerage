// backend/src/routes/placement.js
// DB-backed Placement: Clients + Proposals + Policies
// Compatible with current Placement.jsx API/field names.

const express = require('express');
const router = express.Router();
const db = require('../utils/db'); // adjust if your path/name is different
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// helper: uniform ID compare
const sameId = (a, b) => String(a) === String(b);


// Setup upload directory
const uploadDir =
  process.env.FILE_UPLOAD_PATH || path.join(__dirname, '..', '..', 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage for policy documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const policyId = req.params.id || 'unknown';
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname || '');
    cb(null, `policy_${policyId}_${unique}${ext}`);
  },
});

const upload = multer({ storage });

const getPolicyDocsManifestPath = (policyId) =>
  path.join(uploadDir, `policy_${policyId}_docs.json`);

const readPolicyDocs = (policyId) => {
  const filePath = getPolicyDocsManifestPath(policyId);
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const writePolicyDocs = (policyId, docs) => {
  const filePath = getPolicyDocsManifestPath(policyId);
  fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf8');
};

// Helper to get user ID from req.user or headers
const getUserId = (req) => {
  if (req.user && (req.user.id || req.user.user_id)) {
    return req.user.id || req.user.user_id;
  }
  const fromHeader = req.headers['x-user-id'];
  if (!fromHeader) return null;
  const parsed = parseInt(fromHeader, 10);
  return Number.isNaN(parsed) ? null : parsed;
};
// ------------------------------
// CLIENTS
// ------------------------------

// GET /api/placement/clients
router.get('/clients', async (req, res) => {
  try {
    const { rows } = await db.query(
      `
      SELECT
        id,
        client_id,
        name,
        email,
        contact_person,
        contact_address,
        contact_address_2,
        contact_address_3,
        contact_phone,
        contact_phone_2,
        contact_fax,
        contact_fax_2,
        taxid,
        tax_name,
        tax_address,
        lob,
        type_of_client,
        special_flag,
        remarks,
        salutation,
        first_name,
        mid_name,
        last_name,
        contact_position,
        created_at,
        updated_at
      FROM clients
      ORDER BY id DESC
      `
    );

    const data = rows.map((r) => ({
      id: r.id,
      client_id: r.client_id,
      type_of_client: r.type_of_client,
      salutation: r.salutation || "",
      first_name: r.first_name || "",
      mid_name: r.mid_name || "",
      last_name: r.last_name || "",
      name: r.name,
      address_1: r.contact_address || "",
      address_2: r.contact_address_2 || "",
      address_3: r.contact_address_3 || "",
      phone_1: r.contact_phone || "",
      phone_2: r.contact_phone_2 || "",
      fax_1: r.contact_fax || "",
      fax_2: r.contact_fax_2 || "",
      email: r.email || "",
      contact_person: r.contact_person || "",
      contact_position: r.contact_position || "",
      tax_id: r.taxid || "",
      tax_address: r.tax_address || "",
      remarks: r.remarks || "",
      client_code: r.client_id || null,
      special_flag: r.special_flag,
      lob: r.lob,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    return res.json({ success: true, data });
  } catch (err) {
    console.error('Error loading clients:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});


// POST /api/placement/clients
router.post('/clients', async (req, res) => {
  try {
    const body = req.body || {};

    const {
      type_of_client,
      salutation,
      first_name,
      mid_name,
      last_name,
      name,
      address_1,
      address_2,
      address_3,
      phone_1,
      phone_2,
      fax_1,
      fax_2,
      email,
      contact_person,
      contact_position,
      tax_id,
      tax_address,
      remarks,
      lob,
      special_flag,
    } = body;

    if (!type_of_client || !name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'type_of_client and name are required',
        },
      });
    }

    const clientCode = body.id || null;
    const userId = getUserId(req);

    const insertSql = `
      INSERT INTO clients (
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
        remarks,
        client_id,
        created_by,
        updated_by,
        salutation,
        first_name,
        mid_name,
        last_name,
        contact_address_2,
        contact_address_3,
        contact_phone_2,
        contact_fax,
        contact_fax_2,
        contact_position,
        created_at,
        updated_at
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
        $14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,
        now(),now()
      )
      RETURNING
        id,
        client_id,
        name,
        email,
        contact_person,
        contact_address,
        contact_address_2,
        contact_address_3,
        contact_phone,
        contact_phone_2,
        contact_fax,
        contact_fax_2,
        taxid,
        tax_name,
        tax_address,
        lob,
        type_of_client,
        special_flag,
        remarks,
        salutation,
        first_name,
        mid_name,
        last_name,
        contact_position,
        created_at,
        updated_at,
        created_by,
        updated_by
    `;

    const params = [
      name,                       // $1  name
      email || null,              // $2  email
      contact_person || null,     // $3  contact_person
      address_1 || null,          // $4  contact_address
      phone_1 || null,            // $5  contact_phone
      tax_id || null,             // $6  taxid
      null,                       // $7  tax_name
      tax_address || null,        // $8  tax_address
      lob || null,                // $9  lob
      type_of_client,             // $10 type_of_client
      special_flag === true || special_flag === "true", // $11 special_flag
      remarks || null,            // $12 remarks
      clientCode,                 // $13 client_id
      userId,                     // $14 created_by
      userId,                     // $15 updated_by
      salutation || null,         // $16 salutation
      first_name || null,         // $17 first_name
      mid_name || null,           // $18 mid_name
      last_name || null,          // $19 last_name
      address_2 || null,          // $20 contact_address_2
      address_3 || null,          // $21 contact_address_3
      phone_2 || null,            // $22 contact_phone_2
      fax_1 || null,              // $23 contact_fax
      fax_2 || null,              // $24 contact_fax_2
      contact_position || null,   // $25 contact_position
    ];

    const { rows } = await db.query(insertSql, params);
    const r = rows[0];

    const responseClient = {
      id: r.id,
      type_of_client: r.type_of_client,
      salutation: r.salutation || '',
      first_name: r.first_name || '',
      mid_name: r.mid_name || '',
      last_name: r.last_name || '',
      name: r.name,
      address_1: r.contact_address || '',
      address_2: r.contact_address_2 || '',
      address_3: r.contact_address_3 || '',
      phone_1: r.contact_phone || '',
      phone_2: r.contact_phone_2 || '',
      fax_1: r.contact_fax || '',
      fax_2: r.contact_fax_2 || '',
      email: r.email || '',
      contact_person: r.contact_person || '',
      contact_position: r.contact_position || '',
      tax_id: r.taxid || '',
      tax_address: r.tax_address || '',
      remarks: r.remarks || '',
      client_code: r.client_id || null,
      special_flag: r.special_flag,
      lob: r.lob,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };

    return res.json({
      success: true,
      data: responseClient,
      message: 'Client created successfully',
    });
  } catch (err) {
    console.error('Error creating client:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});


// PUT /api/placement/clients/:id
router.put('/clients/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid client id' },
      });
    }

    const body = req.body || {};
    const {
      type_of_client,
      salutation,
      first_name,
      mid_name,
      last_name,
      name,
      address_1,
      address_2,
      address_3,
      phone_1,
      phone_2,
      fax_1,
      fax_2,
      email,
      contact_person,
      contact_position,
      tax_id,
      tax_address,
      remarks,
      lob,
      special_flag,
    } = body;

    const userId = getUserId(req);

    const sql = `
      UPDATE clients
      SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        contact_person = COALESCE($3, contact_person),
        contact_address = COALESCE($4, contact_address),
        contact_phone = COALESCE($5, contact_phone),
        taxid = COALESCE($6, taxid),
        tax_address = COALESCE($7, tax_address),
        type_of_client = COALESCE($8, type_of_client),
        remarks = COALESCE($9, remarks),
        lob = COALESCE($10, lob),
        updated_at = now(),
        updated_by = COALESCE($11, updated_by),
        salutation = COALESCE($12, salutation),
        first_name = COALESCE($13, first_name),
        mid_name = COALESCE($14, mid_name),
        last_name = COALESCE($15, last_name),
        contact_address_2 = COALESCE($16, contact_address_2),
        contact_address_3 = COALESCE($17, contact_address_3),
        contact_phone_2 = COALESCE($18, contact_phone_2),
        contact_fax = COALESCE($19, contact_fax),
        contact_fax_2 = COALESCE($20, contact_fax_2),
        contact_position = COALESCE($21, contact_position),
        special_flag = COALESCE($23, special_flag)
      WHERE id = $22
      RETURNING
        id,
        client_id,
        name,
        email,
        contact_person,
        contact_address,
        contact_address_2,
        contact_address_3,
        contact_phone,
        contact_phone_2,
        contact_fax,
        contact_fax_2,
        taxid,
        tax_name,
        tax_address,
        lob,
        type_of_client,
        special_flag,
        remarks,
        salutation,
        first_name,
        mid_name,
        last_name,
        contact_position,
        created_at,
        updated_at,
        created_by,
        updated_by,
        special_flag
    `;

    const params = [
      name || null,            // $1
      email || null,           // $2
      contact_person || null,  // $3
      address_1 || null,       // $4 -> contact_address
      phone_1 || null,         // $5 -> contact_phone
      tax_id || null,          // $6
      tax_address || null,     // $7
      type_of_client || null,  // $8
      remarks || null,         // $9
      lob || null,             // $10
      userId,                  // $11 updated_by
      salutation || null,      // $12
      first_name || null,      // $13
      mid_name || null,        // $14
      last_name || null,       // $15
      address_2 || null,       // $16
      address_3 || null,       // $17
      phone_2 || null,         // $18
      fax_1 || null,           // $19
      fax_2 || null,           // $20
      contact_position || null,// $21
      id,                      // $22
      special_flag === true || special_flag === "true" // $23
    ];

    const { rows } = await db.query(sql, params);
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Client not found' },
      });
    }

    const r = rows[0];

    const responseClient = {
      id: r.id,
      client_id: r.client_id,
      type_of_client: r.type_of_client,
      salutation: r.salutation || '',
      first_name: r.first_name || '',
      mid_name: r.mid_name || '',
      last_name: r.last_name || '',
      name: r.name,
      address_1: r.contact_address || '',
      address_2: r.contact_address_2 || '',
      address_3: r.contact_address_3 || '',
      phone_1: r.contact_phone || '',
      phone_2: r.contact_phone_2 || '',
      fax_1: r.contact_fax || '',
      fax_2: r.contact_fax_2 || '',
      email: r.email || '',
      contact_person: r.contact_person || '',
      contact_position: r.contact_position || '',
      tax_id: r.taxid || '',
      tax_address: r.tax_address || '',
      remarks: r.remarks || '',
      client_code: r.client_id || null,
      special_flag: r.special_flag,
      lob: r.lob,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };

    return res.json({
      success: true,
      data: responseClient,
      message: 'Client updated successfully',
    });
  } catch (err) {
    console.error('Error updating client:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});


// ------------------------------
// PROPOSALS
// ------------------------------

// GET /api/placement/proposals
router.get('/proposals', async (req, res) => {
  try {
    const { rows } = await db.query(
      `
      SELECT
        id,
        transaction_number,
        type_of_case,
        type_of_business,
        client_id,
        source_business_id,
        class_of_business_id,
        product_id,
        sales_id,
        request_date,
        placing_slip_number,
        quotation_slip_number,
        remarks,
        status,
        created_at,
        updated_at
      FROM proposals
      ORDER BY id DESC
      `
    );

    const data = rows.map((r) => ({
      id: r.id,
      transaction_number: r.transaction_number || '',
      type_of_case: r.type_of_case,
      type_of_business: r.type_of_business,
      client_id: r.client_id,
      source_business_id: r.source_business_id,
      class_of_business_id: r.class_of_business_id,
      product_id: r.product_id,
      sales_id: r.sales_id,
      booking_date: r.request_date ? r.request_date.toISOString().split('T')[0] : '',
      placing_slip_number: r.placing_slip_number || '',
      qs_number: r.quotation_slip_number || '',
      remarks: r.remarks || '',
      status: r.status || 'DRAFT',
    }));

    return res.json({ success: true, data });
  } catch (err) {
    console.error('Error loading proposals:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// POST /api/placement/proposals
router.post('/proposals', async (req, res) => {
  try {
    const body = req.body || {};
    const {
      transaction_number,
      client_id,
      source_business_id,
      sales_id,
      class_of_business_id,
      product_id,
      type_of_case,
      type_of_business,
      booking_date,
      placing_slip_number,
      qs_number,
      remarks,
    } = body;

    if (!client_id || !class_of_business_id || !product_id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Client, Class of Business and Product are required',
        },
      });
    }
    const typeCase =
      body.type_of_case === "Renewal" ? "Renewal" : "New";

    const typeBusiness =
      body.type_of_business === "Non Direct" ? "Non Direct" : "Direct";

    const trx =
      transaction_number && transaction_number.trim()
        ? transaction_number
        : `TRX-${Date.now().toString().slice(-6)}`;

    const reqDate = booking_date || new Date().toISOString().split('T')[0];
    const userId = getUserId(req);
    const sql = `
      INSERT INTO proposals (
        transaction_number,
        type_of_case,
        type_of_business,
        client_id,
        source_business_id,
        class_of_business_id,
        product_id,
        sales_id,
        request_date,
        placing_slip_number,
        quotation_slip_number,
        remarks,
        status,
        created_at,
        updated_at,
        created_by,
        updated_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'DRAFT',now(),now(),$13,$13)
      RETURNING
        id,
        transaction_number,
        type_of_case,
        type_of_business,
        client_id,
        source_business_id,
        class_of_business_id,
        product_id,
        sales_id,
        request_date,
        placing_slip_number,
        quotation_slip_number,
        remarks,
        status,
        created_at,
        updated_at,
        created_by,
        updated_by
    `;

    const params = [
      trx,
      typeCase,
      typeBusiness,
      client_id,
      source_business_id || null,
      class_of_business_id,
      product_id,
      sales_id || null,
      reqDate,
      placing_slip_number || null,
      qs_number || null,
      remarks || null,
      userId,
    ];

    const { rows } = await db.query(sql, params);
    const r = rows[0];

    const proposal = {
      id: r.id,
      transaction_number: r.transaction_number,
      type_of_case: r.type_of_case,
      type_of_business: r.type_of_business,
      client_id: r.client_id,
      source_business_id: r.source_business_id,
      class_of_business_id: r.class_of_business_id,
      product_id: r.product_id,
      sales_id: r.sales_id,
      booking_date: r.request_date ? r.request_date.toISOString().split('T')[0] : '',
      placing_slip_number: r.placing_slip_number || '',
      qs_number: r.quotation_slip_number || '',
      remarks: r.remarks || '',
      status: r.status || 'DRAFT',
    };

    return res.json({
      success: true,
      data: proposal,
      message: 'Proposal created successfully',
    });
  } catch (err) {
    console.error('Error creating proposal:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// PUT /api/placement/proposals/:id
router.put('/proposals/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid proposal id' },
      });
    }

    const body = req.body || {};
    const {
      transaction_number,
      client_id,
      source_business_id,
      sales_id,
      class_of_business_id,
      product_id,
      type_of_case,
      type_of_business,
      booking_date,
      placing_slip_number,
      qs_number,
      remarks,
      status
    } = body;
    const userId = getUserId(req);
    let normalizedTypeCase = null;
      if (typeof type_of_case === "string") {
        normalizedTypeCase =
          type_of_case === "Renewal" ? "Renewal" : "New";
      }

      let normalizedTypeBusiness = null;
      if (typeof type_of_business === "string") {
        normalizedTypeBusiness =
          type_of_business === "Non Direct" ? "Non Direct" : "Direct";
      }

    const sql = `
      UPDATE proposals
      SET
        transaction_number = COALESCE($1, transaction_number),
        type_of_case = COALESCE($2, type_of_case),
        type_of_business = COALESCE($3, type_of_business),
        client_id = COALESCE($4, client_id),
        source_business_id = COALESCE($5, source_business_id),
        class_of_business_id = COALESCE($6, class_of_business_id),
        product_id = COALESCE($7, product_id),
        sales_id = COALESCE($8, sales_id),
        request_date = COALESCE($9, request_date),
        placing_slip_number = COALESCE($10, placing_slip_number),
        quotation_slip_number = COALESCE($11, quotation_slip_number),
        remarks = COALESCE($12, remarks),
        status = COALESCE($13, status),
        updated_at = now(),
        updated_by = COALESCE($15, updated_by)
      WHERE id = $14
      RETURNING
        id,
        transaction_number,
        type_of_case,
        type_of_business,
        client_id,
        source_business_id,
        class_of_business_id,
        product_id,
        sales_id,
        request_date,
        placing_slip_number,
        quotation_slip_number,
        remarks,
        status,
        created_at,
        updated_at,
        updated_by
    `;

    const reqDate = booking_date || null;

    const params = [
      transaction_number || null,
      normalizedTypeCase,
      normalizedTypeBusiness,
      client_id || null,
      source_business_id || null,
      class_of_business_id || null,
      product_id || null,
      sales_id || null,
      reqDate,
      placing_slip_number || null,
      qs_number || null,
      remarks || null,
      status || null,
      id,
      userId,
    ];

    const { rows } = await db.query(sql, params);
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Proposal not found' },
      });
    }

    const r = rows[0];
    const proposal = {
      id: r.id,
      transaction_number: r.transaction_number,
      type_of_case: r.type_of_case,
      type_of_business: r.type_of_business,
      client_id: r.client_id,
      source_business_id: r.source_business_id,
      class_of_business_id: r.class_of_business_id,
      product_id: r.product_id,
      sales_id: r.sales_id,
      booking_date: r.request_date ? r.request_date.toISOString().split('T')[0] : '',
      placing_slip_number: r.placing_slip_number || '',
      qs_number: r.quotation_slip_number || '',
      remarks: r.remarks || '',
      status: r.status || 'DRAFT',
    };

    return res.json({
      success: true,
      data: proposal,
      message: 'Proposal updated successfully',
    });
  } catch (err) {
    console.error('Error updating proposal:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// POST /api/placement/proposals/:id/convert
router.post('/proposals/:id/convert', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid proposal id' },
      });
    }

    const { rows } = await db.query(
      `
      UPDATE proposals
      SET status = 'CONVERTED', updated_at = now()
      WHERE id = $1
      RETURNING id, status
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Proposal not found' },
      });
    }

    return res.json({
      success: true,
      data: rows[0],
      message: 'Proposal marked as CONVERTED',
    });
  } catch (err) {
    console.error('Error converting proposal:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// ------------------------------
// POLICIES
// ------------------------------

// GET /api/placement/policies
router.get('/policies', async (req, res) => {
  try {
    const { rows } = await db.query(
      `
      SELECT
        id,
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
        commission_net_percent,
        effective_date,
        expiry_date,
        sent_to_finance,
        request_date,
        sales_id,
        remarks,
        created_at,
        updated_at
      FROM policies
      ORDER BY id DESC
      `
    );

    const policies = rows.map((r) => ({
      id: r.id,
      transaction_number: r.transaction_number || '',
      policy_number: r.policy_number || '',
      placing_slip_number: r.placing_number || '',
      qs_number: r.quotation_number || '',
      client_id: r.client_id,
      insurance_id: r.insurance_id,
      source_business_id: r.source_business_id,
      class_of_business_id: r.class_of_business_id,
      product_id: r.product_id,
      type_of_case: r.case_type || 'New',
      type_of_business: r.type_of_business || 'Direct',
      currency: r.currency || 'IDR',
      premium_amount: r.premium_amount ? Number(r.premium_amount) : 0,
      commission_gross: r.commission_gross ? Number(r.commission_gross) : 0,
      commission_to_source: r.commission_to_source
        ? Number(r.commission_to_source)
        : 0,
      commission_net_percent: r.commission_net_percent
        ? Number(r.commission_net_percent)
        : 0,
      effective_date: r.effective_date
        ? r.effective_date.toISOString().split('T')[0]
        : '',
      expiry_date: r.expiry_date
        ? r.expiry_date.toISOString().split('T')[0]
        : '',
      sent_to_finance: r.sent_to_finance,
      booking_date: r.request_date
        ? r.request_date.toISOString().split('T')[0]
        : '',
      sales_id: r.sales_id,
      remarks: r.remarks || '',
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    return res.json({ success: true, data: policies });
  } catch (err) {
    console.error('Error loading policies:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// POST /api/placement/policies
router.post('/policies', async (req, res) => {
  try {
    const body = req.body || {};
    const {
      transaction_number,
      client_id,
      insurance_id,
      source_business_id,
      sales_id,
      class_of_business_id,
      product_id,
      type_of_case,
      type_of_business,
      booking_date,
      effective_date,
      expiry_date,
      policy_number,
      placing_slip_number,
      qs_number,
      premium_amount,
      currency,
      commission_gross,
      commission_to_source,
      commission_net_percent,
      remarks,
      reference_policy_id,
    } = body;

    if (!client_id || !class_of_business_id || !product_id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Client, Class of Business and Product are required',
        },
      });
    }

    const trx =
      transaction_number && transaction_number.trim()
        ? transaction_number
        : `POL-${Date.now().toString().slice(-6)}`;

    const reqDate = booking_date || new Date().toISOString().split('T')[0];

    const prem = premium_amount != null ? Number(premium_amount) : 0;
    const gross = commission_gross != null ? Number(commission_gross) : 0;
    const src = commission_to_source != null ? Number(commission_to_source) : 0;
    const net =
      commission_net_percent != null && commission_net_percent !== ''
        ? Number(commission_net_percent)
        : gross - src;
    const userId = getUserId(req);
    const sql = `
      INSERT INTO policies (
        transaction_number,
        policy_number,
        placing_number,
        quotation_number,
        client_id,
        insurance_id,
        source_business_id,
        class_of_business_id,
        product_id,
        reference_policy_id,
        case_type,
        type_of_business,
        currency,
        premium_amount,
        commission_gross,
        commission_to_source,
        commission_net_percent,
        effective_date,
        expiry_date,
        sent_to_finance,
        request_date,
        sales_id,
        remarks,
        created_at,
        updated_at,
        created_by,
        updated_by
      )
      VALUES (
        $1,$2,$3,$4,
        $5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,
        $18,$19,false,$20,$21,$22,now(),now(),$23,$24
      )
      RETURNING
        id,
        transaction_number,
        policy_number,
        placing_number,
        quotation_number,
        client_id,
        insurance_id,
        source_business_id,
        class_of_business_id,
        product_id,
        reference_policy_id,
        case_type,
        type_of_business,
        currency,
        premium_amount,
        commission_gross,
        commission_to_source,
        commission_net_percent,
        effective_date,
        expiry_date,
        sent_to_finance,
        request_date,
        sales_id,
        remarks,
        created_at,
        updated_at,
        created_by,
        updated_by
    `;

        const params = [
      trx,                           // $1
      policy_number || null,         // $2
      placing_slip_number || null,   // $3
      qs_number || null,             // $4
      client_id,                     // $5
      insurance_id || null,          // $6
      source_business_id || null,    // $7
      class_of_business_id,          // $8
      product_id,                    // $9
      reference_policy_id || null,   // $10
      type_of_case,         // $11
      type_of_business ,  // $12
      currency ,             // $13
      prem,                          // $14
      gross,                         // $15
      src,                           // $16
      net,                           // $17
      effective_date || null,        // $18
      expiry_date || null,           // $19
      reqDate,                       // $20
      sales_id || null,              // $21
      remarks || null,               // $22
      userId,                        // $23
      userId,                        // $24
    ];


    const { rows } = await db.query(sql, params);
    const r = rows[0];

    const policy = {
      id: r.id,
      transaction_number: r.transaction_number || '',
      policy_number: r.policy_number || '',
      placing_slip_number: r.placing_number || '',
      qs_number: r.quotation_number || '',
      client_id: r.client_id,
      insurance_id: r.insurance_id,
      source_business_id: r.source_business_id,
      class_of_business_id: r.class_of_business_id,
      product_id: r.product_id,
      type_of_case: r.case_type || 'New',
      type_of_business: r.type_of_business || 'Direct',
      currency: r.currency || 'IDR',
      premium_amount: r.premium_amount ? Number(r.premium_amount) : 0,
      commission_gross: r.commission_gross ? Number(r.commission_gross) : 0,
      commission_to_source: r.commission_to_source
        ? Number(r.commission_to_source)
        : 0,
      commission_net_percent: r.commission_net_percent
        ? Number(r.commission_net_percent)
        : 0,
      effective_date: r.effective_date
        ? r.effective_date.toISOString().split('T')[0]
        : '',
      expiry_date: r.expiry_date
        ? r.expiry_date.toISOString().split('T')[0]
        : '',
      sent_to_finance: r.sent_to_finance,
      booking_date: r.request_date
        ? r.request_date.toISOString().split('T')[0]
        : '',
      sales_id: r.sales_id,
      remarks: r.remarks || '',
      created_at: r.created_at,
      updated_at: r.updated_at,
      reference_policy_id: r.reference_policy_id,

    };

    return res.json({
      success: true,
      data: policy,
      message: 'Policy created successfully',
    });
  } catch (err) {
    console.error('Error creating policy:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// PUT /api/placement/policies/:id
router.put('/policies/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid policy id' },
      });
    }
    const userId = getUserId(req);
    const body = req.body || {};
    const {
      transaction_number,
      client_id,
      insurance_id,
      source_business_id,
      sales_id,
      class_of_business_id,
      product_id,
      type_of_case,
      type_of_business,
      booking_date,
      effective_date,
      expiry_date,
      policy_number,
      placing_slip_number,
      qs_number,
      premium_amount,
      currency,
      commission_gross,
      commission_to_source,
      commission_net_percent,
      remarks,
      sent_to_finance,
      reference_policy_id,
    } = body;

    const prem =
      premium_amount !== undefined && premium_amount !== null
        ? Number(premium_amount)
        : null;
    const gross =
      commission_gross !== undefined && commission_gross !== null
        ? Number(commission_gross)
        : null;
    const src =
      commission_to_source !== undefined && commission_to_source !== null
        ? Number(commission_to_source)
        : null;
    const net =
      commission_net_percent !== undefined &&
      commission_net_percent !== null &&
      commission_net_percent !== ''
        ? Number(commission_net_percent)
        : null;

    const sql = `
      UPDATE policies
      SET
        transaction_number = COALESCE($1, transaction_number),
        policy_number = COALESCE($2, policy_number),
        placing_number = COALESCE($3, placing_number),
        quotation_number = COALESCE($4, quotation_number),
        client_id = COALESCE($5, client_id),
        insurance_id = COALESCE($6, insurance_id),
        source_business_id = COALESCE($7, source_business_id),
        class_of_business_id = COALESCE($8, class_of_business_id),
        product_id = COALESCE($9, product_id),
        reference_policy_id = COALESCE($10, reference_policy_id),
        case_type = COALESCE($11, case_type),
        type_of_business = COALESCE($12, type_of_business),
        currency = COALESCE($13, currency),
        premium_amount = COALESCE($14, premium_amount),
        commission_gross = COALESCE($15, commission_gross),
        commission_to_source = COALESCE($16, commission_to_source),
        commission_net_percent = COALESCE($17, commission_net_percent),
        effective_date = COALESCE($18, effective_date),
        expiry_date = COALESCE($19, expiry_date),
        request_date = COALESCE($20, request_date),
        sales_id = COALESCE($21, sales_id),
        remarks = COALESCE($22, remarks),
        sent_to_finance = COALESCE($23, sent_to_finance),
        updated_at = now(),
        updated_by = COALESCE($25, updated_by)
      WHERE id = $24
      RETURNING
        id,
        transaction_number,
        policy_number,
        placing_number,
        quotation_number,
        client_id,
        insurance_id,
        source_business_id,
        class_of_business_id,
        product_id,
        reference_policy_id,
        case_type,
        type_of_business,
        currency,
        premium_amount,
        commission_gross,
        commission_to_source,
        commission_net_percent,
        effective_date,
        expiry_date,
        sent_to_finance,
        request_date,
        sales_id,
        remarks,
        created_at,
        updated_at,
        updated_by
    `;

        const params = [
      transaction_number || null,                                // $1
      policy_number || null,                                     // $2
      placing_slip_number || null,                               // $3
      qs_number || null,                                         // $4
      client_id || null,                                         // $5
      insurance_id || null,                                      // $6
      source_business_id || null,                                // $7
      class_of_business_id || null,                              // $8
      product_id || null,                                        // $9
      reference_policy_id || null,                               // $10
      type_of_case || null,                                      // $11
      type_of_business || null,                                  // $12
      currency || null,                                          // $13
      prem,                                                      // $14
      gross,                                                     // $15
      src,                                                       // $16
      net,                                                       // $17
      effective_date || null,                                    // $18
      expiry_date || null,                                       // $19
      booking_date || null,                                      // $20
      sales_id || null,                                          // $21
      remarks || null,                                           // $22
      typeof sent_to_finance === 'boolean' ? sent_to_finance : null, // $23
      id,                                                        // $24
      userId,                                                    // $25
    ];


    const { rows } = await db.query(sql, params);
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Policy not found' },
      });
    }

    const r = rows[0];
    const policy = {
      id: r.id,
      transaction_number: r.transaction_number || '',
      policy_number: r.policy_number || '',
      placing_slip_number: r.placing_number || '',
      qs_number: r.quotation_number || '',
      client_id: r.client_id,
      insurance_id: r.insurance_id,
      source_business_id: r.source_business_id,
      class_of_business_id: r.class_of_business_id,
      product_id: r.product_id,
      type_of_case: r.case_type || 'New',
      type_of_business: r.type_of_business || 'Direct',
      currency: r.currency || 'IDR',
      premium_amount: r.premium_amount ? Number(r.premium_amount) : 0,
      commission_gross: r.commission_gross ? Number(r.commission_gross) : 0,
      commission_to_source: r.commission_to_source
        ? Number(r.commission_to_source)
        : 0,
      commission_net_percent: r.commission_net_percent
        ? Number(r.commission_net_percent)
        : 0,
      effective_date: r.effective_date
        ? r.effective_date.toISOString().split('T')[0]
        : '',
      expiry_date: r.expiry_date
        ? r.expiry_date.toISOString().split('T')[0]
        : '',
      sent_to_finance: r.sent_to_finance,
      booking_date: r.request_date
        ? r.request_date.toISOString().split('T')[0]
        : '',
      sales_id: r.sales_id,
      remarks: r.remarks || '',
      created_at: r.created_at,
      updated_at: r.updated_at,
      reference_policy_id: r.reference_policy_id,
    };

    return res.json({
      success: true,
      data: policy,
      message: 'Policy updated successfully',
    });
  } catch (err) {
    console.error('Error updating policy:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// POST /api/placement/policies/:id/send-to-finance
router.post('/policies/:id/send-to-finance', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid policy id' },
      });
    }
    const userId = getUserId(req);
    const { rows } = await db.query(
      `
      UPDATE policies
      SET
        sent_to_finance = true,
        updated_at = now(),
        updated_by = $2
      WHERE id = $1
      RETURNING
        id,
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
        commission_net_percent,
        effective_date,
        expiry_date,
        sent_to_finance,
        request_date,
        sales_id,
        remarks,
        created_at,
        updated_at,
        updated_by
      `,
      [id, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Policy not found' },
      });
    }

    const r = rows[0];
    const policy = {
      id: r.id,
      transaction_number: r.transaction_number || '',
      policy_number: r.policy_number || '',
      placing_slip_number: r.placing_number || '',
      qs_number: r.quotation_number || '',
      client_id: r.client_id,
      insurance_id: r.insurance_id,
      source_business_id: r.source_business_id,
      class_of_business_id: r.class_of_business_id,
      product_id: r.product_id,
      type_of_case: r.case_type || 'New',
      type_of_business: r.type_of_business || 'Direct',
      currency: r.currency || 'IDR',
      premium_amount: r.premium_amount ? Number(r.premium_amount) : 0,
      commission_gross: r.commission_gross ? Number(r.commission_gross) : 0,
      commission_to_source: r.commission_to_source
        ? Number(r.commission_to_source)
        : 0,
      commission_net_percent: r.commission_net_percent
        ? Number(r.commission_net_percent)
        : 0,
      effective_date: r.effective_date
        ? r.effective_date.toISOString().split('T')[0]
        : '',
      expiry_date: r.expiry_date
        ? r.expiry_date.toISOString().split('T')[0]
        : '',
      sent_to_finance: r.sent_to_finance,
      booking_date: r.request_date
        ? r.request_date.toISOString().split('T')[0]
        : '',
      sales_id: r.sales_id,
      remarks: r.remarks || '',
      created_at: r.created_at,
      updated_at: r.updated_at,
    };

    return res.json({
      success: true,
      data: policy,
      message: 'Policy marked as SENT_TO_FINANCE',
    });
  } catch (err) {
    console.error('Error sending policy to finance:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});


// ------------------------------
// POLICY DOCUMENTS
// ------------------------------

// GET /api/placement/policies/:id/documents
router.get('/policies/:id/documents', async (req, res) => {
  const policyId = parseInt(req.params.id, 10);
  if (!policyId) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid policy id' },
    });
  }

  try {
    const { rows } = await db.query(
      `
      SELECT
        id,
        policy_id,
        document_type,
        file_name,
        original_name,
        file_size,
        file_url,
        description,
        uploaded_at,
        status,
        created_by,
        updated_by
      FROM policy_documents
      WHERE policy_id = $1
        AND status = 'active'
      ORDER BY uploaded_at DESC, id DESC
      `,
      [policyId]
    );

    return res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    console.error('Error loading policy documents:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// POST /api/placement/policies/:id/documents
router.post(
  '/policies/:id/documents',
  upload.single('file'),
  async (req, res) => {
    const policyId = parseInt(req.params.id, 10);

    if (!policyId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid policy id' },
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'File is required' },
      });
    }

    try {
      // pastikan policy ada
      const { rows: policyRows } = await db.query(
        'SELECT id, policy_number FROM policies WHERE id = $1',
        [policyId]
      );
      if (policyRows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Policy not found' },
        });
      }

      const policy = policyRows[0];
      const file = req.file;
      const { document_type, description } = req.body || {};
      const userId = getUserId(req);

      const insertSql = `
        INSERT INTO policy_documents (
          policy_id,
          document_type,
          file_name,
          original_name,
          file_size,
          file_url,
          description,
          uploaded_at,
          status,
          created_by,
          updated_by
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,
          now(),
          'active',
          $8,$8
        )
        RETURNING
          id,
          policy_id,
          document_type,
          file_name,
          original_name,
          file_size,
          file_url,
          description,
          uploaded_at,
          status,
          created_by,
          updated_by
      `;

      const params = [
        policyId,                                // $1 policy_id
        document_type || 'Policy Document',      // $2
        file.filename,                           // $3 file_name
        file.originalname || null,               // $4
        file.size || null,                       // $5
        `/uploads/${file.filename}`,             // $6
        description || '',                       // $7
        userId,                                  // $8 created_by & updated_by
      ];

      const { rows } = await db.query(insertSql, params);
      const doc = rows[0];

      return res.json({
        success: true,
        data: doc,
        message: `Document uploaded for Policy #${
          policy.policy_number || policyId
        }`,
      });
    } catch (err) {
      console.error('Error uploading policy document:', err);
      return res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: err.message },
      });
    }
  }
);

// DELETE /api/placement/policies/:id/documents/:docId
router.delete('/policies/:id/documents/:docId', async (req, res) => {
  const policyId = parseInt(req.params.id, 10);
  const docId = parseInt(req.params.docId, 10);

  if (!policyId || !docId) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Policy ID and document ID are required',
      },
    });
  }

  try {
    // ambil dulu untuk tahu file_name
    const { rows } = await db.query(
      `
      SELECT
        id,
        file_name
      FROM policy_documents
      WHERE id = $1
        AND policy_id = $2
        AND status = 'active'
      `,
      [docId, policyId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Document not found' },
      });
    }

    const doc = rows[0];
    const userId = getUserId(req);

    // soft delete di DB
    await db.query(
      `
      UPDATE policy_documents
      SET
        status = 'deleted',
        updated_by = $3
      WHERE id = $1
        AND policy_id = $2
      `,
      [docId, policyId, userId]
    );

    // best-effort hapus file fisik
    if (doc.file_name) {
      const filePath = path.join(uploadDir, doc.file_name);
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error('Error deleting file from disk:', err);
          }
        });
      }
    }

    return res.json({
      success: true,
      message: 'Document deleted',
    });
  } catch (err) {
    console.error('Error deleting policy document:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

module.exports = router;
