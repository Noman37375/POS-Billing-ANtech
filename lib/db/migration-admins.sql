-- Migration: Admins Table
-- Run this SQL in your Supabase SQL editor to create the admins table
-- This table is used for super-admin authentication separate from POS users

CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_is_active ON admins(is_active);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_admins_updated_at 
  BEFORE UPDATE ON admins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS: Disable RLS (consistent with pos_users approach - server-side auth only)
ALTER TABLE admins DISABLE ROW LEVEL SECURITY;

-- Note: To create the first admin user, run:
-- INSERT INTO admins (email, password_hash, name, is_active)
-- VALUES ('admin@example.com', '<bcrypt_hash_of_password>', 'Admin Name', true);
-- 
-- To generate bcrypt hash, use Node.js:
-- const bcrypt = require('bcryptjs');
-- const hash = await bcrypt.hash('your_password', 10);
