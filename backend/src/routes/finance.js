const express = require('express');
const router = express.Router();
const db = require('../utils/db');

function normalizeBusinessType(type) {
  if (!type) return 'DIRECT';
  const v = String(type).toLowerCase().trim();
  if (v === 'non direct' || v === 'non_direct' || v === 'non-direct') {
    return 'NON_DIRECT';
  }
  return 'DIRECT';
}

function buildSummary(installments) {
  const summary = {
    premium_total: 0,
    premium_received: 0,
    premium_outstanding: 0,

    premium_to_insurer_total: 0,
    premium_to_insurer_paid: 0,
    premium_to_insurer_outstanding: 0,

    commission_in_total: 0,
    commission_in_received: 0,
    commission_in_outstanding: 0,

    commission_to_source_total: 0,
    commission_to_source_paid: 0,
    commission_to_source_outstanding: 0,

    next_due_date: null,
    insurer_next_due_date: null
  };

  const today = new Date().toISOString().slice(0, 10);

  for (const inst of installments) {
    for (const entry of inst.entries || []) {
      const desc = entry.description;
      const amt = Number(entry.amount || 0);
      const status = entry.status || 'NOT_DUE';
      const due = entry.due_date;

      let isPaid =
        status === 'PAID'; // PARTIAL_PAID kita treat masih ada outstanding

      if (desc === 'Premium (From Client)') {
        summary.premium_total += amt;
        if (isPaid) summary.premium_received += amt;
      } else if (desc === 'Premium to Insurer') {
        summary.premium_to_insurer_total += amt;
        if (isPaid) summary.premium_to_insurer_paid += amt;
      } else if (desc === 'Commission In') {
        summary.commission_in_total += amt;
        if (isPaid) summary.commission_in_received += amt;
      } else if (desc === 'Commission to Source') {
        summary.commission_to_source_total += amt;
        if (isPaid) summary.commission_to_source_paid += amt;
      }

      if (due && !isPaid) {
        if (!summary.next_due_date || due < summary.next_due_date) {
          summary.next_due_date = due;
        }
        if (desc === 'Premium to Insurer') {
          if (
            !summary.insurer_next_due_date ||
            due < summary.insurer_next_due_date
          ) {
            summary.insurer_next_due_date = due;
          }
        }
      }
    }
  }

  summary.premium_outstanding =
    summary.premium_total - summary.premium_received;
  summary.premium_to_insurer_outstanding =
    summary.premium_to_insurer_total - summary.premium_to_insurer_paid;
  summary.commission_in_outstanding =
    summary.commission_in_total - summary.commission_in_received;
  summary.commission_to_source_outstanding =
    summary.commission_to_source_total - summary.commission_to_source_paid;

  return summary;
}

async function loadSchedulesWithChildren() {
  const schedRes = await db.query(
    `SELECT fs.*,
            p.transaction_number,
            p.policy_number,
            p.placing_number,
            p.quotation_number,
            p.type_of_business,
            p.currency AS policy_currency
     FROM finance_schedules fs
     JOIN policies p ON p.id = fs.policy_id
     ORDER BY fs.created_at DESC`,
    []
  );

  const scheduleIds = schedRes.rows.map((r) => r.id);
  if (!scheduleIds.length) return [];

  const instRes = await db.query(
    `SELECT fi.*
     FROM finance_installments fi
     WHERE fi.schedule_id = ANY($1::int[])
     ORDER BY fi.schedule_id, fi.installment_number`,
    [scheduleIds]
  );

  const instIds = instRes.rows.map((r) => r.id);
  let entriesRes = { rows: [] };
  if (instIds.length) {
    entriesRes = await db.query(
      `SELECT fe.*
       FROM finance_entries fe
       WHERE fe.installment_id = ANY($1::int[])
       ORDER BY fe.installment_id, fe.id`,
      [instIds]
    );
  }

  const instBySchedule = {};
  for (const inst of instRes.rows) {
    if (!instBySchedule[inst.schedule_id]) {
      instBySchedule[inst.schedule_id] = [];
    }
    instBySchedule[inst.schedule_id].push({
      installment: inst.installment_number,
      installment_id: inst.id,
      entries: []
    });
  }

  const entriesByInstallment = {};
  for (const e of entriesRes.rows) {
    if (!entriesByInstallment[e.installment_id]) {
      entriesByInstallment[e.installment_id] = [];
    }
    entriesByInstallment[e.installment_id].push({
      description: e.description,
      due_date: e.due_date ? e.due_date.toISOString().slice(0, 10) : null,
      amount: Number(e.amount || 0),
      status: e.status || 'NOT_DUE',
      paid_date: e.paid_date ? e.paid_date.toISOString().slice(0, 10) : null
    });
  }

  for (const schedId of Object.keys(instBySchedule)) {
    for (const inst of instBySchedule[schedId]) {
      inst.entries = entriesByInstallment[inst.installment_id] || [];
    }
  }

  const schedules = schedRes.rows.map((s) => {
    const installments = instBySchedule[s.id] || [];
    const summary = buildSummary(installments);

    return {
      id: s.id,
      policy_id: s.policy_id,
      client_id: s.client_id,
      insurance_id: s.insurance_id,
      source_business_id: s.source_business_id,
      currency: s.currency || s.policy_currency || 'IDR',
      type_of_business: normalizeBusinessType(s.type_of_business || s.type_of_business),
      commission_gross: Number(s.commission_gross || 0),
      commission_to_source: Number(s.commission_to_source || 0),
      transaction_number: s.transaction_number,
      policy_number: s.policy_number,
      placing_number: s.placing_number,
      quotation_number: s.quotation_number,
      installments,
      summary
    };
  });

  return schedules;
}

