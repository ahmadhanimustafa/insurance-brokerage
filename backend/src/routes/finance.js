// backend/src/routes/finance.js
// Finance module - Database-backed schedules with installment-level entries
// Status codes: NOT_DUE, DUE, PARTIAL_PAID, PAID
// Descriptions: Premium (From Client), Premium to Insurer, Commission In, Commission to Source

const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { generateInvoiceNumber, getInvoiceType } = require('../utils/numbering');

// ===============================
// File Upload Setup
// ===============================

const uploadDir =
  process.env.FILE_UPLOAD_PATH || path.join(__dirname, '..', '..', 'uploads', 'receipts');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const entryId = req.params.entryId || 'unknown';
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname || '');
    cb(null, `receipt_${entryId}_${unique}${ext}`);
  },
});

const upload = multer({ storage });

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
        internal_invoice_number, external_invoice_number, internal_reference_number,
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
          SELECT id, description, due_date, amount, status, paid_date,
                 paid_amount, invoice_number, invoice_type,
                 receipt_file_name, receipt_file_url, receipt_uploaded_at
          FROM finance_entries
          WHERE installment_id = $1
          ORDER BY id
        `, [instRow.id]);

        installments.push({
          installment: instRow.installment_number,
          entries: entriesResult.rows.map(e => {
            const amount = Number(e.amount || 0);
            const paidAmount = Number(e.paid_amount || 0);
            const outstanding = amount - paidAmount;

            return {
              id: e.id,
              description: e.description,
              due_date: e.due_date ? e.due_date.toISOString().split('T')[0] : null,
              amount: amount,
              paid_amount: paidAmount,
              outstanding: outstanding,
              status: e.status,
              paid_date: e.paid_date ? e.paid_date.toISOString().split('T')[0] : null,
              invoice_number: e.invoice_number,
              invoice_type: e.invoice_type,
              receipt_file_name: e.receipt_file_name,
              receipt_file_url: e.receipt_file_url,
              receipt_uploaded_at: e.receipt_uploaded_at ? e.receipt_uploaded_at.toISOString() : null
            };
          })
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
        internal_reference_number: scheduleRow.internal_reference_number,
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
      external_invoice_number,
      internal_reference_number,
      effective_date // Policy effective date for invoice generation
    } = req.body;

    if (!policy_id) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'policy_id is required' }
      });
    }

    if (!effective_date) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'effective_date is required for invoice generation' }
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
        internal_reference_number,
        effective_date,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now(), now())
      RETURNING id, policy_id, client_id, insurance_id, source_business_id,
                currency, type_of_business, commission_gross, commission_to_source,
                internal_invoice_number, external_invoice_number, internal_reference_number, effective_date,
                created_at, updated_at
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
      null, // internal_invoice_number - will be set per entry
      external_invoice_number || null,
      internal_reference_number || null,
      effective_date
    ];

    const { rows } = await db.query(scheduleSql, scheduleParams);
    const schedule = rows[0];

    // Create installments and entries in database with invoice numbers
    const generatedInvoices = [];

    for (const inst of installments) {
      const instSql = `
        INSERT INTO finance_installments (schedule_id, installment_number)
        VALUES ($1, $2)
        RETURNING id
      `;
      const instResult = await db.query(instSql, [schedule.id, inst.installment]);
      const installmentId = instResult.rows[0].id;

      for (const entry of inst.entries) {
        // Generate invoice number for each entry
        const invoiceType = getInvoiceType(entry.description);
        const invoiceNumber = await generateInvoiceNumber({
          effectiveDate: effective_date,
          installmentNumber: inst.installment,
          invoiceType: invoiceType
        });

        generatedInvoices.push({
          description: entry.description,
          invoice_number: invoiceNumber,
          invoice_type: invoiceType
        });

        const entrySql = `
          INSERT INTO finance_entries (
            installment_id, description, due_date, amount, status, paid_date,
            paid_amount, invoice_number, invoice_type
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;
        await db.query(entrySql, [
          installmentId,
          entry.description,
          entry.due_date,
          entry.amount,
          entry.status,
          entry.paid_date,
          0, // paid_amount starts at 0
          invoiceNumber,
          invoiceType
        ]);
      }
    }

    const enriched = {
      ...schedule,
      installments,
      generated_invoices: generatedInvoices
    };

    res.status(201).json({
      success: true,
      data: enriched,
      message: `Finance schedule created with ${generatedInvoices.length} invoice(s) generated`
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
router.put('/schedules/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (!id) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'Invalid schedule ID' }
      });
    }

    // Check if schedule exists
    const scheduleCheck = await db.query(
      'SELECT id, type_of_business, effective_date FROM finance_schedules WHERE id = $1',
      [id]
    );

    if (scheduleCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Schedule not found' }
      });
    }

    const current = scheduleCheck.rows[0];

    const {
      currency,
      type_of_business,
      external_invoice_number,
      internal_reference_number,
      installments // optional updated installments
    } = req.body;

    const normalizedType =
      type_of_business != null
        ? normalizeBusinessType(type_of_business)
        : current.type_of_business;

    // Update schedule
    if (currency || type_of_business !== undefined || external_invoice_number !== undefined || internal_reference_number !== undefined) {
      const updateSql = `
        UPDATE finance_schedules
        SET
          currency = COALESCE($1, currency),
          type_of_business = COALESCE($2, type_of_business),
          external_invoice_number = COALESCE($3, external_invoice_number),
          internal_reference_number = COALESCE($4, internal_reference_number),
          updated_at = now()
        WHERE id = $5
      `;
      await db.query(updateSql, [
        currency || null,
        normalizedType,
        external_invoice_number !== undefined ? external_invoice_number : null,
        internal_reference_number !== undefined ? internal_reference_number : null,
        id
      ]);
    }

    // Update installments if provided
    if (installments !== undefined) {
      // Delete existing installments and entries
      await db.query(
        'DELETE FROM finance_installments WHERE schedule_id = $1',
        [id]
      );

      // Rebuild installments from body
      const rebuilt = buildInstallmentsFromBody(
        { installments },
        normalizedType
      );

      // Insert new installments and entries
      for (const inst of rebuilt) {
        const instSql = `
          INSERT INTO finance_installments (schedule_id, installment_number)
          VALUES ($1, $2)
          RETURNING id
        `;
        const instResult = await db.query(instSql, [id, inst.installment]);
        const installmentId = instResult.rows[0].id;

        for (const entry of inst.entries) {
          // Generate invoice number if not already present
          let invoiceNumber = entry.invoice_number;
          let invoiceType = entry.invoice_type || getInvoiceType(entry.description);

          if (!invoiceNumber) {
            invoiceNumber = await generateInvoiceNumber({
              effectiveDate: current.effective_date,
              installmentNumber: inst.installment,
              invoiceType: invoiceType
            });
          }

          const entrySql = `
            INSERT INTO finance_entries (
              installment_id, description, due_date, amount, status, paid_date,
              paid_amount, invoice_number, invoice_type
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `;
          await db.query(entrySql, [
            installmentId,
            entry.description,
            entry.due_date,
            entry.amount,
            entry.status || 'NOT_DUE',
            entry.paid_date || null,
            entry.paid_amount || 0,
            invoiceNumber,
            invoiceType
          ]);
        }
      }
    }

    // Reload updated schedule
    const updatedSchedule = await db.query(`
      SELECT
        id, policy_id, client_id, insurance_id, source_business_id,
        currency, type_of_business, commission_gross, commission_to_source,
        internal_invoice_number, external_invoice_number, internal_reference_number, effective_date,
        created_at, updated_at
      FROM finance_schedules
      WHERE id = $1
    `, [id]);

    // Load installments and entries
    const installmentsResult = await db.query(`
      SELECT id, installment_number
      FROM finance_installments
      WHERE schedule_id = $1
      ORDER BY installment_number
    `, [id]);

    const loadedInstallments = [];
    for (const instRow of installmentsResult.rows) {
      const entriesResult = await db.query(`
        SELECT id, description, due_date, amount, status, paid_date,
               paid_amount, invoice_number, invoice_type,
               receipt_file_name, receipt_file_url, receipt_uploaded_at
        FROM finance_entries
        WHERE installment_id = $1
        ORDER BY id
      `, [instRow.id]);

      loadedInstallments.push({
        installment: instRow.installment_number,
        entries: entriesResult.rows.map(e => {
          const amount = Number(e.amount || 0);
          const paidAmount = Number(e.paid_amount || 0);
          const outstanding = amount - paidAmount;

          return {
            id: e.id,
            description: e.description,
            due_date: e.due_date ? e.due_date.toISOString().split('T')[0] : null,
            amount: amount,
            paid_amount: paidAmount,
            outstanding: outstanding,
            status: e.status,
            paid_date: e.paid_date ? e.paid_date.toISOString().split('T')[0] : null,
            invoice_number: e.invoice_number,
            invoice_type: e.invoice_type,
            receipt_file_name: e.receipt_file_name,
            receipt_file_url: e.receipt_file_url,
            receipt_uploaded_at: e.receipt_uploaded_at ? e.receipt_uploaded_at.toISOString() : null
          };
        })
      });
    }

    const scheduleRow = updatedSchedule.rows[0];
    const fullSchedule = {
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
      internal_reference_number: scheduleRow.internal_reference_number,
      effective_date: scheduleRow.effective_date,
      installments: loadedInstallments,
      created_at: scheduleRow.created_at,
      updated_at: scheduleRow.updated_at
    };

    const enriched = computeSummary(fullSchedule);

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

