# AI Build Instructions: F1 Telemetry Comparison Tool

## Project Overview
Build a web application for comparing Assetto Corsa sim racing telemetry data between two drivers. The app allows CSV upload per circuit/user, displays F1-style overlay charts with configurable deltas, and provides cross-circuit trend analysis.

## Tech Stack
- **Frontend**: React + Vite
- **Hosting**: Cloudflare Pages
- **Database**: Supabase (PostgreSQL)
- **KV Store**: Cloudflare KV (circuit metadata)
- **Charts**: Plotly.js (F1-style telemetry visualization)
- **Styling**: Tailwind CSS
- **State Management**: React Context or Zustand

---

## Phase 1: Project Setup & Infrastructure

### 1.1 Initialize Project
```bash
npm create vite@latest telemetry-compare -- --template react
cd telemetry-compare
npm install
npm install @supabase/supabase-js plotly.js-dist-min papaparse zustand date-fns recharts
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 1.2 Configure Tailwind
Update `tailwind.config.js`:
```javascript
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        f1: {
          red: '#E10600',
          background: '#15151E',
          panel: '#1E1E2E',
          text: '#FFFFFF',
          accent: '#00D9FF',
        }
      }
    }
  }
}
```

### 1.3 Supabase Setup

**Database Schema:**

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial users
INSERT INTO users (name, display_name) VALUES 
  ('sam', 'Sam'),
  ('friend', 'Friend');

-- Circuits table (stores circuit configurations)
CREATE TABLE circuits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  country TEXT,
  corner_classifications JSONB DEFAULT '{"slow": {"min": 0, "max": 100}, "medium": {"min": 100, "max": 180}, "fast": {"min": 180, "max": 999}}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Telemetry sessions table
CREATE TABLE telemetry_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  circuit_id UUID REFERENCES circuits(id) ON DELETE CASCADE,
  session_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  lap_time DECIMAL(10,3),
  best_lap_number INTEGER,
  file_name TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Telemetry data table (stores actual lap data points)
CREATE TABLE telemetry_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES telemetry_sessions(id) ON DELETE CASCADE,
  distance DECIMAL(10,2),
  speed DECIMAL(10,2),
  throttle DECIMAL(5,2),
  brake DECIMAL(5,2),
  gear INTEGER,
  rpm INTEGER,
  lateral_g DECIMAL(5,3),
  longitudinal_g DECIMAL(5,3),
  data_index INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_telemetry_data_session ON telemetry_data(session_id, data_index);
CREATE INDEX idx_telemetry_sessions_user_circuit ON telemetry_sessions(user_id, circuit_id);
CREATE INDEX idx_telemetry_data_distance ON telemetry_data(session_id, distance);

-- Corner analysis cache table (pre-computed corner stats)
CREATE TABLE corner_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES telemetry_sessions(id) ON DELETE CASCADE,
  circuit_id UUID REFERENCES circuits(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  corner_type TEXT CHECK (corner_type IN ('slow', 'medium', 'fast')),
  entry_speed_avg DECIMAL(10,2),
  exit_speed_avg DECIMAL(10,2),
  min_speed DECIMAL(10,2),
  max_brake_pressure DECIMAL(5,2),
  corner_count INTEGER,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_corner_analysis_lookup ON corner_analysis(user_id, circuit_id, corner_type);

-- Views for easier querying
CREATE VIEW session_comparisons AS
SELECT 
  s1.id as session1_id,
  s2.id as session2_id,
  s1.user_id as user1_id,
  s2.user_id as user2_id,
  s1.circuit_id,
  s1.lap_time as user1_lap_time,
  s2.lap_time as user2_lap_time,
  s1.lap_time - s2.lap_time as time_delta
FROM telemetry_sessions s1
JOIN telemetry_sessions s2 
  ON s1.circuit_id = s2.circuit_id 
  AND s1.user_id != s2.user_id;
```

### 1.4 Cloudflare KV Structure

**KV Namespace**: `TELEMETRY_CIRCUITS`

**Key-Value Schema:**
```javascript
// Key: circuit:{circuit_name}
{
  "name": "monza",
  "displayName": "Monza",
  "country": "Italy",
  "cornerClassifications": {
    "slow": { "min": 0, "max": 120 },
    "medium": { "min": 120, "max": 200 },
    "fast": { "min": 200, "max": 999 }
  },
  "trackLength": 5793,
  "sectors": 3
}

// Key: app:config
{
  "password": "race",
  "availableCircuits": ["monza", "spa", "silverstone", ...],
  "users": ["sam", "friend"]
}
```

**Cloudflare Pages Setup:**
Create `functions/api/[[path]].js` for KV access:
```javascript
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // GET /api/circuits
  if (url.pathname === '/api/circuits') {
    const circuits = await env.TELEMETRY_CIRCUITS.get('app:config', 'json');
    return new Response(JSON.stringify(circuits), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // GET /api/circuits/:name
  if (url.pathname.startsWith('/api/circuits/')) {
    const name = url.pathname.split('/').pop();
    const circuit = await env.TELEMETRY_CIRCUITS.get(`circuit:${name}`, 'json');
    return new Response(JSON.stringify(circuit), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response('Not Found', { status: 404 });
}
```

---

## Phase 2: Core Application Structure

