-- ============================================================================
-- Insurance Brokerage Database Schema - Consolidated Init Script
-- ============================================================================
-- This script creates all tables in the proper dependency order
-- Generated from migrations: init + 003-008 (skipping 002)
-- ============================================================================

-- ============================================================================
-- LEVEL 0: Independent Tables (No Foreign Keys)
-- ============================================================================

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    permissions JSONB DEFAULT '{}'
);

-- Lookup values for dropdowns and reference data
CREATE TABLE IF NOT EXISTS lookup_values (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    code VARCHAR(100) NOT NULL,
    label VARCHAR(255) NOT NULL,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(category, code)
);

-- Class of Business categories
CREATE TABLE IF NOT EXISTS class_of_business (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL
);

-- ============================================================================
-- LEVEL 1: Tables with Single Dependencies
-- ============================================================================

-- Users table (depends on: roles, departments)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role_id INTEGER NOT NULL,
    department_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- Products table (depends on: class_of_business)
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    class_id INT REFERENCES class_of_business(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    UNIQUE(class_id, code)
);

-- Clients table (serves as clients, insurers, source_business, and sales)
-- Uses TEXT id for custom ID generation (e.g., PH-123456)
CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    salutation TEXT,
    first_name TEXT,
    mid_name TEXT,
    last_name TEXT,
    name TEXT NOT NULL,
    address_1 TEXT,
    address_2 TEXT,
    address_3 TEXT,
    phone_1 TEXT,
    phone_2 TEXT,
    mobile_1 TEXT,
    mobile_2 TEXT,
    fax_1 TEXT,
    fax_2 TEXT,
    email TEXT UNIQUE,
    contact TEXT,
    contact_address TEXT,
    contact_address_2 TEXT,
    contact_address_3 TEXT,
    contact_phone TEXT,
    contact_phone_2 VARCHAR(50),
    contact_fax VARCHAR(50),
    contact_fax_2 VARCHAR(50),
    contact_position VARCHAR(50),
    taxid TEXT,
    tax_name TEXT,
    tax_address TEXT,
    lob TEXT,
    type_of_client TEXT NOT NULL,
    special_flag BOOLEAN DEFAULT FALSE,
    remarks TEXT,
    client_id VARCHAR(50) UNIQUE,
    created_by INTEGER,
    updated_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- LEVEL 2: Proposals and Policies
-- ============================================================================