// PUT update payment for an entry (partial payment)
router.put('/entries/:id/payment', async (req, res) => {
  try {
    const entryId = parseInt(req.params.id, 10);
    const { paid_amount, paid_date, status } = req.body;

    if (!entryId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'Entry ID is required' }
      });
    }

    // Get current entry data
    const currentEntry = await db.query(
      'SELECT id, amount, paid_amount FROM finance_entries WHERE id = $1',
      [entryId]
    );

    if (currentEntry.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Finance entry not found' }
      });
    }

    const entry = currentEntry.rows[0];
    const totalAmount = Number(entry.amount || 0);
    const newPaidAmount = Number(paid_amount || 0);

    // Validate paid amount
    if (newPaidAmount > totalAmount) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'Paid amount cannot exceed total amount' }
      });
    }

    // Determine status based on paid amount
    let finalStatus = status;
    if (!status) {
      if (newPaidAmount === 0) {
        finalStatus = 'NOT_DUE';
      } else if (newPaidAmount < totalAmount) {
        finalStatus = 'PARTIAL_PAID';
      } else if (newPaidAmount === totalAmount) {
        finalStatus = 'PAID';
      }
    }

    const updateSql = `
      UPDATE finance_entries
      SET paid_amount = $1,
          paid_date = $2,
          status = $3,
          updated_at = now()
      WHERE id = $4
      RETURNING id, description, amount, paid_amount, status, paid_date,
                invoice_number, invoice_type
    `;

    const { rows } = await db.query(updateSql, [
      newPaidAmount,
      paid_date || null,
      finalStatus,
      entryId
    ]);

    const updated = rows[0];
    const outstanding = Number(updated.amount) - Number(updated.paid_amount);

    res.json({
      success: true,
      data: {
        ...updated,
        amount: Number(updated.amount),
        paid_amount: Number(updated.paid_amount),
        outstanding: outstanding
      },
      message: 'Payment updated successfully'
    });
  } catch (err) {
    console.error('Error updating payment:', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: err.message || 'Failed to update payment'
      }
    });
  }
});

