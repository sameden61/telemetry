import { useState, useEffect } from 'react';
import { getUsers, getCircuits, getCars } from '../lib/api';
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
}

interface Car {
  id: string;
  name: string;
  display_name: string;
  category: string;
}

export default function UploadPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedCircuit, setSelectedCircuit] = useState('');
  const [selectedCar, setSelectedCar] = useState('');

  // Modal states
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddCircuit, setShowAddCircuit] = useState(false);
  const [showAddCar, setShowAddCar] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('Loading data from API...');

      const [usersData, circuitsData, carsData] = await Promise.all([
        getUsers(),
        getCircuits(),
        getCars(),
      ]);

      console.log('Users:', usersData);
      console.log('Circuits:', circuitsData);
      console.log('Cars:', carsData);

      setUsers(usersData || []);
      // Sort circuits alphabetically by display_name
      setCircuits((circuitsData || []).sort((a, b) =>
        a.display_name.localeCompare(b.display_name)
      ));
      // Sort cars alphabetically by display_name
      setCars((carsData || []).sort((a, b) =>
        a.display_name.localeCompare(b.display_name)
      ));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

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
      />

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
