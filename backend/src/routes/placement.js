// backend/src/routes/placement.js
// DB-backed Placement: Clients + Proposals + Policies
// Compatible with current Placement.jsx API/field names.

const express = require('express');
const router = express.Router();
const db = require('../utils/db'); // adjust if your path/name is different

// helper: uniform ID compare
const sameId = (a, b) => String(a) === String(b);

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
        contact_phone,
        taxid,
        tax_name,
        tax_address,
        lob,
        type_of_client,
        special_flag,
        remarks,
        created_at,
        updated_at
      FROM clients
      ORDER BY id DESC
      `
    );

    // Map DB columns back into the shape Placement.jsx expects for listing / dropdowns.
    const data = rows.map((r) => ({
      id: r.id, // used as FK everywhere
      type_of_client: r.type_of_client,
      salutation: "",      // not stored; kept only in UI
      first_name: "",      // not stored; we store full name in `name`
      mid_name: "",
      last_name: "",
      name: r.name,
      address_1: r.contact_address || "",
      address_2: "",
      address_3: "",
      phone_1: r.contact_phone || "",
      phone_2: "",
      fax_1: "",
      fax_2: "",
      email: r.email || "",
      contact_person: r.contact_person || "",
      contact_position: "",
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

    const contact_address = [address_1, address_2, address_3]
      .filter(Boolean)
      .join('\n');

    // main phone
    const contact_phone = phone_1 || null;

    // stuff we don't have direct columns for -> append into remarks
    let mergedRemarks = remarks || '';
    if (phone_2) mergedRemarks += `\nAlt phone: ${phone_2}`;
    if (fax_1) mergedRemarks += `\nFax 1: ${fax_1}`;
    if (fax_2) mergedRemarks += `\nFax 2: ${fax_2}`;
    if (contact_position) mergedRemarks += `\nContact position: ${contact_position}`;
    if (salutation || first_name || last_name) {
      mergedRemarks += `\nName parts: ${[
        salutation,
        first_name,
        mid_name,
        last_name,
      ]
        .filter(Boolean)
        .join(' ')}`;
    }

    // Frontend generates a pretty code (CL-001 etc) in payload.id.
    // We'll store that in clients.client_id, but primary key is the serial `id`.
    const clientCode = body.id || null;

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
        client_id
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,false,$11,$12)
      RETURNING
        id,
        client_id,
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
        created_at,
        updated_at
    `;

    const params = [
      name,
      email || null,
      contact_person || null,
      contact_address || null,
      contact_phone,
      tax_id || null,
      null, // tax_name not provided from UI
      tax_address || null,
      null, // lob
      type_of_client,
      mergedRemarks || null,
      clientCode,
    ];

    const { rows } = await db.query(insertSql, params);
    const r = rows[0];

    const responseClient = {
      id: r.id,
      type_of_client: r.type_of_client,
      salutation: '',
      first_name: '',
      mid_name: '',
      last_name: '',
      name: r.name,
      address_1: r.contact_address || '',
      address_2: '',
      address_3: '',
      phone_1: r.contact_phone || '',
      phone_2: '',
      fax_1: '',
      fax_2: '',
      email: r.email || '',
      contact_person: r.contact_person || '',
      contact_position: '',
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
    } = body;

    const contact_address = [address_1, address_2, address_3]
      .filter(Boolean)
      .join('\n');
    const contact_phone = phone_1 || null;

    let mergedRemarks = remarks || '';
    if (phone_2) mergedRemarks += `\nAlt phone: ${phone_2}`;
    if (fax_1) mergedRemarks += `\nFax 1: ${fax_1}`;
    if (fax_2) mergedRemarks += `\nFax 2: ${fax_2}`;
    if (contact_position) mergedRemarks += `\nContact position: ${contact_position}`;
    if (first_name || last_name) {
      mergedRemarks += `\nName parts: ${[first_name, mid_name, last_name]
        .filter(Boolean)
        .join(' ')}`;
    }

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
        updated_at = now()
      WHERE id = $10
      RETURNING
        id,
        client_id,
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
        created_at,
        updated_at
    `;

    const params = [
      name || null,
      email || null,
      contact_person || null,
      contact_address || null,
      contact_phone,
      tax_id || null,
      tax_address || null,
      type_of_client || null,
      mergedRemarks || null,
      id,
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
      type_of_client: r.type_of_client,
      salutation: '',
      first_name: '',
      mid_name: '',
      last_name: '',
      name: r.name,
      address_1: r.contact_address || '',
      address_2: '',
      address_3: '',
      phone_1: r.contact_phone || '',
      phone_2: '',
      fax_1: '',
      fax_2: '',
      email: r.email || '',
      contact_person: r.contact_person || '',
      contact_position: '',
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

    const trx =
      transaction_number && transaction_number.trim()
        ? transaction_number
        : `TRX-${Date.now().toString().slice(-6)}`;

    const reqDate = booking_date || new Date().toISOString().split('T')[0];

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
        status
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'DRAFT')
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
        updated_at
    `;

    const params = [
      trx,
      type_of_case || 'New',
      type_of_business || 'Direct',
      client_id,
      source_business_id || null,
      class_of_business_id,
      product_id,
      sales_id || null,
      reqDate,
      placing_slip_number || null,
      qs_number || null,
      remarks || null,
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
      status,
    } = body;

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
        updated_at = now()
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
        updated_at
    `;

    const reqDate = booking_date || null;

    const params = [
      transaction_number || null,
      type_of_case || null,
      type_of_business || null,
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
        remarks
      )
      VALUES (
        $1,$2,$3,$4,
        $5,$6,$7,$8,$9,
        $10,$11,$12,$13,$14,$15,$16,
        $17,$18,false,$19,$20,$21
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
    `;

    const params = [
      trx,
      policy_number || null,
      placing_slip_number || null,
      qs_number || null,
      client_id,
      insurance_id || null,
      source_business_id || null,
      class_of_business_id,
      product_id,
      type_of_case || 'New',
      type_of_business || 'Direct',
      currency || 'IDR',
      prem,
      gross,
      src,
      net,
      effective_date || null,
      expiry_date || null,
      reqDate,
      sales_id || null,
      remarks || null,
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
        case_type = COALESCE($10, case_type),
        type_of_business = COALESCE($11, type_of_business),
        currency = COALESCE($12, currency),
        premium_amount = COALESCE($13, premium_amount),
        commission_gross = COALESCE($14, commission_gross),
        commission_to_source = COALESCE($15, commission_to_source),
        commission_net_percent = COALESCE($16, commission_net_percent),
        effective_date = COALESCE($17, effective_date),
        expiry_date = COALESCE($18, expiry_date),
        request_date = COALESCE($19, request_date),
        sales_id = COALESCE($20, sales_id),
        remarks = COALESCE($21, remarks),
        sent_to_finance = COALESCE($22, sent_to_finance),
        updated_at = now()
      WHERE id = $23
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
        updated_at
    `;

    const params = [
      transaction_number || null,
      policy_number || null,
      placing_slip_number || null,
      qs_number || null,
      client_id || null,
      insurance_id || null,
      source_business_id || null,
      class_of_business_id || null,
      product_id || null,
      type_of_case || null,
      type_of_business || null,
      currency || null,
      prem,
      gross,
      src,
      net,
      effective_date || null,
      expiry_date || null,
      booking_date || null,
      sales_id || null,
      remarks || null,
      typeof sent_to_finance === 'boolean' ? sent_to_finance : null,
      id,
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

    const { rows } = await db.query(
      `
      UPDATE policies
      SET
        sent_to_finance = true,
        updated_at = now()
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
        updated_at
      `,
      [id]
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

module.exports = router;