### 2.1 Project Structure
```
src/
├── components/
│   ├── auth/
│   │   └── PasswordGate.jsx
│   ├── upload/
│   │   ├── CircuitSelector.jsx
│   │   ├── UserSelector.jsx
│   │   └── CSVUploader.jsx
│   ├── charts/
│   │   ├── TelemetryChart.jsx
│   │   ├── DeltaChart.jsx
│   │   └── ChartControls.jsx
│   ├── comparison/
│   │   ├── LapComparison.jsx
│   │   └── SessionSelector.jsx
│   ├── dashboard/
│   │   ├── TrendDashboard.jsx
│   │   ├── CornerAnalysis.jsx
│   │   └── StatsCard.jsx
│   └── mcp/
│       └── MCPChat.jsx
├── lib/
│   ├── supabase.js
│   ├── csvParser.js
│   ├── telemetryAnalysis.js
│   └── cornerClassifier.js
├── stores/
│   └── appStore.js
├── pages/
│   ├── Upload.jsx
│   ├── Compare.jsx
│   ├── Dashboard.jsx
│   └── MCP.jsx
├── App.jsx
└── main.jsx
```

### 2.2 Supabase Client (`src/lib/supabase.js`)
```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper functions
export const uploadTelemetrySession = async (userId, circuitId, lapTime, fileName) => {
  const { data, error } = await supabase
    .from('telemetry_sessions')
    .insert({
      user_id: userId,
      circuit_id: circuitId,
      lap_time: lapTime,
      file_name: fileName
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const uploadTelemetryData = async (sessionId, telemetryPoints) => {
  const dataToInsert = telemetryPoints.map((point, index) => ({
    session_id: sessionId,
    distance: point.distance,
    speed: point.speed,
    throttle: point.throttle,
    brake: point.brake,
    gear: point.gear,
    rpm: point.rpm,
    lateral_g: point.lateralG,
    longitudinal_g: point.longitudinalG,
    data_index: index
  }));
  
  // Insert in batches of 1000
  const batchSize = 1000;
  for (let i = 0; i < dataToInsert.length; i += batchSize) {
    const batch = dataToInsert.slice(i, i + batchSize);
    const { error } = await supabase.from('telemetry_data').insert(batch);
    if (error) throw error;
  }
};

export const getSessionsByCircuit = async (circuitId) => {
  const { data, error } = await supabase
    .from('telemetry_sessions')
    .select(`
      *,
      users (name, display_name),
      circuits (name, display_name)
    `)
    .eq('circuit_id', circuitId)
    .order('lap_time', { ascending: true });
  
  if (error) throw error;
  return data;
};

export const getTelemetryData = async (sessionId) => {
  const { data, error } = await supabase
    .from('telemetry_data')
    .select('*')
    .eq('session_id', sessionId)
    .order('data_index', { ascending: true });
  
  if (error) throw error;
  return data;
};

export const getCornerAnalysis = async (userId, circuitId) => {
  const { data, error } = await supabase
    .from('corner_analysis')
    .select('*')
    .eq('user_id', userId)
    .eq('circuit_id', circuitId);
  
  if (error) throw error;
  return data;
};

export const getAllCornerAnalysis = async () => {
  const { data, error } = await supabase
    .from('corner_analysis')
    .select(`
      *,
      users (name, display_name),
      circuits (name, display_name)
    `);
  
  if (error) throw error;
  return data;
};
```

### 2.3 CSV Parser (`src/lib/csvParser.js`)
```javascript
import Papa from 'papaparse';

/**
 * Expected CSV format from Assetto Corsa Content Manager:
 * distance,speed,throttle,brake,gear,rpm,lateralG,longitudinalG
 */

export const parseCSV = (file) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(results.errors);
        } else {
          resolve(results.data);
        }
      },
      error: (error) => reject(error)
    });
  });
};

export const validateTelemetryData = (data) => {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('No telemetry data found');
  }
  
  const requiredFields = ['distance', 'speed', 'throttle', 'brake'];
  const firstRow = data[0];
  
  for (const field of requiredFields) {
    if (!(field in firstRow)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  return true;
};

export const calculateBestLap = (data) => {
  // Assumes data is from a single lap
  // Calculate lap time from distance and speed
  if (data.length < 2) return null;
  
  let lapTime = 0;
  for (let i = 1; i < data.length; i++) {
    const distanceDelta = data[i].distance - data[i - 1].distance;
    const avgSpeed = (data[i].speed + data[i - 1].speed) / 2;
    if (avgSpeed > 0) {
      lapTime += (distanceDelta / avgSpeed) * 3.6; // Convert to seconds
    }
  }
  
  return lapTime;
};

export const normalizeTelemetryData = (data) => {
  return data.map(point => ({
    distance: parseFloat(point.distance) || 0,
    speed: parseFloat(point.speed) || 0,
    throttle: parseFloat(point.throttle) || 0,
    brake: parseFloat(point.brake) || 0,
    gear: parseInt(point.gear) || 0,
    rpm: parseInt(point.rpm) || 0,
    lateralG: parseFloat(point.lateralG || point.lateral_g) || 0,
    longitudinalG: parseFloat(point.longitudinalG || point.longitudinal_g) || 0
  }));
};
```

