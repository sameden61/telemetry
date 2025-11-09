import { useEffect, useRef } from 'react';
// @ts-ignore - Plotly doesn't have TypeScript definitions
import Plotly from 'plotly.js-dist-min';

interface TelemetryDataPoint {
  distance: number;
  speed: number;
  throttle: number;
  brake: number;
  gear: number;
  rpm: number;
  lateral_g: number;
  longitudinal_g: number;
  time: number;
  cumulative_time: number;
  [key: string]: number | undefined;
}

interface Session {
  sessionId: string;
  userName: string;
  lapTime: number;
  data: TelemetryDataPoint[];
}

interface TelemetryChartProps {
  sessions: Session[];
  showDelta?: boolean;
  deltaType?: 'absolute' | 'percentage';
}

export default function TelemetryChart({
  sessions,
  showDelta = false,
  deltaType = 'absolute'
}: TelemetryChartProps) {
  const plotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessions || sessions.length === 0 || !plotRef.current) return;

    const colors = ['#00D9FF', '#E10600'];
    const traces: any[] = [];

    // Create 5 subplots: Speed, Brake, Time Delta, Throttle, Gear
    const metrics = ['speed', 'brake', 'cumulative_time', 'throttle', 'gear'];

    metrics.forEach((metric, metricIdx) => {
      // Time delta is always shown as delta (never absolute values)
      if (metric === 'cumulative_time') {
        if (sessions.length === 2) {
          const deltaTrace = calculateTimeDelta(
            sessions[0],
            sessions[1],
            metricIdx === 4 ? 'x' : `x${metricIdx + 1}`,
            metricIdx === 0 ? 'y' : `y${metricIdx + 1}`,
            false  // Never show legend for time delta
          );
          traces.push(deltaTrace);
        }
      } else {
        // When showDelta is false, show the actual session data
        if (!showDelta) {
          sessions.forEach((session, sessionIdx) => {
            traces.push({
              x: session.data.map(d => d.distance),
              y: session.data.map(d => d[metric]),
              type: 'scatter',
              mode: 'lines',
              name: session.userName,
              legendgroup: session.userName,
              showlegend: metricIdx === 0, // Only show legend on speed graph
              line: {
                color: colors[sessionIdx] || '#FFFFFF',
                width: 2
              },
              xaxis: metricIdx === 4 ? 'x' : `x${metricIdx + 1}`,
              yaxis: metricIdx === 0 ? 'y' : `y${metricIdx + 1}`
            });
          });
        }

        // When showDelta is true, ONLY show delta lines (not the absolute values)
        if (showDelta && sessions.length === 2) {
          const deltaTrace = calculateMetricDelta(
            sessions[0],
            sessions[1],
            metric,
            metricIdx === 4 ? 'x' : `x${metricIdx + 1}`,
            metricIdx === 0 ? 'y' : `y${metricIdx + 1}`,
            metricIdx === 0  // Only show legend on speed graph
          );
          traces.push(deltaTrace);
        }
      }
    });

    const layout: any = {
      paper_bgcolor: '#000000',
      plot_bgcolor: '#0A0A0A',
      font: { color: '#FFFFFF', family: 'Arial, sans-serif' },
      hovermode: 'x unified',
      grid: {
        rows: 5,
        columns: 1,
        pattern: 'independent',
        roworder: 'top to bottom'
      },
      legend: {
        x: 0.02,
        y: 0.98,
        bgcolor: 'rgba(10, 10, 10, 0.8)',
        bordercolor: '#1a1a1a',
        borderwidth: 1
      },
      margin: { t: 40, r: 40, b: 60, l: 60 },

      // Speed subplot (top)
      xaxis1: { 
        gridcolor: '#1a1a1a', 
        showticklabels: false,
        matches: 'x'
      },
      yaxis1: {
        title: showDelta ? 'Δ Speed (km/h)' : 'Speed (km/h)',
        gridcolor: '#1a1a1a',
        domain: [0.82, 1],
        zeroline: showDelta,
        zerolinecolor: showDelta ? '#666666' : undefined,
        zerolinewidth: showDelta ? 2 : undefined
      },

      // Brake subplot (second)
      xaxis2: { 
        gridcolor: '#1a1a1a', 
        showticklabels: false,
        matches: 'x'
      },
      yaxis2: {
        title: showDelta ? 'Δ Brake (%)' : 'Brake (%)',
        gridcolor: '#1a1a1a',
        domain: [0.615, 0.785],
        zeroline: showDelta,
        zerolinecolor: showDelta ? '#666666' : undefined,
        zerolinewidth: showDelta ? 2 : undefined
      },

      // Time Delta subplot (third) - always shown as delta when 2 sessions
      xaxis3: { 
        gridcolor: '#1a1a1a', 
        showticklabels: false,
        matches: 'x'
      },
      yaxis3: {
        title: 'Δ Time (s)',
        gridcolor: '#1a1a1a',
        domain: [0.41, 0.58],
        zeroline: true,
        zerolinecolor: '#666666',
        zerolinewidth: 2
      },

      // Throttle subplot (fourth)
      xaxis4: { 
        gridcolor: '#1a1a1a', 
        showticklabels: false,
        matches: 'x'
      },
      yaxis4: {
        title: showDelta ? 'Δ Throttle (%)' : 'Throttle (%)',
        gridcolor: '#1a1a1a',
        domain: [0.205, 0.375],
        zeroline: showDelta,
        zerolinecolor: showDelta ? '#666666' : undefined,
        zerolinewidth: showDelta ? 2 : undefined
      },

      // Gear subplot (bottom)
      xaxis: {
        title: 'Distance (m)',
        gridcolor: '#1a1a1a',
        showticklabels: true
      },
      yaxis5: {
        title: showDelta ? 'Δ Gear' : 'Gear',
        gridcolor: '#1a1a1a',
        domain: [0, 0.17],
        dtick: showDelta ? undefined : 1,
        zeroline: showDelta,
        zerolinecolor: showDelta ? '#666666' : undefined,
        zerolinewidth: showDelta ? 2 : undefined
      }
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
  }, [sessions, showDelta, deltaType]);

  return (
    <div ref={plotRef} className="w-full h-[1000px]" />
  );
}

