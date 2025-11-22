import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

const ENTRY_TYPES = [
  { value: 'ALL', label: 'All Entry Types' },
  { value: 'PREMIUM_CLIENT', label: 'Premium (From Client)' },
  { value: 'PREMIUM_INSURER', label: 'Premium to Insurer' },
  { value: 'COMM_IN', label: 'Commission In' },
  { value: 'COMM_SOURCE', label: 'Commission to Source' }
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Status' },
  { value: 'NOT_DUE', label: 'Not Due' },
  { value: 'DUE', label: 'Due' },
  { value: 'PARTIAL_PAID', label: 'Partial Paid' },
  { value: 'PAID', label: 'Paid' }
];

const DESCRIPTION_OPTIONS = [
  'Premium (From Client)',
  'Premium to Insurer',
  'Commission In',
  'Commission to Source'
];

function mapDescriptionToEntryType(desc) {
  switch (desc) {
    case 'Premium (From Client)':
      return 'PREMIUM_CLIENT';
    case 'Premium to Insurer':
      return 'PREMIUM_INSURER';
    case 'Commission In':
      return 'COMM_IN';
    case 'Commission to Source':
      return 'COMM_SOURCE';
    default:
      return 'OTHER';
  }
}

function computeEntryAging(dueDateStr) {
  if (!dueDateStr) return null;
  const today = new Date();
  const dueDate = new Date(dueDateStr);
  const diffMs = today.setHours(0, 0, 0, 0) - dueDate.setHours(0, 0, 0, 0);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
}

function formatCurrency(amount, currency = 'IDR') {
  if (amount === null || amount === undefined || isNaN(amount)) return '-';
  try {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: currency || 'IDR',
      maximumFractionDigits: 0
    }).format(amount);
  } catch {
    return `${currency} ${Number(amount).toLocaleString('id-ID')}`;
  }
}

