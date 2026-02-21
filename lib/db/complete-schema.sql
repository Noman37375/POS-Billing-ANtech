-- Complete Database Schema for POS Billing System
-- Run this SQL in your Supabase SQL Editor to create all tables

-- ============================================
-- 1. POS USERS TABLE (Already created)
-- ============================================
-- This table should already exist from previous setup
-- If not, run lib/db/schema.sql first

-- ============================================
-- 2. PARTIES TABLE (Customers & Vendors)
-- ============================================
CREATE TABLE IF NOT EXISTS parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  type TEXT NOT NULL CHECK (type IN ('Customer', 'Vendor')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for parties
CREATE INDEX IF NOT EXISTS idx_parties_type ON parties(type);
CREATE INDEX IF NOT EXISTS idx_parties_created_at ON parties(created_at DESC);

-- ============================================
-- 3. CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for categories
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- Trigger to update updated_at for categories
CREATE TRIGGER update_categories_updated_at 
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. INVENTORY ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  stock NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (stock >= 0),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add category_id and barcode columns if they don't exist (for existing tables)
DO $$ 
BEGIN
  -- Add category_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'inventory_items' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE inventory_items 
    ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
  END IF;
  
  -- Add barcode column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'inventory_items' AND column_name = 'barcode'
  ) THEN
    ALTER TABLE inventory_items 
    ADD COLUMN barcode TEXT;
    
    -- Add unique constraint separately (can't add UNIQUE in ALTER TABLE ADD COLUMN if data exists)
    -- Only add unique constraint if there are no duplicate barcodes
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'inventory_items_barcode_key'
    ) THEN
      -- Check if we can safely add unique constraint
      IF NOT EXISTS (
        SELECT barcode FROM inventory_items 
        WHERE barcode IS NOT NULL 
        GROUP BY barcode 
        HAVING COUNT(*) > 1
      ) THEN
        ALTER TABLE inventory_items 
        ADD CONSTRAINT inventory_items_barcode_key UNIQUE (barcode);
      END IF;
    END IF;
  END IF;
END $$;

-- Indexes for inventory_items
CREATE INDEX IF NOT EXISTS idx_inventory_items_name ON inventory_items(name);
CREATE INDEX IF NOT EXISTS idx_inventory_items_created_at ON inventory_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_items_stock ON inventory_items(stock) WHERE stock < 5; -- For low stock alerts
CREATE INDEX IF NOT EXISTS idx_inventory_items_category_id ON inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_barcode ON inventory_items(barcode) WHERE barcode IS NOT NULL;

-- ============================================
-- 5. STOCK MOVEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('IN', 'OUT')),
  quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
  reference_type TEXT CHECK (reference_type IN ('Invoice', 'Purchase', 'Adjustment', 'Manual')),
  reference_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for stock_movements
CREATE INDEX IF NOT EXISTS idx_stock_movements_item_id ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);

-- ============================================
-- 6. SALES INVOICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sales_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE RESTRICT,
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  total NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Paid', 'Pending', 'Cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for sales_invoices
CREATE INDEX IF NOT EXISTS idx_sales_invoices_party_id ON sales_invoices(party_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_status ON sales_invoices(status);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_created_at ON sales_invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_total ON sales_invoices(total);

-- ============================================
-- 7. SALES INVOICE LINES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sales_invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  line_total NUMERIC(10, 2) NOT NULL CHECK (line_total >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for sales_invoice_lines
CREATE INDEX IF NOT EXISTS idx_sales_invoice_lines_invoice_id ON sales_invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_lines_item_id ON sales_invoice_lines(item_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to update updated_at for sales_invoices
CREATE TRIGGER update_sales_invoices_updated_at 
  BEFORE UPDATE ON sales_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- OPTIONAL: RPC FUNCTION FOR STOCK DECREMENT
-- ============================================
-- This function is called when creating invoices to decrease stock
CREATE OR REPLACE FUNCTION decrement_inventory_stock(
  item_id UUID,
  quantity NUMERIC
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE inventory_items
  SET stock = GREATEST(0, stock - quantity)
  WHERE id = item_id;
END;
$$;

-- ============================================
-- RLS (Row Level Security) - DISABLE FOR CUSTOM AUTH
-- ============================================
-- Since we're using custom authentication, disable RLS on all tables
-- or adjust policies based on your needs

ALTER TABLE parties DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoice_lines DISABLE ROW LEVEL SECURITY;

-- ============================================
-- NOTES
-- ============================================
-- 1. All tables use UUID for primary keys
-- 2. Foreign keys have appropriate ON DELETE actions:
--    - CASCADE: When invoice is deleted, lines are deleted
--    - RESTRICT: Prevents deletion if referenced (parties, inventory_items)
-- 3. Check constraints ensure data integrity (non-negative values, valid types)
-- 4. Indexes are created for frequently queried columns
-- 5. RLS is disabled for custom authentication - adjust if needed
