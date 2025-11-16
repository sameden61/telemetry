# Time Delta Graph & Backfill Implementation

## Overview

This update adds a cumulative time delta graph to the Compare page and provides a backfill script to calculate time columns for existing telemetry data.

## What Was Added

### 1. Time Delta Chart Component

**File:** `src/react-app/components/charts/TimeDeltaChart.tsx`

A new chart component that displays the time difference between two sessions across the entire lap:

**Features:**
- Shows cumulative time delta (session1 - session2) throughout the lap
- Positive values = session1 is slower (taking more time)
- Negative values = session1 is faster (taking less time)
- Zero line indicates where drivers are equal
- Fill under curve for better visualization
- Summary annotation showing overall winner and time difference
- Always displayed (not affected by delta toggle)

**Visual Interpretation:**
```
                Time Delta Chart
     +2.0s ┌────────────────────────────┐
           │     ╱╲                     │  Session 1 slower
     +1.0s │    ╱  ╲                    │
           │   ╱    ╲                   │
      0.0s ├──────────╲─────────────────┤  Equal
           │           ╲      ╱         │
     -1.0s │            ╲    ╱          │  Session 1 faster
           │             ╲  ╱           │
     -2.0s └──────────────╲╱────────────┘
           0m          500m          1000m
```

### 2. Updated Compare Page

**File:** `src/react-app/pages/Compare.tsx`

**Changes:**
- Imported `TimeDeltaChart` component
- Updated `TelemetryDataPoint` interface to include `time` and `cumulative_time`
- Added new chart section that displays when exactly 2 sessions are selected
- Chart appears above the main telemetry charts
- Not affected by the delta toggle (always shows time delta)

**Display Order:**
1. Chart Controls (delta toggle)
2. **Time Delta Analysis** (NEW - only shown with 2 sessions)
3. Main Telemetry Charts (speed, brake, throttle, gear)
4. Lap Summary

### 3. Updated TelemetryChart Component

**File:** `src/react-app/components/charts/TelemetryChart.tsx`

**Changes:**
- Updated `TelemetryDataPoint` interface to include `time` and `cumulative_time`
- No functional changes to the chart rendering logic
- Now compatible with new data format

### 4. Backfill Script

**File:** `migration-backfill-time-columns.sql`

A comprehensive SQL script to calculate time columns for existing data:

**What It Does:**
1. Creates a temporary function `backfill_session_time()` that:
   - Takes a session_id as input
   - Retrieves all telemetry data ordered by `data_index`
   - Calculates time for each segment using the formula: `time = (distance_delta / avg_speed) × 3.6`
   - Calculates cumulative time as a running total
   - Updates each record with the calculated values

2. Processes all sessions in the database:
   - Iterates through all telemetry sessions
   - Calls the backfill function for each session
   - Provides progress updates every 10 sessions
   - Logs completion status

3. Verifies the results:
   - Checks for any remaining NULL values
   - Compares calculated lap time vs recorded lap time
   - Displays top 10 sessions with largest time discrepancies

4. Cleans up:
   - Drops the temporary function after completion

**Performance:**
- Processes data in batches per session
- Uses efficient indexing (by data_index)
- Suitable for databases with thousands of sessions

**Output Example:**
```
NOTICE:  Starting backfill for 45 sessions...
NOTICE:  Backfilled session f47ac10b-58cc-4372-a567-0e02b2c3d479
NOTICE:  Processed 10 of 45 sessions...
...
NOTICE:  Backfill complete! Processed 45 sessions.
NOTICE:  Verification: 180000 of 180000 records have time values (0 null)
NOTICE:  Success! All records have been backfilled.
```

## How Time Delta Works

### Calculation Method

The time delta at any point on the track shows how much time one driver is ahead or behind:

```
time_delta = cumulative_time[session1] - cumulative_time[session2]
```

**Interpretation:**
- **Positive Delta (+0.5s)**: Session 1 has taken 0.5s MORE time to reach this point (slower)
- **Negative Delta (-0.5s)**: Session 1 has taken 0.5s LESS time to reach this point (faster)
- **Zero Delta (0.0s)**: Both sessions reached this point in the same time

### Example Scenario

```
Driver A vs Driver B at Turn 3 (500m into the lap):

Driver A cumulative_time: 25.340s
Driver B cumulative_time: 25.120s
Time Delta: 25.340 - 25.120 = +0.220s

Interpretation: Driver A is 0.220s slower than Driver B at this point
```

### Why This Is Useful

1. **Identify Problem Areas**: See exactly where time is lost/gained
2. **Corner-by-Corner Analysis**: Compare approach, apex, and exit timing
3. **Strategic Insights**: Understand if slower corner entry leads to better exit
4. **Sector Performance**: Visualize performance across different track sections

## Deployment Instructions

### Step 1: Run Database Migrations

First, add the time columns (if not already done):
```sql
-- In Supabase SQL Editor
-- Copy/paste from: migration-add-time-columns.sql
```

