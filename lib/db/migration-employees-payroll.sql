-- Migration: Employees & Payroll Module
-- Run this in Supabase SQL Editor
--
-- NOTE: After running this migration, update the default privileges in schema.sql
-- to include "employees_payroll": false in the pos_users.privileges JSONB default.
-- For existing users, you may want to add this privilege manually or via a script.

-- ============================================
-- 1. EMPLOYEES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES pos_users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  designation TEXT,
  join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
  bank_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for employees
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_created_at ON employees(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email) WHERE email IS NOT NULL;

-- Trigger to update updated_at for employees
CREATE TRIGGER update_employees_updated_at 
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. EMPLOYEE_SALARIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS employee_salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  effective_from DATE NOT NULL,
  basic_salary NUMERIC(10, 2) NOT NULL CHECK (basic_salary >= 0),
  allowances JSONB DEFAULT '[]'::jsonb,
  deductions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for employee_salaries
CREATE INDEX IF NOT EXISTS idx_employee_salaries_employee_id ON employee_salaries(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_salaries_effective_from ON employee_salaries(employee_id, effective_from DESC);

-- ============================================
-- 3. EMPLOYEE_LEDGER_ENTRIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS employee_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  debit NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  reference_type TEXT CHECK (reference_type IN ('salary_payment', 'advance', 'adjustment', 'other')),
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for employee_ledger_entries
CREATE INDEX IF NOT EXISTS idx_employee_ledger_entries_employee_id ON employee_ledger_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_ledger_entries_entry_date ON employee_ledger_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_employee_ledger_entries_reference ON employee_ledger_entries(reference_type, reference_id) WHERE reference_type IS NOT NULL;

-- ============================================
-- 4. PAYROLL_RUNS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processed', 'paid')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  UNIQUE(month)
);

-- Indexes for payroll_runs
CREATE INDEX IF NOT EXISTS idx_payroll_runs_month ON payroll_runs(month DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_status ON payroll_runs(status);

-- ============================================
-- 5. PAYROLL_LINES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payroll_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  gross NUMERIC(10, 2) NOT NULL CHECK (gross >= 0),
  deductions NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (deductions >= 0),
  net NUMERIC(10, 2) NOT NULL CHECK (net >= 0),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
  paid_at TIMESTAMPTZ,
  ledger_entry_id UUID REFERENCES employee_ledger_entries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(payroll_id, employee_id)
);

-- Indexes for payroll_lines
CREATE INDEX IF NOT EXISTS idx_payroll_lines_payroll_id ON payroll_lines(payroll_id);
CREATE INDEX IF NOT EXISTS idx_payroll_lines_employee_id ON payroll_lines(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_lines_payment_status ON payroll_lines(payment_status);

-- ============================================
-- 6. RLS (consistent with rest of schema - custom auth)
-- ============================================
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE employee_salaries DISABLE ROW LEVEL SECURITY;
ALTER TABLE employee_ledger_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs DISABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_lines DISABLE ROW LEVEL SECURITY;
