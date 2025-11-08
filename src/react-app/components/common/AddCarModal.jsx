import { useState } from 'react';
import { addCar } from '../../lib/supabase';
import Modal from './Modal';

export default function AddCarModal({ isOpen, onClose, onCarAdded }) {
  const [formData, setFormData] = useState({
    displayName: '',
    manufacturer: '',
    category: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const car = await addCar(
        formData.displayName,
        formData.displayName,
        formData.manufacturer,
        formData.category
      );

      // Reset form and close modal
      setFormData({ displayName: '', manufacturer: '', category: '' });
      onCarAdded && onCarAdded(car);
      onClose();
    } catch (err) {
      console.error('Error adding car:', err);
      setError(err.message || 'Failed to add car');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({ displayName: '', manufacturer: '', category: '' });
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Car">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-900 bg-opacity-50 border border-red-700 text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div>
          <label className="block text-f1-text font-medium mb-2">
            Car Name *
          </label>
          <input
            type="text"
            value={formData.displayName}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            placeholder="e.g., Ferrari 488 GT3"
            className="w-full bg-f1-background text-f1-text px-4 py-3 rounded-lg border border-gray-700 focus:border-f1-accent focus:ring-2 focus:ring-f1-accent focus:ring-opacity-50 outline-none transition-all"
            required
            autoFocus
          />
        </div>

        <div>
          <label className="block text-f1-text font-medium mb-2">
            Manufacturer *
          </label>
          <input
            type="text"
            value={formData.manufacturer}
            onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
            placeholder="e.g., Ferrari, Porsche"
            className="w-full bg-f1-background text-f1-text px-4 py-3 rounded-lg border border-gray-700 focus:border-f1-accent focus:ring-2 focus:ring-f1-accent focus:ring-opacity-50 outline-none transition-all"
            required
          />
        </div>

        <div>
          <label className="block text-f1-text font-medium mb-2">
            Category
          </label>
          <input
            type="text"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="e.g., GT3, GT4, Formula"
            className="w-full bg-f1-background text-f1-text px-4 py-3 rounded-lg border border-gray-700 focus:border-f1-accent focus:ring-2 focus:ring-f1-accent focus:ring-opacity-50 outline-none transition-all"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isSubmitting || !formData.displayName.trim() || !formData.manufacturer.trim()}
            className="flex-1 bg-f1-accent hover:bg-cyan-400 text-gray-900 font-semibold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Adding...' : 'Add Car'}
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
