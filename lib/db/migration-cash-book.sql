-- Migration: Daily Cash Book — opening balance override
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS cash_book_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES pos_users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  opening_balance_override NUMERIC(10, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_cash_book_settings_user_date ON cash_book_settings(user_id, date);

DROP TRIGGER IF EXISTS update_cash_book_settings_updated_at ON cash_book_settings;
CREATE TRIGGER update_cash_book_settings_updated_at
  BEFORE UPDATE ON cash_book_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE cash_book_settings DISABLE ROW LEVEL SECURITY;
