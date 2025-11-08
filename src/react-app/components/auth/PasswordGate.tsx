import { useState, ReactNode } from 'react';
import { useAppStore } from '../../stores/appStore';

interface PasswordGateProps {
  children: ReactNode;
}

export default function PasswordGate({ children }: PasswordGateProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { isAuthenticated, setAuthenticated } = useAppStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'race') {
      setAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password');
    }
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-f1-background flex items-center justify-center">
      <div className="bg-f1-panel p-8 border border-f1-border max-w-md w-full">
        <h1 className="text-2xl font-bold text-f1-text mb-6 text-center uppercase tracking-wide">
          <span className="text-f1-red">F1</span> Telemetry
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-f1-textGray text-xs mb-2 uppercase tracking-wider">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-f1-card text-f1-text border border-f1-border focus:border-f1-accent outline-none"
              placeholder="Enter password"
            />
          </div>
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}
          <button
            type="submit"
            className="w-full bg-f1-red hover:bg-red-700 text-white font-bold py-2 px-4 uppercase tracking-wider transition-colors"
          >
            Access
          </button>
        </form>
      </div>
    </div>
  );
}
