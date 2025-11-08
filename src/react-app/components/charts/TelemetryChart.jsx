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
