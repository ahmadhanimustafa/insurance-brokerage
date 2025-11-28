-- PROPOSALS: add transaction number + PS/QS + sales_id + remarks
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS transaction_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS placing_slip_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS quotation_slip_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS sales_id INTEGER,
  ADD COLUMN IF NOT EXISTS remarks TEXT;

-- optional but recommended FK for sales_id
ALTER TABLE public.proposals
  ADD CONSTRAINT proposals_sales_id_fkey
  FOREIGN KEY (sales_id)
  REFERENCES public.clients (id)
  ON UPDATE NO ACTION
  ON DELETE SET NULL;


-- POLICIES: add sales_id + remarks (UI already uses them)
ALTER TABLE public.policies
  ADD COLUMN IF NOT EXISTS sales_id INTEGER,
  ADD COLUMN IF NOT EXISTS remarks TEXT;

ALTER TABLE public.policies
  ADD CONSTRAINT policies_sales_id_fkey
  FOREIGN KEY (sales_id)
  REFERENCES public.clients (id)
  ON UPDATE NO ACTION
  ON DELETE SET NULL;

-- Audit columns
ALTER TABLE clients
  ADD COLUMN created_by INTEGER,
  ADD COLUMN updated_by INTEGER,
  ADD COLUMN salutation text,
  ADD COLUMN first_name text,
  ADD COLUMN mid_name text,
  ADD COLUMN last_name text,
  ADD COLUMN contact_address_2 text,
  ADD COLUMN contact_address_3 text,
  ADD COLUMN contact_phone_2 varchar(50),
  ADD COLUMN contact_fax varchar(50),
  ADD COLUMN contact_fax_2 varchar(50),
  ADD COLUMN contact_position varchar(50);

ALTER TABLE proposals
  ADD COLUMN created_by INTEGER,
  ADD COLUMN updated_by INTEGER;

ALTER TABLE policies
  ADD COLUMN created_by INTEGER,
  ADD COLUMN updated_by INTEGER,
  ADD COLUMN reference_policy_id integer NULL;

-- Policy documents table (metadata only)
CREATE TABLE policy_documents (
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
