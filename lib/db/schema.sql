-- POS Users Table Schema
-- Run this SQL in your Supabase SQL editor to create the pos_users table

CREATE TABLE IF NOT EXISTS pos_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('pos_user', 'sub_pos_user')),
  parent_user_id UUID REFERENCES pos_users(id) ON DELETE CASCADE,
  name TEXT,
  privileges JSONB NOT NULL DEFAULT '{
    "dashboard": false,
    "parties": false,
    "inventory": false,
    "inventory_report": false,
    "categories": false,
    "barcode": false,
    "invoices_create": false,
    "invoices_list": false,
    "accounts": false,
    "returns_refunds": false
  }'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pos_users_email ON pos_users(email);
CREATE INDEX IF NOT EXISTS idx_pos_users_parent_user_id ON pos_users(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_pos_users_role ON pos_users(role);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_pos_users_updated_at 
  BEFORE UPDATE ON pos_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) policies (optional, adjust based on your needs)
ALTER TABLE pos_users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own record and sub-users (for admin)
CREATE POLICY "Users can view own and sub-users" ON pos_users
  FOR SELECT
  USING (
    auth.uid()::text = id::text OR 
    parent_user_id::text = auth.uid()::text
  );

-- Note: For custom auth, you may want to disable RLS or adjust policies
-- based on your session management approach
