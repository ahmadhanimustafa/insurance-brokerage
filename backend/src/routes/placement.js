// backend/src/routes/placement.js - UPDATED with case type, renewal reference, business type, currency

const express = require('express');
const router = express.Router();

let clients = [];
let policies = [];
let documents = [];

let nextClientId = 1;
let nextPolicyId = 1;
let nextDocumentId = 1;

// ==========================================
// CLIENTS ENDPOINTS
// ==========================================

router.get('/clients', (req, res) => {
  res.json({
    success: true,
    data: { clients }
  });
});

router.post('/clients', (req, res) => {
  const {
    id, salutation, first_name, mid_name, last_name, name,
    address_1, address_2, address_3,
    phone_1, phone_2, mobile_1, mobile_2, fax_1, fax_2,
    email, contact, contact_address, contact_phone,
    taxid, tax_name, tax_address, lob, type_of_client,
    special_flag, remarks
  } = req.body;

  if (!email || !type_of_client) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Email and type of client are required' }
    });
  }

  const existingClient = clients.find(c => c.email?.toLowerCase() === email.toLowerCase());
  if (existingClient) {
    return res.status(400).json({
      success: false,
      error: { code: 'DUPLICATE', message: `Client with email ${email} already exists` }
    });
  }

  const newClient = {
    id: id || generateClientId(type_of_client),
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
    mobile_1,
    mobile_2,
    fax_1,
    fax_2,
    email,
    contact,
    contact_address,
    contact_phone,
    taxid,
    tax_name,
    tax_address,
    lob,
    type_of_client,
    special_flag: special_flag || false,
    remarks,
    created_at: new Date(),
    updated_at: new Date()
  };

  clients.push(newClient);
  res.status(201).json({ success: true, data: newClient });
});

router.get('/clients/:id', (req, res) => {
  const client = clients.find(c => c.id === req.params.id);
  if (!client) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Client not found' }
    });
  }
  res.json({ success: true, data: client });
});

router.put('/clients/:id', (req, res) => {
  const clientId = req.params.id;
  const clientIndex = clients.findIndex(c => c.id === clientId);

  if (clientIndex === -1) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Client not found' }
    });
  }

  const {
    salutation, first_name, mid_name, last_name, name,
    address_1, address_2, address_3,
    phone_1, phone_2, mobile_1, mobile_2, fax_1, fax_2,
    email, contact, contact_address, contact_phone,
    taxid, tax_name, tax_address, lob, type_of_client,
    special_flag, remarks
  } = req.body;

  if (email && email !== clients[clientIndex].email) {
    const duplicateEmail = clients.find(c => c.id !== clientId && c.email?.toLowerCase() === email.toLowerCase());
    if (duplicateEmail) {
      return res.status(400).json({
        success: false,
        error: { code: 'DUPLICATE', message: `Email ${email} already exists` }
      });
    }
  }

  const updatedClient = {
    ...clients[clientIndex],
    salutation: salutation !== undefined ? salutation : clients[clientIndex].salutation,
    first_name: first_name !== undefined ? first_name : clients[clientIndex].first_name,
    mid_name: mid_name !== undefined ? mid_name : clients[clientIndex].mid_name,
    last_name: last_name !== undefined ? last_name : clients[clientIndex].last_name,
    name: name !== undefined ? name : clients[clientIndex].name,
    address_1: address_1 !== undefined ? address_1 : clients[clientIndex].address_1,
    address_2: address_2 !== undefined ? address_2 : clients[clientIndex].address_2,
    address_3: address_3 !== undefined ? address_3 : clients[clientIndex].address_3,
    phone_1: phone_1 !== undefined ? phone_1 : clients[clientIndex].phone_1,
    phone_2: phone_2 !== undefined ? phone_2 : clients[clientIndex].phone_2,
    mobile_1: mobile_1 !== undefined ? mobile_1 : clients[clientIndex].mobile_1,
    mobile_2: mobile_2 !== undefined ? mobile_2 : clients[clientIndex].mobile_2,
    fax_1: fax_1 !== undefined ? fax_1 : clients[clientIndex].fax_1,
    fax_2: fax_2 !== undefined ? fax_2 : clients[clientIndex].fax_2,
    email: email !== undefined ? email : clients[clientIndex].email,
    contact: contact !== undefined ? contact : clients[clientIndex].contact,
    contact_address: contact_address !== undefined ? contact_address : clients[clientIndex].contact_address,
    contact_phone: contact_phone !== undefined ? contact_phone : clients[clientIndex].contact_phone,
    taxid: taxid !== undefined ? taxid : clients[clientIndex].taxid,
    tax_name: tax_name !== undefined ? tax_name : clients[clientIndex].tax_name,
    tax_address: tax_address !== undefined ? tax_address : clients[clientIndex].tax_address,
    lob: lob !== undefined ? lob : clients[clientIndex].lob,
    type_of_client: type_of_client !== undefined ? type_of_client : clients[clientIndex].type_of_client,
    special_flag: special_flag !== undefined ? special_flag : clients[clientIndex].special_flag,
    remarks: remarks !== undefined ? remarks : clients[clientIndex].remarks,
    updated_at: new Date()
  };

  clients[clientIndex] = updatedClient;
  res.json({ success: true, data: updatedClient, message: 'Client updated successfully' });
});

