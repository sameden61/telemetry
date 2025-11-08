import { useState } from 'react';
import { useAppStore } from '../../stores/appStore';

export default function PasswordGate({ children }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { isAuthenticated, setAuthenticated } = useAppStore();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === 'race') {
      setAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password');
    }
  };

  if (isAuthenticated) {
    return children;
  }

  return (
    <div className="min-h-screen bg-f1-background flex items-center justify-center">
      <div className="bg-f1-panel p-8 rounded-lg shadow-xl max-w-md w-full">
        <h1 className="text-3xl font-bold text-f1-text mb-6 text-center">
          Telemetry Comparison
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-f1-text mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded bg-f1-background text-f1-text border border-gray-700 focus:border-f1-accent outline-none"
              placeholder="Enter password"
            />
          </div>
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}
          <button
            type="submit"
            className="w-full bg-f1-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            Access
          </button>
        </form>
      </div>
    </div>
  );
}
