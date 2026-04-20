-- Migration: Fix invoice status constraints to include return statuses
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. FIX sales_invoices status constraint
-- ============================================
ALTER TABLE sales_invoices DROP CONSTRAINT IF EXISTS sales_invoices_status_check;
ALTER TABLE sales_invoices
  ADD CONSTRAINT sales_invoices_status_check
  CHECK (status IN ('Draft', 'Paid', 'Pending', 'Credit', 'Cancelled', 'Returned', 'Partially Returned'));

-- ============================================
-- 2. FIX purchase_invoices status constraint
-- ============================================
ALTER TABLE purchase_invoices DROP CONSTRAINT IF EXISTS purchase_invoices_status_check;
ALTER TABLE purchase_invoices
  ADD CONSTRAINT purchase_invoices_status_check
  CHECK (status IN ('Draft', 'Paid', 'Pending', 'Cancelled', 'Returned', 'Partially Returned'));
