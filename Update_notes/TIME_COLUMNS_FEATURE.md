# Time Columns Feature

## Overview

This feature adds temporal analysis capabilities to telemetry data by calculating time intervals and cumulative time for each data point in both TC and CSV files.

## What Was Added

### Database Changes

Two new columns were added to the `telemetry_data` table:

1. **`time`** (DECIMAL(10,3))
   - Time in seconds for the segment between this data point and the previous one
   - Calculated using: `time = distance_delta / speed` (with proper unit conversions)
   - First data point has `time = 0` (no previous point to compare)

2. **`cumulative_time`** (DECIMAL(10,3))
   - Running total of time from the start of the lap in seconds
   - Enables time-based analysis and synchronization across different sessions

### New Index
- `idx_telemetry_data_cumulative_time` on `(session_id, cumulative_time)` for efficient time-based queries

## Implementation Details

### Unit Conversions

The time calculation uses the following formula:

```
time (seconds) = (distance (meters) / speed (km/h)) × 3.6
```

**Why multiply by 3.6?**
- Distance is in meters
- Speed is in km/h
- To convert km/h to m/s: divide by 3.6
- Therefore: time = distance / (speed / 3.6) = (distance / speed) × 3.6

**Average Speed Calculation:**
- Uses average speed between consecutive points: `avgSpeed = (speed[i] + speed[i-1]) / 2`
- This provides more accurate time estimation between sample points

### Sorting

Both parsers now ensure data is sorted before calculating time:
- **TC files**: Sorted by `position` (0.0 to 1.0 normalized lap distance)
- **CSV files**: Sorted by `distance` (absolute distance in meters)

This ensures accurate delta calculations between consecutive points.

### TC File Parsing (`tcParser.ts`)

The `convertTCToTelemetry()` function was updated to:

1. Sort datapoints by position
2. For each point (after the first):
   - Calculate distance delta from previous point
   - Calculate average speed between points
   - Calculate segment time using the formula above
   - Add to cumulative time
3. Return telemetry data with `time` and `cumulative_time` fields

**Example:**
```typescript
// Point i=0: position=0.000, speed=50 km/h
//   time=0, cumulative_time=0

// Point i=1: position=0.025, speed=60 km/h
//   distance_delta = 0.025 * trackLength
//   avgSpeed = (50 + 60) / 2 = 55 km/h
//   time = (distance_delta / 55) * 3.6
//   cumulative_time = 0 + time
```

### CSV File Parsing (`csvParser.js`)

The `normalizeTelemetryData()` function was updated similarly:

1. Sort data by distance
2. For each point (after the first):
   - Calculate distance delta
   - Calculate average speed
   - Calculate segment time
   - Add to cumulative time
3. Return normalized data with `time` and `cumulative_time` fields

### Worker API (`index.ts`)

The `/api/telemetry-data` POST endpoint was updated to:
- Accept `time` and `cumulative_time` fields from telemetry points
- Handle both camelCase and snake_case naming conventions
- Store these values in the database with default value of 0 if missing

## Usage Examples

### Querying by Time

```sql
-- Get telemetry data at specific time intervals
SELECT * FROM telemetry_data 
WHERE session_id = '...' 
  AND cumulative_time BETWEEN 10.0 AND 15.0
ORDER BY cumulative_time;

-- Find time deltas between sessions
SELECT 
  s1.cumulative_time as time1,
  s2.cumulative_time as time2,
  s2.cumulative_time - s1.cumulative_time as time_delta
FROM telemetry_data s1
JOIN telemetry_data s2 
  ON s1.distance = s2.distance
WHERE s1.session_id = '...' AND s2.session_id = '...';
```

### Analyzing Time per Corner

```sql
-- Average time spent in braking zones
SELECT 
  AVG(time) as avg_segment_time,
  COUNT(*) as num_segments
FROM telemetry_data
WHERE session_id = '...'
  AND brake > 0.5;
```

## Migration

To apply this feature to an existing database:

```bash
# Run the migration SQL
psql -h your-supabase-host -U postgres -d postgres -f migration-add-time-columns.sql
```

**Note:** Existing telemetry data will have `NULL` values for `time` and `cumulative_time`. To populate these:
1. Re-upload telemetry files, OR
2. Write a backfill script to recalculate times from existing data

## Benefits

1. **Time-based Analysis**: Compare performance at specific time intervals rather than just distance
2. **Synchronization**: Align multiple laps by time for easier comparison
3. **Sector Analysis**: Calculate sector times and identify time gains/losses
4. **Visualization**: Plot telemetry metrics against time instead of distance
5. **Corner Timing**: Analyze time spent in different phases (braking, apex, acceleration)

## Files Modified

1. `migration-add-time-columns.sql` - New database migration
2. `database-schema.sql` - Updated schema documentation
3. `src/react-app/lib/tcParser.ts` - Added time calculations for TC files
4. `src/react-app/lib/csvParser.js` - Added time calculations for CSV files
5. `src/worker/index.ts` - Updated API to accept and store time fields

## Testing Recommendations

1. **Unit Tests**: Verify time calculations with known test data
2. **Integration Tests**: Upload sample TC and CSV files, verify time values
3. **Performance Tests**: Ensure new index doesn't impact query performance
4. **Validation**: Check that cumulative_time at end of lap matches lap_time in session

## Future Enhancements

Possible future improvements:
- Add lap sector definitions and auto-calculate sector times
- Time-based synchronization in comparison views
- Time delta visualizations (e.g., "gaining/losing time" plots)
- Predictive lap time estimation from partial lap data

