import React, { useState, useRef, useEffect } from 'react';
import client from '../api/client';

export default function Chat() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const endOfMessagesRef = useRef(null);

  const scrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMsg = { role: 'user', content: query };
    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const res = await client.post('/chat', { query: userMsg.content });
      const r = res.data.response;
      const content = r?.answer || r?.summary || r?.optimal_route?.join(' → ') || JSON.stringify(r, null, 2);
      
      setMessages((prev) => [
        ...prev,
        { 
          role: 'ai', 
          content: content, 
          intent: res.data.intent 
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'error', content: 'Failed to fetch response from server.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[80vh] max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Warehouse AI Assistant</h1>
        <p className="text-slate-500 mt-1">Ask about inventory, orders, SOPs, or optimization.</p>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto mb-6 p-6 border border-slate-200 rounded-2xl bg-slate-50 flex flex-col gap-6 shadow-inner">
        {messages.length === 0 && (
          <div className="text-center text-slate-400 mt-20 flex flex-col items-center gap-3">
            <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            <p>No messages yet. Send a query below to start!</p>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            {msg.role === 'user' ? (
              <div className="bg-blue-600 text-white px-5 py-3 rounded-2xl rounded-br-none shadow-sm max-w-[80%] text-[15px]">
                {msg.content}
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-w-[85%]">
                {msg.intent && (
                  <div className="flex">
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full uppercase tracking-wider border border-indigo-200 shadow-sm">
                      Intent: {msg.intent}
                    </span>
                  </div>
                )}
                <div className={`px-5 py-4 rounded-2xl shadow-sm border text-[15px] whitespace-pre-wrap ${
                  msg.role === 'error' ? 'bg-red-50 text-red-700 border-red-200 rounded-bl-none' : 'bg-white text-slate-700 border-slate-200 rounded-bl-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            )}
          </div>
        ))}
        
        {loading && (
          <div className="flex items-start">
            <div className="bg-white px-5 py-4 rounded-2xl rounded-bl-none shadow-sm border border-slate-200 flex items-center gap-2">
              <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="flex gap-3 bg-white p-2 border border-slate-200 rounded-2xl shadow-sm hover:border-blue-400 transition-colors focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a question..."
          className="flex-1 px-4 py-3 bg-transparent focus:outline-none text-slate-700"
          disabled={loading}
        />
        <button 
          type="submit"
          disabled={loading}
          className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
        >
          Send
        </button>
      </form>
    </div>
  );
}
