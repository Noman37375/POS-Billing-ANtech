-- Migration: Add user_id to all tables for multi-tenant data isolation
-- Run this SQL in your Supabase SQL Editor
-- This will add user_id columns to all tables so each POS user only sees their own data

-- ============================================
-- 1. PARTIES TABLE
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'parties' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE parties 
    ADD COLUMN user_id UUID REFERENCES pos_users(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_parties_user_id ON parties(user_id);
  END IF;
END $$;

-- ============================================
-- 2. CATEGORIES TABLE
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE categories 
    ADD COLUMN user_id UUID REFERENCES pos_users(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
    
    -- Drop unique constraint on name, add composite unique constraint
    IF EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'categories_name_key'
    ) THEN
      ALTER TABLE categories DROP CONSTRAINT categories_name_key;
    END IF;
    
    -- Add composite unique constraint (name + user_id)
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'categories_name_user_id_key'
    ) THEN
      ALTER TABLE categories ADD CONSTRAINT categories_name_user_id_key UNIQUE (name, user_id);
    END IF;
  END IF;
END $$;

-- ============================================
-- 3. INVENTORY ITEMS TABLE
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'inventory_items' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE inventory_items 
    ADD COLUMN user_id UUID REFERENCES pos_users(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_inventory_items_user_id ON inventory_items(user_id);
  END IF;
END $$;

-- ============================================
-- 4. STOCK MOVEMENTS TABLE
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'stock_movements' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE stock_movements 
    ADD COLUMN user_id UUID REFERENCES pos_users(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_stock_movements_user_id ON stock_movements(user_id);
  END IF;
END $$;

-- ============================================
-- 5. SALES INVOICES TABLE
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sales_invoices' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE sales_invoices 
    ADD COLUMN user_id UUID REFERENCES pos_users(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_sales_invoices_user_id ON sales_invoices(user_id);
  END IF;
END $$;

-- ============================================
-- 6. PURCHASE INVOICES TABLE (if exists)
-- ============================================
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'purchase_invoices'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'purchase_invoices' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE purchase_invoices 
    ADD COLUMN user_id UUID REFERENCES pos_users(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_purchase_invoices_user_id ON purchase_invoices(user_id);
  END IF;
END $$;

-- ============================================
-- 7. PAYMENTS TABLE
-- ============================================
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'payments'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE payments 
    ADD COLUMN user_id UUID REFERENCES pos_users(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
  END IF;
END $$;

-- ============================================
-- 8. PURCHASE PAYMENTS TABLE (if exists)
-- ============================================
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'purchase_payments'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'purchase_payments' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE purchase_payments 
    ADD COLUMN user_id UUID REFERENCES pos_users(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_purchase_payments_user_id ON purchase_payments(user_id);
  END IF;
END $$;

-- ============================================
-- 9. RETURNS TABLE
-- ============================================
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'returns'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'returns' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE returns 
    ADD COLUMN user_id UUID REFERENCES pos_users(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_returns_user_id ON returns(user_id);
  END IF;
END $$;

-- ============================================
-- 10. REFUNDS TABLE (if exists)
-- ============================================
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'refunds'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'refunds' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE refunds 
    ADD COLUMN user_id UUID REFERENCES pos_users(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON refunds(user_id);
  END IF;
END $$;

-- ============================================
-- 11. UNITS TABLE (if exists)
-- ============================================
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'units'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'units' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE units 
    ADD COLUMN user_id UUID REFERENCES pos_users(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_units_user_id ON units(user_id);
    
    -- Drop unique constraint on name, add composite unique constraint
    IF EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'units_name_key'
    ) THEN
      ALTER TABLE units DROP CONSTRAINT units_name_key;
    END IF;
    
    -- Add composite unique constraint (name + user_id)
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'units_name_user_id_key'
    ) THEN
      ALTER TABLE units ADD CONSTRAINT units_name_user_id_key UNIQUE (name, user_id);
    END IF;
  END IF;
END $$;

-- ============================================
-- 12. EMPLOYEES TABLE (if exists)
-- ============================================
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'employees'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE employees 
    ADD COLUMN user_id UUID REFERENCES pos_users(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
  END IF;
END $$;

-- ============================================
-- 13. EMPLOYEE_SALARIES TABLE (if exists)
-- ============================================
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'employee_salaries'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'employee_salaries' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE employee_salaries 
    ADD COLUMN user_id UUID REFERENCES pos_users(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_employee_salaries_user_id ON employee_salaries(user_id);
  END IF;
END $$;

-- ============================================
-- 14. PAYROLL_RUNS TABLE (if exists)
-- ============================================
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'payroll_runs'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'payroll_runs' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE payroll_runs 
    ADD COLUMN user_id UUID REFERENCES pos_users(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_payroll_runs_user_id ON payroll_runs(user_id);
  END IF;
END $$;

-- ============================================
-- 15. PAYROLL_LINES TABLE (if exists)
-- ============================================
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'payroll_lines'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'payroll_lines' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE payroll_lines 
    ADD COLUMN user_id UUID REFERENCES pos_users(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_payroll_lines_user_id ON payroll_lines(user_id);
  END IF;
END $$;

-- ============================================
-- 16. EMPLOYEE_LEDGER_ENTRIES TABLE (if exists)
-- ============================================
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'employee_ledger_entries'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'employee_ledger_entries' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE employee_ledger_entries 
    ADD COLUMN user_id UUID REFERENCES pos_users(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_employee_ledger_entries_user_id ON employee_ledger_entries(user_id);
  END IF;
END $$;

-- ============================================
-- NOTES
-- ============================================
-- After running this migration:
-- 1. Existing data will have NULL user_id (you may want to assign them to a default user)
-- 2. All new inserts must include user_id
-- 3. All queries must filter by user_id
-- 4. Update your application code to:
--    - Get current user from session
--    - Add user_id to all INSERT statements
--    - Add .eq('user_id', currentUser.id) to all SELECT queries
