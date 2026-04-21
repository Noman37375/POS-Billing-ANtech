-- Migration: Expense Tracking
-- Run this in Supabase SQL editor

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL DEFAULT 'Other',
  description TEXT,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expenses_user_crud" ON expenses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Index for date queries
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date);

-- Also allow sub-users (admin_users) to manage expenses for their owner
CREATE POLICY "expenses_subuser_crud" ON expenses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.sub_user_id = auth.uid()
        AND au.owner_user_id = expenses.user_id
    )
  );
