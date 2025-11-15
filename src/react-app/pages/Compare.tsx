import { useState, useEffect } from 'react';
import { getCircuits, getTelemetrySessions, getTelemetryData } from '../lib/api';
import TelemetryChart from '../components/charts/TelemetryChart';
import ChartControls from '../components/charts/ChartControls';

interface Circuit {
  id: string;
  name: string;
  display_name: string;
}

interface Session {
  id: string;
  lap_time: number;
  session_date: string;
  file_type: 'csv' | 'tc';
  file_name: string;
  version: number;
  uploaded_at: string;
  users: {
    display_name: string;
  };
  cars: {
    display_name: string;
  };
}

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

interface ChartSession {
  sessionId: string;
  userName: string;
  carName: string;
  lapTime: number;
  data: TelemetryDataPoint[];
}

export default function ComparePage() {
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [selectedCircuit, setSelectedCircuit] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState<'all' | 'csv' | 'tc'>('all');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [chartData, setChartData] = useState<ChartSession[]>([]);

  const [showDelta, setShowDelta] = useState(false);
  const [deltaType, setDeltaType] = useState<'absolute' | 'percentage'>('absolute');

  useEffect(() => {
    loadCircuits();
  }, []);

  useEffect(() => {
    if (selectedCircuit) {
      loadSessions();
    }
  }, [selectedCircuit]);

  const loadCircuits = async () => {
    const circuitsData = await getCircuits();
    // Sort circuits alphabetically by display_name
    const sortedCircuits = (circuitsData || []).sort((a, b) =>
      a.display_name.localeCompare(b.display_name)
    );
    setCircuits(sortedCircuits);
  };

  const loadSessions = async () => {
    const data = await getTelemetrySessions({ circuitId: selectedCircuit });
    setSessions(data);
    setSelectedSessions([]);
  };

  // Filter and sort sessions based on file type and lap time
  const filteredSessions = sessions
    .filter(session => {
      if (fileTypeFilter === 'all') return true;
      return session.file_type === fileTypeFilter;
    })
    .sort((a, b) => a.lap_time - b.lap_time); // Sort by lap time ascending (fastest first)

  // Auto-select fastest session when sessions load or filter changes
  useEffect(() => {
    if (filteredSessions.length > 0 && selectedSessions.length === 0) {
      setSelectedSessions([filteredSessions[0].id]);
    }
  }, [sessions, fileTypeFilter]);

  const handleSessionSelect = (sessionId: string) => {
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

    const data = await Promise.all(
      selectedSessions.map(async (sessionId) => {
        const session = sessions.find(s => s.id === sessionId);
        const telemetry = await getTelemetryData(sessionId);
        return {
          sessionId,
          userName: session!.users.display_name,
          carName: session!.cars.display_name,
          lapTime: session!.lap_time,
          data: telemetry
        };
      })
    );
    setChartData(data);
  };

  useEffect(() => {
    loadComparisonData();
  }, [selectedSessions]);

  return (
    <div className="space-y-6">
      <div className="border-b border-f1-border pb-4">
        <h2 className="text-2xl font-bold text-f1-text uppercase tracking-wide">Compare Laps</h2>
        <p className="text-f1-textGray text-sm mt-1">Compare telemetry data across different cars and drivers on the same circuit</p>
      </div>

      <div className="bg-f1-panel p-6 border border-f1-border">
        <h3 className="text-sm font-semibold text-f1-textGray uppercase tracking-wider mb-4">Select Track & File Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-f1-textGray text-xs font-medium mb-2 uppercase tracking-wider">Circuit</label>
            <select
              value={selectedCircuit}
              onChange={(e) => setSelectedCircuit(e.target.value)}
              className="w-full bg-f1-card text-f1-text px-4 py-2 border border-f1-border focus:border-f1-accent outline-none transition-all"
            >
              <option value="">Choose circuit...</option>
              {circuits.map(circuit => (
                <option key={circuit.id} value={circuit.id}>
                  {circuit.display_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-f1-textGray text-xs font-medium mb-2 uppercase tracking-wider">File Type</label>
            <select
              value={fileTypeFilter}
              onChange={(e) => setFileTypeFilter(e.target.value as 'all' | 'csv' | 'tc')}
              className="w-full bg-f1-card text-f1-text px-4 py-2 border border-f1-border focus:border-f1-accent outline-none transition-all"
            >
              <option value="all">All Types</option>
              <option value="csv">CSV Only</option>
              <option value="tc">TC Only</option>
            </select>
          </div>
        </div>
      </div>

      {sessions.length > 0 && (
        <div className="bg-f1-panel p-6 border border-f1-border">
          <h3 className="text-sm font-semibold text-f1-textGray uppercase tracking-wider mb-3">
            Select Sessions <span className="text-xs">(max 2, showing {filteredSessions.length} of {sessions.length})</span>
          </h3>
          <div className="space-y-1">
            {filteredSessions.map(session => (
              <label
                key={session.id}
                className={`flex items-center gap-3 p-2 cursor-pointer transition-all border ${
                  selectedSessions.includes(session.id)
                    ? 'bg-f1-card border-f1-red'
                    : 'bg-f1-card border-f1-border hover:border-f1-textGray'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedSessions.includes(session.id)}
                  onChange={() => handleSessionSelect(session.id)}
                  disabled={selectedSessions.length >= 2 && !selectedSessions.includes(session.id)}
                  className="w-4 h-4 accent-f1-red flex-shrink-0"
                />
                <div className="flex-1 text-f1-text min-w-0">
                  <div className="flex items-center gap-2 flex-wrap text-sm">
                    <span className="font-bold">{session.users.display_name}</span>
                    <span className="text-xs text-f1-textGray">in</span>
                    <span className="font-semibold text-f1-accent">{session.cars.display_name}</span>
                    <span className="font-mono text-f1-text font-bold">{session.lap_time.toFixed(3)}s</span>
                    <span className={`text-xs font-bold uppercase px-1.5 py-0.5 ${
                      session.file_type === 'tc' ? 'bg-purple-900 text-purple-300' : 'bg-blue-900 text-blue-300'
                    }`}>
                      {session.file_type}
                    </span>
                    <span className="text-xs font-bold uppercase px-1.5 py-0.5 bg-gray-700 text-gray-300">
                      v{session.version}
                    </span>
                    <span className="text-xs text-f1-textGray" title={`Uploaded: ${new Date(session.uploaded_at).toLocaleString()}`}>
                      {new Date(session.uploaded_at || session.session_date).toLocaleDateString()}
                    </span>
                  </div>
                  {session.file_name && (
                    <div className="text-xs text-f1-textGray mt-0.5 truncate">
                      {session.file_name}
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {chartData.length > 0 && (
        <>
          <ChartControls
            showDelta={showDelta}
            onDeltaToggle={setShowDelta}
            deltaType={deltaType}
            onDeltaTypeChange={(type) => setDeltaType(type as 'absolute' | 'percentage')}
          />

          <div className="bg-f1-panel p-6 border border-f1-border">
            <TelemetryChart
              sessions={chartData}
              showDelta={showDelta}
              deltaType={deltaType}
            />
          </div>

          <div className="bg-f1-panel p-6 border border-f1-border">
            <h3 className="text-sm font-semibold text-f1-textGray uppercase tracking-wider mb-4">Lap Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {chartData.map((session, idx) => (
                <div key={session.sessionId} className="bg-f1-card p-6 border border-f1-border">
                  <p className="text-f1-textGray text-xs uppercase tracking-wider mb-1">Driver</p>
                  <p className="font-bold text-xl text-f1-text mb-1">{session.userName}</p>
                  <p className="text-f1-textGray text-xs uppercase tracking-wider mb-1">Car</p>
                  <p className="font-semibold text-lg text-f1-accent mb-4">{session.carName}</p>
                  <p className="text-f1-textGray text-xs uppercase tracking-wider mb-1">Lap Time</p>
                  <p className="text-2xl font-mono text-f1-accent font-bold">
                    {session.lapTime.toFixed(3)}s
                  </p>
                  {chartData.length === 2 && idx === 0 && (
                    <div className="mt-4 pt-4 border-t border-f1-border">
                      <p className="text-f1-textGray text-xs uppercase tracking-wider mb-1">Delta</p>
                      <p className={`text-lg font-mono font-bold ${
                        chartData[0].lapTime < chartData[1].lapTime ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {chartData[0].lapTime < chartData[1].lapTime ? '-' : '+'}
                        {Math.abs(chartData[0].lapTime - chartData[1].lapTime).toFixed(3)}s
                      </p>
                    </div>
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
