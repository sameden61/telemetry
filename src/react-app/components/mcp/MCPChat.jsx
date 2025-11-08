import { useState } from 'react';

export default function MCPChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
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
        content: data.response || 'I apologize, but I could not generate a response.'
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
    <div className="bg-f1-panel rounded-lg h-[600px] flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-xl font-bold text-f1-text">AI Telemetry Coach</h3>
        <p className="text-sm text-gray-400 mt-1">
          Powered by Cloudflare Workers AI - Ask questions about sim racing and telemetry
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-gray-500 text-center mt-8">
            <p className="mb-2 font-semibold">Try asking:</p>
            <ul className="text-sm space-y-2">
              <li className="bg-f1-background p-2 rounded">"How can I improve my braking technique?"</li>
              <li className="bg-f1-background p-2 rounded">"What's the best racing line through Monza's first chicane?"</li>
              <li className="bg-f1-background p-2 rounded">"How do I reduce understeer in high-speed corners?"</li>
              <li className="bg-f1-background p-2 rounded">"Tips for better throttle control on corner exits?"</li>
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
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-f1-background text-f1-text p-3 rounded-lg flex items-center gap-2">
              <div className="animate-pulse">🤖</div>
              <span>Analyzing with AI...</span>
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
            onKeyPress={(e) => e.key === 'Enter' && !loading && handleSend()}
            placeholder="Ask about telemetry, racing techniques, setup..."
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