### 2.4 Corner Classification (`src/lib/cornerClassifier.js`)
```javascript
/**
 * Classifies corners based on minimum speed thresholds
 */

export const classifyCorners = (telemetryData, thresholds) => {
  const { slow, medium, fast } = thresholds;
  
  // Find local minima in speed (corner apexes)
  const corners = [];
  const windowSize = 10; // Look at 10 data points for context
  
  for (let i = windowSize; i < telemetryData.length - windowSize; i++) {
    const point = telemetryData[i];
    const prevPoints = telemetryData.slice(i - windowSize, i);
    const nextPoints = telemetryData.slice(i + 1, i + windowSize + 1);
    
    // Check if this is a local minimum
    const isMinimum = prevPoints.every(p => point.speed <= p.speed) &&
                      nextPoints.every(p => point.speed <= p.speed);
    
    if (isMinimum && point.speed < fast.max) {
      let cornerType;
      if (point.speed <= slow.max) cornerType = 'slow';
      else if (point.speed <= medium.max) cornerType = 'medium';
      else cornerType = 'fast';
      
      corners.push({
        distance: point.distance,
        apexSpeed: point.speed,
        type: cornerType,
        dataIndex: i
      });
    }
  }
  
  return corners;
};

export const analyzeCornerPerformance = (telemetryData, corners) => {
  return corners.map(corner => {
    const dataIndex = corner.dataIndex;
    const entryStart = Math.max(0, dataIndex - 30);
    const exitEnd = Math.min(telemetryData.length - 1, dataIndex + 30);
    
    const entryData = telemetryData.slice(entryStart, dataIndex);
    const exitData = telemetryData.slice(dataIndex, exitEnd);
    
    const entrySpeed = entryData.length > 0 
      ? entryData.reduce((sum, p) => sum + p.speed, 0) / entryData.length 
      : 0;
    
    const exitSpeed = exitData.length > 0
      ? exitData.reduce((sum, p) => sum + p.speed, 0) / exitData.length
      : 0;
    
    const maxBrakePressure = Math.max(...entryData.map(p => p.brake));
    
    return {
      ...corner,
      entrySpeed,
      exitSpeed,
      maxBrakePressure
    };
  });
};

export const aggregateCornerStats = (cornerAnalysis, cornerType) => {
  const filtered = cornerAnalysis.filter(c => c.type === cornerType);
  
  if (filtered.length === 0) {
    return {
      count: 0,
      avgEntrySpeed: 0,
      avgExitSpeed: 0,
      avgApexSpeed: 0,
      avgBrakePressure: 0
    };
  }
  
  return {
    count: filtered.length,
    avgEntrySpeed: filtered.reduce((sum, c) => sum + c.entrySpeed, 0) / filtered.length,
    avgExitSpeed: filtered.reduce((sum, c) => sum + c.exitSpeed, 0) / filtered.length,
    avgApexSpeed: filtered.reduce((sum, c) => sum + c.apexSpeed, 0) / filtered.length,
    avgBrakePressure: filtered.reduce((sum, c) => sum + c.maxBrakePressure, 0) / filtered.length
  };
};

export const calculateCornerAnalysisForSession = async (sessionId, circuitId, userId, telemetryData, cornerThresholds) => {
  const corners = classifyCorners(telemetryData, cornerThresholds);
  const analysis = analyzeCornerPerformance(telemetryData, corners);
  
  const stats = {
    slow: aggregateCornerStats(analysis, 'slow'),
    medium: aggregateCornerStats(analysis, 'medium'),
    fast: aggregateCornerStats(analysis, 'fast')
  };
  
  // Store in corner_analysis table
  const { supabase } = await import('./supabase.js');
  
  for (const [type, stat] of Object.entries(stats)) {
    await supabase.from('corner_analysis').insert({
      session_id: sessionId,
      circuit_id: circuitId,
      user_id: userId,
      corner_type: type,
      entry_speed_avg: stat.avgEntrySpeed,
      exit_speed_avg: stat.avgExitSpeed,
      min_speed: stat.avgApexSpeed,
      max_brake_pressure: stat.avgBrakePressure,
      corner_count: stat.count
    });
  }
  
  return stats;
};
```

---

## Phase 3: Frontend Components

### 3.1 App Store (`src/stores/appStore.js`)
```javascript
import { create } from 'zustand';

export const useAppStore = create((set) => ({
  isAuthenticated: false,
  selectedCircuit: null,
  selectedSessions: [],
  circuits: [],
  users: [],
  
  setAuthenticated: (value) => set({ isAuthenticated: value }),
  setSelectedCircuit: (circuit) => set({ selectedCircuit: circuit }),
  setSelectedSessions: (sessions) => set({ selectedSessions: sessions }),
  setCircuits: (circuits) => set({ circuits }),
  setUsers: (users) => set({ users }),
}));
```

### 3.2 Password Gate (`src/components/auth/PasswordGate.jsx`)
```jsx
import { useState } from 'react';
import { useAppStore } from '../../stores/appStore';

export default function PasswordGate({ children }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { isAuthenticated, setAuthenticated } = useAppStore();
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === 'race') {
      setAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password');
    }
  };
  
  if (isAuthenticated) {
    return children;
  }
  
  return (
    <div className="min-h-screen bg-f1-background flex items-center justify-center">
      <div className="bg-f1-panel p-8 rounded-lg shadow-xl max-w-md w-full">
        <h1 className="text-3xl font-bold text-f1-text mb-6 text-center">
          🏁 Telemetry Comparison
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-f1-text mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded bg-f1-background text-f1-text border border-gray-700 focus:border-f1-accent outline-none"
              placeholder="Enter password"
            />
          </div>
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}
          <button
            type="submit"
            className="w-full bg-f1-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            Access
          </button>
        </form>
      </div>
    </div>
  );
}
```

