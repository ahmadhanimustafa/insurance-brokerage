
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

module.exports = {
  generatePolicyNumber,
  generatePlacingNumber,
  generateQuotationNumber
};
