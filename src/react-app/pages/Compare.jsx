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
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h2 className="text-4xl font-bold text-f1-text mb-2">Compare Laps</h2>
        <p className="text-gray-400">Analyze and compare telemetry data between sessions</p>
      </div>

      <div className="bg-f1-panel p-8 rounded-xl border border-gray-800 shadow-xl">
        <h3 className="text-xl font-semibold text-f1-text mb-6">Select Track & Car</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-f1-text font-medium mb-2">Circuit</label>
            <select
              value={selectedCircuit}
              onChange={(e) => setSelectedCircuit(e.target.value)}
              className="w-full bg-f1-background text-f1-text px-4 py-3 rounded-lg border border-gray-700 focus:border-f1-accent focus:ring-2 focus:ring-f1-accent focus:ring-opacity-50 outline-none transition-all"
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
            <label className="block text-f1-text font-medium mb-2">Car</label>
            <select
              value={selectedCar}
              onChange={(e) => setSelectedCar(e.target.value)}
              className="w-full bg-f1-background text-f1-text px-4 py-3 rounded-lg border border-gray-700 focus:border-f1-accent focus:ring-2 focus:ring-f1-accent focus:ring-opacity-50 outline-none transition-all"
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
      </div>

      {sessions.length > 0 && (
        <div className="bg-f1-panel p-8 rounded-xl border border-gray-800 shadow-xl">
          <h3 className="text-xl font-semibold text-f1-text mb-6">
            Select Sessions <span className="text-gray-400 text-sm">(max 2)</span>
          </h3>
          <div className="space-y-3">
            {sessions.map(session => (
              <label
                key={session.id}
                className={`flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-all border ${
                  selectedSessions.includes(session.id)
                    ? 'bg-f1-accent bg-opacity-10 border-f1-accent'
                    : 'bg-f1-background border-gray-700 hover:border-gray-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedSessions.includes(session.id)}
                  onChange={() => handleSessionSelect(session.id)}
                  disabled={selectedSessions.length >= 2 && !selectedSessions.includes(session.id)}
                  className="w-5 h-5 accent-f1-accent"
                />
                <div className="flex-1 text-f1-text">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-lg">{session.users.display_name}</span>
                    <span className="font-mono text-f1-accent text-xl">{session.lap_time.toFixed(3)}s</span>
                    <span className="text-sm text-gray-400">
                      {new Date(session.session_date).toLocaleDateString()}
                    </span>
                  </div>
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

          <div className="bg-f1-panel p-8 rounded-xl border border-gray-800 shadow-xl">
            <TelemetryChart
              sessions={chartData}
              metric={metric}
              showDelta={showDelta}
              deltaType={deltaType}
            />
          </div>

          <div className="bg-f1-panel p-8 rounded-xl border border-gray-800 shadow-xl">
            <h3 className="text-xl font-semibold text-f1-text mb-6">Lap Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {chartData.map((session, idx) => (
                <div key={session.sessionId} className="bg-f1-background p-6 rounded-lg border border-gray-700">
                  <p className="text-gray-400 text-sm mb-1">Driver</p>
                  <p className="font-bold text-2xl text-f1-text mb-3">{session.userName}</p>
                  <p className="text-gray-400 text-sm mb-1">Lap Time</p>
                  <p className="text-3xl font-mono text-f1-accent font-bold">
                    {session.lapTime.toFixed(3)}s
                  </p>
                  {chartData.length === 2 && idx === 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <p className="text-gray-400 text-sm mb-1">Delta</p>
                      <p className={`text-xl font-mono font-bold ${
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
