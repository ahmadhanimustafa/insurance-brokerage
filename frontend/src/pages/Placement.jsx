// frontend/src/pages/Placement.jsx - UPDATED with search/filter, documents, policy number + PS/QS generator & validation

import React, { useState, useEffect } from 'react';
import api from '../services/api';

function Placement() {
  const [activeTab, setActiveTab] = useState('policies');
  const [clients, setClients] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Selected policy for documents
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [policyDocuments, setPolicyDocuments] = useState([]);

  // Modal states
  const [showClientModal, setShowClientModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [nameValidation, setNameValidation] = useState('');
  const [emailValidation, setEmailValidation] = useState('');

  // Autocomplete states
  const [clientNameInput, setClientNameInput] = useState('');
  const [clientNameOpen, setClientNameOpen] = useState(false);
  const [insuranceNameInput, setInsuranceNameInput] = useState('');
  const [insuranceNameOpen, setInsuranceNameOpen] = useState(false);
  const [sourceBusinessInput, setSourceBusinessInput] = useState('');
  const [sourceBusinessOpen, setSourceBusinessOpen] = useState(false);
  const [previousPolicyInput, setPreviousPolicyInput] = useState('');
  const [previousPolicyOpen, setPreviousPolicyOpen] = useState(false);

  // Search & filter states (Clients)
  const [clientSearch, setClientSearch] = useState('');
  const [clientTypeFilter, setClientTypeFilter] = useState('');

  // Search & filter states (Policies)
  const [policySearch, setPolicySearch] = useState('');
  const [policyTypeFilter, setPolicyTypeFilter] = useState('');
  const [policyBusinessFilter, setPolicyBusinessFilter] = useState('');

  // Validation for policy/placing/QS numbers
  const [policyNumberValidation, setPolicyNumberValidation] = useState('');
  const [placingValidation, setPlacingValidation] = useState('');
  const [qsValidation, setQsValidation] = useState('');

  // Document preview state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewDocName, setPreviewDocName] = useState('');
  const [previewIsBlob, setPreviewIsBlob] = useState(false);


  // Dropdown options
  const salutationOptions = ['PT', 'CV', 'UD', 'Bapak', 'Ibu', 'Mr', 'Mrs', 'Ms'];
  const typeOfClientOptions = ['Policy Holder', 'Source of Business', 'Insurance', 'Partner Co-Broking'];
  const typeOfCaseOptions = ['New', 'Renewal'];
  const typeOfBusinessOptions = ['Direct', 'Non Direct'];
  const currencyOptions = ['IDR', 'USD'];

  const classOfBusinessOptions = [
    'Professional Indemnity',
    'Property Damage',
    'Liability',
    'Marine',
    'Aviation',
    'Motor',
    'Travel',
    'Health Insurance'
  ];

  const productNameOptions = {
    'Professional Indemnity': ['PI Insurance', 'E&O Insurance', 'Management Liability'],
    'Property Damage': ['Building Insurance', 'Contents Insurance', 'Equipment Coverage'],
    'Liability': ['General Liability', 'Employers Liability', 'Product Liability'],
    'Marine': ['Hull Insurance', 'Cargo Insurance', 'Protection & Indemnity'],
    'Aviation': ['Aircraft Liability', 'Passenger Liability', 'Equipment Coverage'],
    'Motor': ['Motor Fleet', 'Motor Commercial', 'Motor Private'],
    'Travel': ['Travel Insurance', 'Trip Cancellation', 'Medical Expenses'],
    'Health Insurance': ['Health Plans', 'Dental Plans', 'Vision Plans']
  };

  // === Helpers ===

  // Generate transaction number
  const generateTransactionNumber = () => {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `TRX-${timestamp}-${random}`;
  };

  // Generate ID with prefix based on client type
  const generateClientId = (typeOfClient) => {
    const prefixes = {
      'Policy Holder': 'PH',
      'Source of Business': 'SOB',
      'Insurance': 'INS',
      'Partner Co-Broking': 'PCB'
    };
    const prefix = prefixes[typeOfClient] || 'CLT';
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}-${timestamp}`;
  };

  const toInitials = (str) => {
    if (!str) return '';
    return str
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0].toUpperCase())
      .join('');
  };

  const monthToRoman = (monthNumber) => {
    const roman = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
    if (monthNumber < 1 || monthNumber > 12) return '';
    return roman[monthNumber - 1];
  };

  // Format premium with currency
  const formatPremium = (value) => {
    if (!value) return '';
    const num = parseFloat(value);
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Parse formatted premium back to number
  const parsePremium = (formatted) => {
    if (!formatted) return '';
    return formatted.replace(/,/g, '');
  };

  // Validate email on-the-fly
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      setEmailValidation('');
      return;
    }

    if (!emailRegex.test(email)) {
      setEmailValidation('⚠️ Invalid email format');
      return;
    }

    const existingClient = clients.find((c) => c.email?.toLowerCase() === email.toLowerCase());
    if (existingClient) {
      setEmailValidation(`⚠️ Email already exists: ${existingClient.name}`);
      return;
    }

    setEmailValidation('✅ Email is valid');
  };

  // Validate and suggest name
  const validateName = (firstName, midName, lastName) => {
    const fullName = `${firstName} ${midName} ${lastName}`.trim();
    const existingName = clients.find((c) => c.name?.toLowerCase() === fullName.toLowerCase());

    if (existingName) {
      return `⚠️ Similar name exists: ${existingName.name}`;
    }

    if (fullName.length < 3) {
      return '⚠️ Name too short';
    }

    return '✅ Name is valid';
  };

  // Calculate expiry date (1 year from effective date)
  const calculateExpiryDate = (effectiveDate) => {
    if (!effectiveDate) return '';
    const date = new Date(effectiveDate);
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split('T')[0];
  };

  // Get filtered clients by type
  const getClientsByType = (type) => {
    return clients.filter((c) => c.type_of_client === type);
  };

  // Filter autocomplete options
  const filterAutocomplete = (items, searchTerm) => {
    if (!searchTerm) return items;
    return items.filter((item) =>
      item.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Get previous policies for reference
  const getPreviousPolicies = (searchTerm) => {
    let filtered = policies.filter((p) => p.id !== policyForm.policy_id);
    if (!searchTerm) return filtered.slice(0, 5);
    return filtered
      .filter(
        (p) =>
          p.policy_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.transaction_number?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .slice(0, 5);
  };

  const calculateNetCommission = (gross, toSource) => {
    if (!gross || !toSource) return '';
    const gross_val = parseFloat(gross) || 0;
    const source_val = parseFloat(toSource) || 0;
    const net = gross_val - source_val;
    return net.toFixed(2);
  };

  // === Form state ===

  const initialClientForm = {
    id: '',
    salutation: '',
    first_name: '',
    mid_name: '',
    last_name: '',
    name: '',
    address_1: '',
    address_2: '',
    address_3: '',
    phone_1: '',
    phone_2: '',
    mobile_1: '',
    mobile_2: '',
    fax_1: '',
    fax_2: '',
    email: '',
    contact: '',
    contact_address: '',
    contact_phone: '',
    taxid: '',
    tax_name: '',
    tax_address: '',
    lob: '',
    type_of_client: '',
    special_flag: false,
    remarks: ''
  };

  const initialPolicyForm = {
    policy_id: '',
    transaction_number: '',
    type_of_case: 'New',
    reference_policy_id: '',
    client_id: '',
    insurance_id: '',
    source_business_id: '',
    policy_number: '',
    class_of_business_id: '',
    product_id: '',
    type_of_business: 'Direct',
    placing_slip_number: '',
    qs_number: '',
    effective_date: '',
    expiry_date: '',
    premium_amount: '',
    currency: 'IDR',
    commission_gross: '',
    commission_to_source: '',
    commission_net_percent: ''
  };

  const [clientForm, setClientForm] = useState(initialClientForm);
  const [policyForm, setPolicyForm] = useState(initialPolicyForm);

  const [docForm, setDocForm] = useState({
    policy_id: '',
    document_type: 'general',
    file_name: '',
    file: null,
    description: ''
  });

  // === API ===

  useEffect(() => {
    loadClients();
    loadPolicies();
  }, []);

  const loadClients = async () => {
    try {
      const response = await api.get('/placement/clients');
      if (response.data.success) {
        setClients(response.data.data.clients || response.data.data);
      }
    } catch (err) {
      console.error('Error loading clients:', err);
    }
  };

  const loadPolicies = async () => {
    try {
      const response = await api.get('/placement/policies');
      if (response.data.success) {
        setPolicies(response.data.data.policies || response.data.data);
      }
    } catch (err) {
      console.error('Error loading policies:', err);
    }
  };

  const loadPolicyDocuments = async (policyId) => {
    try {
      const response = await api.get(`/placement/policies/${policyId}/documents`);
      if (response.data.success) {
        setPolicyDocuments(response.data.data.documents || []);
      }
    } catch (err) {
      console.error('Error loading documents:', err);
    }
  };

  // === Client form helpers ===

  const updateClientName = (form) => {
    const fullName = `${form.salutation ? form.salutation + ' ' : ''}${form.first_name} ${form.mid_name} ${form.last_name}`.trim();
    const validation = validateName(form.first_name, form.mid_name, form.last_name);
    setNameValidation(validation);
    return { ...form, name: fullName };
  };

  const handleAddClient = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const clientData = {
        ...clientForm,
        id: clientForm.id || generateClientId(clientForm.type_of_client)
      };

      const response = await api.post('/placement/clients', clientData);
      if (response.data.success) {
        setSuccess('✅ Client added successfully!');
        setShowClientModal(false);
        setEditingClient(null);
        setNameValidation('');
        setEmailValidation('');
        setClientForm(initialClientForm);
        loadClients();
      }
    } catch (err) {
      setError('❌ Error: ' + (err.response?.data?.error?.message || err.message));
    }
    setLoading(false);
  };

  const handleEditClient = (client) => {
    setEditingClient(client);
    setClientForm({
      ...initialClientForm,
      ...client
    });
    setShowClientModal(true);
  };

  // === Policy number / PS / QS helpers & validation ===

  const validateUniquePolicyNumber = (value, currentPolicyId) => {
    if (!value) {
      setPolicyNumberValidation('');
      return;
    }
    const dup = policies.find(
      (p) => p.policy_number === value && p.id !== currentPolicyId
    );
    if (dup) {
      setPolicyNumberValidation(`⚠️ Duplicate policy number (TRX: ${dup.transaction_number})`);
    } else {
      setPolicyNumberValidation('✅ Unique policy number');
    }
  };

  const validatePlacingNumber = (value, currentPolicyId) => {
    if (!value) {
      setPlacingValidation('');
      return;
    }
    const dup = policies.find(
      (p) => p.placing_slip_number === value && p.id !== currentPolicyId
    );
    if (dup) {
      setPlacingValidation(`⚠️ Duplicate placing slip (TRX: ${dup.transaction_number})`);
    } else {
      setPlacingValidation('✅ Unique placing slip');
    }
  };

  const validateQsNumber = (value, currentPolicyId) => {
    if (!value) {
      setQsValidation('');
      return;
    }
    const dup = policies.find(
      (p) => p.qs_number === value && p.id !== currentPolicyId
    );
    if (dup) {
      setQsValidation(`⚠️ Duplicate quotation slip (TRX: ${dup.transaction_number})`);
    } else {
      setQsValidation('✅ Unique quotation slip');
    }
  };

  const generatePolicyNumber = () => {
    const cob = policyForm.class_of_business_id;
    const prod = policyForm.product_id;
    const eff = policyForm.effective_date || new Date().toISOString().split('T')[0];

    if (!cob || !prod) {
      setPolicyNumberValidation('⚠️ Please choose Class of Business & Product first');
      return;
    }

    const year = new Date(eff).getFullYear();
    const cobInit = toInitials(cob);
    const prodInit = toInitials(prod);
    const prefix = `${cobInit}${prodInit}-${year}-`;

    const existing = policies
      .map((p) => p.policy_number)
      .filter((num) => num && num.startsWith(prefix));

    let maxSeq = 0;
    existing.forEach((num) => {
      const parts = num.split('-');
      const seqPart = parts[2];
      const n = parseInt(seqPart, 10);
      if (!isNaN(n) && n > maxSeq) maxSeq = n;
    });

    const next = maxSeq + 1;
    const seqStr = String(next).padStart(3, '0');
    const newNumber = `${cobInit}${prodInit}-${year}-${seqStr}`;

    setPolicyForm((prev) => ({
      ...prev,
      policy_number: newNumber
    }));
    validateUniquePolicyNumber(newNumber, policyForm.policy_id || editingPolicy?.id);
  };

  const generateRefNumber = (kind) => {
    const cob = policyForm.class_of_business_id;
    const prod = policyForm.product_id;
    const eff = policyForm.effective_date || new Date().toISOString().split('T')[0];

    if (!cob || !prod) {
      if (kind === 'PS') {
        setPlacingValidation('⚠️ Please choose Class of Business & Product first');
      } else {
        setQsValidation('⚠️ Please choose Class of Business & Product first');
      }
      return;
    }

    const date = new Date(eff);
    const year = date.getFullYear();
    const monthRoman = monthToRoman(date.getMonth() + 1);
    const cobInit = toInitials(cob);
    const prodInit = toInitials(prod);

    const list =
      kind === 'PS'
        ? policies.map((p) => p.placing_slip_number).filter(Boolean)
        : policies.map((p) => p.qs_number).filter(Boolean);

    let maxSeq = 0;
    list.forEach((num) => {
      const parts = num.split('/');
      if (parts[0] !== kind) return;
      const n = parseInt(parts[1], 10);
      if (!isNaN(n) && n > maxSeq) maxSeq = n;
    });

    const next = maxSeq + 1;
    const seqStr = String(next).padStart(3, '0');
    const value = `${kind}/${seqStr}/${cobInit}/${prodInit}/${monthRoman}/${year}`;

    if (kind === 'PS') {
      setPolicyForm((prev) => ({
        ...prev,
        placing_slip_number: value
      }));
      validatePlacingNumber(value, policyForm.policy_id || editingPolicy?.id);
    } else {
      setPolicyForm((prev) => ({
        ...prev,
        qs_number: value
      }));
      validateQsNumber(value, policyForm.policy_id || editingPolicy?.id);
    }
  };

  // === Policy save/edit ===

  const handleSavePolicy = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const policyData = {
        ...policyForm,
        premium_amount: parsePremium(policyForm.premium_amount),
        commission_net_percent: calculateNetCommission(
          policyForm.commission_gross,
          policyForm.commission_to_source
        )
      };

      if (editingPolicy) {
        const response = await api.put(`/placement/policies/${editingPolicy.id}`, policyData);
        if (response.data.success) {
          setSuccess('✅ Policy updated successfully!');
          setEditingPolicy(null);
        }
      } else {
        const response = await api.post('/placement/policies', policyData);
        if (response.data.success) {
          setSuccess('✅ Policy created successfully!');
        }
      }
      setShowPolicyModal(false);
      setPolicyForm(initialPolicyForm);
      setClientNameInput('');
      setInsuranceNameInput('');
      setSourceBusinessInput('');
      setPreviousPolicyInput('');
      setPolicyNumberValidation('');
      setPlacingValidation('');
      setQsValidation('');
      loadPolicies();
    } catch (err) {
      setError('❌ Error: ' + (err.response?.data?.error?.message || err.message));
    }
    setLoading(false);
  };

  const handleEditPolicy = (policy) => {
    setEditingPolicy(policy);
    setPolicyForm({
      ...initialPolicyForm,
      policy_id: policy.id || '',
      transaction_number: policy.transaction_number || '',
      type_of_case: policy.type_of_case || 'New',
      reference_policy_id: policy.reference_policy_id || '',
      client_id: policy.client_id || '',
      insurance_id: policy.insurance_id || '',
      source_business_id: policy.source_business_id || '',
      policy_number: policy.policy_number || '',
      class_of_business_id: policy.class_of_business_id || '',
      product_id: policy.product_id || '',
      type_of_business: policy.type_of_business || 'Direct',
      placing_slip_number: policy.placing_slip_number || '',
      qs_number: policy.qs_number || '',
      effective_date: policy.effective_date || '',
      expiry_date: policy.expiry_date || '',
      premium_amount: formatPremium(policy.premium_amount) || '',
      currency: policy.currency || 'IDR',
      commission_gross: policy.commission_gross || '',
      commission_to_source: policy.commission_to_source || '',
      commission_net_percent: policy.commission_net_percent || ''
    });

    setClientNameInput(clients.find((c) => c.id === policy.client_id)?.name || '');
    setInsuranceNameInput(clients.find((c) => c.id === policy.insurance_id)?.name || '');
    setSourceBusinessInput(clients.find((c) => c.id === policy.source_business_id)?.name || '');
    setPreviousPolicyInput(
      policy.reference_policy_id
        ? policies.find((p) => p.id === policy.reference_policy_id)?.policy_number || ''
        : ''
    );

    // re-validate numbers on edit
    validateUniquePolicyNumber(policy.policy_number || '', policy.id);
    validatePlacingNumber(policy.placing_slip_number || '', policy.id);
    validateQsNumber(policy.qs_number || '', policy.id);

    setShowPolicyModal(true);
  };

  // === Documents ===

  const handleAddDocument = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/placement/documents', {
        policy_id: docForm.policy_id,
        document_type: docForm.document_type,
        file_name: docForm.file_name || docForm.file?.name,
        description: docForm.description,
        file_size: docForm.file?.size
      });
      if (response.data.success) {
        setSuccess('✅ Document uploaded!');
        setShowDocModal(false);
        setDocForm({
          policy_id: selectedPolicy?.id || '',
          document_type: 'general',
          file_name: '',
          file: null,
          description: ''
        });
        if (selectedPolicy) loadPolicyDocuments(selectedPolicy.id);
      }
    } catch (err) {
      setError('❌ Error: ' + (err.response?.data?.error?.message || err.message));
    }
    setLoading(false);
  };

  const handleSelectPolicy = (policy) => {
    setSelectedPolicy(policy);
    loadPolicyDocuments(policy.id);
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await api.delete(`/placement/documents/${docId}`);
      setSuccess('✅ Document deleted!');
      if (selectedPolicy) loadPolicyDocuments(selectedPolicy.id);
    } catch (err) {
      setError('❌ Error deleting document');
    }
  };

  const handlePreviewDocument = async (doc) => {
    try {
      // Reset dulu
      if (previewUrl && previewIsBlob) {
        window.URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      setPreviewDocName(doc.file_name || 'Document');
      setPreviewIsBlob(false);

      // Kalau file_url eksternal (misal dari Google Drive / S3), langsung embed
      if (doc.file_url && /^https?:\/\//.test(doc.file_url)) {
        setPreviewUrl(doc.file_url);
        setPreviewIsBlob(false);
        setShowPreviewModal(true);
        return;
      }

      // Kalau file diserve via API backend → ambil sebagai blob
      const response = await api.get(`/placement/documents/${doc.id}/download`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);

      setPreviewUrl(url);
      setPreviewIsBlob(true);
      setShowPreviewModal(true);
    } catch (err) {
      console.error('Error previewing document:', err);
      setError('❌ Error previewing document');
    }
  };


  const handleDownloadDocument = async (doc) => {
    try {
      if (doc.file_url) {
        const link = document.createElement('a');
        link.href = doc.file_url;
        link.setAttribute('download', doc.file_name || 'document');
        document.body.appendChild(link);
        link.click();
        link.remove();
        return;
      }
      const response = await api.get(`/placement/documents/${doc.id}/download`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.file_name || 'document');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading document:', err);
      setError('❌ Error downloading document');
    }
  };

  // === Send to Finance ===
  const handleSendToFinance = async (policy) => {
  try {
    setLoading(true);
    setError('');
    setSuccess('');

    const res = await api.post(
      `/placement/policies/${policy.id}/send-to-finance`
    );

    if (res.data.success) {
      setSuccess('✅ Policy sudah dikirim ke Finance.');
      // optional: reload policies biar flag sent_to_finance ke-refresh
      await loadPolicies();
    } else {
      setError('Gagal mengirim policy ke Finance.');
    }
  } catch (err) {
    setError(
      '❌ Error kirim ke Finance: ' +
        (err.response?.data?.error?.message || err.message)
    );
  } finally {
    setLoading(false);
  }
};


  // === Filtered lists ===

  const filteredClients = clients.filter((client) => {
    const term = clientSearch.trim().toLowerCase();
    const matchesType = !clientTypeFilter || client.type_of_client === clientTypeFilter;
    const matchesSearch =
      !term ||
      [client.id, client.name, client.email, client.phone_1, client.taxid].some(
        (field) => field && field.toString().toLowerCase().includes(term)
      );
    return matchesType && matchesSearch;
  });

  const filteredPolicies = policies.filter((policy) => {
    const term = policySearch.trim().toLowerCase();
    const clientName = clients.find((c) => c.id === policy.client_id)?.name || '';
    const insuranceName = clients.find((c) => c.id === policy.insurance_id)?.name || '';
    const matchesType = !policyTypeFilter || policy.type_of_case === policyTypeFilter;
    const matchesBusiness = !policyBusinessFilter || policy.type_of_business === policyBusinessFilter;
    const matchesSearch =
      !term ||
      [
        policy.transaction_number,
        policy.policy_number,
        clientName,
        insuranceName,
        policy.qs_number,
        policy.placing_slip_number
      ].some((field) => field && field.toString().toLowerCase().includes(term));
    return matchesType && matchesBusiness && matchesSearch;
  });

  return (
    <div className="placement-module">
      {error && (
        <div className="alert alert-danger alert-dismissible fade show">
          <strong>Error!</strong> {error}
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}
      {success && (
        <div className="alert alert-success alert-dismissible fade show">
          <strong>Success!</strong> {success}
          <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
        </div>
      )}

      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'clients' ? 'active' : ''}`}
            onClick={() => setActiveTab('clients')}
          >
            👥 Clients
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'policies' ? 'active' : ''}`}
            onClick={() => setActiveTab('policies')}
          >
            📋 Policies
          </button>
        </li>
      </ul>

      {/* === CLIENTS TAB === */}
      {activeTab === 'clients' && (
        <div>
          <div className="row mb-3">
            <div className="col-md-6 mb-2">
              <label className="form-label small text-muted">Search Clients</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search by name, ID, email, phone, or tax ID..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
              />
            </div>
            <div className="col-md-3 mb-2">
              <label className="form-label small text-muted">Filter Type</label>
              <select
                className="form-select"
                value={clientTypeFilter}
                onChange={(e) => setClientTypeFilter(e.target.value)}
              >
                <option value="">All Types</option>
                {typeOfClientOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3 mb-2 d-flex align-items-end">
              <button
                type="button"
                className="btn btn-outline-secondary w-100"
                onClick={() => {
                  setClientSearch('');
                  setClientTypeFilter('');
                }}
              >
                Reset Filters
              </button>
            </div>
          </div>

          <button
            className="btn btn-primary mb-3"
            onClick={() => {
              setEditingClient(null);
              setClientForm(initialClientForm);
              setShowClientModal(true);
              setNameValidation('');
              setEmailValidation('');
            }}
          >
            ➕ Add Client
          </button>
          <div className="table-responsive">
            <table className="table table-hover table-sm">
              <thead>
                <tr>
                  <th>Client ID</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Tax ID</th>
                  <th>Special</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr key={client.id}>
                    <td className="fw-bold">{client.id}</td>
                    <td>{client.name}</td>
                    <td>
                      <span className="badge bg
                      -info">{client.type_of_client}</span>
                    </td>
                    <td>{client.email}</td>
                    <td>{client.phone_1}</td>
                    <td>{client.taxid}</td>
                    <td>{client.special_flag ? '✓' : '-'}</td>
                    <td>
                    <button
                      className="btn btn-sm btn-warning"
                      onClick={() => handleEditClient(client)}
                    >
                      ✏️ Edit
                    </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredClients.length === 0 && (
            <div className="alert alert-info">📭 No clients found</div>
          )}
        </div>
      )}

      {/* === POLICIES TAB === */}
      {activeTab === 'policies' && (
        <div>
          <div className="d-flex flex-column flex-md-row gap-2 mb-3">
            <div className="flex-grow-1">
              <label className="form-label small text-muted">Search Policies</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search by TRX, policy no, client, insurance..."
                value={policySearch}
                onChange={(e) => setPolicySearch(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label small text-muted">Case Type</label>
              <select
                className="form-select"
                value={policyTypeFilter}
                onChange={(e) => setPolicyTypeFilter(e.target.value)}
              >
                <option value="">All</option>
                {typeOfCaseOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label small text-muted">Business Type</label>
              <select
                className="form-select"
                value={policyBusinessFilter}
                onChange={(e) => setPolicyBusinessFilter(e.target.value)}
              >
                <option value="">All</option>
                {typeOfBusinessOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div className="d-flex align-items-end">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => {
                  setPolicySearch('');
                  setPolicyTypeFilter('');
                  setPolicyBusinessFilter('');
                }}
              >
                Reset Filters
              </button>
            </div>
          </div>

          <button
            className="btn btn-primary mb-3"
            onClick={() => {
              setEditingPolicy(null);
              setPolicyForm({
                ...initialPolicyForm,
                transaction_number: generateTransactionNumber(),
                type_of_case: 'New',
                type_of_business: 'Direct',
                currency: 'IDR'
              });
              setClientNameInput('');
              setInsuranceNameInput('');
              setSourceBusinessInput('');
              setPreviousPolicyInput('');
              setPolicyNumberValidation('');
              setPlacingValidation('');
              setQsValidation('');
              setShowPolicyModal(true);
            }}
          >
            ➕ Add Policy
          </button>
          <div className="table-responsive">
            <table className="table table-hover table-sm">
              <thead>
                <tr>
                  <th>TRX #</th>
                  <th>Policy #</th>
                  <th>Type</th>
                  <th>Client</th>
                  <th>Insurance</th>
                  <th>Effective</th>
                  <th>Expiry</th>
                  <th>Premium</th>
                  <th>Net Comm</th>
                  <th>Docs</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
              {filteredPolicies.map((policy) => (
                <tr key={policy.id}>
                  <td className="fw-bold">{policy.transaction_number}</td>
                  <td>{policy.policy_number || `POL-${policy.id}`}</td>
                  <td>
                    <span className="badge bg-secondary">{policy.type_of_case}</span>
                  </td>
                  <td>{clients.find((c) => c.id === policy.client_id)?.name || 'N/A'}</td>
                  <td>{clients.find((c) => c.id === policy.insurance_id)?.name || 'N/A'}</td>
                  <td>{policy.effective_date}</td>
                  <td>{policy.expiry_date}</td>
                  <td>
                    {formatPremium(policy.premium_amount)} {policy.currency}
                  </td>
                  <td>{policy.commission_net_percent}%</td>
                  <td>
                    <button
                      className="btn btn-sm btn-info"
                      onClick={() => handleSelectPolicy(policy)}
                    >
                      📄
                    </button>
                  </td>
                  <td>
                    <div className="btn-group btn-group-sm">
                      <button
                        className="btn btn-warning"
                        onClick={() => handleEditPolicy(policy)}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="btn btn-success"
                        onClick={() => handleSendToFinance(policy)}
                        title="Kirim ke Finance"
                        disabled={policy.sent_to_finance} // ✅ sekarang aman, policy ada di scope
                      >
                        {policy.sent_to_finance ? '✅ Sent' : '💸 Finance'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>

            </table>
          </div>
          {filteredPolicies.length === 0 && (
            <div className="alert alert-info">📭 No policies found</div>
          )}
        </div>
      )}

      {/* === CLIENT MODAL === */}
      {showClientModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
        >
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  {editingClient ? '✏️ Edit Client' : '➕ Add New Client'}
                </h5>
                <button
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setShowClientModal(false);
                    setEditingClient(null);
                    setNameValidation('');
                    setEmailValidation('');
                  }}
                ></button>
              </div>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <form onSubmit={handleAddClient}>
                  <div className="row mb-3">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Client ID (Auto-generated) *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={clientForm.id || generateClientId(clientForm.type_of_client)}
                        disabled
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Type of Client *</label>
                      <select
                        className="form-select"
                        value={clientForm.type_of_client}
                        onChange={(e) =>
                          setClientForm({ ...clientForm, type_of_client: e.target.value })
                        }
                        required
                      >
                        <option value="">Select Type</option>
                        {typeOfClientOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <fieldset className="border p-3 mb-3">
                    <legend className="w-auto px-2">Personal Information</legend>
                    <div className="row">
                      <div className="col-md-2 mb-3">
                        <label className="form-label">Salutation</label>
                        <select
                          className="form-select"
                          value={clientForm.salutation}
                          onChange={(e) =>
                            setClientForm(
                              updateClientName({ ...clientForm, salutation: e.target.value })
                            )
                          }
                        >
                          <option value="">Select</option>
                          {salutationOptions.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-3 mb-3">
                        <label className="form-label">First Name *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={clientForm.first_name}
                          onChange={(e) =>
                            setClientForm(
                              updateClientName({ ...clientForm, first_name: e.target.value })
                            )
                          }
                          required
                        />
                      </div>
                      <div className="col-md-3 mb-3">
                        <label className="form-label">Mid Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={clientForm.mid_name}
                          onChange={(e) =>
                            setClientForm(
                              updateClientName({ ...clientForm, mid_name: e.target.value })
                            )
                          }
                        />
                      </div>
                      <div className="col-md-3 mb-3">
                        <label className="form-label">Last Name *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={clientForm.last_name}
                          onChange={(e) =>
                            setClientForm(
                              updateClientName({ ...clientForm, last_name: e.target.value })
                            )
                          }
                          required
                        />
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-9 mb-3">
                        <label className="form-label">Full Name (Auto)</label>
                        <input
                          type="text"
                          className="form-control bg-light"
                          value={clientForm.name}
                          disabled
                        />
                      </div>
                      <div className="col-md-3 mb-3">
                        <label className="form-label">Validation</label>
                        <div className="alert alert-warning py-1 px-2 small mb-0">
                          {nameValidation}
                        </div>
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="border p-3 mb-3">
                    <legend className="w-auto px-2">Address Information</legend>
                    <div className="mb-3">
                      <label className="form-label">Address Line 1</label>
                      <input
                        type="text"
                        className="form-control"
                        value={clientForm.address_1}
                        onChange={(e) =>
                          setClientForm({ ...clientForm, address_1: e.target.value })
                        }
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Address Line 2</label>
                      <input
                        type="text"
                        className="form-control"
                        value={clientForm.address_2}
                        onChange={(e) =>
                          setClientForm({ ...clientForm, address_2: e.target.value })
                        }
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Address Line 3</label>
                      <input
                        type="text"
                        className="form-control"
                        value={clientForm.address_3}
                        onChange={(e) =>
                          setClientForm({ ...clientForm, address_3: e.target.value })
                        }
                      />
                    </div>
                  </fieldset>

                  <fieldset className="border p-3 mb-3">
                    <legend className="w-auto px-2">Contact Information</legend>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Phone 1</label>
                        <input
                          type="tel"
                          className="form-control"
                          value={clientForm.phone_1}
                          onChange={(e) =>
                            setClientForm({ ...clientForm, phone_1: e.target.value })
                          }
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Phone 2</label>
                        <input
                          type="tel"
                          className="form-control"
                          value={clientForm.phone_2}
                          onChange={(e) =>
                            setClientForm({ ...clientForm, phone_2: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Mobile 1</label>
                        <input
                          type="tel"
                          className="form-control"
                          value={clientForm.mobile_1}
                          onChange={(e) =>
                            setClientForm({ ...clientForm, mobile_1: e.target.value })
                          }
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Mobile 2</label>
                        <input
                          type="tel"
                          className="form-control"
                          value={clientForm.mobile_2}
                          onChange={(e) =>
                            setClientForm({ ...clientForm, mobile_2: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Fax 1</label>
                        <input
                          type="tel"
                          className="form-control"
                          value={clientForm.fax_1}
                          onChange={(e) =>
                            setClientForm({ ...clientForm, fax_1: e.target.value })
                          }
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Fax 2</label>
                        <input
                          type="tel"
                          className="form-control"
                          value={clientForm.fax_2}
                          onChange={(e) =>
                            setClientForm({ ...clientForm, fax_2: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Email *</label>
                        <input
                          type="email"
                          className="form-control"
                          value={clientForm.email}
                          onChange={(e) => {
                            setClientForm({ ...clientForm, email: e.target.value });
                            validateEmail(e.target.value);
                          }}
                          required
                        />
                        {emailValidation && (
                          <small className="d-block mt-1">{emailValidation}</small>
                        )}
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Contact Person</label>
                        <input
                          type="text"
                          className="form-control"
                          value={clientForm.contact}
                          onChange={(e) =>
                            setClientForm({ ...clientForm, contact: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Contact Address</label>
                        <input
                          type="text"
                          className="form-control"
                          value={clientForm.contact_address}
                          onChange={(e) =>
                            setClientForm({ ...clientForm, contact_address: e.target.value })
                          }
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Contact Phone</label>
                        <input
                          type="tel"
                          className="form-control"
                          value={clientForm.contact_phone}
                          onChange={(e) =>
                            setClientForm({ ...clientForm, contact_phone: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="border p-3 mb-3">
                    <legend className="w-auto px-2">Tax Information</legend>
                    <div className="row">
                      <div className="col-md-4 mb-3">
                        <label className="form-label">Tax ID</label>
                        <input
                          type="text"
                          className="form-control"
                          value={clientForm.taxid}
                          onChange={(e) =>
                            setClientForm({ ...clientForm, taxid: e.target.value })
                          }
                        />
                      </div>
                      <div className="col-md-4 mb-3">
                        <label className="form-label">Tax Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={clientForm.tax_name}
                          onChange={(e) =>
                            setClientForm({ ...clientForm, tax_name: e.target.value })
                          }
                        />
                      </div>
                      <div className="col-md-4 mb-3">
                        <label className="form-label">Tax Address</label>
                        <input
                          type="text"
                          className="form-control"
                          value={clientForm.tax_address}
                          onChange={(e) =>
                            setClientForm({ ...clientForm, tax_address: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="border p-3 mb-3">
                    <legend className="w-auto px-2">Additional Information</legend>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Line of Business</label>
                        <input
                          type="text"
                          className="form-control"
                          value={clientForm.lob}
                          onChange={(e) =>
                            setClientForm({ ...clientForm, lob: e.target.value })
                          }
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Special Flag</label>
                        <div className="form-check">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            id="specialFlag"
                            checked={clientForm.special_flag}
                            onChange={(e) =>
                              setClientForm({
                                ...clientForm,
                                special_flag: e.target.checked
                              })
                            }
                          />
                          <label className="form-check-label" htmlFor="specialFlag">
                            Mark as Special
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Remarks</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={clientForm.remarks}
                        onChange={(e) =>
                          setClientForm({ ...clientForm, remarks: e.target.value })
                        }
                      ></textarea>
                    </div>
                  </fieldset>

                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading
                        ? '⏳ Saving...'
                        : editingClient
                        ? '✅ Update Client'
                        : '✅ Add Client'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowClientModal(false);
                        setEditingClient(null);
                        setNameValidation('');
                        setEmailValidation('');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === POLICY MODAL === */}
      {showPolicyModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1040 }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  {editingPolicy ? '✏️ Edit Policy' : '➕ Add New Policy'}
                </h5>
                <button
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setShowPolicyModal(false);
                    setEditingPolicy(null);
                    setClientNameInput('');
                    setInsuranceNameInput('');
                    setSourceBusinessInput('');
                    setPreviousPolicyInput('');
                    setPolicyNumberValidation('');
                    setPlacingValidation('');
                    setQsValidation('');
                  }}
                ></button>
              </div>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <form onSubmit={handleSavePolicy}>
                  <div className="row mb-3">
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Transaction Number (Auto) *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={policyForm.transaction_number}
                        disabled
                      />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Type of Case *</label>
                      <select
                        className="form-select"
                        value={policyForm.type_of_case}
                        onChange={(e) =>
                          setPolicyForm({ ...policyForm, type_of_case: e.target.value })
                        }
                        required
                      >
                        {typeOfCaseOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Type of Business *</label>
                      <select
                        className="form-select"
                        value={policyForm.type_of_business}
                        onChange={(e) =>
                          setPolicyForm({ ...policyForm, type_of_business: e.target.value })
                        }
                        required
                      >
                        {typeOfBusinessOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {policyForm.type_of_case === 'Renewal' && (
                    <div className="mb-3">
                      <label className="form-label">Reference Previous Policy (Renewal From)</label>
                      <div className="position-relative">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Search policy number or TRX..."
                          value={previousPolicyInput}
                          onChange={(e) => {
                            setPreviousPolicyInput(e.target.value);
                            setPreviousPolicyOpen(true);
                          }}
                          onFocus={() => setPreviousPolicyOpen(true)}
                        />
                        {previousPolicyOpen && (
                          <div
                            className="list-group mt-2 position-absolute w-100"
                            style={{ zIndex: 1000, maxHeight: '150px', overflowY: 'auto' }}
                          >
                            {getPreviousPolicies(previousPolicyInput).map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                className="list-group-item list-group-item-action text-start"
                                onClick={() => {
                                  setPolicyForm({ ...policyForm, reference_policy_id: p.id });
                                  setPreviousPolicyInput(`${p.policy_number} (${p.transaction_number})`);
                                  setPreviousPolicyOpen(false);
                                }}
                              >
                                <strong>{p.policy_number}</strong> - {p.transaction_number}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <small className="text-muted">
                        Ref:{' '}
                        {policyForm.reference_policy_id
                          ? policies.find((p) => p.id === policyForm.reference_policy_id)
                              ?.policy_number
                          : 'None'}
                      </small>
                    </div>
                  )}

                  <div className="row mb-3">
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Policy Number</label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          value={policyForm.policy_number}
                          onChange={(e) => {
                            const value = e.target.value;
                            setPolicyForm({ ...policyForm, policy_number: value });
                            validateUniquePolicyNumber(
                              value,
                              policyForm.policy_id || editingPolicy?.id
                            );
                          }}
                          placeholder="Auto or manual"
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={generatePolicyNumber}
                        >
                          Generate
                        </button>
                      </div>
                      {policyNumberValidation && (
                        <small className="d-block mt-1">{policyNumberValidation}</small>
                      )}
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Placing Slip Number</label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          value={policyForm.placing_slip_number}
                          onChange={(e) => {
                            const value = e.target.value;
                            setPolicyForm({ ...policyForm, placing_slip_number: value });
                            validatePlacingNumber(
                              value,
                              policyForm.policy_id || editingPolicy?.id
                            );
                          }}
                          placeholder='PS/001/PD/PII/I/2025'
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => generateRefNumber('PS')}
                        >
                          Generate
                        </button>
                      </div>
                      {placingValidation && (
                        <small className="d-block mt-1">{placingValidation}</small>
                      )}
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Quotation Number</label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          value={policyForm.qs_number}
                          onChange={(e) => {
                            const value = e.target.value;
                            setPolicyForm({ ...policyForm, qs_number: value });
                            validateQsNumber(value, policyForm.policy_id || editingPolicy?.id);
                          }}
                          placeholder='QS/001/PD/PII/I/2025'
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => generateRefNumber('QS')}
                        >
                          Generate
                        </button>
                      </div>
                      {qsValidation && (
                        <small className="d-block mt-1">{qsValidation}</small>
                      )}
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Client Name (Policy Holder)</label>
                      <div className="position-relative">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Type to search..."
                          value={clientNameInput}
                          onChange={(e) => {
                            setClientNameInput(e.target.value);
                            setClientNameOpen(true);
                          }}
                          onFocus={() => setClientNameOpen(true)}
                        />
                        {clientNameOpen && (
                          <div
                            className="list-group mt-2 position-absolute w-100"
                            style={{ zIndex: 1000, maxHeight: '150px', overflowY: 'auto' }}
                          >
                            {filterAutocomplete(
                              getClientsByType('Policy Holder'),
                              clientNameInput
                            ).map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                className="list-group-item list-group-item-action text-start"
                                onClick={() => {
                                  setPolicyForm({ ...policyForm, client_id: c.id });
                                  setClientNameInput(c.name);
                                  setClientNameOpen(false);
                                }}
                              >
                                {c.name} <br />
                                <small>{c.id}</small>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <small className="text-muted">
                        Selected: {clients.find((c) => c.id === policyForm.client_id)?.name || 'None'}
                      </small>
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Insurance Name</label>
                      <div className="position-relative">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Type to search..."
                          value={insuranceNameInput}
                          onChange={(e) => {
                            setInsuranceNameInput(e.target.value);
                            setInsuranceNameOpen(true);
                          }}
                          onFocus={() => setInsuranceNameOpen(true)}
                        />
                        {insuranceNameOpen && (
                          <div
                            className="list-group mt-2 position-absolute w-100"
                            style={{ zIndex: 1000, maxHeight: '150px', overflowY: 'auto' }}
                          >
                            {filterAutocomplete(
                              getClientsByType('Insurance'),
                              insuranceNameInput
                            ).map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                className="list-group-item list-group-item-action text-start"
                                onClick={() => {
                                  setPolicyForm({ ...policyForm, insurance_id: c.id });
                                  setInsuranceNameInput(c.name);
                                  setInsuranceNameOpen(false);
                                }}
                              >
                                {c.name} <br />
                                <small>{c.id}</small>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <small className="text-muted">
                        Selected:{' '}
                        {clients.find((c) => c.id === policyForm.insurance_id)?.name || 'None'}
                      </small>
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Source of Business</label>
                      <div className="position-relative">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Type to search..."
                          value={sourceBusinessInput}
                          onChange={(e) => {
                            setSourceBusinessInput(e.target.value);
                            setSourceBusinessOpen(true);
                          }}
                          onFocus={() => setSourceBusinessOpen(true)}
                        />
                        {sourceBusinessOpen && (
                          <div
                            className="list-group mt-2 position-absolute w-100"
                            style={{ zIndex: 1000, maxHeight: '150px', overflowY: 'auto' }}
                          >
                            {filterAutocomplete(
                              getClientsByType('Source of Business').concat(
                                getClientsByType('Partner Co-Broking')
                              ),
                              sourceBusinessInput
                            ).map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                className="list-group-item list-group-item-action text-start"
                                onClick={() => {
                                  setPolicyForm({ ...policyForm, source_business_id: c.id });
                                  setSourceBusinessInput(c.name);
                                  setSourceBusinessOpen(false);
                                }}
                              >
                                {c.name} <br />
                                <small>{c.id}</small>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <small className="text-muted">
                        Selected:{' '}
                        {clients.find((c) => c.id === policyForm.source_business_id)?.name ||
                          'None'}
                      </small>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Class of Business *</label>
                      <select
                        className="form-select"
                        value={policyForm.class_of_business_id}
                        onChange={(e) =>
                          setPolicyForm({
                            ...policyForm,
                            class_of_business_id: e.target.value,
                            product_id: ''
                          })
                        }
                        required
                      >
                        <option value="">Select Class</option>
                        {classOfBusinessOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Product Name *</label>
                      <select
                        className="form-select"
                        value={policyForm.product_id}
                        onChange={(e) =>
                          setPolicyForm({ ...policyForm, product_id: e.target.value })
                        }
                        required
                        disabled={!policyForm.class_of_business_id}
                      >
                        <option value="">Select Product</option>
                        {policyForm.class_of_business_id &&
                          productNameOptions[policyForm.class_of_business_id]?.map((prod) => (
                            <option key={prod} value={prod}>
                              {prod}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Effective Date *</label>
                      <input
                        type="date"
                        className="form-control"
                        value={policyForm.effective_date}
                        onChange={(e) =>
                          setPolicyForm({
                            ...policyForm,
                            effective_date: e.target.value,
                            expiry_date: calculateExpiryDate(e.target.value)
                          })
                        }
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Expiry Date * (Auto: 1 year)</label>
                      <input
                        type="date"
                        className="form-control"
                        value={policyForm.expiry_date}
                        onChange={(e) =>
                          setPolicyForm({ ...policyForm, expiry_date: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Currency *</label>
                      <select
                        className="form-select"
                        value={policyForm.currency}
                        onChange={(e) =>
                          setPolicyForm({ ...policyForm, currency: e.target.value })
                        }
                        required
                      >
                        {currencyOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">
                        Premium Amount * ({policyForm.currency})
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={policyForm.premium_amount}
                        onChange={(e) =>
                          setPolicyForm({ ...policyForm, premium_amount: e.target.value })
                        }
                        placeholder="0.00"
                        required
                      />
                      <small className="text-muted">Format: #,##0.00</small>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Gross Commission % *</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        value={policyForm.commission_gross}
                        onChange={(e) =>
                          setPolicyForm({ ...policyForm, commission_gross: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Comm to Source of Business % *</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        value={policyForm.commission_to_source}
                        onChange={(e) =>
                          setPolicyForm({
                            ...policyForm,
                            commission_to_source: e.target.value
                          })
                        }
                        required
                      />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Net Commission % (Auto-calculated)</label>
                      <input
                        type="text"
                        className="form-control bg-light"
                        value={calculateNetCommission(
                          policyForm.commission_gross,
                          policyForm.commission_to_source
                        )}
                        disabled
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading
                      ? '⏳ Saving...'
                      : editingPolicy
                      ? '✅ Update Policy'
                      : '✅ Create Policy'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary ms-2"
                    onClick={() => {
                      setShowPolicyModal(false);
                      setEditingPolicy(null);
                      setClientNameInput('');
                      setInsuranceNameInput('');
                      setSourceBusinessInput('');
                      setPreviousPolicyInput('');
                      setPolicyNumberValidation('');
                      setPlacingValidation('');
                      setQsValidation('');
                    }}
                  >
                    Cancel
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === DOCUMENTS LIST MODAL === */}
      {selectedPolicy && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1040 }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  📄 Documents for Policy #{selectedPolicy.policy_number}
                </h5>
                <button
                  className="btn-close btn-close-white"
                  onClick={() => setSelectedPolicy(null)}
                ></button>
              </div>
              <div className="modal-body">
                <button
                  className="btn btn-sm btn-success mb-3"
                  onClick={() => {
                    setDocForm({
                      policy_id: selectedPolicy.id,
                      document_type: 'general',
                      file_name: '',
                      file: null,
                      description: ''
                    });
                    setShowDocModal(true);
                  }}
                >
                  ➕ Upload Document
                </button>
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>File Name</th>
                        <th>Type</th>
                        <th>Size</th>
                        <th>Description</th>
                        <th>Uploaded</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {policyDocuments.map((doc) => (
                        <tr key={doc.id}>
                          <td>{doc.file_name}</td>
                          <td>
                            <span className="badge bg-info">{doc.document_type}</span>
                          </td>
                          <td>
                            {doc.file_size ? (doc.file_size / 1024).toFixed(2) : '-'} KB
                          </td>
                          <td>{doc.description}</td>
                          <td>
                            {doc.uploaded_at
                              ? new Date(doc.uploaded_at).toLocaleDateString()
                              : '-'}
                          </td>
                          <td className="d-flex gap-1">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => handlePreviewDocument(doc)}
                              title="Preview"
                            >
                              👁️
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => handleDownloadDocument(doc)}
                              title="Download"
                            >
                              ⬇️
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeleteDocument(doc.id)}
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {policyDocuments.length === 0 && (
                  <div className="alert alert-info">No documents</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === DOCUMENT UPLOAD MODAL === */}
      {showDocModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1040 }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">➕ Upload Document</h5>
                <button
                  className="btn-close btn-close-white"
                  onClick={() => setShowDocModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleAddDocument}>
                  <div className="mb-3">
                    <label className="form-label">Document Type *</label>
                    <select
                      className="form-select"
                      value={docForm.document_type}
                      onChange={(e) =>
                        setDocForm({ ...docForm, document_type: e.target.value })
                      }
                      required
                    >
                      <option value="general">General</option>
                      <option value="quotation">Quotation</option>
                      <option value="proposal">Proposal</option>
                      <option value="certificate">Certificate</option>
                      <option value="endorsement">Endorsement</option>
                      <option value="invoice">Invoice</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Browse File *</label>
                    <input
                      type="file"
                      className="form-control"
                      onChange={(e) =>
                        setDocForm({
                          ...docForm,
                          file: e.target.files[0],
                          file_name: e.target.files[0]?.name
                        })
                      }
                      required
                    />
                    <small className="text-muted">
                      File: {docForm.file_name || 'No file selected'}
                    </small>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      value={docForm.description}
                      onChange={(e) =>
                        setDocForm({ ...docForm, description: e.target.value })
                      }
                      rows="3"
                    ></textarea>
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? '⏳ Uploading...' : '✅ Upload'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary ms-2"
                    onClick={() => setShowDocModal(false)}
                  >
                    Cancel
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* === DOCUMENT PREVIEW MODAL === */}
      {showPreviewModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
        >
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">Preview: {previewDocName}</h5>
                <button
                  className="btn-close btn-close-white"
                  onClick={() => {
                    if (previewUrl && previewIsBlob) {
                      window.URL.revokeObjectURL(previewUrl);
                    }
                    setShowPreviewModal(false);
                    setPreviewUrl(null);
                    setPreviewIsBlob(false);
                  }}
                ></button>
              </div>
              <div className="modal-body" style={{ height: '75vh' }}>
                {previewUrl ? (
                  <iframe
                    src={previewUrl}
                    title={previewDocName}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                      borderRadius: '4px'
                    }}
                  />
                ) : (
                  <div className="alert alert-info mb-0">
                    Preview not available for this document.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Placement;
