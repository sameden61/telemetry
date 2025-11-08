interface StatsCardProps {
  title: string;
  stats: {
    avgEntry: number;
    avgApex: number;
    avgExit: number;
  };
}

export default function StatsCard({ title, stats }: StatsCardProps) {
  return (
    <div className="bg-f1-panel p-6 border border-f1-border">
      <h4 className="text-xs font-bold text-f1-textGray uppercase tracking-wider mb-4">{title}</h4>
      <div className="space-y-2 text-f1-text text-sm">
        <div className="flex justify-between">
          <span>Avg Entry:</span>
          <span className="font-mono text-f1-accent">{stats.avgEntry.toFixed(1)} km/h</span>
        </div>
        <div className="flex justify-between">
          <span>Avg Apex:</span>
          <span className="font-mono text-f1-accent">{stats.avgApex.toFixed(1)} km/h</span>
        </div>
        <div className="flex justify-between">
          <span>Avg Exit:</span>
          <span className="font-mono text-f1-accent">{stats.avgExit.toFixed(1)} km/h</span>
        </div>
      </div>
    </div>
  );
}
