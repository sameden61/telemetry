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
