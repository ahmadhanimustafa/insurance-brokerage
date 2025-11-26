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
