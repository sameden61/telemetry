export default function StatsCard({ title, stats }) {
  return (
    <div className="bg-f1-panel p-6 rounded-lg">
      <h4 className="text-lg font-bold text-f1-text mb-4">{title}</h4>
      <div className="space-y-2 text-f1-text">
        <div className="flex justify-between">
          <span>Avg Entry:</span>
          <span className="font-mono">{stats.avgEntry.toFixed(1)} km/h</span>
        </div>
        <div className="flex justify-between">
          <span>Avg Apex:</span>
          <span className="font-mono">{stats.avgApex.toFixed(1)} km/h</span>
        </div>
        <div className="flex justify-between">
          <span>Avg Exit:</span>
          <span className="font-mono">{stats.avgExit.toFixed(1)} km/h</span>
        </div>
      </div>
    </div>
  );
}
