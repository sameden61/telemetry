import { useEffect, useState } from 'react';
import { getAllCornerAnalysis } from '../../lib/supabase';
import StatsCard from './StatsCard';

export default function TrendDashboard() {
  const [analysis, setAnalysis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aggregatedStats, setAggregatedStats] = useState(null);

  useEffect(() => {
    loadAnalysis();
  }, []);

  const loadAnalysis = async () => {
    try {
      const data = await getAllCornerAnalysis();
      setAnalysis(data);
      calculateAggregatedStats(data);
    } catch (error) {
      console.error('Error loading analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAggregatedStats = (data) => {
    const byUser = {};

    data.forEach(record => {
      const userName = record.users.name;
      if (!byUser[userName]) {
        byUser[userName] = {
          slow: { entry: [], exit: [], apex: [] },
          medium: { entry: [], exit: [], apex: [] },
          fast: { entry: [], exit: [], apex: [] }
        };
      }

      const type = record.corner_type;
      byUser[userName][type].entry.push(record.entry_speed_avg);
      byUser[userName][type].exit.push(record.exit_speed_avg);
      byUser[userName][type].apex.push(record.min_speed);
    });

    // Calculate averages
    const stats = {};
    for (const [user, corners] of Object.entries(byUser)) {
      stats[user] = {};
      for (const [type, speeds] of Object.entries(corners)) {
        stats[user][type] = {
          avgEntry: avg(speeds.entry),
          avgExit: avg(speeds.exit),
          avgApex: avg(speeds.apex)
        };
      }
    }

    setAggregatedStats(stats);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-f1-text text-xl">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h2 className="text-4xl font-bold text-f1-text mb-2">Cross-Circuit Analysis</h2>
        <p className="text-gray-400">Performance metrics across all circuits and sessions</p>
      </div>

      {aggregatedStats && Object.entries(aggregatedStats).map(([user, stats]) => (
        <div key={user} className="space-y-4">
          <h3 className="text-2xl font-bold text-f1-accent capitalize">{user}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['slow', 'medium', 'fast'].map(type => (
              <StatsCard
                key={type}
                title={`${type.toUpperCase()} Corners`}
                stats={stats[type]}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Comparison Section */}
      {aggregatedStats && Object.keys(aggregatedStats).length === 2 && (
        <div className="bg-f1-panel p-6 rounded-lg">
          <h3 className="text-2xl font-bold text-f1-text mb-4">Head-to-Head</h3>
          <ComparisonTable stats={aggregatedStats} />
        </div>
      )}
    </div>
  );
}

function ComparisonTable({ stats }) {
  const users = Object.keys(stats);
  const user1 = users[0];
  const user2 = users[1];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-f1-text">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="text-left p-2">Corner Type</th>
            <th className="text-left p-2">Metric</th>
            <th className="text-center p-2 capitalize">{user1}</th>
            <th className="text-center p-2 capitalize">{user2}</th>
            <th className="text-center p-2">Delta</th>
          </tr>
        </thead>
        <tbody>
          {['slow', 'medium', 'fast'].map(type => (
            ['avgEntry', 'avgApex', 'avgExit'].map(metric => {
              const val1 = stats[user1][type][metric];
              const val2 = stats[user2][type][metric];
              const delta = val1 - val2;
              const winner = delta > 0 ? user1 : user2;

              return (
                <tr key={`${type}-${metric}`} className="border-b border-gray-800">
                  <td className="p-2 capitalize">{type}</td>
                  <td className="p-2">{metric.replace('avg', '')}</td>
                  <td className={`text-center p-2 font-mono ${winner === user1 ? 'text-green-400' : ''}`}>
                    {val1.toFixed(1)}
                  </td>
                  <td className={`text-center p-2 font-mono ${winner === user2 ? 'text-green-400' : ''}`}>
                    {val2.toFixed(1)}
                  </td>
                  <td className={`text-center p-2 font-mono ${delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                  </td>
                </tr>
              );
            })
          ))}
        </tbody>
      </table>
    </div>
  );
}

function avg(arr) {
  return arr.length > 0 ? arr.reduce((sum, v) => sum + v, 0) / arr.length : 0;
}