/**
 * Calculate cumulative time delta between two sessions
 * Returns session1 - session2 (positive means session1 is slower)
 */
function calculateTimeDelta(
  session1: Session,
  session2: Session,
  xaxis: string,
  yaxis: string,
  showlegend: boolean
) {
  const distances = session1.data.map(d => d.distance);
  
  const deltas = distances.map((dist, idx) => {
    const p1 = session1.data[idx];
    const p2 = session2.data.find(d => Math.abs(d.distance - dist) < 1);

    if (!p1 || !p2) return null;

    const time1 = p1.cumulative_time;
    const time2 = p2.cumulative_time;

    if (time1 === undefined || time2 === undefined) return null;

    // Delta: positive means session1 is slower (taking more time)
    return time1 - time2;
  }).filter(d => d !== null) as number[];

  return {
    x: distances,
    y: deltas,
    type: 'scatter',
    mode: 'lines',
    name: 'Time Delta',
    line: {
      color: '#FFB800',
      width: 2
    },
    fill: 'tozeroy',
    fillcolor: 'rgba(255, 184, 0, 0.1)',
    xaxis,
    yaxis,
    legendgroup: 'timedelta',
    showlegend
  };
}

/**
 * Calculate the difference between two sessions for a specific metric
 * Returns session1 - session2 at each distance point
 */
function calculateMetricDelta(
  session1: Session,
  session2: Session,
  metric: string,
  xaxis: string,
  yaxis: string,
  showlegend: boolean
) {
  // Use session1 distances as reference
  const distances = session1.data.map(d => d.distance);
  
  const deltas = distances.map((dist, idx) => {
    const p1 = session1.data[idx];
    // Find closest matching point in session2 (within 1 meter)
    const p2 = session2.data.find(d => Math.abs(d.distance - dist) < 1);

    if (!p1 || !p2) return null;

    const val1 = p1[metric];
    const val2 = p2[metric];

    if (val1 === undefined || val2 === undefined) return null;

    // Delta: positive means session1 has higher value, negative means session2 has higher value
    return val1 - val2;
  }).filter(d => d !== null) as number[];

  return {
    x: distances,
    y: deltas,
    type: 'scatter',
    mode: 'lines',
    name: 'Delta',
    line: {
      color: '#FFB800',
      width: 2
    },
    xaxis,
    yaxis,
    legendgroup: 'delta',
    showlegend
  };
}
