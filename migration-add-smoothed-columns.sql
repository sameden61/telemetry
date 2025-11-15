-- Migration: Add smoothed gear and throttle columns
-- Date: 2025-11-15
-- Purpose: Add smoothed values to remove gear change spikes while preserving original data

-- Step 1: Add the new columns
ALTER TABLE telemetry_data
ADD COLUMN smoothed_gear DECIMAL(5,2) DEFAULT 0 NOT NULL,
ADD COLUMN smoothed_throttle DECIMAL(5,2) DEFAULT 0 NOT NULL;

COMMENT ON COLUMN telemetry_data.smoothed_gear IS 'Smoothed gear value with gear change spikes removed. Original gear data preserved in gear column.';
COMMENT ON COLUMN telemetry_data.smoothed_throttle IS 'Smoothed throttle value with gear change artifacts removed. Original throttle data preserved in throttle column.';

-- Step 2: Initialize smoothed values from original values for existing data
-- This will be replaced when files are re-uploaded with proper smoothing
UPDATE telemetry_data
SET smoothed_gear = gear,
    smoothed_throttle = throttle
WHERE smoothed_gear = 0 AND smoothed_throttle = 0;

-- Step 3: Verify the migration
SELECT
  COUNT(*) as total_rows,
  COUNT(CASE WHEN smoothed_gear > 0 THEN 1 END) as rows_with_smoothed_gear,
  COUNT(CASE WHEN smoothed_throttle > 0 THEN 1 END) as rows_with_smoothed_throttle
FROM telemetry_data;

-- Expected: All counts should be equal, meaning all rows have smoothed values
