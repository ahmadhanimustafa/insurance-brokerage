
// backend/src/utils/numbering.js
// Helpers for generating policy, placing, and quotation numbers

const db = require('./db');

const romanMonths = [
  null,
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'
];

function getRomanMonth(monthNumber) {
  return romanMonths[monthNumber] || '';
}

function mapCaseToCode(caseType) {
  if (!caseType) return 'NB';
  const t = String(caseType).toUpperCase();
  if (t.startsWith('REN')) return 'RN';
  if (t === 'RN') return 'RN';
  return 'NB';
}

async function getNextRunningForYear(table, dateColumn, yearValue) {
  const sql = `
    SELECT COUNT(*)::int AS cnt
    FROM ${table}
    WHERE ${dateColumn} IS NOT NULL
      AND EXTRACT(YEAR FROM ${dateColumn}) = $1
  `;
  const result = await db.query(sql, [yearValue]);
  const count = result.rows[0]?.cnt || 0;
  return String(count + 1).padStart(3, '0');
}

async function generatePolicyNumber({ cobCode, productName, effectiveDate }) {
  const date = effectiveDate ? new Date(effectiveDate) : new Date();
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const roman = getRomanMonth(month);

  const running = await getNextRunningForYear('policies', 'effective_date', year);

  return `POL/${running}/${cobCode}/${productName}/${roman}/${year}`;
}

async function generatePlacingNumber({ caseType, productCode, effectiveDate }) {
  const date = effectiveDate ? new Date(effectiveDate) : new Date();
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const roman = getRomanMonth(month);
  const nbRn = mapCaseToCode(caseType);

  const running = await getNextRunningForYear('policies', 'effective_date', year);

  return `PS/ICIB/${running}/${roman}/${nbRn}/${productCode}-${year}`;
}

async function generateQuotationNumber({ caseType, productCode, effectiveDate }) {
  const date = effectiveDate ? new Date(effectiveDate) : new Date();
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const roman = getRomanMonth(month);
  const nbRn = mapCaseToCode(caseType);

  const running = await getNextRunningForYear('policies', 'effective_date', year);

  return `QS/ICIB/${running}/${roman}/${nbRn}/${productCode}-${year}`;
}

async function generateInvoiceNumber({ effectiveDate, installmentNumber, invoiceType }) {
  // Format: {Running}/{Installment}/{DN/CN}/{MM}/{YY}
  // effectiveDate is the policy effective date
  const date = effectiveDate ? new Date(effectiveDate) : new Date();
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const monthStr = String(month).padStart(2, '0');
  const yearStr = String(year).slice(-2); // Last 2 digits

  // Get count of finance entries for this year-month to generate running number
  const sql = `
    SELECT COUNT(*)::int AS cnt
    FROM finance_entries
    WHERE invoice_number IS NOT NULL
      AND created_at IS NOT NULL
      AND EXTRACT(YEAR FROM created_at) = $1
      AND EXTRACT(MONTH FROM created_at) = $2
  `;
  const result = await db.query(sql, [year, month]);
  const count = result.rows[0]?.cnt || 0;
  const running = String(count + 1).padStart(4, '0');

  // Format: RUNNING/INSTALLMENT/TYPE/MM/YY
  return `${running}/${installmentNumber}/${invoiceType}/${monthStr}/${yearStr}`;
}

// Helper function to determine invoice type based on description
function getInvoiceType(description) {
  // DN (Debit Note): Pay premium to insurance, Pay commission
  // CN (Credit Note): Receive premium from client, Collect commission from insurance

  switch (description) {
    case 'Premium (From Client)':
      return 'CN'; // Receiving from client
    case 'Premium to Insurer':
      return 'DN'; // Paying to insurer
    case 'Commission In':
      return 'CN'; // Collecting commission
    case 'Commission to Source':
      return 'DN'; // Paying commission
    default:
      return 'DN';
  }
}

module.exports = {
  generatePolicyNumber,
  generatePlacingNumber,
  generateQuotationNumber,
  generateInvoiceNumber,
  getInvoiceType
};
