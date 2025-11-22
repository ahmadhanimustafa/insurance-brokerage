
-- 003_placement_rework.sql
-- Add client_id, proposals, commission_net_percent, fix FKs to clients, and seed class_of_business & products

-- 1) Add client_id to clients table
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS client_id VARCHAR(50) UNIQUE;

-- 2) Ensure commission_net_percent exists on policies
ALTER TABLE policies
  ADD COLUMN IF NOT EXISTS commission_net_percent NUMERIC(5,2);

-- 3) Optional: request_date on policies (for traceability)
ALTER TABLE policies
  ADD COLUMN IF NOT EXISTS request_date DATE;

-- 4) Proposals table
CREATE TABLE IF NOT EXISTS proposals (
    id SERIAL PRIMARY KEY,
    type_of_case VARCHAR(50) NOT NULL,        -- New / Renewal
    type_of_business VARCHAR(50) NOT NULL,    -- Direct / Non Direct
    client_id INT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    source_business_id INT REFERENCES clients(id) ON DELETE SET NULL,
    class_of_business_id INT NOT NULL REFERENCES class_of_business(id) ON DELETE RESTRICT,
    product_id INT REFERENCES products(id) ON DELETE SET NULL,
    sales_team_name VARCHAR(255),
    request_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Open', -- Open / Won / Lost
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5) Fix FK relationships for insurance_id & source_business_id to clients
DO $$
BEGIN
  BEGIN
    ALTER TABLE policies DROP CONSTRAINT IF EXISTS policies_insurance_id_fkey;
  EXCEPTION WHEN undefined_object THEN
    NULL;
  END;

  BEGIN
    ALTER TABLE policies DROP CONSTRAINT IF EXISTS policies_source_business_id_fkey;
  EXCEPTION WHEN undefined_object THEN
    NULL;
  END;
END $$;

ALTER TABLE policies
  ADD CONSTRAINT policies_insurance_id_fkey
    FOREIGN KEY (insurance_id) REFERENCES clients(id),
  ADD CONSTRAINT policies_source_business_id_fkey
    FOREIGN KEY (source_business_id) REFERENCES clients(id);

DO $$
BEGIN
  BEGIN
    ALTER TABLE finance_schedules DROP CONSTRAINT IF EXISTS finance_schedules_insurance_id_fkey;
  EXCEPTION WHEN undefined_object THEN
    NULL;
  END;

  BEGIN
    ALTER TABLE finance_schedules DROP CONSTRAINT IF EXISTS finance_schedules_source_business_id_fkey;
  EXCEPTION WHEN undefined_object THEN
    NULL;
  END;
END $$;

ALTER TABLE finance_schedules
  ADD CONSTRAINT finance_schedules_insurance_id_fkey
    FOREIGN KEY (insurance_id) REFERENCES clients(id),
  ADD CONSTRAINT finance_schedules_source_business_id_fkey
    FOREIGN KEY (source_business_id) REFERENCES clients(id);

-- 6) Seed Class of Business & Products (idempotent)

INSERT INTO class_of_business (code, name) VALUES
  ('PI',   'Professional Indemnity'),
  ('PD',   'Property Damage'),
  ('LIAB', 'Liability'),
  ('MRN',  'Marine'),
  ('AVN',  'Aviation'),
  ('CST',  'Construction'),
  ('MOT',  'Motor Vehicle'),
  ('MED',  'Medical / Health'),
  ('EQP',  'Equipment Coverage')
ON CONFLICT (code) DO NOTHING;

-- Professional Indemnity
WITH pi AS (
  SELECT id FROM class_of_business WHERE code = 'PI'
)
INSERT INTO products (class_id, code, name)
SELECT pi.id, x.code, x.name
FROM pi,
  (VALUES
    ('PI-LAW',  'PI Lawyer'),
    ('PI-ACC',  'PI Accountant'),
    ('PI-ENG',  'PI Engineer')
  ) AS x(code, name)
ON CONFLICT (class_id, code) DO NOTHING;

-- Property Damage
WITH pd AS (
  SELECT id FROM class_of_business WHERE code = 'PD'
)
INSERT INTO products (class_id, code, name)
SELECT pd.id, x.code, x.name
FROM pd,
  (VALUES
    ('PD-FAR', 'Fire All Risk'),
    ('PD-IAR', 'Industrial All Risk'),
    ('PD-PAR', 'Property All Risk')
  ) AS x(code, name)
ON CONFLICT (class_id, code) DO NOTHING;

-- Liability
WITH lb AS (
  SELECT id FROM class_of_business WHERE code = 'LIAB'
)
INSERT INTO products (class_id, code, name)
SELECT lb.id, x.code, x.name
FROM lb,
  (VALUES
    ('LIAB-GL',  'General Liability'),
    ('LIAB-PL',  'Public Liability'),
    ('LIAB-PDL', 'Product Liability'),
    ('LIAB-EL',  'Employer Liability')
  ) AS x(code, name)
ON CONFLICT (class_id, code) DO NOTHING;

-- Marine
WITH mrn AS (
  SELECT id FROM class_of_business WHERE code = 'MRN'
)
INSERT INTO products (class_id, code, name)
SELECT mrn.id, x.code, x.name
FROM mrn,
  (VALUES
    ('MRN-CARGO', 'Marine Cargo'),
    ('MRN-HULL',  'Hull')
  ) AS x(code, name)
ON CONFLICT (class_id, code) DO NOTHING;

-- Aviation
WITH avn AS (
  SELECT id FROM class_of_business WHERE code = 'AVN'
)
INSERT INTO products (class_id, code, name)
SELECT avn.id, x.code, x.name
FROM avn,
  (VALUES
    ('AVN-HULL', 'Aviation Hull'),
    ('AVN-LIAB', 'Aviation Liability')
  ) AS x(code, name)
ON CONFLICT (class_id, code) DO NOTHING;

-- Construction
WITH cst AS (
  SELECT id FROM class_of_business WHERE code = 'CST'
)
INSERT INTO products (class_id, code, name)
SELECT cst.id, x.code, x.name
FROM cst,
  (VALUES
    ('CST-CAR', 'Contractors All Risk (CAR)'),
    ('CST-EAR', 'Erection All Risk (EAR)')
  ) AS x(code, name)
ON CONFLICT (class_id, code) DO NOTHING;

-- Motor Vehicle
WITH mot AS (
  SELECT id FROM class_of_business WHERE code = 'MOT'
)
INSERT INTO products (class_id, code, name)
SELECT mot.id, x.code, x.name
FROM mot,
  (VALUES
    ('MOT-COMP', 'Motor Comprehensive'),
    ('MOT-TLO',  'Motor TLO')
  ) AS x(code, name)
ON CONFLICT (class_id, code) DO NOTHING;

-- Medical / Health
WITH med AS (
  SELECT id FROM class_of_business WHERE code = 'MED'
)
INSERT INTO products (class_id, code, name)
SELECT med.id, x.code, x.name
FROM med,
  (VALUES
    ('MED-INP', 'Inpatient'),
    ('MED-OUT', 'Outpatient')
  ) AS x(code, name)
ON CONFLICT (class_id, code) DO NOTHING;

-- Equipment Coverage
WITH eqp AS (
  SELECT id FROM class_of_business WHERE code = 'EQP'
)
INSERT INTO products (class_id, code, name)
SELECT eqp.id, x.code, x.name
FROM eqp,
  (VALUES
    ('EQP-BD',  'Equipment Breakdown'),
    ('EQP-MACH','Machinery Insurance')
  ) AS x(code, name)
ON CONFLICT (class_id, code) DO NOTHING;