### 3.3 CSV Uploader (`src/components/upload/CSVUploader.jsx`)
```jsx
import { useState } from 'react';
import { parseCSV, validateTelemetryData, calculateBestLap, normalizeTelemetryData } from '../../lib/csvParser';
import { uploadTelemetrySession, uploadTelemetryData } from '../../lib/supabase';
import { calculateCornerAnalysisForSession } from '../../lib/cornerClassifier';

export default function CSVUploader({ userId, circuitId, circuitThresholds }) {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    setStatus('Parsing CSV...');
    
    try {
      // Parse CSV
      const rawData = await parseCSV(file);
      validateTelemetryData(rawData);
      const telemetryData = normalizeTelemetryData(rawData);
      
      setStatus('Calculating lap time...');
      const lapTime = calculateBestLap(telemetryData);
      
      setStatus('Creating session...');
      const session = await uploadTelemetrySession(
        userId,
        circuitId,
        lapTime,
        file.name
      );
      
      setStatus('Uploading telemetry data...');
      await uploadTelemetryData(session.id, telemetryData);
      
      setStatus('Analyzing corners...');
      await calculateCornerAnalysisForSession(
        session.id,
        circuitId,
        userId,
        telemetryData,
        circuitThresholds
      );
      
      setStatus('Upload complete! ✅');
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      setStatus(`Error: ${error.message}`);
      console.error(error);
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className="bg-f1-panel p-6 rounded-lg">
      <h3 className="text-xl font-bold text-f1-text mb-4">Upload Telemetry</h3>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        disabled={uploading || !userId || !circuitId}
        className="block w-full text-f1-text file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-f1-red file:text-white hover:file:bg-red-700 file:cursor-pointer cursor-pointer"
      />
      {status && (
        <p className="mt-4 text-f1-accent">{status}</p>
      )}
    </div>
  );
}
```

### 3.4 Telemetry Chart (`src/components/charts/TelemetryChart.jsx`)
```jsx
import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';

export default function TelemetryChart({ 
  sessions, 
  metric = 'speed',
  showDelta = false,
  deltaType = 'absolute' // 'absolute' or 'percentage'
}) {
  const plotRef = useRef(null);
  
  useEffect(() => {
    if (!sessions || sessions.length === 0) return;
    
    const traces = sessions.map((session, idx) => ({
      x: session.data.map(d => d.distance),
      y: session.data.map(d => d[metric]),
      type: 'scatter',
      mode: 'lines',
      name: session.userName,
      line: {
        color: idx === 0 ? '#00D9FF' : '#E10600',
        width: 2
      }
    }));
    
    // Add delta trace if enabled
    if (showDelta && sessions.length === 2) {
      const deltaTrace = calculateDelta(sessions[0], sessions[1], metric, deltaType);
      traces.push(deltaTrace);
    }
    
    const layout = {
      paper_bgcolor: '#15151E',
      plot_bgcolor: '#1E1E2E',
      font: { color: '#FFFFFF', family: 'Arial, sans-serif' },
      xaxis: {
        title: 'Distance (m)',
        gridcolor: '#2A2A3E',
        showline: true,
        linecolor: '#444'
      },
      yaxis: {
        title: getMetricLabel(metric),
        gridcolor: '#2A2A3E',
        showline: true,
        linecolor: '#444'
      },
      hovermode: 'x unified',
      legend: {
        x: 0.02,
        y: 0.98,
        bgcolor: 'rgba(30, 30, 46, 0.8)',
        bordercolor: '#444',
        borderwidth: 1
      },
      margin: { t: 40, r: 40, b: 60, l: 60 }
    };
    
    const config = {
      responsive: true,
      displayModeBar: true,
      modeBarButtonsToRemove: ['lasso2d', 'select2d']
    };
    
    Plotly.newPlot(plotRef.current, traces, layout, config);
    
    return () => {
      if (plotRef.current) {
        Plotly.purge(plotRef.current);
      }
    };
  }, [sessions, metric, showDelta, deltaType]);
  
  return (
    <div ref={plotRef} className="w-full h-[500px]" />
  );
}

function calculateDelta(session1, session2, metric, deltaType) {
  // Interpolate to match distances
  const distances = session1.data.map(d => d.distance);
  const deltas = distances.map(dist => {
    const p1 = session1.data.find(d => Math.abs(d.distance - dist) < 1);
    const p2 = session2.data.find(d => Math.abs(d.distance - dist) < 1);
    
    if (!p1 || !p2) return null;
    
    if (deltaType === 'percentage') {
      return ((p1[metric] - p2[metric]) / p2[metric]) * 100;
    }
    return p1[metric] - p2[metric];
  }).filter(d => d !== null);
  
  return {
    x: distances,
    y: deltas,
    type: 'scatter',
    mode: 'lines',
    name: `Delta (${deltaType})`,
    line: {
      color: '#FFB800',
      width: 1,
      dash: 'dot'
    },
    yaxis: 'y2'
  };
}

function getMetricLabel(metric) {
  const labels = {
    speed: 'Speed (km/h)',
    throttle: 'Throttle (%)',
    brake: 'Brake Pressure (%)',
    rpm: 'RPM',
    lateralG: 'Lateral G',
    longitudinalG: 'Longitudinal G'
  };
  return labels[metric] || metric;
}
```

