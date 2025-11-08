import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import Modal from './Modal';

export default function AddCircuitModal({ isOpen, onClose, onCircuitAdded }) {
  const [formData, setFormData] = useState({
    displayName: '',
    country: '',
    slowMin: 50,
    slowMax: 100,
    mediumMin: 100,
    mediumMax: 150,
    fastMin: 150
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const cornerClassifications = {
        slow: { min: formData.slowMin, max: formData.slowMax },
        medium: { min: formData.mediumMin, max: formData.mediumMax },
        fast: { min: formData.fastMin, max: 999 }
      };

      const { data, error } = await supabase
        .from('circuits')
        .insert({
          name: formData.displayName.toLowerCase().replace(/\s+/g, '_'),
          display_name: formData.displayName,
          country: formData.country,
          corner_classifications: cornerClassifications
        })
        .select()
        .single();

      if (error) throw error;

      // Reset form and close modal
      setFormData({
        displayName: '',
        country: '',
        slowMin: 50,
        slowMax: 100,
        mediumMin: 100,
        mediumMax: 150,
        fastMin: 150
      });
      onCircuitAdded && onCircuitAdded(data);
      onClose();
    } catch (err) {
      console.error('Error adding circuit:', err);
      setError(err.message || 'Failed to add circuit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      displayName: '',
      country: '',
      slowMin: 50,
      slowMax: 100,
      mediumMin: 100,
      mediumMax: 150,
      fastMin: 150
    });
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Circuit">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-900 bg-opacity-50 border border-red-700 text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div>
          <label className="block text-f1-text font-medium mb-2">
            Circuit Name *
          </label>
          <input
            type="text"
            value={formData.displayName}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            placeholder="e.g., Monza, Spa-Francorchamps"
            className="w-full bg-f1-background text-f1-text px-4 py-3 rounded-lg border border-gray-700 focus:border-f1-accent focus:ring-2 focus:ring-f1-accent focus:ring-opacity-50 outline-none transition-all"
            required
            autoFocus
          />
        </div>

        <div>
          <label className="block text-f1-text font-medium mb-2">
            Country *
          </label>
          <input
            type="text"
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            placeholder="e.g., Italy, Belgium"
            className="w-full bg-f1-background text-f1-text px-4 py-3 rounded-lg border border-gray-700 focus:border-f1-accent focus:ring-2 focus:ring-f1-accent focus:ring-opacity-50 outline-none transition-all"
            required
          />
        </div>

        <div className="border-t border-gray-700 pt-4">
          <h4 className="text-f1-text font-semibold mb-3">Corner Speed Thresholds (km/h)</h4>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-green-400 mb-1">Slow Min</label>
                <input
                  type="number"
                  value={formData.slowMin}
                  onChange={(e) => setFormData({ ...formData, slowMin: parseInt(e.target.value) })}
                  className="w-full bg-f1-background text-f1-text px-3 py-2 rounded border border-gray-700 focus:border-green-400 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-green-400 mb-1">Slow Max</label>
                <input
                  type="number"
                  value={formData.slowMax}
                  onChange={(e) => setFormData({ ...formData, slowMax: parseInt(e.target.value) })}
                  className="w-full bg-f1-background text-f1-text px-3 py-2 rounded border border-gray-700 focus:border-green-400 outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-yellow-400 mb-1">Medium Min</label>
                <input
                  type="number"
                  value={formData.mediumMin}
                  onChange={(e) => setFormData({ ...formData, mediumMin: parseInt(e.target.value) })}
                  className="w-full bg-f1-background text-f1-text px-3 py-2 rounded border border-gray-700 focus:border-yellow-400 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-yellow-400 mb-1">Medium Max</label>
                <input
                  type="number"
                  value={formData.mediumMax}
                  onChange={(e) => setFormData({ ...formData, mediumMax: parseInt(e.target.value) })}
                  className="w-full bg-f1-background text-f1-text px-3 py-2 rounded border border-gray-700 focus:border-yellow-400 outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-red-400 mb-1">Fast Min</label>
              <input
                type="number"
                value={formData.fastMin}
                onChange={(e) => setFormData({ ...formData, fastMin: parseInt(e.target.value) })}
                className="w-full bg-f1-background text-f1-text px-3 py-2 rounded border border-gray-700 focus:border-red-400 outline-none"
                required
              />
              <p className="text-xs text-gray-400 mt-1">Maximum is unlimited</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isSubmitting || !formData.displayName.trim() || !formData.country.trim()}
            className="flex-1 bg-f1-accent hover:bg-cyan-400 text-gray-900 font-semibold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Adding...' : 'Add Circuit'}
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
