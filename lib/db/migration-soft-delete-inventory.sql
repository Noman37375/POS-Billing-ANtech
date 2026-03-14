-- Migration: Add is_archived column to inventory_items for soft delete
-- Items used in sales invoices cannot be hard-deleted (FK constraint),
-- so we archive them instead to hide from inventory while preserving sales history.

ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_inventory_items_is_archived ON inventory_items(is_archived) WHERE is_archived = FALSE;
