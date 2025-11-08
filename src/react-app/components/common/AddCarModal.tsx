import { useState } from 'react';
import { addCar } from '../../lib/supabase';
import Modal from './Modal';

interface Car {
  id: string;
  name: string;
  display_name: string;
  manufacturer: string;
  category: string;
}

interface AddCarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCarAdded?: (car: Car) => void;
}

export default function AddCarModal({ isOpen, onClose, onCarAdded }: AddCarModalProps) {
  const [formData, setFormData] = useState({
    displayName: '',
    manufacturer: '',
    category: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
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
    } catch (err: any) {
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
          <div className="bg-red-900 bg-opacity-50 border border-red-700 text-red-200 px-4 py-3">
            {error}
          </div>
        )}

        <div>
          <label className="block text-f1-textGray text-xs font-medium mb-2 uppercase tracking-wider">
            Car Name *
          </label>
          <input
            type="text"
            value={formData.displayName}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            placeholder="e.g., Ferrari 488 GT3"
            className="w-full bg-f1-card text-f1-text px-4 py-2 border border-f1-border focus:border-f1-accent outline-none transition-all"
            required
            autoFocus
          />
        </div>

        <div>
          <label className="block text-f1-textGray text-xs font-medium mb-2 uppercase tracking-wider">
            Manufacturer *
          </label>
          <input
            type="text"
            value={formData.manufacturer}
            onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
            placeholder="e.g., Ferrari, Porsche"
            className="w-full bg-f1-card text-f1-text px-4 py-2 border border-f1-border focus:border-f1-accent outline-none transition-all"
            required
          />
        </div>

        <div>
          <label className="block text-f1-textGray text-xs font-medium mb-2 uppercase tracking-wider">
            Category
          </label>
          <input
            type="text"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="e.g., GT3, GT4, Formula"
            className="w-full bg-f1-card text-f1-text px-4 py-2 border border-f1-border focus:border-f1-accent outline-none transition-all"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isSubmitting || !formData.displayName.trim() || !formData.manufacturer.trim()}
            className="flex-1 bg-f1-red hover:bg-red-700 text-white font-semibold py-2 px-6 uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Adding...' : 'Add Car'}
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="px-6 py-2 bg-f1-card hover:bg-f1-border text-f1-textGray hover:text-f1-text transition-colors uppercase tracking-wider"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