// POST upload receipt for an entry
router.post('/entries/:id/receipt', upload.single('receipt'), async (req, res) => {
  try {
    const entryId = parseInt(req.params.id, 10);

    if (!entryId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'Entry ID is required' }
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'Receipt file is required' }
      });
    }

    // Check if entry exists
    const entryCheck = await db.query(
      'SELECT id FROM finance_entries WHERE id = $1',
      [entryId]
    );

    if (entryCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Finance entry not found' }
      });
    }

    const file = req.file;
    const updateSql = `
      UPDATE finance_entries
      SET receipt_file_name = $1,
          receipt_file_url = $2,
          receipt_uploaded_at = now()
      WHERE id = $3
      RETURNING id, description, invoice_number, receipt_file_name,
                receipt_file_url, receipt_uploaded_at
    `;

    const { rows } = await db.query(updateSql, [
      file.filename,
      `/uploads/receipts/${file.filename}`,
      entryId
    ]);

    res.json({
      success: true,
      data: rows[0],
      message: 'Receipt uploaded successfully'
    });
  } catch (err) {
    console.error('Error uploading receipt:', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: err.message || 'Failed to upload receipt'
      }
    });
  }
});

// DELETE receipt for an entry
router.delete('/entries/:id/receipt', async (req, res) => {
  try {
    const entryId = parseInt(req.params.id, 10);

    if (!entryId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'Entry ID is required' }
      });
    }

    // Get current receipt file
    const entryResult = await db.query(
      'SELECT receipt_file_name FROM finance_entries WHERE id = $1',
      [entryId]
    );

    if (entryResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Finance entry not found' }
      });
    }

    const fileName = entryResult.rows[0].receipt_file_name;

    // Delete file from disk if exists
    if (fileName) {
      const filePath = path.join(uploadDir, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Clear receipt fields in database
    const updateSql = `
      UPDATE finance_entries
      SET receipt_file_name = NULL,
          receipt_file_url = NULL,
          receipt_uploaded_at = NULL
      WHERE id = $1
    `;

    await db.query(updateSql, [entryId]);

    res.json({
      success: true,
      message: 'Receipt deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting receipt:', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: err.message || 'Failed to delete receipt'
      }
    });
  }
});

module.exports = router;
