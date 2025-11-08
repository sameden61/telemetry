import { useEffect, useState } from 'react';
import { getAllCornerAnalysis } from '../../lib/supabase';
import StatsCard from './StatsCard';

interface User {
  name: string;
  display_name: string;
}

interface CornerAnalysisRecord {
  corner_type: 'slow' | 'medium' | 'fast';
  entry_speed_avg: number;
  exit_speed_avg: number;
  min_speed: number;
  users: User;
}

interface CornerStats {
  avgEntry: number;
  avgExit: number;
  avgApex: number;
}

interface AggregatedStats {
  [userName: string]: {
    slow: CornerStats;
    medium: CornerStats;
    fast: CornerStats;
  };
}

export default function TrendDashboard() {
  const [loading, setLoading] = useState(true);
  const [aggregatedStats, setAggregatedStats] = useState<AggregatedStats | null>(null);

  useEffect(() => {
    loadAnalysis();
  }, []);

  const loadAnalysis = async () => {
    try {
      const data = await getAllCornerAnalysis();
      calculateAggregatedStats(data);
    } catch (error) {
      console.error('Error loading analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAggregatedStats = (data: CornerAnalysisRecord[]) => {
    const byUser: {
      [userName: string]: {
        slow: { entry: number[]; exit: number[]; apex: number[] };
        medium: { entry: number[]; exit: number[]; apex: number[] };
        fast: { entry: number[]; exit: number[]; apex: number[] };
      };
    } = {};

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
    const stats: AggregatedStats = {};
    for (const [user, corners] of Object.entries(byUser)) {
      stats[user] = {} as any;
      for (const [type, speeds] of Object.entries(corners)) {
        stats[user][type as 'slow' | 'medium' | 'fast'] = {
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
        <div className="text-f1-textGray text-sm uppercase tracking-wider">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-f1-border pb-4">
        <h2 className="text-2xl font-bold text-f1-text uppercase tracking-wide">Analytics Dashboard</h2>
        <p className="text-f1-textGray text-sm mt-1">Performance metrics across all circuits and sessions</p>
      </div>

      {aggregatedStats && Object.entries(aggregatedStats).map(([user, stats]) => (
        <div key={user} className="space-y-4">
          <h3 className="text-lg font-bold text-f1-red uppercase tracking-wider">{user}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['slow', 'medium', 'fast'] as const).map(type => (
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
        <div className="bg-f1-panel p-6 border border-f1-border">
          <h3 className="text-sm font-bold text-f1-textGray uppercase tracking-wider mb-4">Head-to-Head</h3>
          <ComparisonTable stats={aggregatedStats} />
        </div>
      )}
    </div>
  );
}

interface ComparisonTableProps {
  stats: AggregatedStats;
}

function ComparisonTable({ stats }: ComparisonTableProps) {
  const users = Object.keys(stats);
  const user1 = users[0];
  const user2 = users[1];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-f1-text text-sm">
        <thead>
          <tr className="border-b border-f1-border">
            <th className="text-left p-3 text-f1-textGray uppercase tracking-wider text-xs">Corner Type</th>
            <th className="text-left p-3 text-f1-textGray uppercase tracking-wider text-xs">Metric</th>
            <th className="text-center p-3 text-f1-textGray uppercase tracking-wider text-xs">{user1}</th>
            <th className="text-center p-3 text-f1-textGray uppercase tracking-wider text-xs">{user2}</th>
            <th className="text-center p-3 text-f1-textGray uppercase tracking-wider text-xs">Delta</th>
          </tr>
        </thead>
        <tbody>
          {(['slow', 'medium', 'fast'] as const).map(type => (
            (['avgEntry', 'avgApex', 'avgExit'] as const).map(metric => {
              const val1 = stats[user1][type][metric];
              const val2 = stats[user2][type][metric];
              const delta = val1 - val2;
              const winner = delta > 0 ? user1 : user2;

              return (
                <tr key={`${type}-${metric}`} className="border-b border-f1-border hover:bg-f1-card">
                  <td className="p-3 capitalize">{type}</td>
                  <td className="p-3">{metric.replace('avg', '')}</td>
                  <td className={`text-center p-3 font-mono ${winner === user1 ? 'text-green-400 font-bold' : ''}`}>
                    {val1.toFixed(1)}
                  </td>
                  <td className={`text-center p-3 font-mono ${winner === user2 ? 'text-green-400 font-bold' : ''}`}>
                    {val2.toFixed(1)}
                  </td>
                  <td className={`text-center p-3 font-mono ${delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
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

function avg(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((sum, v) => sum + v, 0) / arr.length : 0;
}
