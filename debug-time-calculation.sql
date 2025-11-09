-- Debug query to check time calculations
-- Run this to diagnose why cumulative time doesn't match lap time

-- 1. Check a few sessions and compare recorded lap time vs calculated cumulative time
SELECT 
  s.file_name,
  s.lap_time as recorded_lap_time,
  MAX(td.cumulative_time) as calculated_cumulative_time,
  s.lap_time - MAX(td.cumulative_time) as difference,
  COUNT(td.id) as data_points,
  MAX(td.distance) as max_distance
FROM telemetry_sessions s
JOIN telemetry_data td ON td.session_id = s.id
WHERE s.file_name LIKE '%spa%' OR s.file_name LIKE '%tatuus%' OR s.file_name LIKE '%f1%'
GROUP BY s.id, s.file_name, s.lap_time
ORDER BY s.lap_time DESC
LIMIT 10;

-- 2. Check sample time calculations for one session
-- Replace SESSION_ID with an actual session ID from above query
WITH session_sample AS (
  SELECT 
    data_index,
    distance,
    speed,
    time,
    cumulative_time,
    LAG(distance) OVER (ORDER BY data_index) as prev_distance,
    LAG(speed) OVER (ORDER BY data_index) as prev_speed
  FROM telemetry_data
  WHERE session_id = 'SESSION_ID'  -- Replace with actual ID
  ORDER BY data_index
  LIMIT 20
)
SELECT 
  data_index,
  distance,
  speed,
  time as stored_time,
  cumulative_time,
  prev_distance,
  prev_speed,
  -- Recalculate what time SHOULD be
  CASE 
    WHEN prev_distance IS NOT NULL AND prev_speed IS NOT NULL AND (speed + prev_speed) / 2.0 > 0
    THEN ((distance - prev_distance) * 3.6) / ((speed + prev_speed) / 2.0)
    ELSE 0
  END as calculated_time,
  -- Show if there's a mismatch
  ABS(time - CASE 
    WHEN prev_distance IS NOT NULL AND prev_speed IS NOT NULL AND (speed + prev_speed) / 2.0 > 0
    THEN ((distance - prev_distance) * 3.6) / ((speed + prev_speed) / 2.0)
    ELSE 0
  END) as time_difference
FROM session_sample;

-- 3. Manual calculation example with first few points
-- Replace SESSION_ID
SELECT 
  data_index,
  distance,
  speed,
  time,
  cumulative_time,
  -- Show what the calculation should be
  distance - LAG(distance) OVER (ORDER BY data_index) as distance_delta,
  (speed + LAG(speed) OVER (ORDER BY data_index)) / 2.0 as avg_speed,
  -- Manual time calculation
  CASE 
    WHEN LAG(distance) OVER (ORDER BY data_index) IS NOT NULL
    THEN (distance - LAG(distance) OVER (ORDER BY data_index)) * 3.6 / 
         NULLIF((speed + LAG(speed) OVER (ORDER BY data_index)) / 2.0, 0)
    ELSE 0
  END as manual_time_calc
FROM telemetry_data
WHERE session_id = 'SESSION_ID'  -- Replace with actual ID
ORDER BY data_index
LIMIT 10;

-- 4. Check if distance units might be wrong
SELECT 
  s.file_name,
  s.file_type,
  MIN(td.distance) as min_distance,
  MAX(td.distance) as max_distance,
  AVG(td.speed) as avg_speed,
  COUNT(*) as point_count
FROM telemetry_sessions s
JOIN telemetry_data td ON td.session_id = s.id
GROUP BY s.id, s.file_name, s.file_type
ORDER BY s.lap_time DESC
LIMIT 10;