### 3.5 Chart Controls (`src/components/charts/ChartControls.jsx`)
```jsx
export default function ChartControls({ 
  metric, 
  onMetricChange, 
  showDelta, 
  onDeltaToggle,
  deltaType,
  onDeltaTypeChange 
}) {
  const metrics = [
    { value: 'speed', label: 'Speed' },
    { value: 'throttle', label: 'Throttle' },
    { value: 'brake', label: 'Brake' },
    { value: 'rpm', label: 'RPM' },
    { value: 'lateralG', label: 'Lateral G' },
    { value: 'longitudinalG', label: 'Longitudinal G' }
  ];
  
  return (
    <div className="bg-f1-panel p-4 rounded-lg flex gap-4 items-center flex-wrap">
      <div className="flex items-center gap-2">
        <label className="text-f1-text font-medium">Metric:</label>
        <select
          value={metric}
          onChange={(e) => onMetricChange(e.target.value)}
          className="bg-f1-background text-f1-text px-3 py-2 rounded border border-gray-700 focus:border-f1-accent outline-none"
        >
          {metrics.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>
      
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-f1-text cursor-pointer">
          <input
            type="checkbox"
            checked={showDelta}
            onChange={(e) => onDeltaToggle(e.target.checked)}
            className="w-4 h-4 accent-f1-accent"
          />
          <span>Show Delta</span>
        </label>
      </div>
      
      {showDelta && (
        <div className="flex items-center gap-2">
          <label className="text-f1-text font-medium">Delta Type:</label>
          <select
            value={deltaType}
            onChange={(e) => onDeltaTypeChange(e.target.value)}
            className="bg-f1-background text-f1-text px-3 py-2 rounded border border-gray-700 focus:border-f1-accent outline-none"
          >
            <option value="absolute">Absolute</option>
            <option value="percentage">Percentage</option>
          </select>
        </div>
      )}
    </div>
  );
}
```

### 3.6 Trend Dashboard (`src/components/dashboard/TrendDashboard.jsx`)
```jsx
import { useEffect, useState } from 'react';
import { getAllCornerAnalysis } from '../../lib/supabase';
import StatsCard from './StatsCard';

export default function TrendDashboard() {
  const [analysis, setAnalysis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aggregatedStats, setAggregatedStats] = useState(null);
  
  useEffect(() => {
    loadAnalysis();
  }, []);
  
  const loadAnalysis = async () => {
    try {
      const data = await getAllCornerAnalysis();
      setAnalysis(data);
      calculateAggregatedStats(data);
    } catch (error) {
      console.error('Error loading analysis:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const calculateAggregatedStats = (data) => {
    const byUser = {};
    
    data.forEach(record => {
      const userName = record.users.name;
      if (!byUser[userName]) {
        byUser[userName] = {
          slow: { entry: [], exit: [], apex: [] },
          medium: { entry: [], exit: [], apex: [] },
          fast: { entry: [], exit: [], apex: [] }
        };
      }
      
      const type = record.corner_type;
      byUser[userName][type].entry.push(record.entry_speed_avg);
      byUser[userName][type].exit.push(record.exit_speed_avg);
      byUser[userName][type].apex.push(record.min_speed);
    });
    
    // Calculate averages
    const stats = {};
    for (const [user, corners] of Object.entries(byUser)) {
      stats[user] = {};
      for (const [type, speeds] of Object.entries(corners)) {
        stats[user][type] = {
          avgEntry: avg(speeds.entry),
          avgExit: avg(speeds.exit),
          avgApex: avg(speeds.apex)
        };
      }
    }
    
    setAggregatedStats(stats);
  };
  
  if (loading) {
    return <div className="text-f1-text">Loading dashboard...</div>;
  }
  
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-f1-text">Cross-Circuit Analysis</h2>
      
      {aggregatedStats && Object.entries(aggregatedStats).map(([user, stats]) => (
        <div key={user} className="space-y-4">
          <h3 className="text-2xl font-bold text-f1-accent">{user}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['slow', 'medium', 'fast'].map(type => (
              <StatsCard
                key={type}
                title={`${type.toUpperCase()} Corners`}
                stats={stats[type]}
              />
            ))}
          </div>
        </div>
      ))}
      
      {/* Comparison Section */}
      {aggregatedStats && Object.keys(aggregatedStats).length === 2 && (
        <div className="bg-f1-panel p-6 rounded-lg">
          <h3 className="text-2xl font-bold text-f1-text mb-4">Head-to-Head</h3>
          <ComparisonTable stats={aggregatedStats} />
        </div>
      )}
    </div>
  );
}

function StatsCard({ title, stats }) {
  return (
    <div className="bg-f1-panel p-6 rounded-lg">
      <h4 className="text-lg font-bold text-f1-text mb-4">{title}</h4>
      <div className="space-y-2 text-f1-text">
        <div className="flex justify-between">
          <span>Avg Entry:</span>
          <span className="font-mono">{stats.avgEntry.toFixed(1)} km/h</span>
        </div>
        <div className="flex justify-between">
          <span>Avg Apex:</span>
          <span className="font-mono">{stats.avgApex.toFixed(1)} km/h</span>
        </div>
        <div className="flex justify-between">
          <span>Avg Exit:</span>
          <span className="font-mono">{stats.avgExit.toFixed(1)} km/h</span>
        </div>
      </div>
    </div>
  );
}

function ComparisonTable({ stats }) {
  const users = Object.keys(stats);
  const user1 = users[0];
  const user2 = users[1];
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-f1-text">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="text-left p-2">Corner Type</th>
            <th className="text-left p-2">Metric</th>
            <th className="text-center p-2">{user1}</th>
            <th className="text-center p-2">{user2}</th>
            <th className="text-center p-2">Delta</th>
          </tr>
        </thead>
        <tbody>
          {['slow', 'medium', 'fast'].map(type => (
            ['avgEntry', 'avgApex', 'avgExit'].map(metric => {
              const val1 = stats[user1][type][metric];
              const val2 = stats[user2][type][metric];
              const delta = val1 - val2;
              const winner = delta > 0 ? user1 : user2;
              
              return (
                <tr key={`${type}-${metric}`} className="border-b border-gray-800">
                  <td className="p-2 capitalize">{type}</td>
                  <td className="p-2">{metric.replace('avg', '')}</td>
                  <td className={`text-center p-2 font-mono ${winner === user1 ? 'text-green-400' : ''}`}>
                    {val1.toFixed(1)}
                  </td>
                  <td className={`text-center p-2 font-mono ${winner === user2 ? 'text-green-400' : ''}`}>
                    {val2.toFixed(1)}
                  </td>
                  <td className={`text-center p-2 font-mono ${delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                  </td>
                </tr>
              );
            })
          ))}
        </tbody>
      </table>
    </div>
  );
}

