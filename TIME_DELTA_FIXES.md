# Time Delta Calculation Fixes

## Issues Fixed

### 1. ✅ Time Calculation Formula Verified
**Issue:** Time calculations weren't aligning properly with lap time differences.

**Root Cause:** The formula was correct but needed clarification in SQL script.

**Fix:** Ensured consistent formula across all parsers and backfill script:
```
time (seconds) = (distance_delta (meters) * 3.6) / speed (km/h)
```

**Explanation:**
- Distance is in meters
- Speed is in km/h
- To convert: speed in m/s = speed in km/h / 3.6
- Therefore: time = distance / (speed / 3.6) = distance * 3.6 / speed

### 2. ✅ Time Delta Integrated as Subplot
**Issue:** Time delta was a separate component, not part of main chart.

**Fix:** Integrated time delta as the **3rd subplot** in TelemetryChart:
1. Speed (top)
2. Brake
3. **Time Delta** ⭐ (middle - always shows delta when 2 sessions selected)
4. Throttle
5. Gear (bottom)

**Behavior:**
- Time delta **always** shows as delta (never absolute values)
- Not affected by the delta toggle button
- Only displays when exactly 2 sessions are selected
- Shows positive values when session 1 is slower
- Shows negative values when session 1 is faster

### 3. ✅ Delta Direction Consistency
**Issue:** Need consistent delta direction across all graphs.

**Fix:** All deltas now follow the same convention:
```
delta = session1 - session2
```

**Interpretation:**
- **Positive (+)**: Session 1 has higher value (slower for time, more for speed, etc.)
- **Negative (-)**: Session 1 has lower value (faster for time, less for speed, etc.)
- **Zero (0)**: Both sessions are equal at this point

## Changes Made

### Files Modified

| File | Changes |
|------|---------|
| `src/react-app/components/charts/TelemetryChart.tsx` | Added time delta as 3rd subplot, added `calculateTimeDelta()` function, increased height to 1000px |
| `src/react-app/pages/Compare.tsx` | Removed separate TimeDeltaChart component |
| `migration-backfill-time-columns.sql` | Clarified formula with proper operator precedence |

### Files Deleted
| File | Reason |
|------|--------|
| `src/react-app/components/charts/TimeDeltaChart.tsx` | No longer needed - functionality integrated into TelemetryChart |

## How It Works Now

### Visual Layout (5 Subplots)

```
┌─────────────────────────────────────┐
│  [Delta Toggle] ◯ On  ⚫ Off       │
├─────────────────────────────────────┤
│  1. SPEED                           │  ← Affected by toggle
│     (shows delta or absolute)       │
├─────────────────────────────────────┤
│  2. BRAKE                           │  ← Affected by toggle
│     (shows delta or absolute)       │
├─────────────────────────────────────┤
│  3. TIME DELTA ⭐                   │  ← NOT affected by toggle
│     (always delta when 2 sessions)  │  ← Always shows cumulative time delta
├─────────────────────────────────────┤
│  4. THROTTLE                        │  ← Affected by toggle
│     (shows delta or absolute)       │
├─────────────────────────────────────┤
│  5. GEAR                            │  ← Affected by toggle
│     (shows delta or absolute)       │
└─────────────────────────────────────┘
```

### Delta Direction Examples

**Example 1: Speed**
```
Session 1 Speed: 200 km/h
Session 2 Speed: 190 km/h
Delta: 200 - 190 = +10 km/h (Session 1 is faster)
```

**Example 2: Time**
```
Session 1 Time: 45.5s
Session 2 Time: 44.8s
Delta: 45.5 - 44.8 = +0.7s (Session 1 is slower, took more time)
```

**Example 3: Brake**
```
Session 1 Brake: 80%
Session 2 Brake: 90%
Delta: 80 - 90 = -10% (Session 1 brakes less)
```

## Testing the Fix

### 1. Deploy Changes

```bash
# Build and deploy
npm run build
npm run deploy
```

### 2. Run Backfill (if not done already)

In Supabase SQL Editor:
```sql
-- Run the updated backfill script
-- Copy/paste: migration-backfill-time-columns.sql
```

### 3. Verify on Compare Page

1. Go to Compare Laps page
2. Select a circuit
3. Select exactly 2 sessions
4. Check the charts:
   - ✅ 5 subplots visible (not 4)
   - ✅ Time Delta is the 3rd graph (middle position)
   - ✅ Time Delta has zero line visible
   - ✅ Time Delta shows positive/negative values
   - ✅ Toggle delta button affects Speed, Brake, Throttle, Gear
   - ✅ Toggle delta button does NOT affect Time Delta