function Finance() {
  const [activeTab, setActiveTab] = useState('inbox'); // inbox | schedules | entries
  const [loading, setLoading] = useState(false);
  const [schedules, setSchedules] = useState([]);

  const [entryTypeFilter, setEntryTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [descriptionFilter, setDescriptionFilter] = useState('ALL');
  const [searchText, setSearchText] = useState('');
  const [sortKey, setSortKey] = useState('due_date');
  const [sortDir, setSortDir] = useState('asc');

  const [error, setError] = useState(null);

  useEffect(() => {
    loadSchedules();
  }, []);

  async function loadSchedules() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/finance/schedules');
      const data = res.data?.data || [];
      const normalized = data.map((s) => ({
        ...s,
        installments: (s.installments || []).map((inst) => ({
          installment: inst.installment,
          entries: (inst.entries || []).map((e) => ({
            ...e,
            amount: Number(e.amount || 0),
            aging_days:
              e.due_date && e.status !== 'PAID'
                ? computeEntryAging(e.due_date)
                : null
          }))
        }))
      }));
      setSchedules(normalized);
    } catch (err) {
      console.error('Error load schedules', err);
      setError('Gagal load data finance');
    } finally {
      setLoading(false);
    }
  }

  const inboxItems = useMemo(() => {
    return (schedules || []).filter((s) => !s.summary || !s.summary.premium_total);
  }, [schedules]);

  const scheduleCards = useMemo(() => {
    return (schedules || []).filter((s) => s.summary && s.summary.premium_total >= 0);
  }, [schedules]);

  const entryRows = useMemo(() => {
    const rows = [];
    for (const s of schedules || []) {
      for (const inst of s.installments || []) {
        for (const entry of inst.entries || []) {
          const type = mapDescriptionToEntryType(entry.description);
          let status = entry.status || 'NOT_DUE';
          if (status !== 'PAID' && status !== 'PARTIAL_PAID') {
            if (entry.due_date) {
              const aging = computeEntryAging(entry.due_date);
              if (aging !== null && aging > 0) {
                status = 'DUE';
              }
            }
          }
          rows.push({
            schedule_id: s.id,
            policy_id: s.policy_id,
            policy_number: s.policy_number,
            transaction_number: s.transaction_number,
            currency: s.currency || 'IDR',
            installment: inst.installment,
            description: entry.description,
            type,
            status,
            due_date: entry.due_date,
            paid_date: entry.paid_date,
            amount: Number(entry.amount || 0),
            aging_days:
              entry.due_date && status !== 'PAID'
                ? computeEntryAging(entry.due_date)
                : null
          });
        }
      }
    }
    return rows;
  }, [schedules]);

  const filteredEntryRows = useMemo(() => {
    let rows = [...entryRows];

    if (entryTypeFilter !== 'ALL') {
      rows = rows.filter((r) => r.type === entryTypeFilter);
    }
    if (statusFilter !== 'ALL') {
      rows = rows.filter((r) => r.status === statusFilter);
    }
    if (descriptionFilter !== 'ALL') {
      rows = rows.filter((r) => r.description === descriptionFilter);
    }
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          String(r.policy_number || '').toLowerCase().includes(q) ||
          String(r.transaction_number || '').toLowerCase().includes(q)
      );
    }

    rows.sort((a, b) => {
      let va = a[sortKey];
      let vb = b[sortKey];

      if (sortKey === 'due_date' || sortKey === 'paid_date') {
        va = va || '';
        vb = vb || '';
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ? 1 : -1;
        return 0;
      }

      if (sortKey === 'amount') {
        return sortDir === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      }

      const sa = String(va || '').toLowerCase();
      const sb = String(vb || '').toLowerCase();
      if (sa < sb) return sortDir === 'asc' ? -1 : 1;
      if (sa > sb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return rows;
  }, [entryRows, entryTypeFilter, statusFilter, descriptionFilter, searchText, sortKey, sortDir]);

  const agingSummary = useMemo(() => {
    const buckets = {
      not_due: 0,
      '0_30': 0,
      '31_60': 0,
      '61_90': 0,
      '90_plus': 0
    };

    for (const row of entryRows) {
      if (!row.due_date || row.status === 'PAID') continue;
      const aging = computeEntryAging(row.due_date);
      if (aging === null || aging <= 0) {
        buckets.not_due += row.amount;
      } else if (aging <= 30) {
        buckets['0_30'] += row.amount;
      } else if (aging <= 60) {
        buckets['31_60'] += row.amount;
      } else if (aging <= 90) {
        buckets['61_90'] += row.amount;
      } else {
        buckets['90_plus'] += row.amount;
      }
    }
    return buckets;
  }, [entryRows]);

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const totalPremiumOutstanding = useMemo(() => {
    return scheduleCards.reduce(
      (acc, s) => acc + (s.summary?.premium_outstanding || 0),
      0
    );
  }, [scheduleCards]);

  const totalCommInOutstanding = useMemo(() => {
    return scheduleCards.reduce(
      (acc, s) => acc + (s.summary?.commission_in_outstanding || 0),
      0
    );
  }, [scheduleCards]);

  const totalCommSourceOutstanding = useMemo(() => {
    return scheduleCards.reduce(
      (acc, s) => acc + (s.summary?.commission_to_source_outstanding || 0),
      0
    );
  }, [scheduleCards]);

  return (
    <Layout title="Finance Management">
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'inbox' ? 'active' : ''}`}
            onClick={() => setActiveTab('inbox')}
          >
            📥 Inbox (From Placement)
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'schedules' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedules')}
          >
            📊 Finance Schedules (Per Policy)
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'entries' ? 'active' : ''}`}
            onClick={() => setActiveTab('entries')}
          >
            📅 Payment Schedule (Installment Level)
          </button>
        </li>
      </ul>

      {loading && (
        <div className="text-center my-3">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {!loading && activeTab === 'schedules' && (
        <>
          <div className="row g-3 mb-3">
            <div className="col-md-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <h6 className="text-secondary mb-1">Total Premium Outstanding</h6>
                  <h4 className="mb-0">
                    {formatCurrency(totalPremiumOutstanding, 'IDR')}
                  </h4>
                  <small className="text-muted">
                    Akumulasi semua installment premium yang belum dibayar client.
                  </small>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <h6 className="text-secondary mb-1">Commission In Outstanding</h6>
                  <h4 className="mb-0">
                    {formatCurrency(totalCommInOutstanding, 'IDR')}
                  </h4>
                  <small className="text-muted">
                    Komisi yang masih harus diterima dari insurer.
                  </small>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <h6 className="text-secondary mb-1">Commission to Source Outstanding</h6>
                  <h4 className="mb-0">
                    {formatCurrency(totalCommSourceOutstanding, 'IDR')}
                  </h4>
                  <small className="text-muted">
                    Komisi yang masih harus dibayarkan ke source of business.
                  </small>
                </div>
              </div>
            </div>
          </div>

          {scheduleCards.length === 0 && (
            <p className="text-muted">Belum ada schedule finance yang tersimpan.</p>
          )}

          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead className="table-light">
                <tr>
                  <th>Policy</th>
                  <th>Premium</th>
                  <th>Premium Outstanding</th>
                  <th>Comm In</th>
                  <th>Comm In Outstanding</th>
                  <th>Comm to Source</th>
                  <th>Comm Source Outstanding</th>
                  <th>Next Due Date</th>
                </tr>
              </thead>
              <tbody>
                {scheduleCards.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="fw-semibold">
                        {s.policy_number || '(No policy number)'}
                      </div>
                      <div className="text-muted small">
                        {s.transaction_number || 'No transaction number'}
                      </div>
                    </td>
                    <td>{formatCurrency(s.summary?.premium_total || 0, s.currency)}</td>
                    <td className="text-danger">
                      {formatCurrency(s.summary?.premium_outstanding || 0, s.currency)}
                    </td>
                    <td>{formatCurrency(s.summary?.commission_in_total || 0, s.currency)}</td>
                    <td className="text-danger">
                      {formatCurrency(s.summary?.commission_in_outstanding || 0, s.currency)}
                    </td>
                    <td>
                      {formatCurrency(
                        s.summary?.commission_to_source_total || 0,
                        s.currency
                      )}
                    </td>
                    <td className="text-danger">
                      {formatCurrency(
                        s.summary?.commission_to_source_outstanding || 0,
                        s.currency
                      )}
                    </td>
                    <td>
                      <span className="badge bg-outline-primary border border-primary text-dark">
                        {s.summary?.next_due_date || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading && activeTab === 'entries' && (
        <>
          <div className="row g-2 mb-3">
            <div className="col-md-2">
              <select
                className="form-select form-select-sm"
                value={entryTypeFilter}
                onChange={(e) => setEntryTypeFilter(e.target.value)}
              >
                {ENTRY_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <select
                className="form-select form-select-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <select
                className="form-select form-select-sm"
                value={descriptionFilter}
                onChange={(e) => setDescriptionFilter(e.target.value)}
              >
                <option value="ALL">All Description</option>
                {DESCRIPTION_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <input
                className="form-control form-control-sm"
                placeholder="Search policy / transaction..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-12">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <h6 className="text-secondary mb-2">Aging Summary (All Unpaid)</h6>
                  <div className="row g-3">
                    <div className="col-md-2">
                      <div className="border rounded p-2 finance-aging-box">
                        <div className="small text-muted">Not Due / ≤ 0 hari</div>
                        <div className="fw-semibold">
                          {formatCurrency(agingSummary.not_due, 'IDR')}
                        </div>
                      </div>
                    </div>
                    <div className="col-md-2">
                     <div className="border rounded p-2 finance-aging-box">
                        <div className="small text-muted">1–30 hari</div>
                        <div className="fw-semibold">
                          {formatCurrency(agingSummary['0_30'], 'IDR')}
                        </div>
                      </div>
                    </div>
                    <div className="col-md-2">
                      <div className="border rounded p-2 finance-aging-box">
                        <div className="small text-muted">31–60 hari</div>
                        <div className="fw-semibold">
                          {formatCurrency(agingSummary['31_60'], 'IDR')}
                        </div>
                      </div>
                    </div>
                    <div className="col-md-2">
                      <div className="border rounded p-2 finance-aging-box">
                        <div className="small text-muted">61–90 hari</div>
                        <div className="fw-semibold">
                          {formatCurrency(agingSummary['61_90'], 'IDR')}
                        </div>
                      </div>
                    </div>
                    <div className="col-md-2">
                      <div className="border rounded p-2 finance-aging-box">
                        <div className="small text-muted">&gt; 90 hari</div>
                        <div className="fw-semibold">
                          {formatCurrency(agingSummary['90_plus'], 'IDR')}
                        </div>
                      </div>
                    </div>
                  </div>
                  <small className="text-muted d-block mt-2">
                    Hanya menghitung entry yang belum berstatus PAID.
                  </small>
                </div>
              </div>
            </div>
          </div>

          {filteredEntryRows.length === 0 && (
            <p className="text-muted">Tidak ada payment entry sesuai filter.</p>
          )}

          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead className="table-light">
                <tr>
                  <th onClick={() => handleSort('policy_number')} style={{ cursor: 'pointer' }}>
                    Policy
                  </th>
                  <th>Installment</th>
                  <th>Description</th>
                  <th onClick={() => handleSort('due_date')} style={{ cursor: 'pointer' }}>
                    Due Date
                  </th>
                  <th onClick={() => handleSort('paid_date')} style={{ cursor: 'pointer' }}>
                    Paid Date
                  </th>
                  <th onClick={() => handleSort('amount')} style={{ cursor: 'pointer' }}>
                    Amount
                  </th>
                  <th>Status</th>
                  <th>Aging (days)</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntryRows.map((row, idx) => (
                  <tr key={idx}>
                    <td>
                      <div className="fw-semibold">{row.policy_number || '-'}</div>
                      <div className="small text-muted">{row.transaction_number || '-'}</div>
                    </td>
                    <td>{row.installment}</td>
                    <td>{row.description}</td>
                    <td>{row.due_date || '-'}</td>
                    <td>{row.paid_date || '-'}</td>
                    <td>{formatCurrency(row.amount, row.currency)}</td>
                    <td>
                      <span
                        className={
                          row.status === 'PAID'
                            ? 'badge bg-success'
                            : row.status === 'PARTIAL_PAID'
                            ? 'badge bg-warning text-dark'
                            : row.status === 'DUE'
                            ? 'badge bg-danger'
                            : 'badge bg-secondary'
                        }
                      >
                        {row.status}
                      </span>
                    </td>
                    <td>{row.aging_days !== null ? row.aging_days : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading && activeTab === 'inbox' && (
        <p className="text-muted">
          Inbox akan menampilkan policy yang dikirim dari Placement dan belum dibuat schedule-nya.
          Untuk saat ini, fokus utama ada di tab Finance Schedules & Payment Schedule.
        </p>
      )}
    </Layout>
  );
}

export default Finance;