-- Proposals table (depends on: clients, class_of_business, products)
CREATE TABLE IF NOT EXISTS proposals (
    id SERIAL PRIMARY KEY,
    transaction_number VARCHAR(100),
    type_of_case VARCHAR(50) NOT NULL,
    type_of_business VARCHAR(50) NOT NULL,
    client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    source_business_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
    class_of_business_id INT NOT NULL REFERENCES class_of_business(id) ON DELETE RESTRICT,
    product_id INT REFERENCES products(id) ON DELETE SET NULL,
    sales_team_name VARCHAR(255),
    sales_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
    placing_slip_number VARCHAR(100),
    quotation_slip_number VARCHAR(100),
    request_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Open',
    remarks TEXT,
    created_by INTEGER,
    updated_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Policies table (depends on: clients, class_of_business, products, policies self-reference)
CREATE TABLE IF NOT EXISTS policies (
    id SERIAL PRIMARY KEY,
    transaction_number TEXT NOT NULL,
    type_of_case TEXT,
    reference_policy_id INTEGER REFERENCES policies(id),
    client_id TEXT REFERENCES clients(id),
    insurance_id TEXT REFERENCES clients(id),
    source_business_id TEXT REFERENCES clients(id),
    sales_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
    class_of_business_id TEXT,
    product_id TEXT,
    type_of_business TEXT,
    placing_slip_number TEXT,
    qs_number TEXT,
    policy_number TEXT,
    effective_date DATE,
    expiry_date DATE,
    request_date DATE,
    premium_amount NUMERIC(18,2),
    currency TEXT DEFAULT 'IDR',
    commission_gross NUMERIC(18,2),
    commission_to_source NUMERIC(18,2),
    commission_net_percent NUMERIC(5,2),
    sent_to_finance BOOLEAN DEFAULT FALSE,
    remarks TEXT,
    created_by INTEGER,
    updated_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- LEVEL 3: Policy Documents
-- ============================================================================

-- Policy documents table (depends on: policies)
CREATE TABLE IF NOT EXISTS policy_documents (
    id SERIAL PRIMARY KEY,
    policy_id INTEGER NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    document_type VARCHAR(100),
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    file_size INTEGER,
    file_url TEXT,
    description TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT now(),
    status VARCHAR(20) DEFAULT 'active',
    created_by INTEGER,
    updated_by INTEGER
);

-- ============================================================================
-- LEVEL 4: Finance Schedule (Master)
-- ============================================================================

-- Finance schedule master (depends on: policies, clients)
CREATE TABLE IF NOT EXISTS finance_schedules (
    id SERIAL PRIMARY KEY,
    policy_id INT NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    client_id TEXT REFERENCES clients(id),
    insurance_id TEXT REFERENCES clients(id),
    source_business_id TEXT REFERENCES clients(id),
    currency TEXT DEFAULT 'IDR',
    type_of_business TEXT,
    commission_gross NUMERIC(18,2),
    commission_to_source NUMERIC(18,2),
    effective_date DATE,
    internal_invoice_number VARCHAR(100) UNIQUE,
    external_invoice_number VARCHAR(100),
    internal_reference_number VARCHAR(100),
    stamp_duty NUMERIC(18,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Comments for finance_schedules
COMMENT ON COLUMN finance_schedules.internal_invoice_number IS 'Auto-generated internal invoice number';
COMMENT ON COLUMN finance_schedules.external_invoice_number IS 'External invoice reference number from other companies';
COMMENT ON COLUMN finance_schedules.internal_reference_number IS 'Internal reference number for finance tracking (optional)';
COMMENT ON COLUMN finance_schedules.effective_date IS 'Policy effective date for invoice number generation';
COMMENT ON COLUMN finance_schedules.stamp_duty IS 'Government stamp duty fee (added to 1st installment)';

-- ============================================================================
-- LEVEL 5: Finance Installments
-- ============================================================================

-- Finance installments (depends on: finance_schedules)
CREATE TABLE IF NOT EXISTS finance_installments (
    id SERIAL PRIMARY KEY,
    schedule_id INT NOT NULL REFERENCES finance_schedules(id) ON DELETE CASCADE,
    installment_number INT NOT NULL,
    UNIQUE (schedule_id, installment_number)
);

-- ============================================================================
-- LEVEL 6: Finance Entries
-- ============================================================================

-- Finance entries (depends on: finance_installments)
CREATE TABLE IF NOT EXISTS finance_entries (
    id SERIAL PRIMARY KEY,
    installment_id INT NOT NULL REFERENCES finance_installments(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    due_date DATE,
    amount NUMERIC(18,2) DEFAULT 0,
    status TEXT DEFAULT 'NOT_DUE',
    paid_date DATE,
    paid_amount NUMERIC(18,2) DEFAULT 0,
    receipt_file_name VARCHAR(255),
    receipt_file_url VARCHAR(500),
    receipt_uploaded_at TIMESTAMP,
    invoice_number VARCHAR(100),
    invoice_type VARCHAR(2) CHECK (invoice_type IN ('DN', 'CN')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Comments for finance_entries
COMMENT ON COLUMN finance_entries.paid_amount IS 'Amount already paid/collected for this entry';
COMMENT ON COLUMN finance_entries.receipt_file_name IS 'Receipt file name';
COMMENT ON COLUMN finance_entries.receipt_file_url IS 'Path to receipt file';
COMMENT ON COLUMN finance_entries.receipt_uploaded_at IS 'Timestamp when receipt was uploaded';
COMMENT ON COLUMN finance_entries.invoice_number IS 'Invoice number for this entry: {Running}/{Installment}/{DN/CN}/{MM}/{YY}';
COMMENT ON COLUMN finance_entries.invoice_type IS 'DN (Debit Note) or CN (Credit Note)';

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert default departments
INSERT INTO departments (name, description) VALUES
    ('Placement', 'Sales team'),
    ('Finance', 'Finance team'),
    ('Aftersales', 'Aftersales team'),
    ('Admin', 'Admin team')
ON CONFLICT (name) DO NOTHING;

-- Insert default roles
INSERT INTO roles (name) VALUES
    ('Admin'),
    ('Placement_Maker'),
    ('Placement_Checker'),
    ('Finance_Maker'),
    ('Finance_Checker'),
    ('Aftersales_Maker'),
    ('Aftersales_Checker')
ON CONFLICT (name) DO NOTHING;

-- Insert default admin user
-- Password: admin123 (hashed with bcrypt)
INSERT INTO users (email, password_hash, full_name, role_id, department_id)
SELECT
    'admin@insurance.com',
    '$2a$10$fi9d2/MfjA8d9eMeHxvZC.sFIEYr1zV7bjjSbPc2P2EnEIJBrILwW',
    'Administrator',
    (SELECT id FROM roles WHERE name = 'Admin'),
    (SELECT id FROM departments WHERE name = 'Admin')
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'admin@insurance.com'
);

-- Insert lookup values
INSERT INTO lookup_values (category, code, label, sort_order) VALUES
    ('TYPE_OF_BUSINESS', 'DIRECT', 'Direct', 1),
    ('TYPE_OF_BUSINESS', 'NON_DIRECT', 'Non Direct', 2),
    ('CURRENCY', 'IDR', 'IDR - Indonesian Rupiah', 1),
    ('CURRENCY', 'USD', 'USD - US Dollar', 2)
ON CONFLICT (category, code) DO NOTHING;

-- Insert class of business
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

-- Insert products for Professional Indemnity
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

-- Insert products for Property Damage
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

-- Insert products for Liability
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

-- Insert products for Marine
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

-- Insert products for Aviation
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

-- Insert products for Construction
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

-- Insert products for Motor Vehicle
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

-- Insert products for Medical / Health
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

-- Insert products for Equipment Coverage
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

-- ============================================================================
-- END OF INIT SCRIPT
-- ============================================================================
