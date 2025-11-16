# Version Tracking for Duplicate File Uploads

This feature allows users to upload the same telemetry file multiple times and track each version separately for comparison.

## How It Works

### Automatic Version Numbering
When you upload a file:
1. The system checks if you've uploaded a file with the same name for the same driver/circuit/car combination
2. If yes, it automatically increments the version number (v1 → v2 → v3, etc.)
3. If no, it starts at version 1

### Version Calculation Logic
Versions are unique per combination of:
- **User ID** (driver)
- **Circuit ID** (track)
- **Car ID** (car)
- **File Name** (filename)

This means:
- Same file, same driver, same track, same car = version increments ✅
- Same file, different driver = separate v1 for each driver ✅
- Same file, same driver, different track = separate v1 for each track ✅
- Same file, same driver, same track, different car = separate v1 for each car ✅

## Database Schema

### New Columns Added

```sql
-- Version number (auto-incremented per file)
version INTEGER DEFAULT 1 NOT NULL

-- Upload timestamp
uploaded_at TIMESTAMP DEFAULT NOW() NOT NULL
```

### Index for Fast Lookups
```sql
CREATE INDEX idx_telemetry_sessions_version_lookup
ON telemetry_sessions(user_id, circuit_id, car_id, file_name, version DESC);
```

## UI Display

### Session List (Compare Page)
Each session now shows:
- **File Type Badge** (CSV or TC) - blue/purple
- **Version Badge** (v1, v2, v3...) - gray
- **Upload Date** - hover for full timestamp
- **File Name** - shown below the main row

Example display:
```
☑ Driver Name    1:32.456s    [TC]  [v2]  11/8/2025
   interlagos_lap.tc
```

### Version Badge Colors
- All versions: Gray badge
- Shows "v1", "v2", "v3", etc.
- Always visible to distinguish versions clearly

## Use Cases

### Scenario 1: Improving Your Lap
1. Upload `interlagos_lap.tc` - gets **v1**
2. Drive better, upload same file again - gets **v2**
3. Compare v1 vs v2 side by side to see improvement

### Scenario 2: Testing Different Setups
1. Upload `silverstone.tc` with Setup A - gets **v1**
2. Change car setup, upload same filename - gets **v2**
3. Change setup again - gets **v3**
4. Compare any two versions to analyze setup changes

### Scenario 3: Multiple Drivers
1. Driver A uploads `spa.tc` - gets **v1** for Driver A
2. Driver B uploads `spa.tc` - gets **v1** for Driver B (separate version tracking)
3. Each driver can have their own version history

## Comparison Features

### Side-by-Side Comparison
- Select any 2 versions of any sessions
- Can compare:
  - v1 vs v2 of the same file
  - v1 of FileA vs v3 of FileB
  - Different drivers, different versions
  - Mix CSV and TC files

### Version History
- Sessions sorted by upload date (newest first)
- Hover over date to see full timestamp
- File name visible to identify duplicates
- Version badge to distinguish each upload

## Migration Instructions

Run this migration in your Supabase SQL editor:

```sql
-- File: migration-add-version-tracking.sql

ALTER TABLE telemetry_sessions
ADD COLUMN version INTEGER DEFAULT 1 NOT NULL;

ALTER TABLE telemetry_sessions
ADD COLUMN uploaded_at TIMESTAMP DEFAULT NOW() NOT NULL;

CREATE INDEX idx_telemetry_sessions_version_lookup
ON telemetry_sessions(user_id, circuit_id, car_id, file_name, version DESC);

COMMENT ON COLUMN telemetry_sessions.version IS 'Version number for duplicate file uploads (auto-incremented per user/circuit/car/filename combination)';
COMMENT ON COLUMN telemetry_sessions.uploaded_at IS 'Timestamp when this version was uploaded';
```

## Implementation Details

### Backend (Worker API)

**Endpoint:** `POST /api/telemetry-sessions`

When creating a session:
1. Query existing sessions matching (user_id, circuit_id, car_id, file_name)
2. Get max version number from results
3. Increment by 1 (or use 1 if no results)
4. Insert with calculated version

```typescript
const { data: existing } = await supabase
  .from('telemetry_sessions')
  .select('version')
  .eq('user_id', user_id)
  .eq('circuit_id', circuit_id)
  .eq('car_id', car_id)
  .eq('file_name', file_name)
  .order('version', { ascending: false })
  .limit(1);

const version = existing?.[0]?.version ? existing[0].version + 1 : 1;
```

### Frontend Display

**Location:** `src/react-app/pages/Compare.tsx`

Shows version badge and file name:
```tsx
<span className="text-xs font-bold uppercase px-2 py-1 bg-gray-700 text-gray-300">
  v{session.version}
</span>
{session.file_name && (
  <div className="text-xs text-f1-textGray mt-1">
    {session.file_name}
  </div>
)}
```

## Benefits

✅ **Track Progress**: Upload same file multiple times to track improvement
✅ **Compare Versions**: Easy side-by-side comparison of different attempts
✅ **No Confusion**: Clear version labels prevent mix-ups
✅ **Automatic**: No manual versioning needed
✅ **Flexible**: Works with both CSV and TC files
✅ **Per-Context**: Versions are scoped to driver/track/car combination
✅ **Sortable**: Newest uploads appear first
✅ **Historical**: Full timestamp available on hover

## Future Enhancements

- [ ] Version diff view (show what changed between versions)
- [ ] Version notes/comments (add notes when uploading)
- [ ] Bulk version management (delete all old versions)
- [ ] Version comparison charts (visualize improvement over versions)
- [ ] Export version history report
