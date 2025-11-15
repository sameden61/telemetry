-- F1 Telemetry Comparison Tool - Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial users
INSERT INTO users (name, display_name) VALUES
  ('sam', 'Sam'),
  ('friend', 'Friend')
ON CONFLICT (name) DO NOTHING;

-- Cars table (stores available cars)
CREATE TABLE IF NOT EXISTS cars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  manufacturer TEXT,
  category TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default cars
INSERT INTO cars (name, display_name, manufacturer, category) VALUES
('ferrari_488_gt3', 'Ferrari 488 GT3', 'Ferrari', 'GT3'),
('porsche_991_gt3_r', 'Porsche 991 GT3 R', 'Porsche', 'GT3'),
('mercedes_amg_gt3', 'Mercedes AMG GT3', 'Mercedes', 'GT3'),
('bmw_m4_gt3', 'BMW M4 GT3', 'BMW', 'GT3')
ON CONFLICT (name) DO NOTHING;

-- Circuits table (stores circuit configurations)
CREATE TABLE IF NOT EXISTS circuits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  country TEXT,
  corner_classifications JSONB DEFAULT '{"slow": {"min": 0, "max": 100}, "medium": {"min": 100, "max": 180}, "fast": {"min": 180, "max": 999}}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default circuits
INSERT INTO circuits (name, display_name, country, corner_classifications) VALUES
('monza', 'Monza', 'Italy', '{"slow": {"min": 0, "max": 120}, "medium": {"min": 120, "max": 200}, "fast": {"min": 200, "max": 999}}'::jsonb),
('spa', 'Spa-Francorchamps', 'Belgium', '{"slow": {"min": 0, "max": 100}, "medium": {"min": 100, "max": 180}, "fast": {"min": 180, "max": 999}}'::jsonb),
('silverstone', 'Silverstone', 'United Kingdom', '{"slow": {"min": 0, "max": 110}, "medium": {"min": 110, "max": 190}, "fast": {"min": 190, "max": 999}}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Telemetry sessions table
CREATE TABLE IF NOT EXISTS telemetry_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  circuit_id UUID REFERENCES circuits(id) ON DELETE CASCADE,
  car_id UUID REFERENCES cars(id) ON DELETE CASCADE,
  session_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  lap_time DECIMAL(10,3),
  best_lap_number INTEGER,
  file_name TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Telemetry data table (stores actual lap data points)
CREATE TABLE IF NOT EXISTS telemetry_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES telemetry_sessions(id) ON DELETE CASCADE,
  distance DECIMAL(10,2),
  speed DECIMAL(10,2),
  throttle DECIMAL(5,2),
  brake DECIMAL(5,2),
  gear INTEGER,
  rpm INTEGER,
  lateral_g DECIMAL(5,3),
  longitudinal_g DECIMAL(5,3),
  time DECIMAL(10,3), -- Time in seconds for segment between this point and previous
  cumulative_time DECIMAL(10,3), -- Cumulative time from start of lap in seconds
  scaled_distance DECIMAL(10,6) DEFAULT 0 NOT NULL, -- Normalized distance 0-100 (percentage of lap)
  data_index INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_telemetry_data_session ON telemetry_data(session_id, data_index);
CREATE INDEX IF NOT EXISTS idx_telemetry_sessions_user_circuit_car ON telemetry_sessions(user_id, circuit_id, car_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_data_distance ON telemetry_data(session_id, distance);
CREATE INDEX IF NOT EXISTS idx_telemetry_data_cumulative_time ON telemetry_data(session_id, cumulative_time);
CREATE INDEX IF NOT EXISTS idx_telemetry_data_scaled_distance ON telemetry_data(session_id, scaled_distance);

-- Corner analysis cache table (pre-computed corner stats)
CREATE TABLE IF NOT EXISTS corner_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES telemetry_sessions(id) ON DELETE CASCADE,
  circuit_id UUID REFERENCES circuits(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  car_id UUID REFERENCES cars(id) ON DELETE CASCADE,
  corner_type TEXT CHECK (corner_type IN ('slow', 'medium', 'fast')),
  entry_speed_avg DECIMAL(10,2),
  exit_speed_avg DECIMAL(10,2),
  min_speed DECIMAL(10,2),
  max_brake_pressure DECIMAL(5,2),
  corner_count INTEGER,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corner_analysis_lookup ON corner_analysis(user_id, circuit_id, car_id, corner_type);

-- Views for easier querying
CREATE OR REPLACE VIEW session_comparisons AS
SELECT
  s1.id as session1_id,
  s2.id as session2_id,
  s1.user_id as user1_id,
  s2.user_id as user2_id,
  s1.circuit_id,
  s1.car_id,
  s1.lap_time as user1_lap_time,
  s2.lap_time as user2_lap_time,
  s1.lap_time - s2.lap_time as time_delta
FROM telemetry_sessions s1
JOIN telemetry_sessions s2
  ON s1.circuit_id = s2.circuit_id
  AND s1.car_id = s2.car_id
  AND s1.user_id != s2.user_id;
