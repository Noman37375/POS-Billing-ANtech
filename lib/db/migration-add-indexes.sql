-- Migration: Add Performance Indexes
-- Description: Add indexes on frequently filtered/sorted columns
-- Date: 2026-02-14

-- Index for inventory_items queries (most common: filter by user_id, sort by created_at)
CREATE INDEX IF NOT EXISTS idx_inventory_items_user_id_created_at
ON inventory_items(user_id, created_at DESC);

-- Index for inventory_items by barcode (for barcode lookup)
CREATE INDEX IF NOT EXISTS idx_inventory_items_user_id_barcode
ON inventory_items(user_id, barcode);

-- Index for sales_invoices queries (filter by user_id, sort by created_at)
CREATE INDEX IF NOT EXISTS idx_sales_invoices_user_id_created_at
ON sales_invoices(user_id, created_at DESC);

-- Index for sales_invoices by status
CREATE INDEX IF NOT EXISTS idx_sales_invoices_user_id_status
ON sales_invoices(user_id, status);

-- Index for purchase_invoices queries
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_user_id_created_at
ON purchase_invoices(user_id, created_at DESC);

-- Index for purchase_invoices by status
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_user_id_status
ON purchase_invoices(user_id, status);

-- Index for parties queries
CREATE INDEX IF NOT EXISTS idx_parties_user_id_created_at
ON parties(user_id, created_at DESC);

-- Index for parties by name (for search)
CREATE INDEX IF NOT EXISTS idx_parties_user_id_name
ON parties(user_id, name);

-- Index for sales_invoice_lines by invoice_id (for fetching line items)
CREATE INDEX IF NOT EXISTS idx_sales_invoice_lines_invoice_id
ON sales_invoice_lines(invoice_id);

-- Index for purchase_invoice_lines
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_lines_purchase_invoice_id
ON purchase_invoice_lines(purchase_invoice_id);

-- Index for stock_movements queries
CREATE INDEX IF NOT EXISTS idx_stock_movements_user_id_created_at
ON stock_movements(user_id, created_at DESC);

-- Index for returns queries
CREATE INDEX IF NOT EXISTS idx_returns_user_id_created_at
ON returns(user_id, created_at DESC);

-- Index for payments queries
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id
ON payments(invoice_id);

-- Index for audit_logs queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id_created_at
ON audit_logs(user_id, created_at DESC);

-- Optional: Analyze query statistics to help planner
-- ANALYZE;
