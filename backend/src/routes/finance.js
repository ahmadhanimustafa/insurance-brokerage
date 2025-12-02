// backend/src/routes/finance.js
// Finance module - Database-backed schedules with installment-level entries
// Status codes: NOT_DUE, DUE, PARTIAL_PAID, PAID
// Descriptions: Premium (From Client), Premium to Insurer, Commission In, Commission to Source

const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const { generateInvoiceNumber } = require('../utils/numbering');

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
router.get('/schedules', async (req, res) => {
  try {
    // Get all schedules from database
    const schedulesResult = await db.query(`
      SELECT
        id, policy_id, client_id, insurance_id, source_business_id,
        currency, type_of_business, commission_gross, commission_to_source,
        internal_invoice_number, external_invoice_number,
        created_at, updated_at
      FROM finance_schedules
      ORDER BY id DESC
    `);

    const schedules = [];

    // For each schedule, load its installments and entries
    for (const scheduleRow of schedulesResult.rows) {
      const installmentsResult = await db.query(`
        SELECT id, installment_number
        FROM finance_installments
        WHERE schedule_id = $1
        ORDER BY installment_number
      `, [scheduleRow.id]);

      const installments = [];

      for (const instRow of installmentsResult.rows) {
        const entriesResult = await db.query(`
          SELECT id, description, due_date, amount, status, paid_date
          FROM finance_entries
          WHERE installment_id = $1
          ORDER BY id
        `, [instRow.id]);

        installments.push({
          installment: instRow.installment_number,
          entries: entriesResult.rows.map(e => ({
            description: e.description,
            due_date: e.due_date ? e.due_date.toISOString().split('T')[0] : null,
            amount: Number(e.amount || 0),
            status: e.status,
            paid_date: e.paid_date ? e.paid_date.toISOString().split('T')[0] : null
          }))
        });
      }

      schedules.push({
        id: scheduleRow.id,
        policy_id: scheduleRow.policy_id,
        client_id: scheduleRow.client_id,
        insurance_id: scheduleRow.insurance_id,
        source_business_id: scheduleRow.source_business_id,
        currency: scheduleRow.currency,
        type_of_business: scheduleRow.type_of_business,
        commission_gross: scheduleRow.commission_gross ? Number(scheduleRow.commission_gross) : null,
        commission_to_source: scheduleRow.commission_to_source ? Number(scheduleRow.commission_to_source) : null,
        internal_invoice_number: scheduleRow.internal_invoice_number,
        external_invoice_number: scheduleRow.external_invoice_number,
        installments,
        created_at: scheduleRow.created_at,
        updated_at: scheduleRow.updated_at
      });
    }

    const enriched = schedules.map((s) => computeSummary(s));
    res.json({
      success: true,
      data: enriched
    });
  } catch (err) {
    console.error('Error loading finance schedules:', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: err.message || 'Failed to load finance schedules'
      }
    });
  }
});

// POST create schedule
router.post('/schedules', async (req, res) => {
  try {
    const {
      policy_id,
      client_id,
      insurance_id,
      source_business_id,
      currency,
      type_of_business, // "Direct" / "Non Direct" from frontend
      commission_gross,
      commission_to_source,
      external_invoice_number
    } = req.body;

    if (!policy_id) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'policy_id is required' }
      });
    }

    // Optional: Prevent duplicate schedule for same policy
    const existingCheck = await db.query(
      'SELECT id FROM finance_schedules WHERE policy_id = $1',
      [policy_id]
    );
    if (existingCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'DUPLICATE',
          message: 'Finance schedule already exists for this policy'
        }
      });
    }

    // Generate internal invoice number
    const internalInvoiceNumber = await generateInvoiceNumber({ createdDate: new Date() });

    const normalizedType = normalizeBusinessType(type_of_business);
    const installments = buildInstallmentsFromBody(
      req.body,
      normalizedType
    );

    // Create finance schedule in database
    const scheduleSql = `
      INSERT INTO finance_schedules (
        policy_id,
        client_id,
        insurance_id,
        source_business_id,
        currency,
        type_of_business,
        commission_gross,
        commission_to_source,
        internal_invoice_number,
        external_invoice_number,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now())
      RETURNING id, policy_id, client_id, insurance_id, source_business_id,
                currency, type_of_business, commission_gross, commission_to_source,
                internal_invoice_number, external_invoice_number, created_at, updated_at
    `;

    const scheduleParams = [
      policy_id,
      client_id || null,
      insurance_id || null,
      source_business_id || null,
      currency || 'IDR',
      normalizedType,
      commission_gross != null ? Number(commission_gross) : null,
      commission_to_source != null ? Number(commission_to_source) : null,
      internalInvoiceNumber,
      external_invoice_number || null
    ];

    const { rows } = await db.query(scheduleSql, scheduleParams);
    const schedule = rows[0];

    // Create installments and entries in database
    for (const inst of installments) {
      const instSql = `
        INSERT INTO finance_installments (schedule_id, installment_number)
        VALUES ($1, $2)
        RETURNING id
      `;
      const instResult = await db.query(instSql, [schedule.id, inst.installment]);
      const installmentId = instResult.rows[0].id;

      for (const entry of inst.entries) {
        const entrySql = `
          INSERT INTO finance_entries (
            installment_id, description, due_date, amount, status, paid_date
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `;
        await db.query(entrySql, [
          installmentId,
          entry.description,
          entry.due_date,
          entry.amount,
          entry.status,
          entry.paid_date
        ]);
      }
    }

    const enriched = {
      ...schedule,
      installments
    };

    res.status(201).json({
      success: true,
      data: enriched,
      message: `Finance schedule created with invoice number: ${internalInvoiceNumber}`
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
