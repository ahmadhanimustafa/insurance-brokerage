// backend/src/routes/placement.js
// Unified Placement module: Clients + Proposals + Policies (+ simple Documents stub)
// In-memory store – good enough for local/dev

const express = require('express');
const router = express.Router();

// In-memory data stores
let clients = [];
let proposals = [];
let policies = [];
let documents = [];

let nextClientId = 1;
let nextProposalId = 1;
let nextPolicyId = 1;
let nextDocumentId = 1;

// Helper: normalize ID comparison
const sameId = (a, b) => String(a) === String(b);

// ===========================
// CLIENTS ENDPOINTS
// ===========================

router.get('/clients', (req, res) => {
  return res.json({
    success: true,
    data: clients,
  });
});

// POST /placement/clients
router.post('/clients', (req, res) => {
  try {
    const body = req.body || {};

    const type_of_client = body.type_of_client || body.type || '';
    const name = body.name || '';

    if (!type_of_client || !name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'type_of_client and name are required',
        },
      });
    }

    const newClient = {
      id: body.id || String(nextClientId++),

      type_of_client,
      salutation: body.salutation || '',
      first_name: body.first_name || '',
      mid_name: body.mid_name || '',
      last_name: body.last_name || '',
      name,

      address_1: body.address_1 || '',
      address_2: body.address_2 || '',
      address_3: body.address_3 || '',

      phone_1: body.phone_1 || '',
      phone_2: body.phone_2 || '',
      fax_1: body.fax_1 || '',
      fax_2: body.fax_2 || '',

      email: body.email || '',
      contact_person: body.contact_person || '',
      contact_position: body.contact_position || '',

      tax_id: body.tax_id || '',
      tax_address: body.tax_address || '',

      remarks: body.remarks || '',

      created_at: new Date(),
      updated_at: new Date(),
    };

    clients.push(newClient);

    return res.json({
      success: true,
      data: newClient,
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

router.put('/clients/:id', (req, res) => {
  try {
    const clientId = req.params.id;
    const idx = clients.findIndex((c) => sameId(c.id, clientId));

    if (idx === -1) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Client not found' },
      });
    }

    const existing = clients[idx];
    const body = req.body || {};

    const updated = {
      ...existing,
      ...body,
      type_of_client: body.type_of_client || body.type || existing.type_of_client,
      updated_at: new Date(),
    };

    clients[idx] = updated;

    return res.json({
      success: true,
      data: updated,
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

// ===========================
// PROPOSALS ENDPOINTS (simple stub if you still use it)
// ===========================

router.get('/proposals', (req, res) => {
  return res.json({
    success: true,
    data: proposals,
  });
});

router.post('/proposals', (req, res) => {
  try {
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
      policy_number,
      placing_slip_number,
      qs_number,
      remarks,
    } = req.body;

    if (!client_id || !class_of_business_id || !product_id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Client, Class of Business and Product are required',
        },
      });
    }

    const newProposal = {
      id: String(nextProposalId++),
      transaction_number:
        transaction_number || `PR-${Date.now().toString().slice(-6)}`,
      client_id,
      insurance_id: insurance_id || null,
      source_business_id: source_business_id || null,
      sales_id: sales_id || null,
      class_of_business_id,
      product_id,
      type_of_case: type_of_case || 'New',
      type_of_business: type_of_business || 'Direct',
      booking_date: booking_date || null,
      policy_number: policy_number || null,
      placing_slip_number: placing_slip_number || null,
      qs_number: qs_number || null,
      remarks: remarks || '',
      status: 'DRAFT',
      created_at: new Date(),
      updated_at: new Date(),
    };

    proposals.push(newProposal);

    return res.json({
      success: true,
      data: newProposal,
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

router.put('/proposals/:id', (req, res) => {
  try {
    const id = req.params.id;
    const idx = proposals.findIndex((p) => sameId(p.id, id));

    if (idx === -1) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Proposal not found' },
      });
    }

    const existing = proposals[idx];
    const updated = {
      ...existing,
      ...req.body,
      updated_at: new Date(),
    };

    proposals[idx] = updated;

    return res.json({
      success: true,
      data: updated,
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

router.post('/proposals/:id/convert', (req, res) => {
  try {
    const id = req.params.id;
    const idx = proposals.findIndex((p) => sameId(p.id, id));

    if (idx === -1) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Proposal not found' },
      });
    }

    proposals[idx] = {
      ...proposals[idx],
      status: 'CONVERTED',
      updated_at: new Date(),
    };

    return res.json({
      success: true,
      data: proposals[idx],
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

// ===========================
// POLICIES ENDPOINTS
// ===========================

router.get('/policies', (req, res) => {
  return res.json({
    success: true,
    data: policies,
  });
});

router.get('/policies/:id', (req, res) => {
  const id = req.params.id;
  const policy = policies.find((p) => sameId(p.id, id));

  if (!policy) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Policy not found' },
    });
  }

  return res.json({
    success: true,
    data: policy,
  });
});

router.post('/policies', (req, res) => {
  try {
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
      business_type, // extra business type if needed
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
      from_proposal_id, // optional
    } = req.body;

    // Insurance is handled at policy level, but we don't hard-block it here
    if (!client_id || !class_of_business_id || !product_id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Client, Class of Business and Product are required',
        },
      });
    }

    const gross = parseFloat(commission_gross) || 0;
    const source = parseFloat(commission_to_source) || 0;
    const net =
      commission_net_percent !== undefined && commission_net_percent !== null
        ? parseFloat(commission_net_percent) || 0
        : gross - source;

    const newPolicy = {
      id: String(nextPolicyId++),
      transaction_number:
        transaction_number || `POL-${Date.now().toString().slice(-6)}`,
      client_id,
      insurance_id: insurance_id || null,
      source_business_id: source_business_id || null,
      sales_id: sales_id || null,
      class_of_business_id,
      product_id,
      type_of_case: type_of_case || 'New',
      type_of_business: type_of_business || 'Direct',
      business_type: business_type || null,
      booking_date: booking_date || null,
      effective_date: effective_date || null,
      expiry_date: expiry_date || null,
      policy_number: policy_number || null,
      placing_slip_number: placing_slip_number || null,
      qs_number: qs_number || null,
      premium_amount: premium_amount ? parseFloat(premium_amount) : 0,
      currency: currency || 'IDR',
      commission_gross: gross,
      commission_to_source: source,
      commission_net_percent: net,
      remarks: remarks || '',
      from_proposal_id: from_proposal_id || null,
      status: 'DRAFT',
      sent_to_finance: false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    policies.push(newPolicy);

    return res.json({
      success: true,
      data: newPolicy,
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

router.put('/policies/:id', (req, res) => {
  try {
    const id = req.params.id;
    const idx = policies.findIndex((p) => sameId(p.id, id));

    if (idx === -1) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Policy not found' },
      });
    }

    const existing = policies[idx];

    const updated = {
      ...existing,
      ...req.body,
      premium_amount:
        req.body.premium_amount !== undefined
          ? parseFloat(req.body.premium_amount) || 0
          : existing.premium_amount,
      commission_gross:
        req.body.commission_gross !== undefined
          ? parseFloat(req.body.commission_gross) || 0
          : existing.commission_gross,
      commission_to_source:
        req.body.commission_to_source !== undefined
          ? parseFloat(req.body.commission_to_source) || 0
          : existing.commission_to_source,
      commission_net_percent:
        req.body.commission_net_percent !== undefined
          ? parseFloat(req.body.commission_net_percent) || 0
          : existing.commission_net_percent,
      updated_at: new Date(),
    };

    policies[idx] = updated;

    return res.json({
      success: true,
      data: updated,
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

router.post('/policies/:id/send-to-finance', (req, res) => {
  try {
    const id = req.params.id;
    const idx = policies.findIndex((p) => sameId(p.id, id));

    if (idx === -1) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Policy not found' },
      });
    }

    policies[idx] = {
      ...policies[idx],
      status: 'SENT_TO_FINANCE',
      sent_to_finance: true,
      sent_to_finance_at: new Date(),
      updated_at: new Date(),
    };

    return res.json({
      success: true,
      data: policies[idx],
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

// ===========================
// DOCUMENTS (very simple stub)
// ===========================

router.get('/documents', (req, res) => {
  const { policy_id } = req.query;

  const filtered = policy_id
    ? documents.filter((d) => sameId(d.policy_id, policy_id))
    : documents;

  return res.json({
    success: true,
    data: filtered,
  });
});

router.post('/documents', (req, res) => {
  try {
    const { policy_id, file_name, file_url, mime_type, size } = req.body;

    if (!policy_id || !file_name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'policy_id and file_name are required',
        },
      });
    }

    const newDoc = {
      id: String(nextDocumentId++),
      policy_id,
      file_name,
      file_url: file_url || null,
      mime_type: mime_type || 'application/octet-stream',
      size: size ? parseInt(size, 10) : null,
      uploaded_at: new Date(),
    };

    documents.push(newDoc);

    return res.json({
      success: true,
      data: newDoc,
      message: 'Document added successfully',
    });
  } catch (err) {
    console.error('Error creating document:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

module.exports = router;
