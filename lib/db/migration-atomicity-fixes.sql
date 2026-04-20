-- ============================================
-- ATOMICITY FIXES MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Fix decrement_inventory_stock
--    Single atomic UPDATE: only succeeds if stock >= quantity
--    No DECLARE variable needed — avoids Supabase SQL editor parsing issue
CREATE OR REPLACE FUNCTION decrement_inventory_stock(
  item_id UUID,
  quantity NUMERIC
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE inventory_items
  SET stock = stock - quantity
  WHERE id = item_id
    AND stock >= quantity;

  IF NOT FOUND THEN
    IF NOT EXISTS (SELECT 1 FROM inventory_items WHERE id = item_id) THEN
      RAISE EXCEPTION 'Item not found: %', item_id;
    ELSE
      RAISE EXCEPTION 'Insufficient stock for item %', item_id;
    END IF;
  END IF;
END;
$$;

-- 2. Fix increment_inventory_stock
--    Raise error if item not found instead of silently doing nothing
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

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found: %', item_id;
  END IF;
END;
$$;
