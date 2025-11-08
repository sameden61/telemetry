import { useState, useEffect } from 'react';
import { supabase, getAllCars, addCar } from '../lib/supabase';
import CSVUploader from '../components/upload/CSVUploader';

export default function UploadPage() {
  const [users, setUsers] = useState([]);
  const [circuits, setCircuits] = useState([]);
  const [cars, setCars] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedCircuit, setSelectedCircuit] = useState('');
  const [selectedCar, setSelectedCar] = useState('');
  const [circuitThresholds, setCircuitThresholds] = useState(null);

  // Add car form state
  const [showAddCar, setShowAddCar] = useState(false);
  const [newCar, setNewCar] = useState({
    displayName: '',
    manufacturer: '',
    category: ''
  });
  const [addingCar, setAddingCar] = useState(false);

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

  const handleAddCar = async (e) => {
    e.preventDefault();
    if (!newCar.displayName || !newCar.manufacturer) return;

    setAddingCar(true);
    try {
      const car = await addCar(
        newCar.displayName,
        newCar.displayName,
        newCar.manufacturer,
        newCar.category
      );
      setCars([...cars, car]);
      setNewCar({ displayName: '', manufacturer: '', category: '' });
      setShowAddCar(false);
      setSelectedCar(car.id);
    } catch (error) {
      console.error('Error adding car:', error);
      alert('Error adding car: ' + error.message);
    } finally {
      setAddingCar(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-3xl font-bold text-f1-text">Upload Telemetry</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <button
            onClick={() => setShowAddCar(!showAddCar)}
            className="mt-2 text-sm text-f1-accent hover:text-f1-text transition-colors"
          >
            + Add New Car
          </button>
        </div>
      </div>

      {showAddCar && (
        <div className="bg-f1-panel p-6 rounded-lg border-2 border-f1-accent">
          <h3 className="text-xl font-bold text-f1-text mb-4">Add New Car</h3>
          <form onSubmit={handleAddCar} className="space-y-4">
            <div>
              <label className="block text-f1-text font-medium mb-2">Car Name *</label>
              <input
                type="text"
                value={newCar.displayName}
                onChange={(e) => setNewCar({...newCar, displayName: e.target.value})}
                placeholder="e.g., Ferrari 488 GT3"
                className="w-full bg-f1-background text-f1-text px-4 py-2 rounded border border-gray-700 focus:border-f1-accent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-f1-text font-medium mb-2">Manufacturer *</label>
              <input
                type="text"
                value={newCar.manufacturer}
                onChange={(e) => setNewCar({...newCar, manufacturer: e.target.value})}
                placeholder="e.g., Ferrari"
                className="w-full bg-f1-background text-f1-text px-4 py-2 rounded border border-gray-700 focus:border-f1-accent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-f1-text font-medium mb-2">Category</label>
              <input
                type="text"
                value={newCar.category}
                onChange={(e) => setNewCar({...newCar, category: e.target.value})}
                placeholder="e.g., GT3, GT4, Formula"
                className="w-full bg-f1-background text-f1-text px-4 py-2 rounded border border-gray-700 focus:border-f1-accent outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={addingCar}
                className="flex-1 bg-f1-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50"
              >
                {addingCar ? 'Adding...' : 'Add Car'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddCar(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <CSVUploader
        userId={selectedUser}
        circuitId={selectedCircuit}
        carId={selectedCar}
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
