// backend/src/routes/finance.js
// Finance module - in-memory schedules with installment-level entries
// Status codes: NOT_DUE, DUE, PARTIAL_PAID, PAID
// Descriptions: Premium (From Client), Premium to Insurer, Commission In, Commission to Source

const express = require('express');
const router = express.Router();

// ===============================
// In-memory storage
// ===============================

let schedules = [];
let nextScheduleId = 1;

// ===============================
// Constants & helpers
// ===============================

const VALID_DESCRIPTIONS = [
  'Premium (From Client)',
  'Premium to Insurer',
  'Commission In',
  'Commission to Source'
];

const VALID_STATUSES = ['NOT_DUE', 'DUE', 'PARTIAL_PAID', 'PAID'];

function normalizeStatus(status) {
  if (!status) return 'NOT_DUE';
  const upper = String(status).toUpperCase();
  if (VALID_STATUSES.includes(upper)) return upper;
  return 'NOT_DUE';
}

function normalizeBusinessType(typeOfBusiness) {
  if (!typeOfBusiness) return 'DIRECT';
  const val = String(typeOfBusiness).toLowerCase().trim();
  if (val === 'non direct' || val === 'non_direct' || val === 'non-direct') {
    return 'NON_DIRECT';
  }
  return 'DIRECT';
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function compareDateStr(a, b) {
  // date string in YYYY-MM-DD
  if (!a) return 1;
  if (!b) return -1;
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

// Build sanitized installments from request body.
// Expect body.installments in shape:
// [ { installment, entries: [ { description, due_date, amount, status, paid_date }, ... ] }, ... ]
function buildInstallmentsFromBody(body, typeOfBusiness) {
  const installmentsRaw = Array.isArray(body.installments) ? body.installments : [];
  const normalizedType = normalizeBusinessType(typeOfBusiness);

  // If no installments passed, we just return empty array.
  if (!installmentsRaw.length) {
    return [];
  }

  // For NON_DIRECT, we ignore Premium entries if frontend accidentally sends them.
  const isNonDirect = normalizedType === 'NON_DIRECT';

  const sanitized = installmentsRaw.map((instRaw, idx) => {
    const installmentNumber =
      instRaw.installment != null ? Number(instRaw.installment) : idx + 1;

    const entriesRaw = Array.isArray(instRaw.entries) ? instRaw.entries : [];

    // Filter & sanitize entries
    const entries = entriesRaw
      .map((entry) => {
        const desc = String(entry.description || '').trim();

        // Enforce description set:
        if (!VALID_DESCRIPTIONS.includes(desc)) {
          return null;
        }

        // For NON_DIRECT, keep only Commission In & Commission to Source
        if (
          isNonDirect &&
          (desc === 'Premium (From Client)' || desc === 'Premium to Insurer')
        ) {
          return null;
        }

        const amountNum = Number(entry.amount || 0);

        return {
          description: desc,
          due_date: entry.due_date || null, // YYYY-MM-DD
          amount: isNaN(amountNum) ? 0 : amountNum,
          status: normalizeStatus(entry.status),
          paid_date: entry.paid_date || null
        };
      })
      .filter(Boolean);

    return {
      installment: installmentNumber,
      entries
    };
  });

  return sanitized;
}

// Compute summary metrics from installments.
// We do NOT mutate original schedule; we return a new object with .summary injected.
function computeSummary(schedule) {
  const installments = Array.isArray(schedule.installments)
    ? schedule.installments
    : [];

  let premiumTotal = 0;
  let premiumReceived = 0;

  let premiumToInsurerTotal = 0;
  let premiumToInsurerPaid = 0;

  let commInTotal = 0;
  let commInReceived = 0;

  let commToSourceTotal = 0;
  let commToSourcePaid = 0;

  let nextDueDate = null;
  let insurerNextDueDate = null;

  const today = todayISO();

  for (const inst of installments) {
    const entries = Array.isArray(inst.entries) ? inst.entries : [];
    for (const entry of entries) {
      const desc = entry.description;
      const amount = Number(entry.amount || 0);
      const status = normalizeStatus(entry.status);
      const dueDate = entry.due_date || null;

      // Aggregate amounts by description
      switch (desc) {
        case 'Premium (From Client)':
          premiumTotal += amount;
          if (status === 'PAID') {
            premiumReceived += amount;
          }
          break;
        case 'Premium to Insurer':
          premiumToInsurerTotal += amount;
          if (status === 'PAID') {
            premiumToInsurerPaid += amount;
          }
          break;
        case 'Commission In':
          commInTotal += amount;
          if (status === 'PAID') {
            commInReceived += amount;
          }
          break;
        case 'Commission to Source':
          commToSourceTotal += amount;
          if (status === 'PAID') {
            commToSourcePaid += amount;
          }
          break;
        default:
          break;
      }

      // Next due date (any entry)
      if (dueDate && status !== 'PAID') {
        if (!nextDueDate || compareDateStr(dueDate, nextDueDate) < 0) {
          nextDueDate = dueDate;
        }
      }

      // Next insurer due date (only Premium to Insurer)
      if (desc === 'Premium to Insurer' && dueDate && status !== 'PAID') {
        if (
          !insurerNextDueDate ||
          compareDateStr(dueDate, insurerNextDueDate) < 0
        ) {
          insurerNextDueDate = dueDate;
        }
      }

      // Auto mark DUE if overdue but still NOT_DUE logically (for reporting),
      // but we don't mutate stored status here. Frontend can use summary dates
      // to highlight overdue entries if needed.
      if (dueDate && compareDateStr(dueDate, today) < 0 && status === 'NOT_DUE') {
        // we don't change entry.status, just note that nextDueDate is in the past
        // Actual visual 'overdue' can be determined by frontend via dueDate < today.
      }
    }
  }

  const premiumOutstanding = premiumTotal - premiumReceived;
  const premiumToInsurerOutstanding =
    premiumToInsurerTotal - premiumToInsurerPaid;

  const commInOutstanding = commInTotal - commInReceived;
  const commToSourceOutstanding = commToSourceTotal - commToSourcePaid;

  return {
    ...schedule,
    summary: {
      premium_total: premiumTotal,
      premium_received: premiumReceived,
      premium_outstanding: premiumOutstanding,

      premium_to_insurer_total: premiumToInsurerTotal,
      premium_to_insurer_paid: premiumToInsurerPaid,
      premium_to_insurer_outstanding: premiumToInsurerOutstanding,

      commission_in_total: commInTotal,
      commission_in_received: commInReceived,
      commission_in_outstanding: commInOutstanding,

      commission_to_source_total: commToSourceTotal,
      commission_to_source_paid: commToSourcePaid,
      commission_to_source_outstanding: commToSourceOutstanding,

      next_due_date: nextDueDate,
      insurer_next_due_date: insurerNextDueDate
    }
  };
}

// ===============================
// Routes
// ===============================

// GET all schedules (with summary)
router.get('/schedules', (req, res) => {
  const enriched = schedules.map((s) => computeSummary(s));
  res.json({
    success: true,
    data: enriched
  });
});

// POST create schedule
router.post('/schedules', (req, res) => {
  try {
    const {
      policy_id,
      client_id,
      insurance_id,
      source_business_id,
      currency,
      type_of_business, // "Direct" / "Non Direct" from frontend
      commission_gross,
      commission_to_source
    } = req.body;

    if (!policy_id) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'policy_id is required' }
      });
    }

    // Optional: Prevent duplicate schedule for same policy
    const existing = schedules.find((s) => s.policy_id === policy_id);
    if (existing) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'DUPLICATE',
          message: 'Finance schedule already exists for this policy'
        }
      });
    }

    const normalizedType = normalizeBusinessType(type_of_business);
    const installments = buildInstallmentsFromBody(
      req.body,
      normalizedType
    );

    const now = new Date();

    const schedule = {
      id: nextScheduleId++,
      policy_id,
      client_id: client_id || null,
      insurance_id: insurance_id || null,
      source_business_id: source_business_id || null,
      currency: currency || 'IDR',

      type_of_business: normalizedType, // DIRECT / NON_DIRECT

      commission_gross: commission_gross != null ? Number(commission_gross) : null,
      commission_to_source:
        commission_to_source != null ? Number(commission_to_source) : null,

      installments,

      created_at: now,
      updated_at: now
    };

    schedules.push(schedule);

    const enriched = computeSummary(schedule);

    res.status(201).json({
      success: true,
      data: enriched
    });
  } catch (err) {
    console.error('Error creating finance schedule:', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: err.message || 'Failed to create finance schedule'
      }
    });
  }
});

// PUT update schedule (including installments)
router.put('/schedules/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const idx = schedules.findIndex((s) => s.id === id);

    if (idx === -1) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Schedule not found' }
      });
    }

    const current = schedules[idx];

    const {
      currency,
      type_of_business,
      installments // optional updated installments
    } = req.body;

    const normalizedType =
      type_of_business != null
        ? normalizeBusinessType(type_of_business)
        : current.type_of_business;

    let updated = {
      ...current,
      currency: currency || current.currency,
      type_of_business: normalizedType,
      updated_at: new Date()
    };

    if (installments !== undefined) {
      const rebuilt = buildInstallmentsFromBody(
        { installments },
        normalizedType
      );
      updated.installments = rebuilt;
    }

    schedules[idx] = updated;

    const enriched = computeSummary(updated);

    res.json({
      success: true,
      data: enriched
    });
  } catch (err) {
    console.error('Error updating finance schedule:', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: err.message || 'Failed to update finance schedule'
      }
    });
  }
});

module.exports = router;
