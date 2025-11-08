import { useState, useEffect } from 'react';
import { supabase, getAllCars } from '../lib/supabase';
import CSVUploader from '../components/upload/CSVUploader';
import SelectWithAdd from '../components/common/SelectWithAdd';
import AddUserModal from '../components/common/AddUserModal';
import AddCircuitModal from '../components/common/AddCircuitModal';
import AddCarModal from '../components/common/AddCarModal';

export default function UploadPage() {
  const [users, setUsers] = useState([]);
  const [circuits, setCircuits] = useState([]);
  const [cars, setCars] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedCircuit, setSelectedCircuit] = useState('');
  const [selectedCar, setSelectedCar] = useState('');
  const [circuitThresholds, setCircuitThresholds] = useState(null);

  // Modal states
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddCircuit, setShowAddCircuit] = useState(false);
  const [showAddCar, setShowAddCar] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: usersData } = await supabase.from('users').select('*');
    const { data: circuitsData } = await supabase.from('circuits').select('*');
    const carsData = await getAllCars();

    setUsers(usersData || []);
    setCircuits(circuitsData || []);
    setCars(carsData || []);
  };

  useEffect(() => {
    if (selectedCircuit) {
      const circuit = circuits.find(c => c.id === selectedCircuit);
      if (circuit) {
        setCircuitThresholds(circuit.corner_classifications);
      }
    }
  }, [selectedCircuit, circuits]);

  const handleUserAdded = (newUser) => {
    setUsers([...users, newUser]);
    setSelectedUser(newUser.id);
  };

  const handleCircuitAdded = (newCircuit) => {
    setCircuits([...circuits, newCircuit]);
    setSelectedCircuit(newCircuit.id);
  };

  const handleCarAdded = (newCar) => {
    setCars([...cars, newCar]);
    setSelectedCar(newCar.id);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h2 className="text-4xl font-bold text-f1-text mb-2">Upload Telemetry</h2>
        <p className="text-gray-400">Upload your racing telemetry data for analysis</p>
      </div>

      <div className="bg-f1-panel p-8 rounded-xl border border-gray-800 shadow-xl">
        <h3 className="text-xl font-semibold text-f1-text mb-6">Session Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SelectWithAdd
            label="Driver"
            value={selectedUser}
            onChange={setSelectedUser}
            options={users}
            onAdd={() => setShowAddUser(true)}
            placeholder="Choose driver..."
            addLabel="Add New Driver"
          />

          <SelectWithAdd
            label="Circuit"
            value={selectedCircuit}
            onChange={setSelectedCircuit}
            options={circuits}
            onAdd={() => setShowAddCircuit(true)}
            placeholder="Choose circuit..."
            addLabel="Add New Circuit"
          />

          <SelectWithAdd
            label="Car"
            value={selectedCar}
            onChange={setSelectedCar}
            options={cars}
            onAdd={() => setShowAddCar(true)}
            placeholder="Choose car..."
            addLabel="Add New Car"
          />
        </div>
      </div>

      <CSVUploader
        userId={selectedUser}
        circuitId={selectedCircuit}
        carId={selectedCar}
        circuitThresholds={circuitThresholds}
      />

      {circuitThresholds && (
        <div className="bg-f1-panel p-6 rounded-xl border border-gray-800">
          <h3 className="text-xl font-semibold text-f1-text mb-4">Corner Speed Classifications</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-900 bg-opacity-20 border border-green-700 p-4 rounded-lg">
              <p className="font-bold text-green-400 mb-1">🟢 Slow Corners</p>
              <p className="text-f1-text">{circuitThresholds.slow.min} - {circuitThresholds.slow.max} km/h</p>
            </div>
            <div className="bg-yellow-900 bg-opacity-20 border border-yellow-700 p-4 rounded-lg">
              <p className="font-bold text-yellow-400 mb-1">🟡 Medium Corners</p>
              <p className="text-f1-text">{circuitThresholds.medium.min} - {circuitThresholds.medium.max} km/h</p>
            </div>
            <div className="bg-red-900 bg-opacity-20 border border-red-700 p-4 rounded-lg">
              <p className="font-bold text-red-400 mb-1">🔴 Fast Corners</p>
              <p className="text-f1-text">{circuitThresholds.fast.min}+ km/h</p>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddUserModal
        isOpen={showAddUser}
        onClose={() => setShowAddUser(false)}
        onUserAdded={handleUserAdded}
      />
      <AddCircuitModal
        isOpen={showAddCircuit}
        onClose={() => setShowAddCircuit(false)}
        onCircuitAdded={handleCircuitAdded}
      />
      <AddCarModal
        isOpen={showAddCar}
        onClose={() => setShowAddCar(false)}
        onCarAdded={handleCarAdded}
      />
    </div>
  );
}
