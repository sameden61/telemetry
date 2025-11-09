# Schema Cleanup - Simplified Data Model

This update simplifies the database schema by removing unnecessary fields and making corner speed classifications global instead of per-circuit.

## Changes Made

### 1. Circuits Table - Simplified
**Removed:**
- `country` column - not needed
- `corner_classifications` column - moved to global settings

**Kept:**
- `id` - UUID
- `name` - slug (e.g., "monza")
- `display_name` - friendly name (e.g., "Monza")

### 2. Cars Table - Simplified
**Removed:**
- `manufacturer` column - not needed

**Kept:**
- `id` - UUID
- `name` - slug (e.g., "ferrari_488_gt3")
- `display_name` - friendly name (e.g., "Ferrari 488 GT3")
- `category` - optional category (e.g., "GT3")

### 3. Corner Speed Settings - Now Global
**New Table:** `corner_speed_settings`

Instead of defining corner speeds per circuit, there's now one global setting that applies to all circuits.

**Columns:**
- `id` - UUID (primary key)
- `slow_min` - Minimum speed for slow corners (km/h)
- `slow_max` - Maximum speed for slow corners (km/h)
- `medium_min` - Minimum speed for medium corners (km/h)
- `medium_max` - Maximum speed for medium corners (km/h)
- `fast_min` - Minimum speed for fast corners (km/h)
- `created_at` - Timestamp
- `updated_at` - Timestamp

**Default Values:**
```sql
slow: 0-100 km/h
medium: 100-200 km/h
fast: 200+ km/h
```

## Migration SQL

Run this in your Supabase SQL editor:

```sql
-- File: migration-schema-cleanup.sql

-- 1. Remove country from circuits table
ALTER TABLE circuits
DROP COLUMN IF EXISTS country;

-- 2. Remove corner classifications from circuits (will be global settings)
ALTER TABLE circuits
DROP COLUMN IF EXISTS corner_classifications;

-- 3. Remove manufacturer from cars table
ALTER TABLE cars
DROP COLUMN IF EXISTS manufacturer;

-- 4. Create global corner speed settings table
CREATE TABLE IF NOT EXISTS corner_speed_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slow_min INTEGER NOT NULL DEFAULT 0,
    slow_max INTEGER NOT NULL DEFAULT 100,
    medium_min INTEGER NOT NULL DEFAULT 100,
    medium_max INTEGER NOT NULL DEFAULT 200,
    fast_min INTEGER NOT NULL DEFAULT 200,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Insert default corner speed settings
INSERT INTO corner_speed_settings (slow_min, slow_max, medium_min, medium_max, fast_min)
VALUES (0, 100, 100, 200, 200)
ON CONFLICT DO NOTHING;

-- Add comment
COMMENT ON TABLE corner_speed_settings IS 'Global corner speed classification thresholds (km/h)';
```

## Updated UI Components

### Add Circuit Modal
**Before:**
- Circuit Name *
- Country *
- Corner Speed Thresholds (6 fields)

**After:**
- Circuit Name * (only field needed)

### Add Car Modal
**Before:**
- Car Name *
- Manufacturer *
- Category

**After:**
- Car Name *
- Category (optional)

### Upload Page
**Before:**
- Displayed per-circuit corner speed thresholds below upload

**After:**
- Removed thresholds display (now global)
- Cleaner, simpler interface

## Benefits

✅ **Simpler Data Entry** - Less fields to fill when adding circuits/cars
✅ **Consistent Classifications** - All circuits use same corner speed definitions
✅ **Easier Comparison** - Apples-to-apples comparison across all tracks
✅ **Less Duplication** - No need to set corner speeds for every circuit
✅ **Cleaner UI** - Removed unnecessary form fields and displays
✅ **Better UX** - Faster to add new circuits and cars

## Future Enhancements

If needed, you can add:
- [ ] UI to modify global corner speed settings
- [ ] Multiple corner speed profiles (e.g., "F1", "GT3", "Rally")
- [ ] Per-car category corner speed overrides
- [ ] Historical tracking of corner speed setting changes

## Files Modified

### Frontend Components
- `src/react-app/components/common/AddCircuitModal.tsx` - Simplified to name only
- `src/react-app/components/common/AddCarModal.tsx` - Removed manufacturer field
- `src/react-app/pages/Upload.tsx` - Removed corner thresholds display

### API & Backend
- `src/react-app/lib/api.ts` - Updated addCar signature
- `src/worker/index.ts` - Updated POST /api/cars endpoint

### Database
- `migration-schema-cleanup.sql` - Schema changes

## Testing

After running the migration:

1. **Add a Circuit** - Should only ask for name
2. **Add a Car** - Should only ask for name + optional category
3. **Upload Telemetry** - Should work without circuit-specific thresholds
4. **Corner Analysis** - Should use global settings for all circuits

## Rollback (if needed)

If you need to revert:

```sql
-- Add back removed columns (example)
ALTER TABLE circuits ADD COLUMN country TEXT;
ALTER TABLE circuits ADD COLUMN corner_classifications JSONB;
ALTER TABLE cars ADD COLUMN manufacturer TEXT;

-- Drop global settings table
DROP TABLE corner_speed_settings;
```

**Note:** You would lose the global corner speed settings if you rollback.
