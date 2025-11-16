-- Fix the two sessions with incorrect time calculations
-- These didn't get auto-scaled by the backfill script

-- Session 1: db91e233-ec11-4f95-877b-4c74eff442c9
-- Scale factor: 100.781 / 337.930 = 0.298 (divide times by 3.35)
DO $$
DECLARE
  v_session_id UUID := 'db91e233-ec11-4f95-877b-4c74eff442c9';
  v_scale_factor DECIMAL := 100.781 / 337.930;
BEGIN
  UPDATE telemetry_data
  SET 
    time = time * v_scale_factor,
    cumulative_time = cumulative_time * v_scale_factor,
    distance = distance * v_scale_factor
  WHERE session_id = v_session_id;
  
  RAISE NOTICE 'Fixed session % with scale factor %', v_session_id, v_scale_factor;
END $$;

-- Session 2: 86bdf98f-ddcb-415b-b741-c03b48aa0134
-- Scale factor: 96.693 / 239.085 = 0.404 (divide times by 2.47)
DO $$
DECLARE
  v_session_id UUID := '86bdf98f-ddcb-415b-b741-c03b48aa0134';
  v_scale_factor DECIMAL := 96.693 / 239.085;
BEGIN
  UPDATE telemetry_data
  SET 
    time = time * v_scale_factor,
    cumulative_time = cumulative_time * v_scale_factor,
    distance = distance * v_scale_factor
  WHERE session_id = v_session_id;
  
  RAISE NOTICE 'Fixed session % with scale factor %', v_session_id, v_scale_factor;
END $$;

-- Verify the fix
SELECT 
  s.id as session_id,
  s.file_name,
  s.lap_time as session_lap_time,
  MAX(td.cumulative_time) as calculated_lap_time,
  ABS(s.lap_time - MAX(td.cumulative_time)) as time_difference,
  COUNT(*) as data_points
FROM telemetry_sessions s
JOIN telemetry_data td ON td.session_id = s.id
WHERE s.id IN (
  'db91e233-ec11-4f95-877b-4c74eff442c9',
  '86bdf98f-ddcb-415b-b741-c03b48aa0134'
)
GROUP BY s.id, s.file_name, s.lap_time
ORDER BY time_difference DESC;

