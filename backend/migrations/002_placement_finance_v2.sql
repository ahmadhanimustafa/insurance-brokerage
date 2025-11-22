-- 002_placement_finance.sql

CREATE TABLE IF NOT EXISTS lookup_values (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    code VARCHAR(100) NOT NULL,
    label VARCHAR(255) NOT NULL,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(category, code)
);

CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
	client_id text,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    contact_person VARCHAR(255),
    contact_address TEXT,
    contact_phone VARCHAR(50),
    taxid VARCHAR(100),
    tax_name VARCHAR(255),
    tax_address TEXT,
    lob VARCHAR(255),
    type_of_client VARCHAR(50),
    special_flag BOOLEAN DEFAULT FALSE,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS insurers (
    id SERIAL PRIMARY KEY,
	client_id text,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    contact_person VARCHAR(255),
    contact_address TEXT,
    contact_phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS source_business (
    id SERIAL PRIMARY KEY,
	client_id text,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    contact_person VARCHAR(255),
    contact_phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS class_of_business (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    class_id INT REFERENCES class_of_business(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    UNIQUE(class_id, code)
);

CREATE TABLE IF NOT EXISTS policies (
    id SERIAL PRIMARY KEY,
    transaction_number VARCHAR(100) UNIQUE,
    policy_number VARCHAR(100),
    placing_number VARCHAR(100),
    quotation_number VARCHAR(100),

    client_id int REFERENCES clients(id),
    insurance_id int REFERENCES insurers(id),
    source_business_id int REFERENCES source_business(id),

    class_of_business_name Text REFERENCES class_of_business(id),
    product_name Text REFERENCES products(id),

    case_type VARCHAR(50),
    type_of_business VARCHAR(50),
    currency VARCHAR(10) DEFAULT 'IDR',

    premium_amount NUMERIC(18,2) DEFAULT 0,
    commission_gross NUMERIC(5,2) DEFAULT 0,
    commission_to_source NUMERIC(5,2) DEFAULT 0,
	commission_net_percent NUMERIC(5,2) DEFAULT 0,

    effective_date DATE,
    expiry_date DATE,

    sent_to_finance BOOLEAN DEFAULT FALSE,
	finance_status TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_schedules (
    id SERIAL PRIMARY KEY,
    policy_id INT NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    client_id Text REFERENCES clients(id),
    insurance_id Text REFERENCES insurers(id),
    source_business_id Text REFERENCES source_business(id),
    currency VARCHAR(10) DEFAULT 'IDR',
    type_of_business VARCHAR(50),
    commission_gross NUMERIC(5,2),
    commission_to_source NUMERIC(5,2),
	commission_net_percent NUMERIC(5,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_installments (
    id SERIAL PRIMARY KEY,
    schedule_id INT NOT NULL REFERENCES finance_schedules(id) ON DELETE CASCADE,
    installment_number INT NOT NULL,
    UNIQUE(schedule_id, installment_number)
);

CREATE TABLE IF NOT EXISTS finance_entries (
    id SERIAL PRIMARY KEY,
    installment_id INT NOT NULL REFERENCES finance_installments(id) ON DELETE CASCADE,
    description VARCHAR(100) NOT NULL,
    due_date DATE,
    amount NUMERIC(18,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'NOT_DUE',
    paid_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO lookup_values (category, code, label, sort_order) VALUES
  ('TYPE_OF_BUSINESS', 'DIRECT', 'Direct', 1),
  ('TYPE_OF_BUSINESS', 'NON_DIRECT', 'Non Direct', 2),
  ('CURRENCY', 'IDR', 'IDR - Indonesian Rupiah', 1),
  ('CURRENCY', 'USD', 'USD - US Dollar', 2)
ON CONFLICT DO NOTHING;
