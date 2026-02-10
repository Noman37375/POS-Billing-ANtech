-- Migration: Add units table and unit_id to inventory_items
-- Created: 2026-01-23

-- Create units table
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  symbol VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unit_id column to inventory_items
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units(id) ON DELETE SET NULL;

-- Create index on unit_id for better query performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_unit_id ON inventory_items(unit_id);

-- Enable RLS on units table
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read all units
CREATE POLICY "Users can read units"
  ON units
  FOR SELECT
  USING (true);

-- RLS Policy: Users can insert units
CREATE POLICY "Users can insert units"
  ON units
  FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Users can update units
CREATE POLICY "Users can update units"
  ON units
  FOR UPDATE
  USING (true);

-- RLS Policy: Users can delete units
CREATE POLICY "Users can delete units"
  ON units
  FOR DELETE
  USING (true);

-- Insert some default units
INSERT INTO units (name, symbol) VALUES
  ('Piece', 'pcs'),
  ('Kilogram', 'kg'),
  ('Gram', 'g'),
  ('Liter', 'L'),
  ('Milliliter', 'mL'),
  ('Meter', 'm'),
  ('Centimeter', 'cm'),
  ('Box', 'box'),
  ('Pack', 'pack'),
  ('Dozen', 'doz')
ON CONFLICT (name) DO NOTHING;
