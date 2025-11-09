import { useState, useEffect } from 'react';
import { getTelemetrySessions, deleteTelemetrySession } from '../lib/api';

interface Session {
  id: string;
  lap_time: number;
  session_date: string;
  file_type: 'csv' | 'tc';
  file_name: string;
  version: number;
  uploaded_at: string;
  users: {
    display_name: string;
  };
  circuits: {
    display_name: string;
  };
  cars: {
    display_name: string;
  };
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await getTelemetrySessions();
      setSessions(data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sessionId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?\n\nThis will permanently delete the session, all telemetry data, and the file from storage.`)) {
      return;
    }

    try {
      setDeleting(sessionId);
      await deleteTelemetrySession(sessionId);
      setSessions(sessions.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete session. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) + 
           ' ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatLapTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return minutes > 0 ? `${minutes}:${secs.padStart(6, '0')}` : `${secs}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-f1-textGray">Loading sessions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-f1-border pb-4">
        <h2 className="text-2xl font-bold text-f1-text uppercase tracking-wide">All Sessions</h2>
        <p className="text-f1-textGray text-sm mt-1">
          View and manage all uploaded telemetry data ({sessions.length} total)
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-f1-panel p-12 border border-f1-border text-center">
          <p className="text-f1-textGray">No sessions found. Upload some telemetry data to get started!</p>
        </div>
      ) : (
        <div className="bg-f1-panel border border-f1-border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-f1-border bg-f1-card">
                  <th className="text-left py-2 px-3 text-f1-textGray text-xs font-semibold uppercase tracking-wider">Driver</th>
                  <th className="text-left py-2 px-3 text-f1-textGray text-xs font-semibold uppercase tracking-wider">Circuit</th>
                  <th className="text-left py-2 px-3 text-f1-textGray text-xs font-semibold uppercase tracking-wider">Car</th>
                  <th className="text-left py-2 px-3 text-f1-textGray text-xs font-semibold uppercase tracking-wider">Time</th>
                  <th className="text-left py-2 px-3 text-f1-textGray text-xs font-semibold uppercase tracking-wider">File</th>
                  <th className="text-left py-2 px-3 text-f1-textGray text-xs font-semibold uppercase tracking-wider">Type</th>
                  <th className="text-left py-2 px-3 text-f1-textGray text-xs font-semibold uppercase tracking-wider">Ver</th>
                  <th className="text-left py-2 px-3 text-f1-textGray text-xs font-semibold uppercase tracking-wider">Uploaded</th>
                  <th className="text-left py-2 px-3 text-f1-textGray text-xs font-semibold uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr
                    key={session.id}
                    className="border-b border-f1-border hover:bg-f1-card transition-colors"
                  >
                    <td className="py-1.5 px-3 text-f1-text font-medium">{session.users.display_name}</td>
                    <td className="py-1.5 px-3 text-f1-text">{session.circuits.display_name}</td>
                    <td className="py-1.5 px-3 text-f1-text text-xs">{session.cars.display_name}</td>
                    <td className="py-1.5 px-3 text-f1-accent font-mono font-bold text-sm">{formatLapTime(session.lap_time)}</td>
                    <td className="py-1.5 px-3 text-f1-text text-xs max-w-xs truncate" title={session.file_name}>{session.file_name}</td>
                    <td className="py-1.5 px-3">
                      <span className={`text-xs font-bold uppercase px-1.5 py-0.5 ${
                        session.file_type === 'tc' ? 'bg-purple-900 text-purple-300' : 'bg-blue-900 text-blue-300'
                      }`}>
                        {session.file_type}
                      </span>
                    </td>
                    <td className="py-1.5 px-3">
                      <span className="text-xs font-bold uppercase px-1.5 py-0.5 bg-gray-700 text-gray-300">
                        {session.version}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 text-f1-textGray text-xs whitespace-nowrap">{formatDate(session.uploaded_at || session.session_date)}</td>
                    <td className="py-1.5 px-3">
                      <button
                        onClick={() => handleDelete(session.id, session.file_name)}
                        disabled={deleting === session.id}
                        className="px-2 py-0.5 bg-f1-red text-white text-xs font-semibold uppercase tracking-wider hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {deleting === session.id ? '...' : 'Del'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
