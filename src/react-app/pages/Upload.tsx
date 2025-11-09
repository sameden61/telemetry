import { useState, useEffect } from 'react';
import { supabase, getAllCars } from '../lib/supabase';
import TelemetryUploader from '../components/upload/TelemetryUploader';
import SelectWithAdd from '../components/common/SelectWithAdd';
import AddUserModal from '../components/common/AddUserModal';
import AddCircuitModal from '../components/common/AddCircuitModal';
import AddCarModal from '../components/common/AddCarModal';

interface User {
  id: string;
  name: string;
  display_name: string;
}

interface Circuit {
  id: string;
  name: string;
  display_name: string;
  country: string;
  corner_classifications: {
    slow: { min: number; max: number };
    medium: { min: number; max: number };
    fast: { min: number; max: number };
  };
}

interface Car {
  id: string;
  name: string;
  display_name: string;
  manufacturer: string;
  category: string;
}

export default function UploadPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedCircuit, setSelectedCircuit] = useState('');
  const [selectedCar, setSelectedCar] = useState('');
  const [circuitThresholds, setCircuitThresholds] = useState<Circuit['corner_classifications'] | null>(null);

  // Modal states
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddCircuit, setShowAddCircuit] = useState(false);
  const [showAddCar, setShowAddCar] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const usersResponse = await (supabase.from('users').select('*') as any);
    const circuitsResponse = await (supabase.from('circuits').select('*') as any);
    const carsData = await getAllCars();

    setUsers(usersResponse.data || []);
    setCircuits(circuitsResponse.data || []);
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

  const handleUserAdded = (newUser: User) => {
    setUsers([...users, newUser]);
    setSelectedUser(newUser.id);
  };

  const handleCircuitAdded = (newCircuit: Circuit) => {
    setCircuits([...circuits, newCircuit]);
    setSelectedCircuit(newCircuit.id);
  };

  const handleCarAdded = (newCar: Car) => {
    setCars([...cars, newCar]);
    setSelectedCar(newCar.id);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-f1-border pb-4">
        <h2 className="text-2xl font-bold text-f1-text uppercase tracking-wide">Upload Telemetry</h2>
        <p className="text-f1-textGray text-sm mt-1">Upload your racing telemetry data for analysis</p>
      </div>

      <div className="bg-f1-panel p-6 border border-f1-border">
        <h3 className="text-sm font-semibold text-f1-textGray uppercase tracking-wider mb-4">Session Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      <TelemetryUploader
        userId={selectedUser}
        circuitId={selectedCircuit}
        carId={selectedCar}
        circuitThresholds={circuitThresholds}
      />

      {circuitThresholds && (
        <div className="bg-f1-panel p-6 border border-f1-border">
          <h3 className="text-sm font-semibold text-f1-textGray uppercase tracking-wider mb-4">Corner Speed Classifications</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-f1-card border border-green-900 p-4">
              <p className="font-bold text-green-400 text-xs uppercase tracking-wider mb-2">Slow Corners</p>
              <p className="text-f1-text text-lg font-mono">{circuitThresholds.slow.min} - {circuitThresholds.slow.max} km/h</p>
            </div>
            <div className="bg-f1-card border border-yellow-900 p-4">
              <p className="font-bold text-yellow-400 text-xs uppercase tracking-wider mb-2">Medium Corners</p>
              <p className="text-f1-text text-lg font-mono">{circuitThresholds.medium.min} - {circuitThresholds.medium.max} km/h</p>
            </div>
            <div className="bg-f1-card border border-red-900 p-4">
              <p className="font-bold text-red-400 text-xs uppercase tracking-wider mb-2">Fast Corners</p>
              <p className="text-f1-text text-lg font-mono">{circuitThresholds.fast.min}+ km/h</p>
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
