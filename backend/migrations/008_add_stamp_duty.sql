-- Migration: Add stamp duty to finance schedules
-- Date: 2025-12-02
-- Description: Adds stamp_duty field to track government stamp duty fees

-- Add stamp duty to finance_schedules
ALTER TABLE finance_schedules
ADD COLUMN IF NOT EXISTS stamp_duty NUMERIC(18,2) DEFAULT 0;

COMMENT ON COLUMN finance_schedules.stamp_duty IS 'Government stamp duty fee (added to 1st installment)';
