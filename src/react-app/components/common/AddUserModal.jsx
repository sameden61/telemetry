import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import Modal from './Modal';

export default function AddUserModal({ isOpen, onClose, onUserAdded }) {
  const [formData, setFormData] = useState({
    displayName: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          name: formData.displayName.toLowerCase().replace(/\s+/g, '_'),
          display_name: formData.displayName
        })
        .select()
        .single();

      if (error) throw error;

      // Reset form and close modal
      setFormData({ displayName: '' });
      onUserAdded && onUserAdded(data);
      onClose();
    } catch (err) {
      console.error('Error adding user:', err);
      setError(err.message || 'Failed to add user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({ displayName: '' });
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New User">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-900 bg-opacity-50 border border-red-700 text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div>
          <label className="block text-f1-text font-medium mb-2">
            Driver Name *
          </label>
          <input
            type="text"
            value={formData.displayName}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            placeholder="e.g., Sam, Friend, John"
            className="w-full bg-f1-background text-f1-text px-4 py-3 rounded-lg border border-gray-700 focus:border-f1-accent focus:ring-2 focus:ring-f1-accent focus:ring-opacity-50 outline-none transition-all"
            required
            autoFocus
          />
          <p className="text-xs text-gray-400 mt-1">
            This will be displayed in the app
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isSubmitting || !formData.displayName.trim()}
            className="flex-1 bg-f1-accent hover:bg-cyan-400 text-gray-900 font-semibold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Adding...' : 'Add User'}
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