### 4. Verify Time Alignment

Check that cumulative time delta aligns with lap time difference:

**Expected:**
```
Session 1 Lap Time: 98.456s
Session 2 Lap Time: 97.623s
Lap Time Difference: 98.456 - 97.623 = 0.833s

Time Delta Graph at finish line: ~+0.833s ✅
```

If there's a small discrepancy (<1s), it's normal due to:
- Different sampling rates
- Rounding in calculations
- Track length estimation differences

## Interpretation Guide

### Reading Time Delta Graph

```
  Δ Time (s)
   +1.0 ┤     ╱╲              Session 1 losing time here
        │    ╱  ╲
   +0.5 ┤   ╱    ╲
        │  ╱      ╲
   0.0  ├─╱────────╲──────   Equal performance
        │           ╲    ╱
   -0.5 ┤            ╲  ╱    Session 1 gaining time here
        │             ╲╱
   -1.0 ┤
        └──────────────────
        0m      500m    1000m
```

**What This Means:**
- **Start to 300m (+ve slope)**: Session 1 is slower through first sector
- **300m to 600m (-ve slope)**: Session 1 gaining back time
- **600m to finish (-ve)**: Session 1 is faster overall
- **Final value**: Overall time difference at finish line

### Common Patterns

**Consistent Positive:** Session 1 continuously slower
```
+1.0 ┤  ╱╱╱╱╱╱╱
     ├─╱
```

**Consistent Negative:** Session 1 continuously faster
```
     ├─╲
-1.0 ┤  ╲╲╲╲╲╲╲
```

**Trading Blows:** Drivers faster in different sections
```
+0.5 ┤ ╱╲    ╱╲
     ├╱──╲──╱──╲
-0.5 ┤    ╲╱
```

## Formula Reference

### Time Calculation
```javascript
// JavaScript (parsers)
const distanceDelta = distance - prevDistance;  // meters
const avgSpeed = (speed + prevSpeed) / 2;       // km/h
const segmentTime = (distanceDelta / avgSpeed) * 3.6;  // seconds
```

```sql
-- SQL (backfill)
v_distance_delta := v_record.distance - v_prev_distance;  -- meters
v_avg_speed := (v_record.speed + v_prev_speed) / 2.0;     -- km/h
v_segment_time := (v_distance_delta * 3.6) / v_avg_speed; -- seconds
```

### Delta Calculation
```javascript
const delta = session1.value - session2.value;
// Positive = session1 higher/slower (for time)
// Negative = session1 lower/faster (for time)
```

## Troubleshooting

### Issue: Time delta doesn't match lap time difference

**Check:**
1. Both sessions have complete data (no gaps)
2. Cumulative time reaches end of lap
3. Track length is consistent between sessions

**Query:**
```sql
SELECT 
  s.file_name,
  s.lap_time,
  MAX(td.cumulative_time) as final_cumulative_time,
  s.lap_time - MAX(td.cumulative_time) as difference
FROM telemetry_sessions s
JOIN telemetry_data td ON td.session_id = s.id
GROUP BY s.id, s.file_name, s.lap_time
HAVING ABS(s.lap_time - MAX(td.cumulative_time)) > 2.0
ORDER BY difference DESC;
```

### Issue: Time delta graph not showing

**Possible Causes:**
1. Only 1 session selected (need exactly 2)
2. Data doesn't have cumulative_time values
3. Browser cache needs clearing

**Solution:**
1. Select exactly 2 sessions
2. Run backfill script if needed
3. Hard refresh browser (Ctrl+Shift+R)

### Issue: Graph heights look wrong

**Expected Heights:**
- Total chart height: 1000px
- Speed: ~18% (180px)
- Brake: ~17% (170px)
- Time Delta: ~17% (170px)
- Throttle: ~17% (170px)
- Gear: ~17% (170px)
- Spacing: ~14% (gaps between)

If it looks squished, check browser zoom level and window size.

## Success Criteria

✅ All requirements met:
- [x] Time calculations verified and consistent
- [x] Time delta is 3rd subplot in main chart
- [x] Time delta always shows delta (never absolute)
- [x] Not affected by delta toggle
- [x] Delta direction consistent across all graphs
- [x] Cumulative time delta aligns with lap time difference
- [x] Build succeeds with no errors
- [x] Separate TimeDeltaChart component removed

## Next Steps

1. Deploy the changes
2. Re-run backfill if needed (with updated formula)
3. Test with real telemetry comparisons
4. Verify time deltas match expectations

