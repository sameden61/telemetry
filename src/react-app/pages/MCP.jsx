import MCPChat from '../components/mcp/MCPChat';

export default function MCPPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-4xl font-bold text-f1-text mb-2">AI Coach</h2>
        <p className="text-gray-400">Get personalized racing tips and telemetry analysis</p>
      </div>
      <MCPChat />
    </div>
  );
}
