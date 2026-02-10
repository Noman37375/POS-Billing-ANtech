-- Migration: Phase 2 - Purchases, Vendor Payments
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. PURCHASE INVOICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE RESTRICT,
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  total NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Paid', 'Pending', 'Cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for purchase_invoices
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_party_id ON purchase_invoices(party_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_status ON purchase_invoices(status);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_created_at ON purchase_invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_total ON purchase_invoices(total);

-- ============================================
-- 2. PURCHASE INVOICE LINES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_invoice_id UUID NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  line_total NUMERIC(10, 2) NOT NULL CHECK (line_total >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for purchase_invoice_lines
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_lines_purchase_invoice_id ON purchase_invoice_lines(purchase_invoice_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_lines_item_id ON purchase_invoice_lines(item_id);

-- ============================================
-- 3. PURCHASE PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_invoice_id UUID NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL CHECK (method IN ('Cash', 'Card', 'Mixed', 'Other')),
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_payments_purchase_invoice_id ON purchase_payments(purchase_invoice_id);
CREATE INDEX IF NOT EXISTS idx_purchase_payments_created_at ON purchase_payments(created_at DESC);

-- ============================================
-- 4. TRIGGER FOR updated_at ON purchase_invoices
-- ============================================
CREATE TRIGGER update_purchase_invoices_updated_at 
  BEFORE UPDATE ON purchase_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. RPC FUNCTION FOR STOCK INCREMENT
-- ============================================
CREATE OR REPLACE FUNCTION increment_inventory_stock(
  item_id UUID,
  quantity NUMERIC
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE inventory_items
  SET stock = stock + quantity
  WHERE id = item_id;
END;
$$;

-- ============================================
-- 6. RLS (consistent with rest of schema - custom auth)
-- ============================================
ALTER TABLE purchase_invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoice_lines DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_payments DISABLE ROW LEVEL SECURITY;