Then, backfill existing data:
```sql
-- In Supabase SQL Editor
-- Copy/paste from: migration-backfill-time-columns.sql
```

**Expected Duration:**
- Small DB (< 50 sessions): ~30 seconds
- Medium DB (50-500 sessions): 1-5 minutes
- Large DB (500+ sessions): 5-15 minutes

### Step 2: Deploy Application

```bash
# Build and deploy to Cloudflare
npm run deploy
```

### Step 3: Verify

1. Navigate to Compare page
2. Select a circuit and 2 sessions
3. You should see:
   - New "Time Delta Analysis" section above main charts
   - Graph showing time difference throughout lap
   - Annotation showing overall winner and delta

## Usage Guide

### Viewing Time Delta

1. Go to **Compare Laps** page
2. Select a circuit
3. Select exactly 2 sessions to compare
4. The Time Delta Analysis chart will appear automatically

### Interpreting the Graph

**Above Zero Line (Positive)**
- First driver is losing time (slower)
- Red/orange colored area (typically)

**Below Zero Line (Negative)**
- First driver is gaining time (faster)
- Green/blue colored area (typically)

**Steep Slopes**
- Rapid change in time delta
- Indicates significant performance difference in that section

**Flat Sections**
- Both drivers performing similarly
- No time gained or lost

### Example Analysis

```
Scenario: Comparing Sam vs Friend at Monza

Graph shows:
- Lap start to 300m: Delta rises from 0 to +0.15s
  → Sam is losing time in Turn 1

- 300m to 800m: Delta drops from +0.15s to -0.05s
  → Sam is gaining back time in the chicanes

- 800m to finish: Delta drops further to -0.35s
  → Sam is faster through Parabolica and finish

Final Delta: -0.35s (Sam is faster overall)
```

## Technical Details

### Data Matching

The chart matches data points by distance with a 1-meter tolerance:
```typescript
const point2 = session2.data.find(p => 
  Math.abs(p.distance - point1.distance) < 1
);
```

This handles slight variations in sampling points between files.

### Performance Considerations

- Chart renders using Plotly.js for smooth interaction
- Data is processed once when sessions are loaded
- Hover tooltips show precise values at each distance
- Responsive to window resizing

## Troubleshooting

### Issue: Time Delta Chart Not Appearing

**Possible Causes:**
1. Less than 2 sessions selected
2. Sessions don't have time data populated

**Solution:**
- Select exactly 2 sessions
- Ensure backfill script has been run
- Check that cumulative_time is not NULL in database

### Issue: Backfill Script Fails

**Possible Causes:**
1. Database permissions
2. Sessions with no telemetry data
3. Invalid distance/speed values

**Solution:**
```sql
-- Check for sessions with no data
SELECT s.id, s.file_name, COUNT(td.id) as data_count
FROM telemetry_sessions s
LEFT JOIN telemetry_data td ON td.session_id = s.id
GROUP BY s.id, s.file_name
HAVING COUNT(td.id) = 0;

-- Check for invalid values
SELECT session_id, COUNT(*) as bad_count
FROM telemetry_data
WHERE speed <= 0 OR distance < 0
GROUP BY session_id;
```

### Issue: Large Time Discrepancy Between Calculated and Recorded Lap Time

**Normal Discrepancy:** ±0.5s is acceptable due to:
- Different calculation methods
- Sampling frequency differences
- Rounding in original files

**Large Discrepancy (>2s):** May indicate:
- Invalid data in file
- Partial lap data
- Incorrect track length assumptions

**Check with:**
```sql
-- Shows sessions with largest discrepancies
SELECT 
  s.id,
  s.file_name,
  s.lap_time as recorded_time,
  MAX(td.cumulative_time) as calculated_time,
  ABS(s.lap_time - MAX(td.cumulative_time)) as difference
FROM telemetry_sessions s
JOIN telemetry_data td ON td.session_id = s.id
GROUP BY s.id, s.file_name, s.lap_time
ORDER BY difference DESC
LIMIT 20;
```

## Files Modified

| File | Purpose |
|------|---------|
| `migration-backfill-time-columns.sql` | SQL script to populate time columns for existing data |
| `src/react-app/components/charts/TimeDeltaChart.tsx` | New component for time delta visualization |
| `src/react-app/pages/Compare.tsx` | Added time delta chart to comparison view |
| `src/react-app/components/charts/TelemetryChart.tsx` | Updated interfaces to include time fields |

## Future Enhancements

Possible improvements:
1. **Color Coding**: Green for gaining time, red for losing
2. **Interactive Markers**: Click graph to see telemetry at that point
3. **Sector Highlighting**: Show track sector boundaries
4. **Time Gain/Loss Statistics**: Calculate total time gained/lost per sector
5. **Multiple Comparison**: Compare more than 2 sessions simultaneously
6. **Export**: Save time delta data as CSV for external analysis

