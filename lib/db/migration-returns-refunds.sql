-- Migration: Returns & Refunds Module
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. EXTEND stock_movements.reference_type
-- ============================================
-- Check if stock_movements table exists, if not create it, if yes update constraint
DO $$
BEGIN
  -- Check if table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'stock_movements'
  ) THEN
    -- Create table if it doesn't exist (with extended reference_type)
    CREATE TABLE stock_movements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
      movement_type TEXT NOT NULL CHECK (movement_type IN ('IN', 'OUT')),
      quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
      reference_type TEXT CHECK (reference_type IN ('Invoice', 'Purchase', 'Adjustment', 'Manual', 'SaleReturn', 'PurchaseReturn')),
      reference_id UUID,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_stock_movements_item_id ON stock_movements(item_id);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);
  ELSE
    -- Table exists, update the constraint
    -- Drop existing constraint if it exists
    ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_reference_type_check;
    
    -- Add new check constraint with SaleReturn and PurchaseReturn
    ALTER TABLE stock_movements 
    ADD CONSTRAINT stock_movements_reference_type_check 
    CHECK (reference_type IN ('Invoice', 'Purchase', 'Adjustment', 'Manual', 'SaleReturn', 'PurchaseReturn'));
  END IF;
END $$;

-- ============================================
-- 2. RETURNS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sale', 'purchase')),
  sales_invoice_id UUID REFERENCES sales_invoices(id) ON DELETE RESTRICT,
  purchase_invoice_id UUID REFERENCES purchase_invoices(id) ON DELETE RESTRICT,
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE RESTRICT,
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  total NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Completed', 'Cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure exactly one of sales_invoice_id or purchase_invoice_id is set
  CONSTRAINT returns_invoice_check CHECK (
    (type = 'sale' AND sales_invoice_id IS NOT NULL AND purchase_invoice_id IS NULL) OR
    (type = 'purchase' AND purchase_invoice_id IS NOT NULL AND sales_invoice_id IS NULL)
  )
);

-- Indexes for returns
CREATE INDEX IF NOT EXISTS idx_returns_type ON returns(type);
CREATE INDEX IF NOT EXISTS idx_returns_sales_invoice_id ON returns(sales_invoice_id) WHERE sales_invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_returns_purchase_invoice_id ON returns(purchase_invoice_id) WHERE purchase_invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_returns_party_id ON returns(party_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);
CREATE INDEX IF NOT EXISTS idx_returns_created_at ON returns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_returns_return_number ON returns(return_number);

-- ============================================
-- 3. RETURN_LINES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS return_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  line_total NUMERIC(10, 2) NOT NULL CHECK (line_total >= 0),
  sales_invoice_line_id UUID REFERENCES sales_invoice_lines(id) ON DELETE SET NULL,
  purchase_invoice_line_id UUID REFERENCES purchase_invoice_lines(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for return_lines
CREATE INDEX IF NOT EXISTS idx_return_lines_return_id ON return_lines(return_id);
CREATE INDEX IF NOT EXISTS idx_return_lines_item_id ON return_lines(item_id);
CREATE INDEX IF NOT EXISTS idx_return_lines_sales_invoice_line_id ON return_lines(sales_invoice_line_id) WHERE sales_invoice_line_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_return_lines_purchase_invoice_line_id ON return_lines(purchase_invoice_line_id) WHERE purchase_invoice_line_id IS NOT NULL;

-- ============================================
-- 4. REFUNDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL CHECK (method IN ('Cash', 'Card', 'Mixed', 'Other')),
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for refunds
CREATE INDEX IF NOT EXISTS idx_refunds_return_id ON refunds(return_id);
CREATE INDEX IF NOT EXISTS idx_refunds_created_at ON refunds(created_at DESC);

-- ============================================
-- 5. TRIGGER FOR updated_at ON returns
-- ============================================
CREATE TRIGGER update_returns_updated_at 
  BEFORE UPDATE ON returns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. FUNCTION TO GENERATE RETURN NUMBER
-- ============================================
CREATE OR REPLACE FUNCTION generate_return_number()
RETURNS TEXT AS $$
DECLARE
  prefix TEXT := 'RET-';
  year_part TEXT := TO_CHAR(NOW(), 'YYYY');
  last_num INTEGER;
  new_num INTEGER;
  return_num TEXT;
BEGIN
  -- Get the last return number for this year
  SELECT COALESCE(MAX(CAST(SUBSTRING(return_number FROM LENGTH(prefix) + 5 FOR 6) AS INTEGER)), 0)
  INTO last_num
  FROM returns
  WHERE return_number LIKE prefix || year_part || '-%';
  
  -- Increment
  new_num := last_num + 1;
  
  -- Format: RET-YYYY-NNNNNN (6 digits)
  return_num := prefix || year_part || '-' || LPAD(new_num::TEXT, 6, '0');
  
  RETURN return_num;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. TRIGGER TO AUTO-GENERATE RETURN NUMBER
-- ============================================
CREATE OR REPLACE FUNCTION set_return_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.return_number IS NULL OR NEW.return_number = '' THEN
    NEW.return_number := generate_return_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_return_number_trigger
  BEFORE INSERT ON returns
  FOR EACH ROW
  EXECUTE FUNCTION set_return_number();

-- ============================================
-- 8. RLS (consistent with rest of schema - custom auth)
-- ============================================
ALTER TABLE returns DISABLE ROW LEVEL SECURITY;
ALTER TABLE return_lines DISABLE ROW LEVEL SECURITY;
ALTER TABLE refunds DISABLE ROW LEVEL SECURITY;
