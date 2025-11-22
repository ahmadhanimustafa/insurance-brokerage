-- 003_placement_finance_reset.sql
-- Hard reset for placement (clients, policies, documents) and finance schedules
-- NOTE: This will DROP existing data in these tables.

BEGIN;

-- Drop existing finance / placement tables if they exist
DROP TABLE IF EXISTS finance_entries CASCADE;
DROP TABLE IF EXISTS finance_installments CASCADE;
DROP TABLE IF EXISTS finance_schedules CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS policies CASCADE;
DROP TABLE IF EXISTS clients CASCADE;

-- Core clients table – keep the same field names as in the Node code
CREATE TABLE clients (
    id TEXT PRIMARY KEY,                           -- e.g. PH-123456 etc. from generateClientId
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
    contact_phone TEXT,
    taxid TEXT,
    tax_name TEXT,
    tax_address TEXT,
    lob TEXT,
    type_of_client TEXT NOT NULL,
    special_flag BOOLEAN DEFAULT FALSE,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Policies table, referencing client IDs as TEXT (same as in frontend/placement.js)
CREATE TABLE policies (
    id SERIAL PRIMARY KEY,
    transaction_number TEXT NOT NULL,
    type_of_case TEXT,                             -- New / Renewal etc.
    reference_policy_id INT REFERENCES policies(id),
    client_id TEXT REFERENCES clients(id),
    insurance_id TEXT REFERENCES clients(id),
    source_business_id TEXT REFERENCES clients(id),
    class_of_business_id TEXT,
    product_id TEXT,
    type_of_business TEXT,                         -- Direct / Non Direct
    placing_slip_number TEXT,
    qs_number TEXT,
    policy_number TEXT,
    effective_date DATE,
    expiry_date DATE,
    premium_amount NUMERIC(18,2),
    currency TEXT DEFAULT 'IDR',
    commission_gross NUMERIC(18,2),
    commission_to_source NUMERIC(18,2),
    commission_net_percent NUMERIC(18,2),
    sent_to_finance BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Simple documents table for policy attachments
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    policy_id INT NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    document_type TEXT,
    file_name TEXT,
    file_size BIGINT,
    file_url TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Finance schedule master
CREATE TABLE finance_schedules (
    id SERIAL PRIMARY KEY,
    policy_id INT NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    client_id TEXT REFERENCES clients(id),
    insurance_id TEXT REFERENCES clients(id),
    source_business_id TEXT REFERENCES clients(id),
    currency TEXT DEFAULT 'IDR',
    type_of_business TEXT,
    commission_gross NUMERIC(18,2),
    commission_to_source NUMERIC(18,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Per-installment rows
CREATE TABLE finance_installments (
    id SERIAL PRIMARY KEY,
    schedule_id INT NOT NULL REFERENCES finance_schedules(id) ON DELETE CASCADE,
    installment_number INT NOT NULL,
    UNIQUE (schedule_id, installment_number)
);

-- The actual entries per installment (premium in/out, commission in/out, etc.)
CREATE TABLE finance_entries (
    id SERIAL PRIMARY KEY,
    installment_id INT NOT NULL REFERENCES finance_installments(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    due_date DATE,
    amount NUMERIC(18,2) DEFAULT 0,
    status TEXT DEFAULT 'NOT_DUE',
    paid_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMIT;
