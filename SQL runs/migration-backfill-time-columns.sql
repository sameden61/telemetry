-- Migration: Backfill time and cumulative_time columns for existing telemetry data
-- This recalculates time values for all existing sessions

-- Create a temporary function to calculate time for a single session
CREATE OR REPLACE FUNCTION backfill_session_time(p_session_id UUID)
RETURNS void AS $$
DECLARE
  v_record RECORD;
  v_prev_distance DECIMAL(10,2);
  v_prev_speed DECIMAL(10,2);
  v_cumulative_time DECIMAL(10,3) := 0;
  v_segment_time DECIMAL(10,3);
  v_is_first BOOLEAN := TRUE;
  v_max_distance DECIMAL(10,2);
  v_lap_time DECIMAL(10,3);
  v_file_type TEXT;
  v_track_scale DECIMAL(10,6) := 1.0;
  v_calculated_lap_time DECIMAL(10,3);
BEGIN
  -- Get session info
  SELECT lap_time, file_type INTO v_lap_time, v_file_type
  FROM telemetry_sessions
  WHERE id = p_session_id;
  
  -- Always mark for potential scaling check - we'll determine after calculating times
  -- This catches all cases where times don't match lap time
  v_track_scale := NULL;
  -- Process each data point in order by data_index
  FOR v_record IN 
    SELECT id, distance, speed, data_index
    FROM telemetry_data
    WHERE session_id = p_session_id
    ORDER BY data_index ASC
  LOOP
    IF v_is_first THEN
      -- First point has time = 0
      v_segment_time := 0;
      v_is_first := FALSE;
    ELSE
      -- Calculate segment time
      -- Formula: time (s) = (distance_delta (m) * 3.6) / speed (km/h)
      -- This converts: distance in meters, speed in km/h -> time in seconds
      DECLARE
        v_distance_delta DECIMAL(10,2);
        v_avg_speed DECIMAL(10,2);
      BEGIN
        v_distance_delta := v_record.distance - v_prev_distance;
        v_avg_speed := (v_record.speed + v_prev_speed) / 2.0;
        
        IF v_avg_speed > 0 THEN
          -- time (s) = distance (m) * 3.6 / speed (km/h)
          v_segment_time := (v_distance_delta * 3.6) / v_avg_speed;
        ELSE
          v_segment_time := 0;
        END IF;
      END;
    END IF;
    
    -- Add to cumulative time
    v_cumulative_time := v_cumulative_time + v_segment_time;
    
    -- Update the record
    UPDATE telemetry_data
    SET 
      time = v_segment_time,
      cumulative_time = v_cumulative_time
    WHERE id = v_record.id;
    
    -- Store current values for next iteration
    v_prev_distance := v_record.distance;
    v_prev_speed := v_record.speed;
  END LOOP;
  
  -- Check if we need to scale (for TC files with wrong track length)
  IF v_track_scale IS NULL AND v_cumulative_time > 0 AND v_lap_time > 0 THEN
    -- Calculate scale factor: how much do we need to multiply times by?
    v_track_scale := v_lap_time / v_cumulative_time;
    
    -- If scale is significantly different from 1.0, we need to recalculate
    IF ABS(v_track_scale - 1.0) > 0.1 THEN
      RAISE NOTICE 'Session % needs scaling by factor % (calculated: %s, expected: %s)', 
        p_session_id, v_track_scale, v_cumulative_time, v_lap_time;
      
      -- Scale all times for this session
      UPDATE telemetry_data
      SET 
        time = time * v_track_scale,
        cumulative_time = cumulative_time * v_track_scale
      WHERE session_id = p_session_id;
      
      -- Also scale distances to match
      UPDATE telemetry_data
      SET distance = distance * v_track_scale
      WHERE session_id = p_session_id;
    END IF;
  END IF;
  
  RAISE NOTICE 'Backfilled session % (scale factor: %)', p_session_id, COALESCE(v_track_scale, 1.0);
END;
$$ LANGUAGE plpgsql;

-- Run the backfill for all sessions
DO $$
DECLARE
  v_session_record RECORD;
  v_session_count INTEGER := 0;
  v_total_sessions INTEGER;
BEGIN
  -- Get total count for progress tracking
  SELECT COUNT(*) INTO v_total_sessions FROM telemetry_sessions;
  
  RAISE NOTICE 'Starting backfill for % sessions...', v_total_sessions;
  
  -- Process each session
  FOR v_session_record IN 
    SELECT id FROM telemetry_sessions
    ORDER BY created_at ASC
  LOOP
    PERFORM backfill_session_time(v_session_record.id);
    v_session_count := v_session_count + 1;
    
    -- Progress update every 10 sessions
    IF v_session_count % 10 = 0 THEN
      RAISE NOTICE 'Processed % of % sessions...', v_session_count, v_total_sessions;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Backfill complete! Processed % sessions.', v_session_count;
END $$;

-- Drop the temporary function
DROP FUNCTION backfill_session_time(UUID);

-- Verify the backfill
DO $$
DECLARE
  v_null_count INTEGER;
  v_total_count INTEGER;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE time IS NULL OR cumulative_time IS NULL),
    COUNT(*)
  INTO v_null_count, v_total_count
  FROM telemetry_data;
  
  RAISE NOTICE 'Verification: % of % records have time values (% null)', 
    v_total_count - v_null_count, v_total_count, v_null_count;
  
  IF v_null_count > 0 THEN
    RAISE WARNING 'Some records still have NULL time values. Manual review may be needed.';
  ELSE
    RAISE NOTICE 'Success! All records have been backfilled.';
  END IF;
END $$;

-- Sample query to check results
SELECT 
  s.id as session_id,
  s.lap_time as session_lap_time,
  MAX(td.cumulative_time) as calculated_lap_time,
  ABS(s.lap_time - MAX(td.cumulative_time)) as time_difference,
  COUNT(*) as data_points
FROM telemetry_sessions s
JOIN telemetry_data td ON td.session_id = s.id
GROUP BY s.id, s.lap_time
ORDER BY time_difference DESC
LIMIT 10;