// GET /api/finance/schedules
router.get('/schedules', async (req, res) => {
  try {
    const schedules = await loadSchedulesWithChildren();
    res.json({ success: true, data: schedules });
  } catch (err) {
    console.error('Error get finance schedules', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  }
});

// POST /api/finance/schedules
router.post('/schedules', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const {
      policy_id,
      client_id,
      insurance_id,
      source_business_id,
      currency,
      type_of_business,
      commission_gross,
      commission_to_source,
      installments
    } = req.body;

    if (!policy_id || !Array.isArray(installments) || !installments.length) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'policy_id and installments are required' }
      });
    }

    await client.query('BEGIN');

    const schedRes = await client.query(
      `INSERT INTO finance_schedules
       (policy_id, client_id, insurance_id, source_business_id,
        currency, type_of_business, commission_gross, commission_to_source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        policy_id,
        client_id || null,
        insurance_id || null,
        source_business_id || null,
        currency || 'IDR',
        type_of_business || 'DIRECT',
        commission_gross || 0,
        commission_to_source || 0
      ]
    );

    const schedule = schedRes.rows[0];
    const scheduleId = schedule.id;

    for (const inst of installments) {
      const instRes = await client.query(
        `INSERT INTO finance_installments
         (schedule_id, installment_number)
         VALUES ($1,$2)
         RETURNING id`,
        [scheduleId, inst.installment]
      );
      const installmentId = instRes.rows[0].id;

      for (const entry of inst.entries || []) {
        await client.query(
          `INSERT INTO finance_entries
           (installment_id, description, due_date, amount, status, paid_date)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            installmentId,
            entry.description,
            entry.due_date || null,
            entry.amount || 0,
            entry.status || 'NOT_DUE',
            entry.paid_date || null
          ]
        );
      }
    }

    await client.query('COMMIT');

    const schedules = await loadSchedulesWithChildren();
    const created = schedules.find((s) => s.id === scheduleId);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    await db.pool.query('ROLLBACK');
    console.error('Error create finance schedule', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  } finally {
    client.release();
  }
});

// PUT /api/finance/schedules/:id
router.put('/schedules/:id', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const scheduleId = Number(req.params.id);
    if (!scheduleId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'invalid id' }
      });
    }

    const { type_of_business, installments } = req.body;
    if (!Array.isArray(installments)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION', message: 'installments must be array' }
      });
    }

    await client.query('BEGIN');

    if (type_of_business) {
      await client.query(
        `UPDATE finance_schedules
         SET type_of_business = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [type_of_business, scheduleId]
      );
    }

    const instRes = await client.query(
      'SELECT id FROM finance_installments WHERE schedule_id = $1',
      [scheduleId]
    );
    const instIds = instRes.rows.map((r) => r.id);
    if (instIds.length) {
      await client.query(
        'DELETE FROM finance_entries WHERE installment_id = ANY($1::int[])',
        [instIds]
      );
      await client.query(
        'DELETE FROM finance_installments WHERE schedule_id = $1',
        [scheduleId]
      );
    }

    for (const inst of installments) {
      const instRes2 = await client.query(
        `INSERT INTO finance_installments
         (schedule_id, installment_number)
         VALUES ($1,$2)
         RETURNING id`,
        [scheduleId, inst.installment]
      );
      const installmentId = instRes2.rows[0].id;
      for (const entry of inst.entries || []) {
        await client.query(
          `INSERT INTO finance_entries
           (installment_id, description, due_date, amount, status, paid_date)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            installmentId,
            entry.description,
            entry.due_date || null,
            entry.amount || 0,
            entry.status || 'NOT_DUE',
            entry.paid_date || null
          ]
        );
      }
    }

    await client.query('COMMIT');

    const schedules = await loadSchedulesWithChildren();
    const updated = schedules.find((s) => s.id === scheduleId);
    res.json({ success: true, data: updated });
  } catch (err) {
    await db.pool.query('ROLLBACK');
    console.error('Error update finance schedule', err);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    });
  } finally {
    client.release();
  }
});

module.exports = router;
