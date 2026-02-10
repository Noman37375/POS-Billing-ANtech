-- Migration: Add category_id and barcode columns to existing inventory_items table
-- Run this SQL in your Supabase SQL Editor if inventory_items table already exists
-- IMPORTANT: Make sure categories table exists first (run complete-schema.sql categories section)

-- Add category_id column (if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'inventory_items' AND column_name = 'category_id'
  ) THEN
    -- Check if categories table exists first
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'categories') THEN
      ALTER TABLE inventory_items 
      ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
    ELSE
      RAISE NOTICE 'Categories table does not exist. Please create it first.';
    END IF;
  END IF;
END $$;

-- Add barcode column (if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'inventory_items' AND column_name = 'barcode'
  ) THEN
    ALTER TABLE inventory_items 
    ADD COLUMN barcode TEXT;
    
    -- Add unique constraint only if no duplicate barcodes exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'inventory_items_barcode_key'
    ) THEN
      -- Check for duplicates
      IF NOT EXISTS (
        SELECT barcode FROM inventory_items 
        WHERE barcode IS NOT NULL 
        GROUP BY barcode 
        HAVING COUNT(*) > 1
      ) THEN
        ALTER TABLE inventory_items 
        ADD CONSTRAINT inventory_items_barcode_key UNIQUE (barcode);
      ELSE
        RAISE NOTICE 'Cannot add unique constraint on barcode: duplicate values exist. Please clean up duplicates first.';
      END IF;
    END IF;
  END IF;
END $$;

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_inventory_items_category_id ON inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_barcode ON inventory_items(barcode) WHERE barcode IS NOT NULL;
