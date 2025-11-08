import MCPChat from '../components/mcp/MCPChat';

export default function MCPPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-f1-border pb-4">
        <h2 className="text-2xl font-bold text-f1-text uppercase tracking-wide">AI Coach</h2>
        <p className="text-f1-textGray text-sm mt-1">Get personalized racing tips and telemetry analysis</p>
      </div>
      <MCPChat />
    </div>
  );
}
