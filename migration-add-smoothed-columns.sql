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
-- Using COUNT(column) instead of > 0 to include valid zero values (like neutral gear)
SELECT
  COUNT(*) as total_rows,
  COUNT(smoothed_gear) as rows_with_smoothed_gear,
  COUNT(smoothed_throttle) as rows_with_smoothed_throttle,
  CASE
    WHEN COUNT(*) = COUNT(smoothed_gear) AND COUNT(*) = COUNT(smoothed_throttle)
    THEN '✓ ALL ROWS HAVE SMOOTHED VALUES'
    ELSE '✗ SOME ROWS MISSING SMOOTHED VALUES'
  END as status
FROM telemetry_data;

-- Sample verification - show original vs smoothed
SELECT
  session_id,
  data_index,
  gear as original_gear,
  smoothed_gear,
  throttle as original_throttle,
  smoothed_throttle
FROM telemetry_data
ORDER BY session_id, data_index
LIMIT 10;

-- Expected:
-- - All three counts should be equal (no rows removed)
-- - Status should show '✓ ALL ROWS HAVE SMOOTHED VALUES'
-- - For existing data, smoothed values = original until files are re-uploaded
