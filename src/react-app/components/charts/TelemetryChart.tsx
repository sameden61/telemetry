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
  scaled_distance: number;
  smoothed_gear: number;
  smoothed_throttle: number;
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

    // Determine which session is faster (lower lap time)
    // Blue for faster, Red for slower
    let sortedSessions = [...sessions];
    if (sessions.length === 2) {
      sortedSessions = [...sessions].sort((a, b) => a.lapTime - b.lapTime);
    }
    const colors = sortedSessions.map((_, idx) =>
      idx === 0 ? '#00D9FF' : '#E10600' // Blue for fastest, red for slower
    );
    const sessionColorMap = new Map(sortedSessions.map((session, idx) => [session.sessionId, colors[idx]]));

    const traces: any[] = [];

    // Create 5 subplots: Speed, Brake, Time Delta, Smoothed Throttle, Smoothed Gear
    const metrics = ['speed', 'brake', 'cumulative_time', 'smoothed_throttle', 'smoothed_gear'];

    metrics.forEach((metric, metricIdx) => {
      // Time delta is always shown as delta (never absolute values)
      if (metric === 'cumulative_time') {
        if (sessions.length === 2) {
          // Always calculate as faster - slower (sorted sessions)
          const deltaTrace = calculateTimeDelta(
            sortedSessions[0], // Faster lap
            sortedSessions[1], // Slower lap
            metricIdx === 4 ? 'x' : `x${metricIdx + 1}`,
            metricIdx === 0 ? 'y' : `y${metricIdx + 1}`,
            false  // Never show legend for time delta
          );
          traces.push(deltaTrace);
        }
      } else {
        // When showDelta is false, show the actual session data
        if (!showDelta) {
          sessions.forEach((session) => {
            const lapTimeLabel = `${session.userName} (${session.lapTime.toFixed(3)}s)`;
            traces.push({
              x: session.data.map(d => d.scaled_distance),
              y: session.data.map(d => d[metric]),
              type: 'scatter',
              mode: 'lines',
              name: lapTimeLabel,
              legendgroup: session.userName,
              showlegend: metricIdx === 0, // Only show legend on speed graph
              line: {
                color: sessionColorMap.get(session.sessionId) || '#FFFFFF',
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

      // Speed subplot (top) - 50% taller (27% of height)
      xaxis1: {
        gridcolor: '#1a1a1a',
        showticklabels: false,
        matches: 'x'
      },
      yaxis1: {
        title: showDelta ? 'Δ Speed (km/h)' : 'Speed (km/h)',
        gridcolor: '#1a1a1a',
        domain: [0.73, 1],
        zeroline: showDelta,
        zerolinecolor: showDelta ? '#666666' : undefined,
        zerolinewidth: showDelta ? 2 : undefined,
        autorange: true,
        fixedrange: false
      },

      // Brake subplot (second) - 20% shorter (13.6% of height)
      xaxis2: {
        gridcolor: '#1a1a1a',
        showticklabels: false,
        matches: 'x'
      },
      yaxis2: {
        title: showDelta ? 'Δ Brake (%)' : 'Brake (%)',
        gridcolor: '#1a1a1a',
        domain: [0.5475, 0.6835],
        zeroline: showDelta,
        zerolinecolor: showDelta ? '#666666' : undefined,
        zerolinewidth: showDelta ? 2 : undefined,
        autorange: true,
        fixedrange: false
      },

      // Time Delta subplot (third) - 20% shorter (13.6% of height)
      xaxis3: {
        gridcolor: '#1a1a1a',
        showticklabels: false,
        matches: 'x'
      },
      yaxis3: {
        title: 'Δ Time (s) - Faster vs Slower',
        gridcolor: '#1a1a1a',
        domain: [0.365, 0.501],
        zeroline: true,
        zerolinecolor: '#666666',
        zerolinewidth: 2,
        autorange: true,
        fixedrange: false
      },

      // Throttle subplot (fourth) - 20% shorter (13.6% of height)
      xaxis4: {
        gridcolor: '#1a1a1a',
        showticklabels: false,
        matches: 'x'
      },
      yaxis4: {
        title: showDelta ? 'Δ Throttle (%)' : 'Throttle (%) - Smoothed',
        gridcolor: '#1a1a1a',
        domain: [0.1825, 0.3185],
        zeroline: showDelta,
        zerolinecolor: showDelta ? '#666666' : undefined,
        zerolinewidth: showDelta ? 2 : undefined,
        autorange: true,
        fixedrange: false
      },

      // Gear subplot (bottom) - 20% shorter (13.6% of height)
      xaxis: {
        title: 'Lap Progress (%)',
        gridcolor: '#1a1a1a',
        showticklabels: true
      },
      yaxis5: {
        title: showDelta ? 'Δ Gear' : 'Gear - Smoothed',
        gridcolor: '#1a1a1a',
        domain: [0, 0.136],
        dtick: showDelta ? undefined : 1,
        zeroline: showDelta,
        zerolinecolor: showDelta ? '#666666' : undefined,
        zerolinewidth: showDelta ? 2 : undefined,
        autorange: true,
        fixedrange: false
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
 * Returns fasterSession - slowerSession
 * Negative values indicate the faster session is gaining time (ahead)
 * Positive values indicate the faster session is losing time (behind)
 */
function calculateTimeDelta(
  fasterSession: Session,
  slowerSession: Session,
  xaxis: string,
  yaxis: string,
  showlegend: boolean
) {
  const scaledDistances = fasterSession.data.map(d => d.scaled_distance);

  const deltas = scaledDistances.map((scaledDist, idx) => {
    const p1 = fasterSession.data[idx];
    const p2 = slowerSession.data.find(d => Math.abs(d.scaled_distance - scaledDist) < 0.1);

    if (!p1 || !p2) return null;

    const time1 = p1.cumulative_time;
    const time2 = p2.cumulative_time;

    if (time1 === undefined || time2 === undefined) return null;

    // Delta: faster - slower
    // Negative = faster lap is ahead (gaining time)
    // Positive = faster lap is behind (losing time to slower lap)
    return time1 - time2;
  }).filter(d => d !== null) as number[];

  return {
    x: scaledDistances,
    y: deltas,
    type: 'scatter',
    mode: 'lines',
    name: 'Time Delta (Faster - Slower)',
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
 * Returns session1 - session2 at each scaled distance point
 */
function calculateMetricDelta(
  session1: Session,
  session2: Session,
  metric: string,
  xaxis: string,
  yaxis: string,
  showlegend: boolean
) {
  // Use session1 scaled distances as reference
  const scaledDistances = session1.data.map(d => d.scaled_distance);

  const deltas = scaledDistances.map((scaledDist, idx) => {
    const p1 = session1.data[idx];
    // Find closest matching point in session2 (within 0.1% of lap)
    const p2 = session2.data.find(d => Math.abs(d.scaled_distance - scaledDist) < 0.1);

    if (!p1 || !p2) return null;

    const val1 = p1[metric];
    const val2 = p2[metric];

    if (val1 === undefined || val2 === undefined) return null;

    // Delta: positive means session1 has higher value, negative means session2 has higher value
    return val1 - val2;
  }).filter(d => d !== null) as number[];

  return {
    x: scaledDistances,
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
