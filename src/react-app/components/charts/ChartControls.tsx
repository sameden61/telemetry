interface ChartControlsProps {
  showDelta: boolean;
  onDeltaToggle: (show: boolean) => void;
  deltaType: string;
  onDeltaTypeChange: (type: string) => void;
}

export default function ChartControls({
  showDelta,
  onDeltaToggle,
  deltaType,
  onDeltaTypeChange
}: ChartControlsProps) {
  return (
    <div className="bg-f1-panel p-4 border border-f1-border flex gap-4 items-center flex-wrap">
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-f1-text cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={showDelta}
            onChange={(e) => onDeltaToggle(e.target.checked)}
            className="w-4 h-4 accent-f1-red"
          />
          <span>Show Delta</span>
        </label>
      </div>

      {showDelta && (
        <div className="flex items-center gap-2">
          <label className="text-f1-textGray text-xs font-medium uppercase tracking-wider">Delta Type:</label>
          <select
            value={deltaType}
            onChange={(e) => onDeltaTypeChange(e.target.value)}
            className="bg-f1-card text-f1-text px-3 py-2 border border-f1-border focus:border-f1-accent outline-none"
          >
            <option value="absolute">Absolute</option>
            <option value="percentage">Percentage</option>
          </select>
        </div>
      )}
    </div>
  );
}
