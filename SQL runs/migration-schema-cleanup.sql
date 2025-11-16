-- Schema cleanup: Remove unnecessary fields and make corner speeds global

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
