import { useState } from 'react';
import { addCircuit } from '../../lib/api';
import Modal from './Modal';

interface Circuit {
  id: string;
  name: string;
  display_name: string;
}

interface AddCircuitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCircuitAdded?: (circuit: Circuit) => void;
}

export default function AddCircuitModal({ isOpen, onClose, onCircuitAdded }: AddCircuitModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const data = await addCircuit({
        name: displayName.toLowerCase().replace(/\s+/g, '_'),
        display_name: displayName
      });

      // Reset form and close modal
      setDisplayName('');
      onCircuitAdded && onCircuitAdded(data as Circuit);
      onClose();
    } catch (err: any) {
      console.error('Error adding circuit:', err);
      setError(err.message || 'Failed to add circuit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setDisplayName('');
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Circuit">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-900 bg-opacity-50 border border-red-700 text-red-200 px-4 py-3">
            {error}
          </div>
        )}

        <div>
          <label className="block text-f1-textGray text-xs font-medium mb-2 uppercase tracking-wider">
            Circuit Name *
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g., Monza, Spa-Francorchamps, Interlagos"
            className="w-full bg-f1-card text-f1-text px-4 py-2 border border-f1-border focus:border-f1-accent outline-none transition-all"
            required
            autoFocus
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isSubmitting || !displayName.trim()}
            className="flex-1 bg-f1-red hover:bg-red-700 text-white font-semibold py-2 px-6 uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Adding...' : 'Add Circuit'}
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
