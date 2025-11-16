-- Add version tracking for duplicate file uploads
-- This allows users to upload the same filename multiple times and track each version

-- Add version column (defaults to 1)
ALTER TABLE telemetry_sessions
ADD COLUMN version INTEGER DEFAULT 1 NOT NULL;

-- Add uploaded_at timestamp to track when each version was uploaded
ALTER TABLE telemetry_sessions
ADD COLUMN uploaded_at TIMESTAMP DEFAULT NOW() NOT NULL;

-- Create composite index for fast version lookup
CREATE INDEX idx_telemetry_sessions_version_lookup
ON telemetry_sessions(user_id, circuit_id, car_id, file_name, version DESC);

-- Add comment to document the versioning
COMMENT ON COLUMN telemetry_sessions.version IS 'Version number for duplicate file uploads (auto-incremented per user/circuit/car/filename combination)';
COMMENT ON COLUMN telemetry_sessions.uploaded_at IS 'Timestamp when this version was uploaded';
