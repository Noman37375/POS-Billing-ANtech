-- Migration: Cost price, selling price, and gross profit support
-- inventory_items: add selling_price, rename unit_price -> cost_price
-- sales_invoice_lines: add cost_price (cost at time of sale)

-- ============================================
-- 1. INVENTORY_ITEMS: add selling_price, rename unit_price -> cost_price
-- ============================================

-- Add selling_price column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'inventory_items' AND column_name = 'selling_price'
  ) THEN
    ALTER TABLE inventory_items
    ADD COLUMN selling_price NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (selling_price >= 0);
  END IF;
END $$;

-- Backfill selling_price from unit_price (only if unit_price column still exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'inventory_items' AND column_name = 'unit_price'
  ) THEN
    UPDATE inventory_items
    SET selling_price = unit_price
    WHERE selling_price = 0 AND unit_price IS NOT NULL;
  END IF;
END $$;

-- Rename unit_price to cost_price if cost_price doesn't exist yet
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'inventory_items' AND column_name = 'unit_price'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'inventory_items' AND column_name = 'cost_price'
  ) THEN
    ALTER TABLE inventory_items RENAME COLUMN unit_price TO cost_price;
  END IF;
END $$;

-- Ensure selling_price = cost_price for any row where selling_price is still 0 (e.g. new column default)
UPDATE inventory_items
SET selling_price = cost_price
WHERE selling_price = 0 AND cost_price IS NOT NULL;

-- ============================================
-- 2. SALES_INVOICE_LINES: add cost_price (cost at time of sale)
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sales_invoice_lines' AND column_name = 'cost_price'
  ) THEN
    ALTER TABLE sales_invoice_lines
    ADD COLUMN cost_price NUMERIC(10, 2) NULL CHECK (cost_price >= 0);
  END IF;
END $$;

-- Backfill cost_price from inventory_items where possible
UPDATE sales_invoice_lines sil
SET cost_price = inv.cost_price
FROM inventory_items inv
WHERE sil.item_id = inv.id
  AND sil.cost_price IS NULL
  AND inv.cost_price IS NOT NULL;
