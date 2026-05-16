-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

--users
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  password text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Companies
CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  phone text NOT NULL,
  gst_number text,
  gst_enabled boolean DEFAULT false,
  owner_id text NOT NULL,
  website text,
  logo_url text,
  qr_code_url text,
  upi_id text,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Parties
CREATE TABLE parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  party_code text NOT NULL,
  phone text,
  address text,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  email text,
  party_type text NOT NULL,
  opening_balance numeric DEFAULT 0,
  balance_type text CHECK (balance_type IN ('DR', 'CR')),
  created_at timestamptz DEFAULT now()
);

-- Products
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  base_price numeric NOT NULL,
  unit text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Orders
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id),
  party_id uuid REFERENCES parties(id),
  title text NOT NULL,
  order_no text NOT NULL,
  job_no text NOT NULL,
  status text,
  notes text,
  order_date date NOT NULL,
  total_amount numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Order Items
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  price numeric NOT NULL,
  quantity numeric NOT NULL,
  total_amount numeric NOT NULL,
  product_description text
);

-- Dynamic Pricing
CREATE TABLE dynamic_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id),
  party_id uuid REFERENCES parties(id),
  product_id uuid REFERENCES products(id),
  price numeric NOT NULL
);

--Designers
CREATE TABLE designers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  name text,
  email text,
  mobile text,
  rate integer,
  size_rates jsonb,
  created_at timestamptz DEFAULT now()
);

-- Designing Jobs
CREATE TABLE designing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  designer_id uuid REFERENCES designers(id),
  date_in date NOT NULL,
  party text NOT NULL,
  status text NOT NULL,
  title text NOT NULL,
  function text NOT NULL,
  size text NOT NULL,
  pages numeric NOT NULL,
  order_no text,
  is_paid boolean DEFAULT false,
  paid_amount numeric DEFAULT 0,
  paid_date date,
  created_at timestamptz DEFAULT now()
);

--Invoices
CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no text NOT NULL,
  company_id uuid REFERENCES companies(id),
  order_id uuid REFERENCES orders(id),
  party_id uuid REFERENCES parties(id),
  total_amount numeric DEFAULT 0,
  paid_amount numeric DEFAULT 0,
  status text DEFAULT 'unpaid',
  title text,
  date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CHECK (status IN ('paid', 'partial', 'cancelled', 'unpaid'))
);

--Invoices Items
CREATE TABLE invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  price numeric NOT NULL,
  quantity numeric NOT NULL,
  total_amount numeric NOT NULL,
  description text
);

--Party Payments
CREATE TABLE party_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id),
  party_id uuid REFERENCES parties(id),
  payment_date timestamptz DEFAULT now(),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  mode text CHECK (mode IN ('Cash', 'UPI', 'Bank Transfer')),
  reference_type text CHECK (reference_type IN ('advance', 'invoice')),
  reference_id uuid,
  notes text,
  created_at timestamptz DEFAULT now()
);


--Party Payment Allocations
CREATE TABLE party_payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id),
  payment_id uuid REFERENCES party_payments(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  allocated_amount numeric(12,2) NOT NULL CHECK (allocated_amount > 0),
  created_at timestamptz DEFAULT now()
);

-- Purchases
CREATE TABLE purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id),
  supplier text NOT NULL,
  item_description text NOT NULL,
  quantity numeric NOT NULL,
  unit_price numeric NOT NULL,
  total_amount numeric NOT NULL,
  purchase_date date NOT NULL,
  notes text
);

-- Expenses
CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id),
  type text NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  expense_date date NOT NULL,
  designer_id text,
  salary_period jsonb
);

-- Indexes (performance)
CREATE INDEX idx_orders_company_id ON orders(company_id);
CREATE INDEX idx_orders_party_id ON orders(party_id);
CREATE INDEX idx_products_company_id ON products(company_id);
CREATE INDEX idx_parties_company_id ON parties(company_id);
CREATE INDEX idx_invoices_company_id ON invoices(company_id);
CREATE INDEX idx_parties_company_active ON parties(company_id, is_active);
CREATE INDEX idx_dynamic_pricing_lookup ON dynamic_pricing(company_id, party_id, product_id);
CREATE INDEX idx_payments_party ON party_payments(party_id);