-- Migration: Add minimum_stock and maximum_stock columns to inventory_items
-- Created: 2026-01-23

-- Add minimum_stock column (if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'inventory_items' AND column_name = 'minimum_stock'
  ) THEN
    ALTER TABLE inventory_items 
    ADD COLUMN minimum_stock NUMERIC(10, 2) DEFAULT 0 CHECK (minimum_stock >= 0);
  END IF;
END $$;

-- Add maximum_stock column (if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'inventory_items' AND column_name = 'maximum_stock'
  ) THEN
    ALTER TABLE inventory_items 
    ADD COLUMN maximum_stock NUMERIC(10, 2) DEFAULT NULL CHECK (maximum_stock IS NULL OR maximum_stock >= 0);
  END IF;
END $$;

-- Add check constraint to ensure maximum_stock >= minimum_stock when both are set
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'inventory_items_stock_range_check'
  ) THEN
    ALTER TABLE inventory_items 
    ADD CONSTRAINT inventory_items_stock_range_check 
    CHECK (maximum_stock IS NULL OR maximum_stock >= minimum_stock);
  END IF;
END $$;
