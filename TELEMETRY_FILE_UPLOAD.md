# Telemetry File Upload Feature

This document explains the new telemetry file upload feature that supports both CSV and TC (Assetto Corsa Telemetry) file formats.

## Features

### Multi-Format Support
- **CSV Files**: Assetto Corsa Content Manager export format
- **TC Files**: Native Assetto Corsa telemetry files from the `ctelemetry` directory

### File Storage
- All uploaded files are stored in **Cloudflare R2** (S3-compatible object storage)
- Files are organized by user, track, and session: `users/{userId}/{trackName}/{sessionId}/{filename}`
- Metadata is tracked in the Supabase database

### Automatic Detection
- The system automatically detects file type based on file extension
- Routes to appropriate parser (CSV or TC)
- Converts data to unified telemetry format for analysis

### File Type Filtering
- Compare page includes a file type filter (All Types, CSV Only, TC Only)
- File type badges show which format each session used
- All existing functionality works with both file types

## Setup Instructions

### 1. Database Migration

Run the migration to add file type tracking columns:

```sql
-- Run this in your Supabase SQL editor
-- File: migration-add-file-type.sql

ALTER TABLE telemetry_sessions
ADD COLUMN file_type VARCHAR(10) DEFAULT 'csv' NOT NULL;

ALTER TABLE telemetry_sessions
ADD COLUMN r2_path TEXT;

COMMENT ON COLUMN telemetry_sessions.file_type IS 'Type of telemetry file: csv or tc';
COMMENT ON COLUMN telemetry_sessions.r2_path IS 'Path to the original file stored in R2 bucket';

CREATE INDEX idx_telemetry_sessions_file_type ON telemetry_sessions(file_type);
```

### 2. Cloudflare R2 Setup

#### Create R2 Bucket
1. Go to Cloudflare Dashboard → R2
2. Create a new bucket named `telemetry-files`
3. Note: The bucket is already configured in `wrangler.json`

#### Local Development
For local development, you can use Wrangler's local R2 emulation:

```bash
npm run dev
```

The local environment will use a simulated R2 bucket.

#### Production Deployment
When deploying to Cloudflare Workers:

```bash
npm run deploy
```

Ensure the R2 bucket exists in your Cloudflare account before deploying.

### 3. Environment Variables

No new environment variables are required. The R2 bucket is bound directly through Wrangler configuration.

## File Format Details

### TC File Format
TC files are binary files with the following structure:

**Header:**
- Player name (variable-length UTF-8)
- Track name (variable-length UTF-8)
- Car name (variable-length UTF-8)
- Track variation (variable-length UTF-8)
- Lap time in milliseconds (32-bit integer)
- Number of data points (always 3999)

**Data Points (3999 entries):**
Each data point is 20 bytes:
- Gear (4 bytes, integer)
- Position (4 bytes, float, 0.0-1.0 normalized lap distance)
- Speed (4 bytes, float, km/h)
- Throttle (4 bytes, float, 0.0-1.0)
- Brake (4 bytes, float, 0.0-1.0)

**Note:** TC files don't include RPM or G-force data, so these fields are set to 0 when converted.

### CSV File Format
Standard Assetto Corsa Content Manager format with columns:
- distance, speed, throttle, brake, gear, rpm, lateralG, longitudinalG

## Usage

### Uploading Files

1. Navigate to the Upload page
2. Select Driver, Circuit, and Car
3. Choose either a `.csv` or `.tc` file
4. The system will:
   - Detect file type automatically
   - Parse the file
   - Upload to R2 storage
   - Store telemetry data in Supabase
   - Analyze corners
   - Complete!

### Comparing Sessions

1. Navigate to the Compare page
2. Select Circuit and Car
3. (Optional) Filter by file type: All Types, CSV Only, or TC Only
4. Select up to 2 sessions to compare
5. View telemetry charts and analysis

Each session shows a badge indicating its file type (CSV or TC).

## File Locations

### Source Files
- **TC Parser**: `src/react-app/lib/tcParser.ts`
- **Universal Uploader**: `src/react-app/components/upload/TelemetryUploader.tsx`
- **Worker Endpoints**: `src/worker/index.ts` (lines 103-181)
- **Compare Page**: `src/react-app/pages/Compare.tsx`

### API Endpoints
- `POST /api/upload-file` - Upload file to R2 storage
- `GET /api/get-file/:userId/:trackName/:sessionId/:filename` - Retrieve file from R2

## Testing

To test with the sample TC file:

```bash
# The sample file is located at:
Sample/samje61_vhe_interlagos_acf_gp_lfm_rss_formula_hybrid_2018_s1.tc
```

1. Navigate to Upload page
2. Select a driver, circuit (Interlagos), and car
3. Upload the sample TC file
4. Verify it appears in the sessions list with a "TC" badge

## Architecture

```
┌─────────────────┐
│  User uploads   │
│   .tc or .csv   │
└────────┬────────┘
         │
         v
┌─────────────────────────────┐
│  TelemetryUploader.tsx      │
│  - Detects file type        │
│  - Routes to parser         │
└────────┬────────────────────┘
         │
         v
┌─────────────────────────────┐
│  Parser (CSV or TC)         │
│  - Converts to unified fmt  │
└────────┬────────────────────┘
         │
         v
┌─────────────────────────────┐
│  Supabase                   │
│  - telemetry_sessions       │
│  - telemetry_data           │
│  - file_type, r2_path       │
└─────────────────────────────┘
         │
         v
┌─────────────────────────────┐
│  Cloudflare R2              │
│  - Original file stored     │
│  - users/{user}/{track}/... │
└─────────────────────────────┘
```

## Known Limitations

1. **TC File Data**: TC files don't include RPM or G-force data. These fields are set to 0.
2. **Data Granularity**: TC files always have 3999 data points regardless of track length or lap time. This is normalized sampling.
3. **Track Length**: For best results with TC files, configure track length in the circuit settings (future enhancement).

## Future Enhancements

- [ ] Add track length configuration for more accurate distance calculation in TC files
- [ ] Support for data decimation/rolling average for very dense telemetry
- [ ] Batch upload multiple files
- [ ] Export functionality to download original files from R2
- [ ] Support for additional file formats (MoTeC, etc.)