function avg(arr) {
  return arr.length > 0 ? arr.reduce((sum, v) => sum + v, 0) / arr.length : 0;
}
```

### 3.7 MCP Chat Interface (`src/components/mcp/MCPChat.jsx`)
```jsx
import { useState } from 'react';

export default function MCPChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    try {
      // This would connect to Claude MCP in production
      // For now, simulate basic queries
      const response = await simulateMCPQuery(input);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('MCP Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error processing your request.' 
      }]);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="bg-f1-panel rounded-lg h-[600px] flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-xl font-bold text-f1-text">MCP Analysis Chat</h3>
        <p className="text-sm text-gray-400 mt-1">
          Ask questions about your telemetry data
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-gray-500 text-center mt-8">
            <p className="mb-2">Try asking:</p>
            <ul className="text-sm space-y-1">
              <li>"Where do I lose most time at Monza?"</li>
              <li>"Compare our braking points"</li>
              <li>"Show my fastest corner exits"</li>
            </ul>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-f1-accent text-f1-background'
                  : 'bg-f1-background text-f1-text'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-f1-background text-f1-text p-3 rounded-lg">
              Analyzing...
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about your telemetry..."
            className="flex-1 px-4 py-2 rounded bg-f1-background text-f1-text border border-gray-700 focus:border-f1-accent outline-none"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-6 py-2 bg-f1-red hover:bg-red-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// Placeholder for MCP integration
async function simulateMCPQuery(query) {
  // In production, this would query the Supabase database via MCP
  // and return intelligent responses based on telemetry data
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  if (query.toLowerCase().includes('monza')) {
    return "Based on your Monza sessions, you're losing approximately 0.3 seconds in the first chicane compared to your friend. Your entry speed is similar but you're getting on the throttle 15 meters later.";
  }
  
  return "I can analyze your telemetry data. Try asking specific questions about circuits, corners, or comparing specific metrics.";
}
```

---

## Phase 4: Main Application & Pages

### 4.1 Main App (`src/App.jsx`)
```jsx
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import PasswordGate from './components/auth/PasswordGate';
import UploadPage from './pages/Upload';
import ComparePage from './pages/Compare';
import DashboardPage from './pages/Dashboard';
import MCPPage from './pages/MCP';

function App() {
  return (
    <PasswordGate>
      <Router>
        <div className="min-h-screen bg-f1-background">
          <nav className="bg-f1-panel border-b border-gray-800">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-f1-text">
                  🏁 Telemetry Compare
                </h1>
                <div className="flex gap-4">
                  <NavLink to="/">Upload</NavLink>
                  <NavLink to="/compare">Compare</NavLink>
                  <NavLink to="/dashboard">Dashboard</NavLink>
                  <NavLink to="/mcp">MCP Chat</NavLink>
                </div>
              </div>
            </div>
          </nav>
          
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<UploadPage />} />
              <Route path="/compare" element={<ComparePage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/mcp" element={<MCPPage />} />
            </Routes>
          </main>
        </div>
      </Router>
    </PasswordGate>
  );
}

function NavLink({ to, children }) {
  return (
    <Link
      to={to}
      className="text-f1-text hover:text-f1-accent transition-colors font-medium"
    >
      {children}
    </Link>
  );
}

export default App;
```

### 4.2 Upload Page (`src/pages/Upload.jsx`)
```jsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import CSVUploader from '../components/upload/CSVUploader';

