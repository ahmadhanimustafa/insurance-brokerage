-- Migration: Add internal reference number to finance_schedules
-- Date: 2025-12-02
-- Description: Adds internal_reference_number field for tracking internal references

-- Add internal reference number to finance_schedules
ALTER TABLE finance_schedules
ADD COLUMN IF NOT EXISTS internal_reference_number VARCHAR(100);

COMMENT ON COLUMN finance_schedules.internal_reference_number IS 'Internal reference number for finance tracking (optional)';
