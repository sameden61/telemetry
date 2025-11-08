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
  metric?: string;
  showDelta?: boolean;
  deltaType?: 'absolute' | 'percentage';
}

export default function TelemetryChart({
  sessions,
  metric = 'speed',
  showDelta = false,
  deltaType = 'absolute'
}: TelemetryChartProps) {
  const plotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessions || sessions.length === 0 || !plotRef.current) return;

    const traces: any[] = sessions.map((session, idx) => ({
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
      paper_bgcolor: '#000000',
      plot_bgcolor: '#0A0A0A',
      font: { color: '#FFFFFF', family: 'Arial, sans-serif' },
      xaxis: {
        title: 'Distance (m)',
        gridcolor: '#1a1a1a',
        showline: true,
        linecolor: '#1a1a1a'
      },
      yaxis: {
        title: getMetricLabel(metric),
        gridcolor: '#1a1a1a',
        showline: true,
        linecolor: '#1a1a1a'
      },
      hovermode: 'x unified',
      legend: {
        x: 0.02,
        y: 0.98,
        bgcolor: 'rgba(10, 10, 10, 0.8)',
        bordercolor: '#1a1a1a',
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

function calculateDelta(session1: Session, session2: Session, metric: string, deltaType: 'absolute' | 'percentage') {
  // Interpolate to match distances
  const distances = session1.data.map(d => d.distance);
  const deltas = distances.map(dist => {
    const p1 = session1.data.find(d => Math.abs(d.distance - dist) < 1);
    const p2 = session2.data.find(d => Math.abs(d.distance - dist) < 1);

    if (!p1 || !p2) return null;

    const val1 = p1[metric];
    const val2 = p2[metric];

    if (val1 === undefined || val2 === undefined) return null;

    if (deltaType === 'percentage') {
      return ((val1 - val2) / val2) * 100;
    }
    return val1 - val2;
  }).filter(d => d !== null) as number[];

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

function getMetricLabel(metric: string): string {
  const labels: { [key: string]: string } = {
    speed: 'Speed (km/h)',
    throttle: 'Throttle (%)',
    brake: 'Brake Pressure (%)',
    rpm: 'RPM',
    lateralG: 'Lateral G',
    longitudinalG: 'Longitudinal G'
  };
  return labels[metric] || metric;
}