export default function UploadPage() {
  const [users, setUsers] = useState([]);
  const [circuits, setCircuits] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedCircuit, setSelectedCircuit] = useState('');
  const [circuitThresholds, setCircuitThresholds] = useState(null);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    const { data: usersData } = await supabase.from('users').select('*');
    const { data: circuitsData } = await supabase.from('circuits').select('*');
    setUsers(usersData || []);
    setCircuits(circuitsData || []);
  };
  
  useEffect(() => {
    if (selectedCircuit) {
      const circuit = circuits.find(c => c.id === selectedCircuit);
      if (circuit) {
        setCircuitThresholds(circuit.corner_classifications);
      }
    }
  }, [selectedCircuit, circuits]);
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-3xl font-bold text-f1-text">Upload Telemetry</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-f1-panel p-6 rounded-lg">
          <label className="block text-f1-text font-medium mb-2">Select User</label>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="w-full bg-f1-background text-f1-text px-4 py-2 rounded border border-gray-700 focus:border-f1-accent outline-none"
          >
            <option value="">Choose user...</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.display_name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="bg-f1-panel p-6 rounded-lg">
          <label className="block text-f1-text font-medium mb-2">Select Circuit</label>
          <select
            value={selectedCircuit}
            onChange={(e) => setSelectedCircuit(e.target.value)}
            className="w-full bg-f1-background text-f1-text px-4 py-2 rounded border border-gray-700 focus:border-f1-accent outline-none"
          >
            <option value="">Choose circuit...</option>
            {circuits.map(circuit => (
              <option key={circuit.id} value={circuit.id}>
                {circuit.display_name}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <CSVUploader
        userId={selectedUser}
        circuitId={selectedCircuit}
        circuitThresholds={circuitThresholds}
      />
      
      {circuitThresholds && (
        <div className="bg-f1-panel p-6 rounded-lg">
          <h3 className="text-xl font-bold text-f1-text mb-4">Corner Classifications</h3>
          <div className="grid grid-cols-3 gap-4 text-f1-text">
            <div>
              <p className="font-bold text-green-400">Slow Corners</p>
              <p className="text-sm">{circuitThresholds.slow.min} - {circuitThresholds.slow.max} km/h</p>
            </div>
            <div>
              <p className="font-bold text-yellow-400">Medium Corners</p>
              <p className="text-sm">{circuitThresholds.medium.min} - {circuitThresholds.medium.max} km/h</p>
            </div>
            <div>
              <p className="font-bold text-red-400">Fast Corners</p>
              <p className="text-sm">{circuitThresholds.fast.min}+ km/h</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 4.3 Compare Page (`src/pages/Compare.jsx`)
```jsx
import { useState, useEffect } from 'react';
import { supabase, getSessionsByCircuit, getTelemetryData } from '../lib/supabase';
import TelemetryChart from '../components/charts/TelemetryChart';
import ChartControls from '../components/charts/ChartControls';

export default function ComparePage() {
  const [circuits, setCircuits] = useState([]);
  const [selectedCircuit, setSelectedCircuit] = useState('');
  const [sessions, setSessions] = useState([]);
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [metric, setMetric] = useState('speed');
  const [showDelta, setShowDelta] = useState(false);
  const [deltaType, setDeltaType] = useState('absolute');
  
  useEffect(() => {
    loadCircuits();
  }, []);
  
  useEffect(() => {
    if (selectedCircuit) {
      loadSessions();
    }
  }, [selectedCircuit]);
  
  const loadCircuits = async () => {
    const { data } = await supabase.from('circuits').select('*');
    setCircuits(data || []);
  };
  
  const loadSessions = async () => {
    setLoading(true);
    const data = await getSessionsByCircuit(selectedCircuit);
    setSessions(data);
    setLoading(false);
  };
  
  const handleSessionSelect = (sessionId) => {
    setSelectedSessions(prev => {
      if (prev.includes(sessionId)) {
        return prev.filter(id => id !== sessionId);
      }
      if (prev.length >= 2) return prev; // Max 2 sessions
      return [...prev, sessionId];
    });
  };
  
  const loadComparisonData = async () => {
    if (selectedSessions.length === 0) return;
    
    setLoading(true);
    const data = await Promise.all(
      selectedSessions.map(async (sessionId) => {
        const session = sessions.find(s => s.id === sessionId);
        const telemetry = await getTelemetryData(sessionId);
        return {
          sessionId,
          userName: session.users.display_name,
          lapTime: session.lap_time,
          data: telemetry
        };
      })
    );
    setChartData(data);
    setLoading(false);
  };
  
  useEffect(() => {
    loadComparisonData();
  }, [selectedSessions]);
  
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-f1-text">Compare Laps</h2>
      
      <div className="bg-f1-panel p-6 rounded-lg">
        <label className="block text-f1-text font-medium mb-2">Select Circuit</label>
        <select
          value={selectedCircuit}
          onChange={(e) => setSelectedCircuit(e.target.value)}
          className="w-full bg-f1-background text-f1-text px-4 py-2 rounded border border-gray-700 focus:border-f1-accent outline-none"
        >
          <option value="">Choose circuit...</option>
          {circuits.map(circuit => (
            <option key={circuit.id} value={circuit.id}>
              {circuit.display_name}
            </option>
          ))}
        </select>
      </div>
      
      {sessions.length > 0 && (
        <div className="bg-f1-panel p-6 rounded-lg">
          <h3 className="text-xl font-bold text-f1-text mb-4">
            Select Sessions (max 2)
          </h3>
          <div className="space-y-2">
            {sessions.map(session => (
              <label
                key={session.id}
                className="flex items-center gap-3 p-3 bg-f1-background rounded hover:bg-opacity-80 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedSessions.includes(session.id)}
                  onChange={() => handleSessionSelect(session.id)}
                  disabled={selectedSessions.length >= 2 && !selectedSessions.includes(session.id)}
                  className="w-4 h-4 accent-f1-accent"
                />
                <div className="flex-1 text-f1-text">
                  <span className="font-bold">{session.users.display_name}</span>
                  <span className="mx-2">•</span>
                  <span className="font-mono">{session.lap_time.toFixed(3)}s</span>
                  <span className="mx-2">•</span>
                  <span className="text-sm text-gray-400">
                    {new Date(session.session_date).toLocaleDateString()}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
      
      {chartData.length > 0 && (
        <>
          <ChartControls
            metric={metric}
            onMetricChange={setMetric}
            showDelta={showDelta}
            onDeltaToggle={setShowDelta}
            deltaType={deltaType}
            onDeltaTypeChange={setDeltaType}
          />
          
          <div className="bg-f1-panel p-6 rounded-lg">
            <TelemetryChart
              sessions={chartData}
              metric={metric}
              showDelta={showDelta}
              deltaType={deltaType}
            />
          </div>
          
          <div className="bg-f1-panel p-6 rounded-lg">
            <h3 className="text-xl font-bold text-f1-text mb-4">Lap Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              {chartData.map(session => (
                <div key={session.sessionId} className="text-f1-text">
                  <p className="font-bold text-lg">{session.userName}</p>
                  <p className="text-2xl font-mono text-f1-accent">
                    {session.lapTime.toFixed(3)}s
                  </p>
                  {chartData.length === 2 && (
                    <p className="text-sm text-gray-400">
                      {chartData[0].sessionId === session.sessionId
                        ? `Δ: ${(chartData[0].lapTime - chartData[1].lapTime).toFixed(3)}s`
                        : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

### 4.4 Dashboard Page (`src/pages/Dashboard.jsx`)
```jsx
import TrendDashboard from '../components/dashboard/TrendDashboard';

export default function DashboardPage() {
  return (
    <div>
      <TrendDashboard />
    </div>
  );
}
```

### 4.5 MCP Page (`src/pages/MCP.jsx`)
```jsx
import MCPChat from '../components/mcp/MCPChat';

export default function MCPPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-f1-text mb-6">MCP Analysis</h2>
      <MCPChat />
    </div>
  );
}
```

---

## Phase 5: Deployment & Configuration

### 5.1 Environment Variables
Create `.env` file:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5.2 Cloudflare Pages Configuration
Create `wrangler.toml`:
```toml
name = "telemetry-compare"
compatibility_date = "2024-01-01"

[site]
bucket = "./dist"

[[kv_namespaces]]
binding = "TELEMETRY_CIRCUITS"
id = "your_kv_namespace_id"
```

Deploy commands:
```bash
npm run build
npx wrangler pages deploy dist
```

### 5.3 Supabase Initial Data
```sql
-- Insert default circuits
INSERT INTO circuits (name, display_name, country, corner_classifications) VALUES
('monza', 'Monza', 'Italy', '{"slow": {"min": 0, "max": 120}, "medium": {"min": 120, "max": 200}, "fast": {"min": 200, "max": 999}}'::jsonb),
('spa', 'Spa-Francorchamps', 'Belgium', '{"slow": {"min": 0, "max": 100}, "medium": {"min": 100, "max": 180}, "fast": {"min": 180, "max": 999}}'::jsonb),
('silverstone', 'Silverstone', 'United Kingdom', '{"slow": {"min": 0, "max": 110}, "medium": {"min": 110, "max": 190}, "fast": {"min": 190, "max": 999}}'::jsonb);

-- Add more circuits as needed (up to 20 total)
```

### 5.4 Populate Cloudflare KV
Use Wrangler CLI:
```bash
# Add config
wrangler kv:key put --binding=TELEMETRY_CIRCUITS "app:config" '{"password":"race","availableCircuits":["monza","spa","silverstone"],"users":["sam","friend"]}'

# Add circuit details
wrangler kv:key put --binding=TELEMETRY_CIRCUITS "circuit:monza" '{"name":"monza","displayName":"Monza","country":"Italy","trackLength":5793}'
```

---

## Phase 6: Testing & Optimization

### 6.1 Test Checklist
- [ ] CSV upload with sample data
- [ ] Session creation and data storage
- [ ] Chart rendering with 2 sessions
- [ ] Delta calculations (absolute & percentage)
- [ ] Corner classification and analysis
- [ ] Dashboard aggregation across circuits
- [ ] MCP chat responses
- [ ] Password authentication

### 6.2 Performance Optimizations
1. **Database Indexing**: Already included in schema
2. **Data Batching**: Implemented in upload process
3. **Chart Memoization**: Use React.memo for chart components
4. **Lazy Loading**: Add React.lazy for dashboard/MCP pages

### 6.3 Known Limitations & Future Enhancements
- MCP chat is currently simulated; integrate actual Claude MCP in production
- Corner detection algorithm is basic; can be improved with ML
- No real-time collaboration features
- Limited to 2-session comparison (can be extended)

---

## Phase 7: Usage Instructions

### For Users:
1. Navigate to the app URL
2. Enter password: `race`
3. Go to Upload page
4. Select user and circuit
5. Upload CSV file from Assetto Corsa Content Manager
6. Go to Compare page to visualize laps
7. Use Dashboard for cross-circuit analysis
8. Use MCP tab for natural language queries

### For Adding Circuits:
1. Connect to Supabase database
2. Insert new circuit record:
```sql
INSERT INTO circuits (name, display_name, country, corner_classifications) VALUES
('new_circuit', 'New Circuit Name', 'Country', 
'{"slow": {"min": 0, "max": 100}, "medium": {"min": 100, "max": 180}, "fast": {"min": 180, "max": 999}}'::jsonb);
```
3. Update Cloudflare KV:
```bash
wrangler kv:key put --binding=TELEMETRY_CIRCUITS "circuit:new_circuit" '{"name":"new_circuit","displayName":"New Circuit Name"}'
```

---

## Summary
This instruction set provides a complete blueprint for building your sim racing telemetry comparison tool. The architecture is designed for:
- **Scalability**: Handles thousands of data points per lap
- **Performance**: Indexed queries and batched uploads
- **Maintainability**: Clean component structure and separation of concerns
- **Extensibility**: Easy to add new circuits, users, and features

Key features implemented:
✅ CSV upload per user/circuit
✅ F1-style Plotly charts with overlays
✅ Configurable delta display (absolute/percentage)
✅ Corner classification (slow/medium/fast)
✅ Cross-circuit trend analysis
✅ MCP chat interface
✅ Simple password authentication
✅ Cloudflare + Supabase infrastructure

Next steps: Deploy, test with real telemetry data, and iterate on corner detection algorithms.