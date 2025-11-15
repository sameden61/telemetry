-- Migration: Add scaled_distance column for normalized lap comparisons
-- Date: 2025-11-14
-- Purpose: Add scaled_distance (0-100 percentage) for consistent comparisons
--          regardless of track length or sampling rate

-- Step 1: Add the new column
ALTER TABLE telemetry_data
ADD COLUMN scaled_distance DECIMAL(10,6) DEFAULT 0 NOT NULL;

COMMENT ON COLUMN telemetry_data.scaled_distance IS 'Normalized distance as percentage of lap completion (0-100). Allows consistent comparisons across different tracks and sampling rates.';

-- Step 2: Create index for efficient queries on scaled_distance
CREATE INDEX idx_telemetry_data_scaled_distance
ON telemetry_data(session_id, scaled_distance);

COMMENT ON INDEX idx_telemetry_data_scaled_distance IS 'Index for efficient scaled_distance-based queries and comparisons';

-- Step 3: Backfill existing data with scaled_distance
-- This calculates scaled_distance = (distance / max_distance_in_session) * 100
-- for all existing telemetry data

-- Create a temporary function to calculate and update scaled distances
DO $$
DECLARE
  session_record RECORD;
  max_dist DECIMAL;
BEGIN
  -- Loop through each unique session
  FOR session_record IN
    SELECT DISTINCT session_id FROM telemetry_data
  LOOP
    -- Get max distance for this session
    SELECT MAX(distance) INTO max_dist
    FROM telemetry_data
    WHERE session_id = session_record.session_id;

    -- Avoid division by zero
    IF max_dist > 0 THEN
      -- Update all rows in this session with calculated scaled_distance
      UPDATE telemetry_data
      SET scaled_distance = (distance / max_dist) * 100
      WHERE session_id = session_record.session_id;

      RAISE NOTICE 'Updated session % (max_distance: %m)',
        session_record.session_id, max_dist;
    ELSE
      RAISE WARNING 'Session % has max_distance = 0, skipping',
        session_record.session_id;
    END IF;
  END LOOP;
END $$;

-- Step 4: Verify the migration
-- This query shows sample data to verify scaled_distance was calculated correctly
SELECT
  session_id,
  data_index,
  distance,
  scaled_distance,
  ROUND((distance / MAX(distance) OVER (PARTITION BY session_id)) * 100, 6) as calculated_scaled_distance,
  CASE
    WHEN scaled_distance = ROUND((distance / MAX(distance) OVER (PARTITION BY session_id)) * 100, 6)
    THEN 'OK'
    ELSE 'MISMATCH'
  END as verification
FROM telemetry_data
ORDER BY session_id, data_index
LIMIT 20;

-- Summary statistics
SELECT
  COUNT(DISTINCT session_id) as total_sessions,
  COUNT(*) as total_datapoints,
  MIN(scaled_distance) as min_scaled_distance,
  MAX(scaled_distance) as max_scaled_distance,
  AVG(scaled_distance) as avg_scaled_distance,
  COUNT(CASE WHEN scaled_distance < 0 OR scaled_distance > 100 THEN 1 END) as out_of_range_count
FROM telemetry_data;

-- Expected results:
-- - min_scaled_distance should be close to 0
-- - max_scaled_distance should be close to 100
-- - out_of_range_count should be 0
