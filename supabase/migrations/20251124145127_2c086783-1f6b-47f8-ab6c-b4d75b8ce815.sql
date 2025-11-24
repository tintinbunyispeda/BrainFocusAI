-- Add material tracking to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS material_name TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS material_category TEXT;

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_sessions_material ON sessions(user_id, material_category);