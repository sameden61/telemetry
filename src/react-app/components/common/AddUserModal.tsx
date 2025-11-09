import { useState } from 'react';
import { addUser } from '../../lib/api';
import Modal from './Modal';

interface User {
  id: string;
  name: string;
  display_name: string;
}

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserAdded?: (user: User) => void;
}

export default function AddUserModal({ isOpen, onClose, onUserAdded }: AddUserModalProps) {
  const [formData, setFormData] = useState({
    displayName: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const name = formData.displayName.toLowerCase().replace(/\s+/g, '_');
      const data = await addUser(name, formData.displayName);

      // Reset form and close modal
      setFormData({ displayName: '' });
      onUserAdded && onUserAdded(data as User);
      onClose();
    } catch (err: any) {
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
          <div className="bg-red-900 bg-opacity-50 border border-red-700 text-red-200 px-4 py-3">
            {error}
          </div>
        )}

        <div>
          <label className="block text-f1-textGray text-xs font-medium mb-2 uppercase tracking-wider">
            Driver Name *
          </label>
          <input
            type="text"
            value={formData.displayName}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            placeholder="e.g., Sam, Friend, John"
            className="w-full bg-f1-card text-f1-text px-4 py-2 border border-f1-border focus:border-f1-accent outline-none transition-all"
            required
            autoFocus
          />
          <p className="text-xs text-f1-textGray mt-1">
            This will be displayed in the app
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isSubmitting || !formData.displayName.trim()}
            className="flex-1 bg-f1-red hover:bg-red-700 text-white font-semibold py-2 px-6 uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Adding...' : 'Add User'}
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
