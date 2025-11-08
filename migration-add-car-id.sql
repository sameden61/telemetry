-- Migration: Add car_id column to existing tables
-- Run this in your Supabase SQL Editor if you have an existing database

-- First, ensure cars table exists
CREATE TABLE IF NOT EXISTS cars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  manufacturer TEXT,
  category TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default cars if they don't exist
INSERT INTO cars (name, display_name, manufacturer, category) VALUES
('ferrari_488_gt3', 'Ferrari 488 GT3', 'Ferrari', 'GT3'),
('porsche_991_gt3_r', 'Porsche 991 GT3 R', 'Porsche', 'GT3'),
('mercedes_amg_gt3', 'Mercedes AMG GT3', 'Mercedes', 'GT3'),
('bmw_m4_gt3', 'BMW M4 GT3', 'BMW', 'GT3')
ON CONFLICT (name) DO NOTHING;

-- Add car_id to telemetry_sessions if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'telemetry_sessions' AND column_name = 'car_id'
  ) THEN
    -- Add the column
    ALTER TABLE telemetry_sessions
    ADD COLUMN car_id UUID REFERENCES cars(id) ON DELETE CASCADE;

    -- Set a default car for existing records (Ferrari 488 GT3)
    UPDATE telemetry_sessions
    SET car_id = (SELECT id FROM cars WHERE name = 'ferrari_488_gt3' LIMIT 1)
    WHERE car_id IS NULL;

    RAISE NOTICE 'Added car_id column to telemetry_sessions';
  ELSE
    RAISE NOTICE 'car_id column already exists in telemetry_sessions';
  END IF;
END $$;

-- Add car_id to corner_analysis if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'corner_analysis' AND column_name = 'car_id'
  ) THEN
    -- Add the column
    ALTER TABLE corner_analysis
    ADD COLUMN car_id UUID REFERENCES cars(id) ON DELETE CASCADE;

    -- Update existing records with car_id from their session
    UPDATE corner_analysis ca
    SET car_id = ts.car_id
    FROM telemetry_sessions ts
    WHERE ca.session_id = ts.id
    AND ca.car_id IS NULL;

    RAISE NOTICE 'Added car_id column to corner_analysis';
  ELSE
    RAISE NOTICE 'car_id column already exists in corner_analysis';
  END IF;
END $$;

-- Recreate the index on telemetry_sessions if needed
DROP INDEX IF EXISTS idx_telemetry_sessions_user_circuit_car;
CREATE INDEX IF NOT EXISTS idx_telemetry_sessions_user_circuit_car
ON telemetry_sessions(user_id, circuit_id, car_id);

-- Recreate the index on corner_analysis if needed
DROP INDEX IF EXISTS idx_corner_analysis_lookup;
CREATE INDEX IF NOT EXISTS idx_corner_analysis_lookup
ON corner_analysis(user_id, circuit_id, car_id, corner_type);

-- Verify the changes
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('telemetry_sessions', 'corner_analysis')
  AND column_name = 'car_id'
ORDER BY table_name;