function generateClientId(typeOfClient) {
  const prefixes = {
    'Policy Holder': 'PH',
    'Source of Business': 'SOB',
    'Insurance': 'INS',
    'Partner Co-Broking': 'PCB'
  };
  const prefix = prefixes[typeOfClient] || 'CLT';
  const timestamp = Date.now().toString().slice(-6);
  return `${prefix}-${timestamp}`;
}

function generateTransactionNumber() {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `TRX-${timestamp}-${random}`;
}

// ==========================================
// POLICIES ENDPOINTS
// ==========================================

router.get('/policies', (req, res) => {
  res.json({
    success: true,
    data: { policies }
  });
});

router.post('/policies', (req, res) => {
  const { 
    transaction_number, type_of_case, reference_policy_id, client_id, insurance_id, source_business_id,
    class_of_business_id, product_id, type_of_business, placing_slip_number, qs_number,
    policy_number, effective_date, expiry_date, premium_amount, currency,
    commission_gross, commission_to_source
  } = req.body;

  if (!effective_date || !expiry_date || !premium_amount) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Required fields missing' }
    });
  }

  // Validate renewal has reference policy
  if (type_of_case === 'Renewal' && !reference_policy_id) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Renewal policies require a reference policy' }
    });
  }

  const gross = parseFloat(commission_gross) || 0;
  const source = parseFloat(commission_to_source) || 0;
  const net = gross - source;

  const newPolicy = {
    id: nextPolicyId++,
    transaction_number: transaction_number || generateTransactionNumber(),
    type_of_case: type_of_case || 'New',
    reference_policy_id: reference_policy_id || null,
    client_id: client_id || null,
    insurance_id: insurance_id || null,
    source_business_id: source_business_id || null,
    class_of_business_id,
    product_id,
    type_of_business: type_of_business || 'Direct',
    placing_slip_number,
    qs_number,
    policy_number: policy_number || `POL-${Date.now()}`,
    effective_date,
    expiry_date,
    premium_amount: parseFloat(premium_amount),
    currency: currency || 'IDR',
    commission_gross: gross,
    commission_to_source: source,
    commission_net_percent: net.toFixed(2),
    sent_to_finance: false,
    created_at: new Date(),
    updated_at: new Date()
  };

  policies.push(newPolicy);
  res.status(201).json({ success: true, data: newPolicy });
});

router.get('/policies/:id', (req, res) => {
  const policy = policies.find(p => p.id === parseInt(req.params.id));
  if (!policy) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Policy not found' }
    });
  }
  res.json({ success: true, data: policy });
});

