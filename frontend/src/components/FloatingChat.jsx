import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import client from '../api/client';

export default function FloatingChat() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const endRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, isOpen]);

  if (location.pathname === '/chat') {
    return null;
  }

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', content: input };
    setMessages((prev) => [...prev.slice(-9), userMsg]);
    const textToSend = input;
    setInput('');
    setLoading(true);

    try {
      const res = await client.post('/chat', { query: textToSend });
      const intent = res.data.intent;
      const responsePayload = res.data;

      setMessages((prev) => [
        ...prev.slice(-9),
        {
          role: 'ai',
          intent: intent,
          data: responsePayload
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev.slice(-9),
        { role: 'error', content: err.response?.data?.detail || 'Error communicating with assistant.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderAiContent = (msg) => {
    const d = msg.data;
    if (!d) return null;
    if (typeof d === 'string') return <p style={{ margin: 0 }}>{d}</p>;
    if (d.answer) return <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{d.answer}</p>;
    if (d.response && typeof d.response === 'string') return <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{d.response}</p>;
    if (d.summary) return <p style={{ margin: 0 }}>{d.summary}</p>;
    if (d.optimal_route) return <p style={{ margin: 0 }}>Route for {d.order_id}: {(d.optimal_route_labeled || d.optimal_route).join(' → ')} ({d.optimized_distance_m}m)</p>;
    return <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(d)}</p>;
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}>
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '88px',
          right: '24px',
          width: '360px',
          height: '500px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 9999
        }}>
          {/* Panel Header */}
          <div style={{
            padding: '16px 20px',
            background: 'var(--bg-card)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justify: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: 700, fontSize: '14px' }}>
              <span>🤖</span>
              <span>Warehouse AI</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px', padding: '2px 4px' }}
                title="Minimize"
              >
                ━
              </button>
              <button
                onClick={() => { setIsOpen(false); navigate('/chat'); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px', padding: '2px 4px' }}
                title="Full Screen AI Chat"
              >
                ↗
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px', padding: '2px 4px' }}
                title="Close Assistant"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div style={{ flex: 1, background: 'var(--bg-primary)', padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
            {messages.length === 0 && (
              <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
                <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>💬</span>
                Ask me about orders, inventory, SOPs, or pick routes!
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg.role === 'user' ? (
                  <div style={{
                    background: 'var(--accent)',
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: '12px 12px 2px 12px',
                    maxWidth: '85%',
                    lineHeight: '1.4'
                  }}>
                    {msg.content}
                  </div>
                ) : msg.role === 'error' ? (
                  <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--error)', border: '1px solid var(--error)', padding: '8px 12px', borderRadius: '8px' }}>
                    {msg.content}
                  </div>
                ) : (
                  <div style={{ maxWidth: '90%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {msg.intent && (
                      <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', background: 'var(--bg-surface)', padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--border)', width: 'fit-content' }}>
                        {msg.intent}
                      </span>
                    )}
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '12px 12px 12px 2px', lineHeight: '1.4' }}>
                      {renderAiContent(msg)}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                Assistant thinking...
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} style={{ padding: '12px 16px', background: 'var(--bg-surface)', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Copilot..."
              style={{
                flex: 1,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: 'var(--text-primary)',
                fontSize: '12px',
                outline: 'none'
              }}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 14px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                opacity: loading || !input.trim() ? 0.5 : 1
              }}
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--accent)',
          color: 'white',
          border: 'none',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justify: 'center',
          fontSize: '20px'
        }}
        title="Open Warehouse AI Copilot"
      >
        💬
      </button>
    </div>
  );
}
