-- Add file_type and r2_path columns to telemetry_sessions table
-- This allows tracking of different file formats and their storage locations

-- Add file_type column (csv or tc)
ALTER TABLE telemetry_sessions
ADD COLUMN file_type VARCHAR(10) DEFAULT 'csv' NOT NULL;

-- Add r2_path column for tracking file location in R2 storage
ALTER TABLE telemetry_sessions
ADD COLUMN r2_path TEXT;

-- Add comment to document the columns
COMMENT ON COLUMN telemetry_sessions.file_type IS 'Type of telemetry file: csv or tc';
COMMENT ON COLUMN telemetry_sessions.r2_path IS 'Path to the original file stored in R2 bucket';

-- Create index for faster queries by file type
CREATE INDEX idx_telemetry_sessions_file_type ON telemetry_sessions(file_type);