router.put('/policies/:id', (req, res) => {
  const policyId = parseInt(req.params.id);
  const policyIndex = policies.findIndex(p => p.id === policyId);

  if (policyIndex === -1) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Policy not found' }
    });
  }

  const { 
    transaction_number, type_of_case, reference_policy_id, client_id, insurance_id, source_business_id,
    class_of_business_id, product_id, type_of_business, placing_slip_number, qs_number,
    policy_number, effective_date, expiry_date, premium_amount, currency,
    commission_gross, commission_to_source
  } = req.body;

  // Validate renewal has reference policy
  if (type_of_case === 'Renewal' && !reference_policy_id) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Renewal policies require a reference policy' }
    });
  }

  const gross = parseFloat(commission_gross) !== undefined ? parseFloat(commission_gross) : policies[policyIndex].commission_gross;
  const source = parseFloat(commission_to_source) !== undefined ? parseFloat(commission_to_source) : policies[policyIndex].commission_to_source;
  const net = gross - source;

  const updatedPolicy = {
    ...policies[policyIndex],
    transaction_number: transaction_number !== undefined ? transaction_number : policies[policyIndex].transaction_number,
    type_of_case: type_of_case !== undefined ? type_of_case : policies[policyIndex].type_of_case,
    reference_policy_id: reference_policy_id !== undefined ? reference_policy_id : policies[policyIndex].reference_policy_id,
    client_id: client_id !== undefined? (client_id || null): policies[policyIndex].client_id,
    insurance_id: insurance_id !== undefined? (insurance_id || null): policies[policyIndex].insurance_id,
    source_business_id: source_business_id !== undefined? (source_business_id || null): policies[policyIndex].source_business_id,
    class_of_business_id: class_of_business_id !== undefined ? class_of_business_id : policies[policyIndex].class_of_business_id,
    product_id: product_id !== undefined ? product_id : policies[policyIndex].product_id,
    type_of_business: type_of_business !== undefined ? type_of_business : policies[policyIndex].type_of_business,
    placing_slip_number: placing_slip_number !== undefined ? placing_slip_number : policies[policyIndex].placing_slip_number,
    qs_number: qs_number !== undefined ? qs_number : policies[policyIndex].qs_number,
    policy_number: policy_number !== undefined ? policy_number : policies[policyIndex].policy_number,
    effective_date: effective_date !== undefined ? effective_date : policies[policyIndex].effective_date,
    expiry_date: expiry_date !== undefined ? expiry_date : policies[policyIndex].expiry_date,
    premium_amount: premium_amount !== undefined ? parseFloat(premium_amount) : policies[policyIndex].premium_amount,
    currency: currency !== undefined ? currency : policies[policyIndex].currency,
    commission_gross: gross,
    commission_to_source: source,
    commission_net_percent: net.toFixed(2),
    sent_to_finance:req.body.sent_to_finance !== undefined? req.body.sent_to_finance: policies[policyIndex].sent_to_finance,
    updated_at: new Date()
  };

  policies[policyIndex] = updatedPolicy;
  res.json({ success: true, data: updatedPolicy, message: 'Policy updated successfully' });
});

// ==========================================
// DOCUMENTS ENDPOINTS
// ==========================================

router.get('/documents', (req, res) => {
  res.json({ success: true, data: { documents } });
});

router.get('/policies/:policy_id/documents', (req, res) => {
  const policyId = parseInt(req.params.policy_id);
  const policyDocs = documents.filter(d => d.policy_id === policyId);
  res.json({
    success: true,
    data: { 
      policy_id: policyId,
      documents: policyDocs,
      count: policyDocs.length
    }
  });
});

router.post('/documents', (req, res) => {
  const { policy_id, document_type, file_name, file_size, file_url, description } = req.body;

  if (!policy_id || !document_type || !file_name) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Policy ID, document type, and file name required' }
    });
  }

  const policy = policies.find(p => p.id === parseInt(policy_id));
  if (!policy) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Policy not found' }
    });
  }

  const newDocument = {
    id: nextDocumentId++,
    policy_id: parseInt(policy_id),
    document_type,
    file_name,
    file_size: file_size || 0,
    file_url: file_url || `/uploads/${file_name}`,
    description,
    uploaded_at: new Date(),
    status: 'active'
  };

  documents.push(newDocument);

  res.status(201).json({
    success: true,
    data: newDocument,
    message: `Document uploaded for Policy #${policy.policy_number}`
  });
});

router.get('/documents/:id', (req, res) => {
  const document = documents.find(d => d.id === parseInt(req.params.id));
  if (!document) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Document not found' }
    });
  }
  res.json({ success: true, data: document });
});

router.delete('/documents/:id', (req, res) => {
  const index = documents.findIndex(d => d.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Document not found' }
    });
  }

  const deleted = documents.splice(index, 1)[0];
  res.json({
    success: true,
    data: deleted,
    message: 'Document deleted successfully'
  });
});
// Mark policy as sent to finance
router.post('/policies/:id/send-to-finance', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const policyIndex = policies.findIndex((p) => p.id === id);

  if (policyIndex === -1) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Policy not found' }
    });
  }

  const policy = policies[policyIndex];

  if (!policy.client_id || !policy.insurance_id) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION',
        message: 'Client dan Insurance harus diisi sebelum dikirim ke Finance.'
      }
    });
  }

  if (policy.sent_to_finance) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'ALREADY_SENT',
        message: 'Policy sudah pernah dikirim ke Finance.'
      }
    });
  }

  policies[policyIndex] = {
    ...policy,
    sent_to_finance: true,
    updated_at: new Date()
  };

  res.json({
    success: true,
    data: policies[policyIndex],
    message: 'Policy marked as sent to Finance.'
  });
});

module.exports = router;