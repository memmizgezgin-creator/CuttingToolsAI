-- Add source attribution columns to products table.
-- Idempotent: IF NOT EXISTS guards allow re-running without error.
ALTER TABLE products ADD COLUMN IF NOT EXISTS source_file TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS source_page INTEGER;
