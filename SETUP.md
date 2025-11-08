# F1 Telemetry Comparison Tool - Setup Guide

## Overview
This is a complete web application for comparing Assetto Corsa sim racing telemetry data between two drivers. Built with React, Vite, Supabase, and Cloudflare.

## Project Status
✅ **All components built and ready to use!**

## What's Been Completed

### Frontend Application
- ✅ React + Vite project structure
- ✅ Tailwind CSS with F1-style theme
- ✅ All components created:
  - Password authentication
  - CSV upload interface
  - Plotly.js telemetry charts
  - Delta comparison tools
  - Corner analysis dashboard
  - MCP chat interface (placeholder)
- ✅ Full routing system (Upload, Compare, Dashboard, MCP)
- ✅ Zustand state management
- ✅ Build process tested and working

### Libraries & Utilities
- ✅ Supabase client setup
- ✅ CSV parser (PapaParse)
- ✅ Corner classification algorithm
- ✅ Telemetry analysis tools

### Configuration Files
- ✅ Tailwind config
- ✅ PostCSS config
- ✅ Environment variables template
- ✅ Database schema SQL file

## Next Steps - Required Setup

### 1. Get Your Supabase Anon Key

**You need to add the anon/publishable key to the `.env` file:**

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project (ID: `trzihrayibvepswdjzei`)
3. Go to **Project Settings** → **API**
4. Copy the **anon public** key (or `sb_publishable_...` key)

5. Edit `.env` file and replace `REPLACE_WITH_YOUR_ANON_KEY` with your actual key:
```bash
VITE_SUPABASE_URL=https://trzihrayibvepswdjzei.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
```

### 2. Set Up the Database

Run the SQL schema in your Supabase SQL Editor:

1. Go to your Supabase Dashboard
2. Click **SQL Editor** in the left sidebar
3. Open the file `database-schema.sql` from this project
4. Copy and paste the entire contents into the SQL Editor
5. Click **Run** to execute the schema

This will create:
- `users` table (with Sam and Friend)
- `circuits` table (with Monza, Spa, Silverstone)
- `telemetry_sessions` table
- `telemetry_data` table
- `corner_analysis` table
- All necessary indexes and views

### 3. Run the Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` and you should see the password gate.

**Default password:** `race`

### 4. Test the Application

1. **Upload Telemetry:**
   - Go to Upload page
   - Select a user (Sam or Friend)
   - Select a circuit
   - Upload a CSV file from Assetto Corsa Content Manager

2. **Compare Laps:**
   - Go to Compare page
   - Select a circuit
   - Choose 2 sessions to compare
   - View telemetry overlays with delta calculations

3. **View Dashboard:**
   - Go to Dashboard page
   - See cross-circuit performance analysis
   - View corner-type statistics

## Project Structure

```
src/react-app/
├── components/
│   ├── auth/PasswordGate.jsx
│   ├── upload/CSVUploader.jsx
│   ├── charts/
│   │   ├── TelemetryChart.jsx
│   │   └── ChartControls.jsx
│   ├── dashboard/
│   │   ├── TrendDashboard.jsx
│   │   └── StatsCard.jsx
│   └── mcp/MCPChat.jsx
├── lib/
│   ├── supabase.js
│   ├── csvParser.js
│   └── cornerClassifier.js
├── stores/
│   └── appStore.js
├── pages/
│   ├── Upload.jsx
│   ├── Compare.jsx
│   ├── Dashboard.jsx
│   └── MCP.jsx
└── App.jsx
```

## CSV Format Expected

Your Assetto Corsa CSV should have these columns:
```
distance,speed,throttle,brake,gear,rpm,lateralG,longitudinalG
```

## Features Implemented

- 🔐 Password protection (password: "race")
- 📊 F1-style telemetry charts with Plotly.js
- 📈 Delta comparison (absolute & percentage)
- 🏎️ Corner classification (slow/medium/fast)
- 📉 Cross-circuit trend analysis
- 💬 MCP chat interface (placeholder for future Claude integration)
- 🎨 F1-inspired dark theme

## Building for Production

```bash
npm run build
```

Build output goes to `dist/` directory.

## Deployment to Cloudflare Pages

```bash
npm run deploy
```

### Setting Up AI API Secrets

The application uses Cloudflare Workers AI (DeepSeek R1) as the primary AI model with Claude Sonnet 4.5 as a fallback. To configure the Claude API key:

1. Install Wrangler CLI (if not already installed):
```bash
npm install -g wrangler
```

2. Authenticate with Cloudflare:
```bash
wrangler login
```

3. Set the Claude API secret (DO NOT commit this to git):
```bash
wrangler secret put CLAUDE_API_KEY
```

When prompted, enter your Claude API key (the one provided to you separately). The key should start with `sk-ant-api03-...`

This securely stores the secret in Cloudflare Workers and makes it available as `c.env.CLAUDE_API_KEY` in your worker code.

## Adding More Circuits

Edit `database-schema.sql` and add new circuit entries:

```sql
INSERT INTO circuits (name, display_name, country, corner_classifications) VALUES
('your_circuit', 'Circuit Name', 'Country',
'{"slow": {"min": 0, "max": 100}, "medium": {"min": 100, "max": 180}, "fast": {"min": 180, "max": 999}}'::jsonb);
```

Then run the SQL in Supabase SQL Editor.

## Troubleshooting

### Build fails with Tailwind error
Make sure `@tailwindcss/postcss` is installed:
```bash
npm install -D @tailwindcss/postcss
```

### Can't connect to Supabase
1. Check your `.env` file has the correct URL and anon key
2. Verify your Supabase project is active
3. Check database tables were created correctly

### Upload fails
1. Ensure database schema is set up
2. Check CSV format matches expected columns
3. Verify user and circuit are selected

## Tech Stack

- **Frontend:** React 19, Vite 6
- **Routing:** React Router
- **Styling:** Tailwind CSS (F1 theme)
- **Charts:** Plotly.js
- **State:** Zustand
- **Database:** Supabase (PostgreSQL)
- **CSV Parsing:** PapaParse
- **Hosting:** Cloudflare Pages + Workers

## Support

Check the main build instructions: `telemetry-build-instructions.md`

## Password

The app password is: **race**
