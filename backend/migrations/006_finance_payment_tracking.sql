-- Migration: Add payment tracking and receipt upload to finance_entries
-- Date: 2025-12-02
-- Description: Adds paid_amount tracking and receipt upload capability

-- Add paid amount tracking to finance_entries
ALTER TABLE finance_entries
ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(18,2) DEFAULT 0;

-- Add receipt upload fields
ALTER TABLE finance_entries
ADD COLUMN IF NOT EXISTS receipt_file_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS receipt_file_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS receipt_uploaded_at TIMESTAMP;

-- Add invoice number to individual entries (each entry can have its own invoice)
ALTER TABLE finance_entries
ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100);

-- Add invoice type (DN/CN) to entries
ALTER TABLE finance_entries
ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(2) CHECK (invoice_type IN ('DN', 'CN'));

-- Add comments
COMMENT ON COLUMN finance_entries.paid_amount IS 'Amount already paid/collected for this entry';
COMMENT ON COLUMN finance_entries.receipt_file_name IS 'Receipt file name';
COMMENT ON COLUMN finance_entries.receipt_file_url IS 'Path to receipt file';
COMMENT ON COLUMN finance_entries.receipt_uploaded_at IS 'Timestamp when receipt was uploaded';
COMMENT ON COLUMN finance_entries.invoice_number IS 'Invoice number for this entry: {Running}/{Installment}/{DN/CN}/{MM}/{YY}';
COMMENT ON COLUMN finance_entries.invoice_type IS 'DN (Debit Note) or CN (Credit Note)';

-- Add effective_date to finance_schedules (needed for invoice number generation)
ALTER TABLE finance_schedules
ADD COLUMN IF NOT EXISTS effective_date DATE;

COMMENT ON COLUMN finance_schedules.effective_date IS 'Policy effective date for invoice number generation';
