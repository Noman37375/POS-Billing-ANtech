-- Migration: Multi-Tier Inventory Pricing System
-- Add cash_price, credit_price, supplier_price, profit_percentage, profit_value
-- Migrate existing selling_price -> cash_price
-- Author: AI Assistant
-- Date: 2026-04-15

-- ============================================
-- PART 1: ADD NEW COLUMNS
-- ============================================

-- Add cash_price column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'inventory_items' AND column_name = 'cash_price'
  ) THEN
    ALTER TABLE inventory_items
    ADD COLUMN cash_price NUMERIC(10, 2) CHECK (cash_price >= 0);
  END IF;
END $$;

-- Add credit_price column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'inventory_items' AND column_name = 'credit_price'
  ) THEN
    ALTER TABLE inventory_items
    ADD COLUMN credit_price NUMERIC(10, 2) CHECK (credit_price >= 0);
  END IF;
END $$;

-- Add supplier_price column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'inventory_items' AND column_name = 'supplier_price'
  ) THEN
    ALTER TABLE inventory_items
    ADD COLUMN supplier_price NUMERIC(10, 2) CHECK (supplier_price >= 0);
  END IF;
END $$;

-- Add profit_percentage column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'inventory_items' AND column_name = 'profit_percentage'
  ) THEN
    ALTER TABLE inventory_items
    ADD COLUMN profit_percentage NUMERIC(5, 2) DEFAULT 0 CHECK (profit_percentage >= 0);
  END IF;
END $$;

-- Add profit_value column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'inventory_items' AND column_name = 'profit_value'
  ) THEN
    ALTER TABLE inventory_items
    ADD COLUMN profit_value NUMERIC(10, 2) DEFAULT 0 CHECK (profit_value >= 0);
  END IF;
END $$;

-- ============================================
-- PART 2: MIGRATE EXISTING DATA
-- ============================================

-- Copy selling_price to cash_price (for existing items)
DO $$
BEGIN
  UPDATE inventory_items
  SET cash_price = selling_price
  WHERE cash_price IS NULL AND selling_price IS NOT NULL;

  RAISE NOTICE 'Migrated % items: selling_price -> cash_price', (
    SELECT COUNT(*) FROM inventory_items WHERE cash_price IS NOT NULL
  );
END $$;

-- Set credit_price = cash_price initially (user can adjust later)
UPDATE inventory_items
SET credit_price = cash_price
WHERE credit_price IS NULL AND cash_price IS NOT NULL;

-- Set supplier_price = 80% of cash_price initially (user can adjust later)
UPDATE inventory_items
SET supplier_price = ROUND(cash_price * 0.8, 2)
WHERE supplier_price IS NULL AND cash_price IS NOT NULL;

-- Calculate and set profit values (based on cash_price)
UPDATE inventory_items
SET
  profit_value = cash_price - cost_price,
  profit_percentage = CASE
    WHEN cost_price > 0 THEN ROUND(((cash_price - cost_price) / cost_price) * 100, 2)
    ELSE 0
  END
WHERE cash_price IS NOT NULL AND cost_price IS NOT NULL;

-- ============================================
-- PART 3: ADD INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_inventory_items_cash_price ON inventory_items(cash_price) WHERE cash_price IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_items_credit_price ON inventory_items(credit_price) WHERE credit_price IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_items_supplier_price ON inventory_items(supplier_price) WHERE supplier_price IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_items_profit_percentage ON inventory_items(profit_percentage) WHERE profit_percentage > 0;

-- ============================================
-- PART 4: VERIFICATION QUERIES (Run these to verify migration success)
-- ============================================

-- Query 1: Check migration summary
-- SELECT
--   COUNT(*) as total_items,
--   COUNT(cash_price) as items_with_cash_price,
--   COUNT(credit_price) as items_with_credit_price,
--   COUNT(supplier_price) as items_with_supplier_price,
--   COUNT(profit_percentage) as items_with_profit_calculated
-- FROM inventory_items;

-- Query 2: Check a sample item to verify all fields
-- SELECT id, name, cost_price, cash_price, credit_price, supplier_price, profit_percentage, profit_value
-- FROM inventory_items
-- LIMIT 5;

-- Query 3: Check for any issues (NULL values)
-- SELECT id, name, cost_price, cash_price, credit_price, supplier_price
-- FROM inventory_items
-- WHERE cash_price IS NULL OR credit_price IS NULL OR supplier_price IS NULL;

-- ============================================
-- PART 5: DEPRECATION (Run AFTER verification and after code is updated)
-- ============================================

-- Once all code is updated to use the new columns (cash_price, credit_price, supplier_price),
-- you can drop the old selling_price column:

-- ALTER TABLE inventory_items DROP COLUMN selling_price;

-- NOTE: Do NOT drop selling_price yet! Keep it for safety until we verify:
-- 1. All queries use new columns
-- 2. UI forms updated
-- 3. Server actions updated
-- 4. A few days of production testing
