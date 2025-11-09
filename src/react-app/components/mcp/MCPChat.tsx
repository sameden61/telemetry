import { useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  model?: string;
}

export default function MCPChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      // Call Cloudflare Workers AI endpoint
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: currentInput,
          context: {
            conversationHistory: messages.slice(-4) // Last 4 messages for context
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response || 'I apologize, but I could not generate a response.',
        model: data.model
      }]);
    } catch (error) {
      console.error('AI Chat Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-f1-panel border border-f1-border h-[600px] flex flex-col">
      <div className="p-4 border-b border-f1-border flex-shrink-0">
        <h3 className="text-lg font-bold text-f1-text uppercase tracking-wide">MCP Telemetry Analyst</h3>
        <p className="text-xs text-f1-textGray mt-1">
          Powered by Llama 4 Scout + Claude Sonnet 4.5 - Quantitative analysis of your telemetry data
        </p>
        <div className="mt-3 p-3 bg-f1-card border border-f1-border">
          <p className="text-xs text-f1-textGray font-semibold mb-2 uppercase tracking-wide">Example Questions:</p>
          <ul className="text-xs text-f1-text space-y-1">
            <li>• What's the average speed in session X at distances 500-1000m?</li>
            <li>• Where are the braking zones in session Y?</li>
            <li>• Compare throttle application between sessions A and B</li>
            <li>• What gear is used most frequently at distance 1500m?</li>
            <li>• Calculate average speed per gear across all sessions</li>
          </ul>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 ${
                msg.role === 'user'
                  ? 'bg-f1-red text-white'
                  : 'bg-f1-card text-f1-text border border-f1-border'
              }`}
            >
              <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
              {msg.model && (
                <div className="text-xs text-f1-textGray mt-2 pt-2 border-t border-f1-border">
                  {msg.model.includes('llama') ? '🦙 Llama 4 Scout' :
                   msg.model.includes('claude') ? '🧠 Claude Sonnet 4.5' :
                   msg.model}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-f1-card text-f1-text p-3 border border-f1-border flex items-center gap-2">
              <div className="animate-pulse">🤖</div>
              <span className="text-sm">Analyzing with AI...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-f1-border flex-shrink-0 bg-f1-panel">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !loading && handleSend()}
            placeholder="Ask about your telemetry data (e.g., average speed, braking zones, throttle patterns)..."
            className="flex-1 px-4 py-2 bg-f1-card text-f1-text border border-f1-border focus:border-f1-accent outline-none"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-6 py-2 bg-f1-red hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors uppercase tracking-wider font-semibold"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
