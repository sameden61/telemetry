import { useState, useEffect } from 'react';
import { supabase, getSessionsByCircuitAndCar, getTelemetryData, getAllCars } from '../lib/supabase';
import TelemetryChart from '../components/charts/TelemetryChart';
import ChartControls from '../components/charts/ChartControls';

export default function ComparePage() {
  const [circuits, setCircuits] = useState([]);
  const [cars, setCars] = useState([]);
  const [selectedCircuit, setSelectedCircuit] = useState('');
  const [selectedCar, setSelectedCar] = useState('');
  const [sessions, setSessions] = useState([]);
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [metric, setMetric] = useState('speed');
  const [showDelta, setShowDelta] = useState(false);
  const [deltaType, setDeltaType] = useState('absolute');

  useEffect(() => {
    loadCircuitsAndCars();
  }, []);

  useEffect(() => {
    if (selectedCircuit && selectedCar) {
      loadSessions();
    }
  }, [selectedCircuit, selectedCar]);

  const loadCircuitsAndCars = async () => {
    const { data: circuitsData } = await supabase.from('circuits').select('*');
    const carsData = await getAllCars();
    setCircuits(circuitsData || []);
    setCars(carsData || []);
  };

  const loadSessions = async () => {
    setLoading(true);
    const data = await getSessionsByCircuitAndCar(selectedCircuit, selectedCar);
    setSessions(data);
    setSelectedSessions([]);
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <div className="bg-f1-panel p-6 rounded-lg">
          <label className="block text-f1-text font-medium mb-2">Select Car</label>
          <select
            value={selectedCar}
            onChange={(e) => setSelectedCar(e.target.value)}
            className="w-full bg-f1-background text-f1-text px-4 py-2 rounded border border-gray-700 focus:border-f1-accent outline-none"
          >
            <option value="">Choose car...</option>
            {cars.map(car => (
              <option key={car.id} value={car.id}>
                {car.display_name}
              </option>
            ))}
          </select>
        </div>
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
