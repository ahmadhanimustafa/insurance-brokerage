
// frontend/src/pages/Placement.jsx
// New Placement module: Clients, Proposals, Policies (DB-based)

import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

function Placement() {
  const [activeTab, setActiveTab] = useState('clients');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Master data
  const [clients, setClients] = useState([]);
  const [classOfBusiness, setClassOfBusiness] = useState([]);
  const [products, setProducts] = useState([]);

  // Proposals & Policies
  const [proposals, setProposals] = useState([]);
  const [policies, setPolicies] = useState([]);

  // Forms
  const [clientForm, setClientForm] = useState({
    id: null,
    name: '',
    email: '',
    phone: '',
    address: '',
    tax_id: '',
    industry: '',
    type_of_client: 'Policy Holder',
    special_flag: false,
    remarks: ''
  });

  const [proposalForm, setProposalForm] = useState({
    id: null,
    type_of_case: 'New',
    type_of_business: 'Direct',
    client_id: '',
    source_business_id: '',
    class_of_business_id: '',
    product_id: '',
    sales_team_name: '',
    request_date: ''
  });

  const [policyForm, setPolicyForm] = useState({
    id: null,
    transaction_number: '',
    policy_number: '',
    placing_number: '',
    quotation_number: '',
    client_id: '',
    insurance_id: '',
    source_business_id: '',
    class_of_business_id: '',
    product_id: '',
    case_type: 'New',
    type_of_business: 'Direct',
    currency: 'IDR',
    premium_amount: '',
    commission_gross: '',
    commission_to_source: '',
    effective_date: '',
    expiry_date: ''
  });

  const [showClientModal, setShowClientModal] = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  const resetAlerts = () => {
    setError('');
    setSuccess('');
  };

  // =====================
  // Loaders
  // =====================

  const loadClients = async () => {
    try {
      const res = await api.get('/placement/clients');
      if (res.data.success) {
        setClients(res.data.data.clients || []);
      }
    } catch (err) {
      console.error('Error loadClients', err);
      setError('Error loading clients');
    }
  };

  const loadClassOfBusiness = async () => {
    try {
      const res = await api.get('/placement/class-of-business');
      if (res.data.success) {
        setClassOfBusiness(res.data.data || []);
      }
    } catch (err) {
      console.error('Error loadClassOfBusiness', err);
      setError('Error loading Class of Business');
    }
  };

  const loadProducts = async (class_id) => {
    try {
      const params = class_id ? { params: { class_id } } : undefined;
      const res = await api.get('/placement/products', params);
      if (res.data.success) {
        setProducts(res.data.data || []);
      }
    } catch (err) {
      console.error('Error loadProducts', err);
      setError('Error loading Products');
    }
  };

  const loadProposals = async () => {
    try {
      const res = await api.get('/placement/proposals');
      if (res.data.success) {
        setProposals(res.data.data || []);
      }
    } catch (err) {
      console.error('Error loadProposals', err);
      setError('Error loading proposals');
    }
  };

  const loadPolicies = async () => {
    try {
      const res = await api.get('/placement/policies');
      if (res.data.success) {
        setPolicies(res.data.data || []);
      }
    } catch (err) {
      console.error('Error loadPolicies', err);
      setError('Error loading policies');
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      resetAlerts();
      try {
        await Promise.all([
          loadClients(),
          loadClassOfBusiness(),
          loadProducts(),
          loadProposals(),
          loadPolicies()
        ]);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =====================
  // Helpers
  // =====================

  const getClientLabel = (id) => {
    const c = clients.find((x) => String(x.id) === String(id));
    if (!c) return '';
    return c.client_id ? `${c.client_id} - ${c.name}` : c.name;
  };

  const getCobLabel = (id) => {
    const c = classOfBusiness.find((x) => String(x.id) === String(id));
    if (!c) return '';
    return `${c.code} - ${c.name}`;
  };

  const getProductLabel = (id) => {
    const p = products.find((x) => String(x.id) === String(id));
    if (!p) return '';
    return `${p.code} - ${p.name}`;
  };

  const filteredPolicyHolders = useMemo(
    () => clients.filter((c) => (c.type_of_client || '').toLowerCase().includes('policy')),
    [clients]
  );

  const filteredInsurers = useMemo(
    () => clients.filter((c) => (c.type_of_client || '').toLowerCase().includes('insurance')),
    [clients]
  );

  const filteredSources = useMemo(
    () => clients.filter((c) => (c.type_of_client || '').toLowerCase().includes('source')),
    [clients]
  );

  // =====================
  // Client handlers
  // =====================

  const handleClientChange = (e) => {
    const { name, value, type, checked } = e.target;
    setClientForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveClient = async (e) => {
    e.preventDefault();
    resetAlerts();
    setLoading(true);
    try {
      if (clientForm.id) {
        const res = await api.put(`/placement/clients/${clientForm.id}`, clientForm);
        if (res.data.success) {
          setSuccess('Client updated');
          await loadClients();
        }
      } else {
        const res = await api.post('/placement/clients', clientForm);
        if (res.data.success) {
          setSuccess('Client created');
          await loadClients();
        }
      }
      setShowClientModal(false);
      setClientForm({
        id: null,
        name: '',
        email: '',
        phone: '',
        address: '',
        tax_id: '',
        industry: '',
        type_of_client: 'Policy Holder',
        special_flag: false,
        remarks: ''
      });
    } catch (err) {
      console.error('Error save client', err);
      setError(
        err.response?.data?.error?.message ||
          err.message ||
          'Failed to save client'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEditClient = (client) => {
    resetAlerts();
    setClientForm({
      id: client.id,
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      tax_id: client.tax_id || '',
      industry: client.industry || '',
      type_of_client: client.type_of_client || 'Policy Holder',
      special_flag: !!client.special_flag,
      remarks: client.remarks || ''
    });
    setShowClientModal(true);
  };

  const handleNewClient = () => {
    resetAlerts();
    setClientForm({
      id: null,
      name: '',
      email: '',
      phone: '',
      address: '',
      tax_id: '',
      industry: '',
      type_of_client: 'Policy Holder',
      special_flag: false,
      remarks: ''
    });
    setShowClientModal(true);
  };

  // =====================
  // Proposal handlers
  // =====================

  const handleProposalChange = (e) => {
    const { name, value } = e.target;
    setProposalForm((prev) => ({
      ...prev,
      [name]: value
    }));

    if (name === 'class_of_business_id' && value) {
      loadProducts(value);
      setProposalForm((prev) => ({
        ...prev,
        class_of_business_id: value,
        product_id: ''
      }));
    }
  };

  const handleNewProposal = () => {
    resetAlerts();
    setProposalForm({
      id: null,
      type_of_case: 'New',
      type_of_business: 'Direct',
      client_id: '',
      source_business_id: '',
      class_of_business_id: '',
      product_id: '',
      sales_team_name: '',
      request_date: new Date().toISOString().slice(0, 10)
    });
    setShowProposalModal(true);
  };

  const handleSaveProposal = async (e) => {
    e.preventDefault();
    resetAlerts();
    setLoading(true);
    try {
      const payload = { ...proposalForm };
      delete payload.id;

      const res = await api.post('/placement/proposals', payload);
      if (res.data.success) {
        setSuccess('Proposal created');
        await loadProposals();
      }
      setShowProposalModal(false);
    } catch (err) {
      console.error('Error save proposal', err);
      setError(
        err.response?.data?.error?.message ||
          err.message ||
          'Failed to save proposal'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleProposalStatus = async (proposal, status) => {
    resetAlerts();
    setLoading(true);
    try {
      await api.patch(`/placement/proposals/${proposal.id}/status`, { status });
      setSuccess(`Proposal marked as ${status}`);
      await loadProposals();
    } catch (err) {
      console.error('Error update status', err);
      setError(
        err.response?.data?.error?.message ||
          err.message ||
          'Failed to update proposal status'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConvertProposal = async (proposal) => {
    resetAlerts();
    setLoading(true);
    try {
      const res = await api.post(`/placement/proposals/${proposal.id}/convert-to-policy`);
      if (res.data.success) {
        setSuccess('Proposal converted to policy');
        await Promise.all([loadPolicies(), loadProposals()]);
        setActiveTab('policies');
      }
    } catch (err) {
      console.error('Error convert proposal', err);
      setError(
        err.response?.data?.error?.message ||
          err.message ||
          'Failed to convert proposal'
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================
  // Policy handlers
  // =====================

  const handlePolicyChange = (e) => {
    const { name, value } = e.target;
    setPolicyForm((prev) => ({
      ...prev,
      [name]: value
    }));

    if (name === 'class_of_business_id' && value) {
      loadProducts(value);
      setPolicyForm((prev) => ({
        ...prev,
        class_of_business_id: value,
        product_id: ''
      }));
    }
  };

  const handleNewPolicy = () => {
    resetAlerts();
    setPolicyForm({
      id: null,
      transaction_number: '',
      policy_number: '',
      placing_number: '',
      quotation_number: '',
      client_id: '',
      insurance_id: '',
      source_business_id: '',
      class_of_business_id: '',
      product_id: '',
      case_type: 'New',
      type_of_business: 'Direct',
      currency: 'IDR',
      premium_amount: '',
      commission_gross: '',
      commission_to_source: '',
      effective_date: new Date().toISOString().slice(0, 10),
      expiry_date: ''
    });
    setShowPolicyModal(true);
  };

  const handleEditPolicy = (policy) => {
    resetAlerts();
    setActiveTab('policies');
    setPolicyForm({
      id: policy.id,
      transaction_number: policy.transaction_number || '',
      policy_number: policy.policy_number || '',
      placing_number: policy.placing_number || '',
      quotation_number: policy.quotation_number || '',
      client_id: policy.client_id || '',
      insurance_id: policy.insurance_id || '',
      source_business_id: policy.source_business_id || '',
      class_of_business_id: policy.class_of_business_id || '',
      product_id: policy.product_id || '',
      case_type: policy.case_type || 'New',
      type_of_business: policy.type_of_business || 'Direct',
      currency: policy.currency || 'IDR',
      premium_amount: policy.premium_amount || '',
      commission_gross: policy.commission_gross || '',
      commission_to_source: policy.commission_to_source || '',
      effective_date: policy.effective_date
        ? String(policy.effective_date).slice(0, 10)
        : '',
      expiry_date: policy.expiry_date
        ? String(policy.expiry_date).slice(0, 10)
        : ''
    });
    if (policy.class_of_business_id) {
      loadProducts(policy.class_of_business_id);
    }
    setShowPolicyModal(true);
  };

  const handleSavePolicy = async (e) => {
    e.preventDefault();
    resetAlerts();
    setLoading(true);
    try {
      const payload = { ...policyForm };
      const id = payload.id;
      delete payload.id;

      if (id) {
        const res = await api.patch(`/placement/policies/${id}`, payload);
        if (res.data.success) {
          setSuccess('Policy updated');
        }
      } else {
        const res = await api.post('/placement/policies', payload);
        if (res.data.success) {
          setSuccess('Policy created');
        }
      }

      await loadPolicies();
      setShowPolicyModal(false);
    } catch (err) {
      console.error('Error save policy', err);
      setError(
        err.response?.data?.error?.message ||
          err.message ||
          'Failed to save policy'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendToFinance = async (policy) => {
    resetAlerts();
    setLoading(true);
    try {
      const res = await api.patch(`/placement/policies/${policy.id}/sent-to-finance`);
      if (res.data.success) {
        setSuccess('Policy sent to Finance');
        await loadPolicies();
      }
    } catch (err) {
      console.error('Error send to finance', err);
      setError(
        err.response?.data?.error?.message ||
          err.message ||
          'Failed to send policy to Finance'
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================
  // Render helpers
  // =====================

  const renderAlerts = () => (
    <>
      {error && (
        <div className="alert alert-danger py-2" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success py-2" role="alert">
          {success}
        </div>
      )}
    </>
  );

  const renderClientsTab = () => (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Clients</h5>
        <button className="btn btn-primary btn-sm" onClick={handleNewClient}>
          + New Client
        </button>
      </div>

      <div className="table-responsive">
        <table className="table table-striped table-hover table-sm align-middle">
          <thead>
            <tr>
              <th>#</th>
              <th>Client ID</th>
              <th>Name</th>
              <th>Type</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Industry</th>
              <th>Special</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c, idx) => (
              <tr key={c.id}>
                <td>{idx + 1}</td>
                <td>{c.client_id || '-'}</td>
                <td>{c.name}</td>
                <td>{c.type_of_client}</td>
                <td>{c.email}</td>
                <td>{c.phone}</td>
                <td>{c.industry}</td>
                <td>{c.special_flag ? 'Yes' : 'No'}</td>
                <td>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => handleEditClient(c)}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {clients.length === 0 && (
          <div className="alert alert-info py-2 mt-2">
            No clients yet. Create one to start a placement.
          </div>
        )}
      </div>
    </div>
  );

  const renderProposalsTab = () => (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Proposals</h5>
        <button className="btn btn-primary btn-sm" onClick={handleNewProposal}>
          + New Proposal
        </button>
      </div>

      <div className="table-responsive">
        <table className="table table-striped table-hover table-sm align-middle">
          <thead>
            <tr>
              <th>#</th>
              <th>Case</th>
              <th>Business</th>
              <th>Client</th>
              <th>Source</th>
              <th>COB</th>
              <th>Product</th>
              <th>Sales</th>
              <th>Request Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {proposals.map((p, idx) => (
              <tr key={p.id}>
                <td>{idx + 1}</td>
                <td>{p.type_of_case}</td>
                <td>{p.type_of_business}</td>
                <td>{p.client_name}</td>
                <td>{p.source_business_name}</td>
                <td>{p.cob_code} - {p.cob_name}</td>
                <td>{p.product_name}</td>
                <td>{p.sales_team_name}</td>
                <td>{p.request_date}</td>
                <td>
                  <span className={`badge bg-${
                    p.status === 'Won'
                      ? 'success'
                      : p.status === 'Lost'
                      ? 'danger'
                      : 'secondary'
                  }`}>
                    {p.status}
                  </span>
                </td>
                <td>
                  <div className="btn-group btn-group-sm" role="group">
                    <button
                      className="btn btn-outline-success"
                      disabled={p.status === 'Won'}
                      onClick={() => handleProposalStatus(p, 'Won')}
                    >
                      Win
                    </button>
                    <button
                      className="btn btn-outline-danger"
                      disabled={p.status === 'Lost'}
                      onClick={() => handleProposalStatus(p, 'Lost')}
                    >
                      Lose
                    </button>
                    <button
                      className="btn btn-outline-primary"
                      disabled={p.status !== 'Won'}
                      onClick={() => handleConvertProposal(p)}
                    >
                      To Policy
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {proposals.length === 0 && (
          <div className="alert alert-info py-2 mt-2">
            No proposals yet. Create one after client onboarding.
          </div>
        )}
      </div>
    </div>
  );

  const renderPoliciesTab = () => (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Policies</h5>
        <button className="btn btn-primary btn-sm" onClick={handleNewPolicy}>
          + New Policy
        </button>
      </div>

      <div className="table-responsive">
        <table className="table table-striped table-hover table-sm align-middle">
          <thead>
            <tr>
              <th>#</th>
              <th>Policy No</th>
              <th>Client</th>
              <th>Insurance</th>
              <th>COB / Product</th>
              <th>Premium</th>
              <th>Comm (G / Src / Net)</th>
              <th>Eff - Exp</th>
              <th>Finance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((p, idx) => (
              <tr key={p.id}>
                <td>{idx + 1}</td>
                <td>{p.policy_number}</td>
                <td>{p.client_name}</td>
                <td>{p.insurance_name}</td>
                <td>
                  {p.cob_code} - {p.cob_name}
                  <br />
                  <small className="text-muted">{p.product_name}</small>
                </td>
                <td>{Number(p.premium_amount || 0).toLocaleString()}</td>
                <td>
                  {p.commission_gross ?? 0} /{' '}
                  {p.commission_to_source ?? 0} /{' '}
                  {p.commission_net_percent ?? 0}
                </td>
                <td>
                  {p.effective_date?.slice(0, 10)} -{' '}
                  {p.expiry_date?.slice(0, 10)}
                </td>
                <td>
                  {p.sent_to_finance ? (
                    <span className="badge bg-success">Sent</span>
                  ) : (
                    <button
                      className="btn btn-sm btn-outline-success"
                      onClick={() => handleSendToFinance(p)}
                    >
                      Send
                    </button>
                  )}
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => handleEditPolicy(p)}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {policies.length === 0 && (
          <div className="alert alert-info py-2 mt-2">
            No policies yet. Convert a Won proposal or create manually.
          </div>
        )}
      </div>
    </div>
  );

  // =====================
  // Modals
  // =====================

  const renderClientModal = () => {
    if (!showClientModal) return null;
    return (
      <div className="modal d-block" tabIndex="-1" role="dialog">
        <div className="modal-dialog modal-lg" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                {clientForm.id ? 'Edit Client' : 'New Client'}
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowClientModal(false)}
              />
            </div>
            <form onSubmit={handleSaveClient}>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Name</label>
                    <input
                      type="text"
                      name="name"
                      className="form-control"
                      value={clientForm.name}
                      onChange={handleClientChange}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Type of Client</label>
                    <select
                      name="type_of_client"
                      className="form-select"
                      value={clientForm.type_of_client}
                      onChange={handleClientChange}
                      required
                    >
                      <option value="Policy Holder">Policy Holder</option>
                      <option value="Insurance">Insurance</option>
                      <option value="Source of Business">Source of Business</option>
                      <option value="Partner Co-Broking">Partner Co-Broking</option>
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      name="email"
                      className="form-control"
                      value={clientForm.email}
                      onChange={handleClientChange}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Phone</label>
                    <input
                      type="text"
                      name="phone"
                      className="form-control"
                      value={clientForm.phone}
                      onChange={handleClientChange}
                    />
                  </div>

                  <div className="col-md-12">
                    <label className="form-label">Address</label>
                    <textarea
                      name="address"
                      className="form-control"
                      rows="2"
                      value={clientForm.address}
                      onChange={handleClientChange}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Tax ID</label>
                    <input
                      type="text"
                      name="tax_id"
                      className="form-control"
                      value={clientForm.tax_id}
                      onChange={handleClientChange}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Industry</label>
                    <input
                      type="text"
                      name="industry"
                      className="form-control"
                      value={clientForm.industry}
                      onChange={handleClientChange}
                    />
                  </div>

                  <div className="col-md-6 form-check mt-2">
                    <input
                      type="checkbox"
                      id="special_flag"
                      name="special_flag"
                      className="form-check-input"
                      checked={clientForm.special_flag}
                      onChange={handleClientChange}
                    />
                    <label className="form-check-label" htmlFor="special_flag">
                      Special Client
                    </label>
                  </div>

                  <div className="col-md-12">
                    <label className="form-label">Remarks</label>
                    <textarea
                      name="remarks"
                      className="form-control"
                      rows="2"
                      value={clientForm.remarks}
                      onChange={handleClientChange}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowClientModal(false)}
                >
                  Close
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  Save Client
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const renderProposalModal = () => {
    if (!showProposalModal) return null;
    return (
      <div className="modal d-block" tabIndex="-1" role="dialog">
        <div className="modal-dialog modal-lg" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">New Proposal</h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowProposalModal(false)}
              />
            </div>
            <form onSubmit={handleSaveProposal}>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label">Type of Case</label>
                    <select
                      name="type_of_case"
                      className="form-select"
                      value={proposalForm.type_of_case}
                      onChange={handleProposalChange}
                    >
                      <option value="New">New</option>
                      <option value="Renewal">Renewal</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Type of Business</label>
                    <select
                      name="type_of_business"
                      className="form-select"
                      value={proposalForm.type_of_business}
                      onChange={handleProposalChange}
                    >
                      <option value="Direct">Direct</option>
                      <option value="Non Direct">Non Direct</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Request Date</label>
                    <input
                      type="date"
                      name="request_date"
                      className="form-control"
                      value={proposalForm.request_date}
                      onChange={handleProposalChange}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Client (Policy Holder)</label>
                    <select
                      name="client_id"
                      className="form-select"
                      value={proposalForm.client_id}
                      onChange={handleProposalChange}
                      required
                    >
                      <option value="">-- Select Client --</option>
                      {filteredPolicyHolders.map((c) => (
                        <option key={c.id} value={c.id}>
                          {getClientLabel(c.id)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Source of Business</label>
                    <select
                      name="source_business_id"
                      className="form-select"
                      value={proposalForm.source_business_id}
                      onChange={handleProposalChange}
                    >
                      <option value="">-- None --</option>
                      {filteredSources.map((c) => (
                        <option key={c.id} value={c.id}>
                          {getClientLabel(c.id)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Class of Business</label>
                    <select
                      name="class_of_business_id"
                      className="form-select"
                      value={proposalForm.class_of_business_id}
                      onChange={handleProposalChange}
                      required
                    >
                      <option value="">-- Select COB --</option>
                      {classOfBusiness.map((c) => (
                        <option key={c.id} value={c.id}>
                          {getCobLabel(c.id)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Product</label>
                    <select
                      name="product_id"
                      className="form-select"
                      value={proposalForm.product_id}
                      onChange={handleProposalChange}
                    >
                      <option value="">-- Select Product --</option>
                      {products
                        .filter(
                          (p) =>
                            !proposalForm.class_of_business_id ||
                            String(p.class_id) ===
                              String(proposalForm.class_of_business_id)
                        )
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {getProductLabel(p.id)}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Sales Team Name</label>
                    <input
                      type="text"
                      name="sales_team_name"
                      className="form-control"
                      value={proposalForm.sales_team_name}
                      onChange={handleProposalChange}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowProposalModal(false)}
                >
                  Close
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  Save Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const renderPolicyModal = () => {
    if (!showPolicyModal) return null;
    return (
      <div className="modal d-block" tabIndex="-1" role="dialog">
        <div className="modal-dialog modal-lg" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                {policyForm.id ? 'Edit Policy' : 'New Policy'}
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowPolicyModal(false)}
              />
            </div>
            <form onSubmit={handleSavePolicy}>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label">Type of Case</label>
                    <select
                      name="case_type"
                      className="form-select"
                      value={policyForm.case_type}
                      onChange={handlePolicyChange}
                    >
                      <option value="New">New</option>
                      <option value="Renewal">Renewal</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Type of Business</label>
                    <select
                      name="type_of_business"
                      className="form-select"
                      value={policyForm.type_of_business}
                      onChange={handlePolicyChange}
                    >
                      <option value="Direct">Direct</option>
                      <option value="Non Direct">Non Direct</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Currency</label>
                    <select
                      name="currency"
                      className="form-select"
                      value={policyForm.currency}
                      onChange={handlePolicyChange}
                    >
                      <option value="IDR">IDR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Client (Policy Holder)</label>
                    <select
                      name="client_id"
                      className="form-select"
                      value={policyForm.client_id}
                      onChange={handlePolicyChange}
                      required
                    >
                      <option value="">-- Select Client --</option>
                      {filteredPolicyHolders.map((c) => (
                        <option key={c.id} value={c.id}>
                          {getClientLabel(c.id)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Insurance Company</label>
                    <select
                      name="insurance_id"
                      className="form-select"
                      value={policyForm.insurance_id}
                      onChange={handlePolicyChange}
                    >
                      <option value="">-- Select Insurance --</option>
                      {filteredInsurers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {getClientLabel(c.id)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Source of Business</label>
                    <select
                      name="source_business_id"
                      className="form-select"
                      value={policyForm.source_business_id}
                      onChange={handlePolicyChange}
                    >
                      <option value="">-- None --</option>
                      {filteredSources.map((c) => (
                        <option key={c.id} value={c.id}>
                          {getClientLabel(c.id)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Class of Business</label>
                    <select
                      name="class_of_business_id"
                      className="form-select"
                      value={policyForm.class_of_business_id}
                      onChange={handlePolicyChange}
                      required
                    >
                      <option value="">-- Select COB --</option>
                      {classOfBusiness.map((c) => (
                        <option key={c.id} value={c.id}>
                          {getCobLabel(c.id)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Product</label>
                    <select
                      name="product_id"
                      className="form-select"
                      value={policyForm.product_id}
                      onChange={handlePolicyChange}
                    >
                      <option value="">-- Select Product --</option>
                      {products
                        .filter(
                          (p) =>
                            !policyForm.class_of_business_id ||
                            String(p.class_id) ===
                              String(policyForm.class_of_business_id)
                        )
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {getProductLabel(p.id)}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Premium Amount</label>
                    <input
                      type="number"
                      name="premium_amount"
                      className="form-control"
                      value={policyForm.premium_amount}
                      onChange={handlePolicyChange}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      Commission Gross (%) / To Source (%)
                    </label>
                    <div className="input-group">
                      <input
                        type="number"
                        name="commission_gross"
                        className="form-control"
                        value={policyForm.commission_gross}
                        onChange={handlePolicyChange}
                        placeholder="Gross"
                      />
                      <input
                        type="number"
                        name="commission_to_source"
                        className="form-control"
                        value={policyForm.commission_to_source}
                        onChange={handlePolicyChange}
                        placeholder="To Source"
                      />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Effective Date</label>
                    <input
                      type="date"
                      name="effective_date"
                      className="form-control"
                      value={policyForm.effective_date}
                      onChange={handlePolicyChange}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Expiry Date</label>
                    <input
                      type="date"
                      name="expiry_date"
                      className="form-control"
                      value={policyForm.expiry_date}
                      onChange={handlePolicyChange}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPolicyModal(false)}
                >
                  Close
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  Save Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // =====================
  // Main render
  // =====================

  return (
    <Layout title="Placement">
      {renderAlerts()}

      {loading && (
        <div className="alert alert-warning py-2" role="alert">
          Loading...
        </div>
      )}

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'clients' ? 'active' : ''}`}
            onClick={() => setActiveTab('clients')}
          >
            Clients
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'proposals' ? 'active' : ''}`}
            onClick={() => setActiveTab('proposals')}
          >
            Proposals
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'policies' ? 'active' : ''}`}
            onClick={() => setActiveTab('policies')}
          >
            Policies
          </button>
        </li>
      </ul>

      {activeTab === 'clients' && renderClientsTab()}
      {activeTab === 'proposals' && renderProposalsTab()}
      {activeTab === 'policies' && renderPoliciesTab()}

      {renderClientModal()}
      {renderProposalModal()}
      {renderPolicyModal()}
    </Layout>
  );
}

export default Placement;
