import { useState } from 'react';

export default function MCPChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // This would connect to Claude MCP in production
      // For now, simulate basic queries
      const response = await simulateMCPQuery(input);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('MCP Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-f1-panel rounded-lg h-[600px] flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-xl font-bold text-f1-text">MCP Analysis Chat</h3>
        <p className="text-sm text-gray-400 mt-1">
          Ask questions about your telemetry data
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-gray-500 text-center mt-8">
            <p className="mb-2">Try asking:</p>
            <ul className="text-sm space-y-1">
              <li>"Where do I lose most time at Monza?"</li>
              <li>"Compare our braking points"</li>
              <li>"Show my fastest corner exits"</li>
            </ul>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-f1-accent text-f1-background'
                  : 'bg-f1-background text-f1-text'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-f1-background text-f1-text p-3 rounded-lg">
              Analyzing...
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about your telemetry..."
            className="flex-1 px-4 py-2 rounded bg-f1-background text-f1-text border border-gray-700 focus:border-f1-accent outline-none"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-6 py-2 bg-f1-red hover:bg-red-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// Placeholder for MCP integration
async function simulateMCPQuery(query) {
  // In production, this would query the Supabase database via MCP
  // and return intelligent responses based on telemetry data

  await new Promise(resolve => setTimeout(resolve, 1000));

  if (query.toLowerCase().includes('monza')) {
    return "Based on your Monza sessions, you're losing approximately 0.3 seconds in the first chicane compared to your friend. Your entry speed is similar but you're getting on the throttle 15 meters later.";
  }

  return "I can analyze your telemetry data. Try asking specific questions about circuits, corners, or comparing specific metrics.";
}
