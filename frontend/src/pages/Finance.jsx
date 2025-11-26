// frontend/src/pages/Finance.jsx
// Finance Module v2 – Tabs, Search/Filter/Sort, Installment-level schedule
// Backend: /api/finance with nested installments & summary

import React, { useState, useEffect } from 'react';
import api from '../services/api';

const ENTRY_STATUS_OPTIONS = [
  { value: 'NOT_DUE', label: 'Not Due' },
  { value: 'DUE', label: 'Due' },
  { value: 'PARTIAL_PAID', label: 'Partial Paid' },
  { value: 'PAID', label: 'Paid' }
];

const ENTRY_DESCRIPTIONS = [
  'Premium (From Client)',
  'Premium to Insurer',
  'Commission In',
  'Commission to Source'
];

const PAYMENT_TYPES = ['ANNUAL', 'SEMESTER', 'QUARTERLY', 'N'];

function Finance() {
  const [activeTab, setActiveTab] = useState('inbox');

  const [schedules, setSchedules] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [clients, setClients] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search & filter per tab
  const [inboxSearch, setInboxSearch] = useState('');
  const [inboxBusinessFilter, setInboxBusinessFilter] = useState('ALL'); // ALL / DIRECT / NON_DIRECT

  const [scheduleSearch, setScheduleSearch] = useState('');
  const [scheduleOutstandingOnly, setScheduleOutstandingOnly] = useState(false);
  const [scheduleSort, setScheduleSort] = useState({ field: 'next_due', direction: 'asc' });

  const [installmentSearch, setInstallmentSearch] = useState('');
  const [installmentStatusFilter, setInstallmentStatusFilter] = useState('ALL'); // ALL / NOT_DUE / DUE / PARTIAL_PAID / PAID
  const [installmentTypeFilter, setInstallmentTypeFilter] = useState('ALL'); // ALL / PREMIUM / COMMISSION
  const [installmentDescriptionFilter, setInstallmentDescriptionFilter] = useState('ALL'); // ALL or specific description
  const [installmentSort, setInstallmentSort] = useState({ field: 'due_date', direction: 'asc' });

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // create | edit
  const [currentPolicy, setCurrentPolicy] = useState(null);
  const [currentSchedule, setCurrentSchedule] = useState(null);
  const [paymentType, setPaymentType] = useState('ANNUAL');
  const [paymentCount, setPaymentCount] = useState(1);
  const [installmentsDraft, setInstallmentsDraft] = useState([]); // [{ installment, entries: [] }]

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [finRes, polRes, cliRes] = await Promise.all([
        api.get('/finance/schedules'),
        api.get('/placement/policies'),
        api.get('/placement/clients')
      ]);

      const finData = finRes.data?.data || [];
      const polData =
        polRes.data?.data?.policies ||
        finRes.data?.data?.policies ||
        polRes.data?.data ||
        [];
      const cliData = cliRes.data?.data?.clients || cliRes.data?.data || [];

      setSchedules(finData);
      setPolicies(polData);
      setClients(cliData);
    } catch (err) {
      setError(
        'Gagal load data finance: ' +
          (err.response?.data?.error?.message || err.message)
      );
    } finally {
      setLoading(false);
    }
  };

  // Helpers
  const getPolicy = (policyId) => policies.find((p) => p.id === policyId) || null;

  const getClientName = (clientId) =>
    clients.find((c) => c.id === clientId)?.name || '';

  const getInsuranceName = (insuranceId) =>
    clients.find((c) => c.id === insuranceId)?.name || '';

  const getSourceName = (sourceId) =>
    clients.find((c) => c.id === sourceId)?.name || '';

  const formatMoney = (amount, currency = 'IDR') => {
    if (amount == null || amount === '') return '-';
    const num = Number(amount) || 0;
    return (
      num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) + ' ' + currency
    );
  };

  const todayISO = () => new Date().toISOString().slice(0, 10);

  const normalizeBusinessType = (type) => {
    if (!type) return 'DIRECT';
    const v = String(type).toLowerCase().trim();
    if (v === 'non direct' || v === 'non_direct' || v === 'non-direct') {
      return 'NON_DIRECT';
    }
    return 'DIRECT';
  };

  const formatStatusLabel = (status) => {
    const opt = ENTRY_STATUS_OPTIONS.find((o) => o.value === status);
    return opt ? opt.label : status || '-';
  };

  const getEffectiveStatus = (entry) => {
    const raw = entry.status || 'NOT_DUE';
    const due = entry.due_date;
    if (!due) return raw;
    if (raw === 'PAID') return raw;
    // kalau overdue dan belum paid, kita treat sebagai DUE
    const t = todayISO();
    if (due < t && raw !== 'DUE' && raw !== 'PARTIAL_PAID') {
      return 'DUE';
    }
    return raw;
  };

  const getAgingDays = (entry) => {
    const due = entry.due_date;
    if (!due) return null;
    const t = todayISO();
    if (due >= t) return 0;
    const dDue = new Date(due);
    const dToday = new Date(t);
    const diffMs = dToday - dDue;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const statusBadgeClass = (status) => {
    switch (status) {
      case 'PAID':
        return 'badge bg-success';
      case 'DUE':
        return 'badge bg-danger';
      case 'PARTIAL_PAID':
        return 'badge bg-warning text-dark';
      case 'NOT_DUE':
      default:
        return 'badge bg-secondary';
    }
  };

  // Inbox policies: sent_to_finance === true & no schedule yet
  const inboxPolicies = policies.filter((p) => {
    if (!p.sent_to_finance) return false;
    const hasSchedule = schedules.some((s) => s.policy_id === p.id);
    if (hasSchedule) return false;

    const businessType = normalizeBusinessType(p.type_of_business);
    if (inboxBusinessFilter === 'DIRECT' && businessType !== 'DIRECT') return false;
    if (inboxBusinessFilter === 'NON_DIRECT' && businessType !== 'NON_DIRECT')
      return false;

    const targetText =
      (p.policy_number || '') +
      ' ' +
      (p.transaction_number || '') +
      ' ' +
      (getClientName(p.client_id) || '') +
      ' ' +
      (getInsuranceName(p.insurance_id) || '');
    if (
      inboxSearch &&
      !targetText.toLowerCase().includes(inboxSearch.toLowerCase())
    ) {
      return false;
    }

    return true;
  });

  // Schedules with optional filter & sort
  const filteredSchedules = schedules
    .filter((s) => {
      const policy = getPolicy(s.policy_id);
      const summary = s.summary || {};

      const targetText =
        (policy?.policy_number || '') +
        ' ' +
        (policy?.transaction_number || '') +
        ' ' +
        (getClientName(s.client_id) || '') +
        ' ' +
        (getInsuranceName(s.insurance_id) || '');

      if (
        scheduleSearch &&
        !targetText.toLowerCase().includes(scheduleSearch.toLowerCase())
      ) {
        return false;
      }

      if (scheduleOutstandingOnly) {
        const hasOutstanding =
          (summary.premium_outstanding || 0) > 0 ||
          (summary.premium_to_insurer_outstanding || 0) > 0 ||
          (summary.commission_in_outstanding || 0) > 0 ||
          (summary.commission_to_source_outstanding || 0) > 0;
        if (!hasOutstanding) return false;
      }

      return true;
    })
    .sort((a, b) => {
      const dir = scheduleSort.direction === 'asc' ? 1 : -1;
      const sa = a.summary || {};
      const sb = b.summary || {};
      const pa = getPolicy(a.policy_id);
      const pb = getPolicy(b.policy_id);

      switch (scheduleSort.field) {
        case 'policy':
          return (
            ((pa?.policy_number || '') > (pb?.policy_number || '') ? 1 : -1) *
            dir
          );
        case 'client':
          return (
            (getClientName(a.client_id) > getClientName(b.client_id) ? 1 : -1) *
            dir
          );
        case 'next_due':
        default: {
          const da = sa.next_due_date || '';
          const db = sb.next_due_date || '';
          if (!da && !db) return 0;
          if (!da) return 1 * dir;
          if (!db) return -1 * dir;
          return (da > db ? 1 : -1) * dir;
        }
      }
    });

  // Flatten installments -> rows for Payment Schedule tab
  const flattenedInstallments = schedules.flatMap((s) => {
    const policy = getPolicy(s.policy_id);
    const summary = s.summary || {};
    const currency = s.currency || policy?.currency || 'IDR';

    const installments = Array.isArray(s.installments) ? s.installments : [];
    return installments.flatMap((inst, instIdx) => {
      const entries = Array.isArray(inst.entries) ? inst.entries : [];
      return entries.map((entry, idx) => ({
        scheduleId: s.id,
        policy,
        clientName: getClientName(s.client_id),
        insuranceName: getInsuranceName(s.insurance_id),
        sourceName: getSourceName(s.source_business_id),
        summary,
        currency,
        installment: inst.installment,
        installmentIndex: instIdx,
        entryIndex: idx,
        entry
      }));
    });
  });

  const filteredInstallments = flattenedInstallments
    .filter((row) => {
      const entry = row.entry;
      const desc = entry.description || '';
      const effStatus = getEffectiveStatus(entry);

      if (installmentTypeFilter === 'PREMIUM') {
        if (
          desc !== 'Premium (From Client)' &&
          desc !== 'Premium to Insurer'
        ) {
          return false;
        }
      }
      if (installmentTypeFilter === 'COMMISSION') {
        if (
          desc !== 'Commission In' &&
          desc !== 'Commission to Source'
        ) {
          return false;
        }
      }

      if (
        installmentDescriptionFilter !== 'ALL' &&
        desc !== installmentDescriptionFilter
      ) {
        return false;
      }

      if (installmentStatusFilter !== 'ALL' && effStatus !== installmentStatusFilter) {
        return false;
      }

      const targetText =
        (row.policy?.policy_number || '') +
        ' ' +
        (row.policy?.transaction_number || '') +
        ' ' +
        (row.clientName || '') +
        ' ' +
        (row.insuranceName || '') +
        ' ' +
        desc;

      if (
        installmentSearch &&
        !targetText.toLowerCase().includes(installmentSearch.toLowerCase())
      ) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      const dir = installmentSort.direction === 'asc' ? 1 : -1;

      switch (installmentSort.field) {
        case 'policy':
          return (
            ((a.policy?.policy_number || '') >
            (b.policy?.policy_number || '')
              ? 1
              : -1) * dir
          );
        case 'installment':
          return (a.installment - b.installment) * dir;
        case 'description':
          return (
            (a.entry.description || '') > (b.entry.description || '')
              ? 1
              : -1
          ) * dir;
        case 'amount':
          return (
            (Number(a.entry.amount || 0) -
              Number(b.entry.amount || 0)) * dir
          );
        case 'due_date':
        default: {
          const da = a.entry.due_date || '';
          const db = b.entry.due_date || '';
          if (!da && !db) return 0;
          if (!da) return 1 * dir;
          if (!db) return -1 * dir;
          return (da > db ? 1 : -1) * dir;
        }
      }
    });

  // ============ MODAL LOGIC ============

  const openCreateModalForPolicy = (policy) => {
    setModalMode('create');
    setCurrentPolicy(policy);
    setCurrentSchedule(null);
    setPaymentType('ANNUAL');
    setPaymentCount(1);
    setInstallmentsDraft([]);
    setShowModal(true);
    setError('');
    setSuccess('');
  };

  const openEditModalForSchedule = (schedule) => {
    const policy = getPolicy(schedule.policy_id);
    setModalMode('edit');
    setCurrentPolicy(policy);
    setCurrentSchedule(schedule);

    const clonedInstallments = (schedule.installments || []).map((inst) => ({
      installment: inst.installment,
      entries: (inst.entries || []).map((e) => ({
        description: e.description,
        due_date: e.due_date || '',
        amount: Number(e.amount || 0),
        status: e.status || 'NOT_DUE',
        paid_date: e.paid_date || ''
      }))
    }));

    setInstallmentsDraft(clonedInstallments);
    setPaymentType('ANNUAL');
    setPaymentCount(
      clonedInstallments.length > 0 ? clonedInstallments.length : 1
    );
    setShowModal(true);
    setError('');
    setSuccess('');
  };

  const closeModal = () => {
    setShowModal(false);
    setCurrentPolicy(null);
    setCurrentSchedule(null);
    setInstallmentsDraft([]);
    setError('');
  };

  const computeBaseInstallments = () => {
    const policy = currentPolicy;
    if (!policy) return [];

    const businessType = normalizeBusinessType(policy.type_of_business);
    const totalPremium = Number(policy.premium_amount || 0) || 0;
    const grossPct = Number(policy.commission_gross || 0) || 0;
    const sourcePct = Number(policy.commission_to_source || 0) || 0;

    let n = 1;
    if (paymentType === 'ANNUAL') n = 1;
    else if (paymentType === 'SEMESTER') n = 2;
    else if (paymentType === 'QUARTERLY') n = 4;
    else if (paymentType === 'N') {
      const c = Number(paymentCount || 0);
      n = c > 0 ? c : 1;
    }

    const effDate = policy.effective_date || todayISO();

    if (businessType === 'NON_DIRECT') {
      // No premium cashflow, only commission flows
      const perPremium = totalPremium / n;
      let acc = 0;
      const rows = [];
      for (let i = 0; i < n; i++) {
        let base = i === n - 1 ? totalPremium - acc : perPremium;
        base = Math.round(base * 100) / 100;
        acc += base;

        const commissionIn = Math.round(base * (grossPct / 100) * 100) / 100;
        const commissionOut =
          Math.round(base * (sourcePct / 100) * 100) / 100;

        rows.push({
          installment: i + 1,
          entries: [
            {
              description: 'Commission In',
              due_date: effDate,
              amount: commissionIn,
              status: 'NOT_DUE',
              paid_date: ''
            },
            {
              description: 'Commission to Source',
              due_date: effDate,
              amount: commissionOut,
              status: 'NOT_DUE',
              paid_date: ''
            }
          ]
        });
      }
      return rows;
    } else {
      // DIRECT business: premium + commission
      const perPremium = totalPremium / n;
      let acc = 0;
      const rows = [];
      for (let i = 0; i < n; i++) {
        let base = i === n - 1 ? totalPremium - acc : perPremium;
        base = Math.round(base * 100) / 100;
        acc += base;

        const commissionIn = Math.round(base * (grossPct / 100) * 100) / 100;
        const commissionOut =
          Math.round(base * (sourcePct / 100) * 100) / 100;
        const premiumToInsurer =
          Math.round((base - commissionIn) * 100) / 100;

        rows.push({
          installment: i + 1,
          entries: [
            {
              description: 'Premium (From Client)',
              due_date: effDate,
              amount: base,
              status: 'NOT_DUE',
              paid_date: ''
            },
            {
              description: 'Premium to Insurer',
              due_date: effDate,
              amount: premiumToInsurer,
              status: 'NOT_DUE',
              paid_date: ''
            },
            {
              description: 'Commission In',
              due_date: effDate,
              amount: commissionIn,
              status: 'NOT_DUE',
              paid_date: ''
            },
            {
              description: 'Commission to Source',
              due_date: effDate,
              amount: commissionOut,
              status: 'NOT_DUE',
              paid_date: ''
            }
          ]
        });
      }
      return rows;
    }
  };

  const handleGenerateInstallments = () => {
    if (!currentPolicy) return;
    const rows = computeBaseInstallments();
    if (!rows.length) {
      setError('Tidak bisa generate installment: premium/komisi tidak valid.');
      return;
    }
    setInstallmentsDraft(rows);
    setError('');
  };

  const updateEntryField = (instIndex, entryIndex, field, value) => {
    const next = installmentsDraft.map((inst, i) => {
      if (i !== instIndex) return inst;
      const entries = inst.entries.map((e, j) => {
        if (j !== entryIndex) return e;
        if (field === 'amount') {
          return { ...e, amount: Number(value || 0) };
        }
        if (field === 'status') {
          return { ...e, status: value };
        }
        return { ...e, [field]: value };
      });
      return { ...inst, entries };
    });
    setInstallmentsDraft(next);
  };

  const computeTotalPremiumFromDraft = () => {
    let total = 0;
    for (const inst of installmentsDraft) {
      for (const entry of inst.entries || []) {
        if (entry.description === 'Premium (From Client)') {
          total += Number(entry.amount || 0);
        }
      }
    }
    return total;
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    if (!currentPolicy) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const businessType = currentPolicy.type_of_business || 'Direct';

      if (modalMode === 'create') {
        const payload = {
          policy_id: currentPolicy.id,
          client_id: currentPolicy.client_id,
          insurance_id: currentPolicy.insurance_id,
          source_business_id: currentPolicy.source_business_id || null,
          currency: currentPolicy.currency || 'IDR',
          type_of_business: businessType,
          commission_gross: currentPolicy.commission_gross,
          commission_to_source: currentPolicy.commission_to_source,
          installments: installmentsDraft
        };

        const res = await api.post('/finance/schedules', payload);
        if (res.data?.success) {
          setSuccess('✅ Finance schedule berhasil dibuat.');
          closeModal();
          await loadAll();
        } else {
          setError('Gagal membuat finance schedule.');
        }
      } else {
        // edit
        if (!currentSchedule) return;
        const res = await api.put(`/finance/schedules/${currentSchedule.id}`, {
          type_of_business: businessType,
          installments: installmentsDraft
        });
        if (res.data?.success) {
          setSuccess('✅ Finance schedule berhasil di-update.');
          closeModal();
          await loadAll();
        } else {
          setError('Gagal update finance schedule.');
        }
      }
    } catch (err) {
      setError(
        'Error menyimpan schedule: ' +
          (err.response?.data?.error?.message || err.message)
      );
    } finally {
      setLoading(false);
    }
  };

  // ============ INLINE UPDATE (Installment tab) ============

  const updateSingleEntryOnServer = async (row, changes) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const schedule = schedules.find((s) => s.id === row.scheduleId);
      if (!schedule) {
        setError('Schedule tidak ditemukan.');
        return;
      }

      const newInstallments = (schedule.installments || []).map((inst) => {
        if (inst.installment !== row.installment) return inst;
        const newEntries = (inst.entries || []).map((e, idx) => {
          if (idx !== row.entryIndex) return e;
          return {
            ...e,
            ...changes
          };
        });
        return { ...inst, entries: newEntries };
      });

      const res = await api.put(`/finance/schedules/${schedule.id}`, {
        installments: newInstallments
      });

      if (res.data?.success) {
        const updated = res.data.data;
        setSchedules((prev) =>
          prev.map((s) => (s.id === updated.id ? updated : s))
        );
        setSuccess('✅ Installment entry updated.');
      } else {
        setError('Gagal update installment entry.');
      }
    } catch (err) {
      setError(
        'Error update installment entry: ' +
          (err.response?.data?.error?.message || err.message)
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInlineStatusChange = (row, newStatus) => {
    const changes = { status: newStatus };
    // Kalau status jadi PAID dan belum ada paid_date, isi hari ini
    if (newStatus === 'PAID' && !row.entry.paid_date) {
      changes.paid_date = todayISO();
    }
    updateSingleEntryOnServer(row, changes);
  };

  const handleInlinePaidDateChange = (row, newDate) => {
    updateSingleEntryOnServer(row, { paid_date: newDate || null });
  };

  // ============ SORT HANDLERS (Schedules & Installments) ============

  const toggleScheduleSort = (field) => {
    setScheduleSort((prev) => {
      if (prev.field === field) {
        return {
          field,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      return { field, direction: 'asc' };
    });
  };

  const toggleInstallmentSort = (field) => {
    setInstallmentSort((prev) => {
      if (prev.field === field) {
        return {
          field,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      return { field, direction: 'asc' };
    });
  };

  // ============ RENDER ============

  return (
    <div className="container py-4">
      <h2 className="mb-3">💸 Finance Module – Premium & Commission Schedule</h2>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show">
          {error}
          <button
            type="button"
            className="btn-close"
            onClick={() => setError('')}
          ></button>
        </div>
      )}
      {success && (
        <div className="alert alert-success alert-dismissible fade show">
          {success}
          <button
            type="button"
            className="btn-close"
            onClick={() => setSuccess('')}
          ></button>
        </div>
      )}

      {/* Tabs */}
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button
            className={
              'nav-link ' + (activeTab === 'inbox' ? 'active fw-bold' : '')
            }
            onClick={() => setActiveTab('inbox')}
          >
            📥 Inbox
          </button>
        </li>
        <li className="nav-item">
          <button
            className={
              'nav-link ' + (activeTab === 'policy' ? 'active fw-bold' : '')
            }
            onClick={() => setActiveTab('policy')}
          >
            📊 Finance Schedules (Per Policy)
          </button>
        </li>
        <li className="nav-item">
          <button
            className={
              'nav-link ' +
              (activeTab === 'installments' ? 'active fw-bold' : '')
            }
            onClick={() => setActiveTab('installments')}
          >
            📅 Payment Schedule (Installment Level)
          </button>
        </li>
      </ul>

      {/* TAB CONTENTS */}
      {activeTab === 'inbox' && (
        <div className="card mb-3">
          <div className="card-header bg-secondary text-white fw-bold d-flex justify-content-between align-items-center">
            <span>📥 Finance Inbox – Policy siap dibuat schedule</span>
            <small>Total: {inboxPolicies.length}</small>
          </div>
          <div className="card-body">
            <div className="row mb-3">
              <div className="col-md-6 mb-2">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Cari policy / client / insurance..."
                  value={inboxSearch}
                  onChange={(e) => setInboxSearch(e.target.value)}
                />
              </div>
              <div className="col-md-3 mb-2">
                <select
                  className="form-select"
                  value={inboxBusinessFilter}
                  onChange={(e) => setInboxBusinessFilter(e.target.value)}
                >
                  <option value="ALL">All Business Type</option>
                  <option value="DIRECT">Direct</option>
                  <option value="NON_DIRECT">Non Direct</option>
                </select>
              </div>
            </div>

            {inboxPolicies.length === 0 ? (
              <div className="alert alert-info mb-0">
                Tidak ada policy di inbox. Kirim dari modul Placement dengan
                tombol Finance.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover table-sm align-middle">
                  <thead>
                    <tr>
                      <th>Policy</th>
                      <th>Client</th>
                      <th>Insurance</th>
                      <th>Source Business</th>
                      <th>Business Type</th>
                      <th>Premium & Commission</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inboxPolicies.map((p) => {
                      const businessType = normalizeBusinessType(
                        p.type_of_business
                      );
                      return (
                        <tr key={p.id}>
                          <td>
                            <div className="fw-bold">
                              {p.policy_number || '—'}
                            </div>
                            <small className="text-muted">
                              TRX: {p.transaction_number || '—'}
                            </small>
                          </td>
                          <td>{getClientName(p.client_id) || '—'}</td>
                          <td>{getInsuranceName(p.insurance_id) || '—'}</td>
                          <td>
                            {p.source_business_id
                              ? getSourceName(p.source_business_id)
                              : '—'}
                          </td>
                          <td>
                            <span
                              className={
                                'badge ' +
                                (businessType === 'NON_DIRECT'
                                  ? 'bg-warning text-dark'
                                  : 'bg-success')
                              }
                            >
                              {businessType === 'NON_DIRECT'
                                ? 'Non Direct'
                                : 'Direct'}
                            </span>
                          </td>
                          <td>
                            <div>
                              <strong>
                                {formatMoney(
                                  p.premium_amount,
                                  p.currency || 'IDR'
                                )}
                              </strong>
                            </div>
                            <small className="text-muted">
                              Comm Broker: {p.commission_gross || 0}% | To
                              Source: {p.commission_to_source || 0}%
                            </small>
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => openCreateModalForPolicy(p)}
                            >
                              ➕ Create Schedule
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'policy' && (
        <div className="card mb-3">
          <div className="card-header bg-primary text-white fw-bold d-flex justify-content-between align-items-center">
            <span>📊 Finance Schedules (Per Policy)</span>
            <small>Total: {filteredSchedules.length}</small>
          </div>
          <div className="card-body">
            <div className="row mb-3">
              <div className="col-md-6 mb-2">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Cari policy / client / insurance..."
                  value={scheduleSearch}
                  onChange={(e) => setScheduleSearch(e.target.value)}
                />
              </div>
              <div className="col-md-3 mb-2 d-flex align-items-center">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="outstandingOnly"
                    checked={scheduleOutstandingOnly}
                    onChange={(e) =>
                      setScheduleOutstandingOnly(e.target.checked)
                    }
                  />
                  <label
                    className="form-check-label"
                    htmlFor="outstandingOnly"
                  >
                    Outstanding Only
                  </label>
                </div>
              </div>
            </div>

            {filteredSchedules.length === 0 ? (
              <div className="alert alert-info mb-0">
                Belum ada finance schedule dibuat.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover table-sm align-middle">
                  <thead>
                    <tr>
                      <th
                        role="button"
                        onClick={() => toggleScheduleSort('policy')}
                      >
                        Policy{' '}
                        {scheduleSort.field === 'policy'
                          ? scheduleSort.direction === 'asc'
                            ? '▲'
                            : '▼'
                          : ''}
                      </th>
                      <th
                        role="button"
                        onClick={() => toggleScheduleSort('client')}
                      >
                        Client{' '}
                        {scheduleSort.field === 'client'
                          ? scheduleSort.direction === 'asc'
                            ? '▲'
                            : '▼'
                          : ''}
                      </th>
                      <th>Insurance</th>
                      <th>Business Type</th>
                      <th
                        role="button"
                        onClick={() => toggleScheduleSort('next_due')}
                      >
                        Next Due{' '}
                        {scheduleSort.field === 'next_due'
                          ? scheduleSort.direction === 'asc'
                            ? '▲'
                            : '▼'
                          : ''}
                      </th>
                      <th>Premium Summary</th>
                      <th>Commission Summary</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSchedules.map((s) => {
                      const policy = getPolicy(s.policy_id);
                      const summary = s.summary || {};
                      const businessType = normalizeBusinessType(
                        policy?.type_of_business
                      );
                      const currency = s.currency || policy?.currency || 'IDR';

                      return (
                        <tr key={s.id}>
                          <td>
                            <div className="fw-bold">
                              {policy?.policy_number || '—'}
                            </div>
                            <small className="text-muted">
                              TRX: {policy?.transaction_number || '—'}
                            </small>
                          </td>
                          <td>{getClientName(s.client_id) || '—'}</td>
                          <td>{getInsuranceName(s.insurance_id) || '—'}</td>
                          <td>
                            <span
                              className={
                                'badge ' +
                                (businessType === 'NON_DIRECT'
                                  ? 'bg-warning text-dark'
                                  : 'bg-success')
                              }
                            >
                              {businessType === 'NON_DIRECT'
                                ? 'Non Direct'
                                : 'Direct'}
                            </span>
                          </td>
                          <td>
                            <div>{summary.next_due_date || '-'}</div>
                            <small className="text-muted">
                              To insurer:{' '}
                              {summary.insurer_next_due_date || '-'}
                            </small>
                          </td>
                          <td>
                            <div>
                              Total:{' '}
                              {formatMoney(
                                summary.premium_total,
                                currency
                              )}
                            </div>
                            <div>
                              Received:{' '}
                              {formatMoney(
                                summary.premium_received,
                                currency
                              )}
                            </div>
                            <div>
                              <strong>
                                Outstanding:{' '}
                                {formatMoney(
                                  summary.premium_outstanding,
                                  currency
                                )}
                              </strong>
                            </div>
                          </td>
                          <td>
                            <div>
                              Comm In:{' '}
                              {formatMoney(
                                summary.commission_in_total,
                                currency
                              )}
                            </div>
                            <div>
                              Rec:{' '}
                              {formatMoney(
                                summary.commission_in_received,
                                currency
                              )}
                            </div>
                            <div>
                              Comm Out:{' '}
                              {formatMoney(
                                summary.commission_to_source_total,
                                currency
                              )}
                            </div>
                            <div>
                              Paid Out:{' '}
                              {formatMoney(
                                summary.commission_to_source_paid,
                                currency
                              )}
                            </div>
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => openEditModalForSchedule(s)}
                            >
                              ✏️ Update Entries
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'installments' && (
        <div className="card">
          <div className="card-header bg-dark text-white fw-bold d-flex justify-content-between align-items-center">
            <span>📅 Payment Schedule (Installment Level)</span>
            <small>Total entries: {filteredInstallments.length}</small>
          </div>
          <div className="card-body">
            <div className="row mb-3">
              <div className="col-md-4 mb-2">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Cari policy / client / description..."
                  value={installmentSearch}
                  onChange={(e) => setInstallmentSearch(e.target.value)}
                />
              </div>
              <div className="col-md-3 mb-2">
                <select
                  className="form-select"
                  value={installmentTypeFilter}
                  onChange={(e) => setInstallmentTypeFilter(e.target.value)}
                >
                  <option value="ALL">All Entry Type</option>
                  <option value="PREMIUM">Premium Only</option>
                  <option value="COMMISSION">Commission Only</option>
                </select>
              </div>
              <div className="col-md-3 mb-2">
                <select
                  className="form-select"
                  value={installmentDescriptionFilter}
                  onChange={(e) =>
                    setInstallmentDescriptionFilter(e.target.value)
                  }
                >
                  <option value="ALL">All Description</option>
                  {ENTRY_DESCRIPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2 mb-2">
                <select
                  className="form-select"
                  value={installmentStatusFilter}
                  onChange={(e) =>
                    setInstallmentStatusFilter(e.target.value)
                  }
                >
                  <option value="ALL">All Status</option>
                  <option value="NOT_DUE">Not Due</option>
                  <option value="DUE">Due</option>
                  <option value="PARTIAL_PAID">Partial Paid</option>
                  <option value="PAID">Paid</option>
                </select>
              </div>
            </div>

            {filteredInstallments.length === 0 ? (
              <div className="alert alert-info mb-0">
                Belum ada installment entry. Buat schedule dulu di tab Inbox /
                update di tab Finance Schedules.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-bordered align-middle">
                  <thead className="table-light">
                    <tr>
                      <th
                        role="button"
                        onClick={() => toggleInstallmentSort('policy')}
                      >
                        Policy{' '}
                        {installmentSort.field === 'policy'
                          ? installmentSort.direction === 'asc'
                            ? '▲'
                            : '▼'
                          : ''}
                      </th>
                      <th
                        role="button"
                        onClick={() =>
                          toggleInstallmentSort('installment')
                        }
                      >
                        Inst#{' '}
                        {installmentSort.field === 'installment'
                          ? installmentSort.direction === 'asc'
                            ? '▲'
                            : '▼'
                          : ''}
                      </th>
                      <th
                        role="button"
                        onClick={() =>
                          toggleInstallmentSort('description')
                        }
                      >
                        Description{' '}
                        {installmentSort.field === 'description'
                          ? installmentSort.direction === 'asc'
                            ? '▲'
                            : '▼'
                          : ''}
                      </th>
                      <th
                        role="button"
                        onClick={() =>
                          toggleInstallmentSort('due_date')
                        }
                      >
                        Due Date{' '}
                        {installmentSort.field === 'due_date'
                          ? installmentSort.direction === 'asc'
                            ? '▲'
                            : '▼'
                          : ''}
                      </th>
                      <th>Aging (days)</th>
                      <th
                        role="button"
                        onClick={() =>
                          toggleInstallmentSort('amount')
                        }
                      >
                        Amount{' '}
                        {installmentSort.field === 'amount'
                          ? installmentSort.direction === 'asc'
                            ? '▲'
                            : '▼'
                          : ''}
                      </th>
                      <th>Status</th>
                      <th>Paid Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInstallments.map((row, idx) => {
                      const effectiveStatus = getEffectiveStatus(row.entry);
                      const aging = getAgingDays(row.entry);
                      return (
                        <tr
                          key={`${row.scheduleId}-${row.installment}-${idx}`}
                        >
                          <td>
                            <div className="fw-bold">
                              {row.policy?.policy_number || '—'}
                            </div>
                            <small className="text-muted">
                              {row.clientName || '—'} |{' '}
                              {row.insuranceName || '—'}
                            </small>
                          </td>
                          <td>{row.installment}</td>
                          <td>{row.entry.description}</td>
                          <td>{row.entry.due_date || '-'}</td>
                          <td>{aging != null ? aging : '-'}</td>
                          <td>
                            {formatMoney(
                              row.entry.amount,
                              row.currency
                            )}
                          </td>
                          <td>
                            <div className="d-flex flex-column">
                              <select
                                className="form-select form-select-sm mb-1"
                                value={row.entry.status || 'NOT_DUE'}
                                onChange={(e) =>
                                  handleInlineStatusChange(
                                    row,
                                    e.target.value
                                  )
                                }
                              >
                                {ENTRY_STATUS_OPTIONS.map((opt) => (
                                  <option
                                    key={opt.value}
                                    value={opt.value}
                                  >
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              <span
                                className={statusBadgeClass(
                                  effectiveStatus
                                )}
                              >
                                {formatStatusLabel(effectiveStatus)}
                              </span>
                            </div>
                          </td>
                          <td>
                            <input
                              type="date"
                              className="form-control form-control-sm"
                              value={row.entry.paid_date || ''}
                              onChange={(e) =>
                                handleInlinePaidDateChange(
                                  row,
                                  e.target.value
                                )
                              }
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL CREATE / EDIT SCHEDULE */}
      {showModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
        >
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  {modalMode === 'create'
                    ? `Create Finance Schedule – ${
                        currentPolicy?.policy_number || ''
                      }`
                    : `Update Finance Schedule – ${
                        currentPolicy?.policy_number || ''
                      }`}
                </h5>
                <button
                  className="btn-close btn-close-white"
                  onClick={closeModal}
                ></button>
              </div>
              <div
                className="modal-body"
                style={{ maxHeight: '80vh', overflowY: 'auto' }}
              >
                {currentPolicy && (
                  <div className="alert alert-secondary">
                    <div>
                      <strong>TRX:</strong>{' '}
                      {currentPolicy.transaction_number || '—'}
                    </div>
                    <div>
                      <strong>Client:</strong>{' '}
                      {getClientName(currentPolicy.client_id) || '—'}
                    </div>
                    <div>
                      <strong>Insurance:</strong>{' '}
                      {getInsuranceName(currentPolicy.insurance_id) ||
                        '—'}
                    </div>
                    <div>
                      <strong>Business Type:</strong>{' '}
                      {normalizeBusinessType(
                        currentPolicy.type_of_business
                      ) === 'NON_DIRECT'
                        ? 'Non Direct'
                        : 'Direct'}
                    </div>
                    <div>
                      <strong>Premium:</strong>{' '}
                      {formatMoney(
                        currentPolicy.premium_amount,
                        currentPolicy.currency || 'IDR'
                      )}
                    </div>
                    <div>
                      <strong>Commission Broker:</strong>{' '}
                      {currentPolicy.commission_gross || 0}% |{' '}
                      <strong>To Source:</strong>{' '}
                      {currentPolicy.commission_to_source || 0}%
                    </div>
                  </div>
                )}

                <form onSubmit={handleSaveModal}>
                  {modalMode === 'create' && currentPolicy && (
                    <fieldset className="border p-3 mb-3">
                      <legend className="w-auto px-2">
                        Payment Type & Generate Installments
                      </legend>
                      <div className="row align-items-end">
                        <div className="col-md-4 mb-2">
                          <label className="form-label">Payment Type</label>
                          <select
                            className="form-select"
                            value={paymentType}
                            onChange={(e) =>
                              setPaymentType(e.target.value)
                            }
                          >
                            <option value="ANNUAL">Annual (1x)</option>
                            <option value="SEMESTER">Semester (2x)</option>
                            <option value="QUARTERLY">Quarterly (4x)</option>
                            <option value="N">N Payment (Custom)</option>
                          </select>
                        </div>
                        {paymentType === 'N' && (
                          <div className="col-md-3 mb-2">
                            <label className="form-label">
                              Jumlah Pembayaran (N)
                            </label>
                            <input
                              type="number"
                              min="1"
                              className="form-control"
                              value={paymentCount}
                              onChange={(e) =>
                                setPaymentCount(e.target.value)
                              }
                            />
                          </div>
                        )}
                        <div className="col-md-3 mb-2">
                          <button
                            type="button"
                            className="btn btn-outline-primary mt-3 mt-md-0"
                            onClick={handleGenerateInstallments}
                          >
                            Generate Installments
                          </button>
                        </div>
                      </div>
                      <small className="text-muted">
                        Gross Premium{' '}
                        {Number(
                          currentPolicy.premium_amount || 0
                        ).toFixed(2)}{' '}
                        {currentPolicy.currency || 'IDR'} | Komisi Broker:{' '}
                        {currentPolicy.commission_gross || 0}% | To Source:{' '}
                        {currentPolicy.commission_to_source || 0}%
                      </small>
                    </fieldset>
                  )}

                  <fieldset className="border p-3 mb-3">
                    <legend className="w-auto px-2">
                      Installment Entries
                    </legend>
                    {installmentsDraft.length === 0 ? (
                      <div className="alert alert-info mb-0">
                        Belum ada installment.{' '}
                        {modalMode === 'create'
                          ? 'Pilih payment type lalu klik Generate.'
                          : 'Schedule ini belum punya installment detail.'}
                      </div>
                    ) : (
                      <>
                        <div className="table-responsive mb-2">
                          <table className="table table-sm table-bordered align-middle">
                            <thead>
                              <tr>
                                <th>Installment</th>
                                <th>Description</th>
                                <th>Due Date</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Paid Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {installmentsDraft.map((inst, iIdx) =>
                                (inst.entries || []).map(
                                  (entry, eIdx) => (
                                    <tr
                                      key={`${inst.installment}-${eIdx}`}
                                    >
                                      <td>{inst.installment}</td>
                                      <td>{entry.description}</td>
                                      <td>
                                        <input
                                          type="date"
                                          className="form-control form-control-sm"
                                          value={entry.due_date || ''}
                                          onChange={(e) =>
                                            updateEntryField(
                                              iIdx,
                                              eIdx,
                                              'due_date',
                                              e.target.value
                                            )
                                          }
                                        />
                                      </td>
                                      <td>
                                        <input
                                          type="number"
                                          step="0.01"
                                          className="form-control form-control-sm"
                                          value={entry.amount}
                                          onChange={(e) =>
                                            updateEntryField(
                                              iIdx,
                                              eIdx,
                                              'amount',
                                              e.target.value
                                            )
                                          }
                                        />
                                      </td>
                                      <td>
                                        <select
                                          className="form-select form-select-sm"
                                          value={
                                            entry.status || 'NOT_DUE'
                                          }
                                          onChange={(e) =>
                                            updateEntryField(
                                              iIdx,
                                              eIdx,
                                              'status',
                                              e.target.value
                                            )
                                          }
                                        >
                                          {ENTRY_STATUS_OPTIONS.map(
                                            (opt) => (
                                              <option
                                                key={opt.value}
                                                value={opt.value}
                                              >
                                                {opt.label}
                                              </option>
                                            )
                                          )}
                                        </select>
                                      </td>
                                      <td>
                                        <input
                                          type="date"
                                          className="form-control form-control-sm"
                                          value={entry.paid_date || ''}
                                          onChange={(e) =>
                                            updateEntryField(
                                              iIdx,
                                              eIdx,
                                              'paid_date',
                                              e.target.value
                                            )
                                          }
                                        />
                                      </td>
                                    </tr>
                                  )
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                        {normalizeBusinessType(
                          currentPolicy?.type_of_business
                        ) === 'DIRECT' && (
                          <div>
                            <strong>
                              Total Premium dari draft:{' '}
                              {computeTotalPremiumFromDraft().toFixed(
                                2
                              )}{' '}
                              {currentPolicy?.currency || 'IDR'}
                            </strong>
                          </div>
                        )}
                      </>
                    )}
                  </fieldset>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading
                      ? 'Saving...'
                      : modalMode === 'create'
                      ? '✅ Create Schedule'
                      : '✅ Save Changes'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary ms-2"
                    onClick={closeModal}
                  >
                    Cancel
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Finance;
