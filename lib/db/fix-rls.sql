-- Fix RLS for custom authentication
-- Run this SQL in your Supabase SQL Editor

-- Option 1: Disable RLS (Recommended for custom auth)
ALTER TABLE pos_users DISABLE ROW LEVEL SECURITY;

-- Option 2: If you want to keep RLS enabled, drop the old policy and create a new one
-- that allows service role access (uncomment if needed)

-- DROP POLICY IF EXISTS "Users can view own and sub-users" ON pos_users;
-- 
-- -- Allow service role to access all records
-- CREATE POLICY "Service role can access all users" ON pos_users
--   FOR ALL
--   USING (true)
--   WITH CHECK (true);

-- Note: If using service role, make sure your Supabase client uses the service role key
-- For now, disabling RLS is the simplest solution for custom authentication
