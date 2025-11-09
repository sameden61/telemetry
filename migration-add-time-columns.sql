-- Migration: Add time columns to telemetry_data table
-- This adds time per data point and cumulative time for temporal analysis

-- Add time column (time in seconds for the segment between this point and the previous)
ALTER TABLE telemetry_data 
ADD COLUMN IF NOT EXISTS time DECIMAL(10,3);

-- Add cumulative_time column (running total of time from start of lap)
ALTER TABLE telemetry_data 
ADD COLUMN IF NOT EXISTS cumulative_time DECIMAL(10,3);

-- Add comment to document the columns
COMMENT ON COLUMN telemetry_data.time IS 'Time in seconds for the segment between this data point and the previous point. Calculated as: distance_delta / speed (with unit conversions)';
COMMENT ON COLUMN telemetry_data.cumulative_time IS 'Cumulative time in seconds from the start of the lap';

-- Create index for time-based queries
CREATE INDEX IF NOT EXISTS idx_telemetry_data_cumulative_time ON telemetry_data(session_id, cumulative_time);

