import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../api/client';

export default function Chat() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const endOfMessagesRef = useRef(null);
  const inputRef = useRef(null);

  const suggestedQuestions = [
    "What is our fastest selling product?",
    "Which products need to be relocated?",
    "How many orders are pending today?",
    "Where should I store chemical items?",
    "What is the damaged goods procedure?",
    "Show me slow moving products",
    "Which zone has the most products?",
    "What are packing rules for fragile items?"
  ];

  const exampleCards = [
    {
      title: "Fastest Selling Product",
      desc: "Query sales velocity data via SQL",
      query: "What is our fastest selling product?"
    },
    {
      title: "Re-slotting Recommendations",
      desc: "Find mis-slotted SKUs and target zone moves",
      query: "Which products need to be relocated?"
    },
    {
      title: "SOP & Storage Guidelines",
      desc: "Retrieve warehouse safety rules and procedures",
      query: "Where should I store chemical items?"
    },
    {
      title: "Pick Path Optimization",
      desc: "Calculate shortest walking route for fulfillment",
      query: "Optimize pick path for ORD001929"
    }
  ];

  const scrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleChipClick = (text) => {
    setQuery(text);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleSend = async (e, customQuery) => {
    if (e) e.preventDefault();
    const textToSend = customQuery || query;
    if (!textToSend.trim()) return;

    const userMsg = { role: 'user', content: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    if (!customQuery) setQuery('');
    setLoading(true);

    try {
      const res = await client.post('/chat', { query: textToSend });
      const intent = res.data.intent;
      const rawResp = res.data;

      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          intent: intent,
          data: rawResp,
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'error', content: err.response?.data?.detail || 'Failed to fetch response from assistant.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getIntentBorderColor = (intent) => {
    switch (intent?.toLowerCase()) {
      case 'nl2sql':
        return '#3b82f6';
      case 'rag':
        return '#8b5cf6';
      case 'slotting':
        return '#f59e0b';
      case 'pick_path':
        return '#10b981';
      default:
        return 'var(--accent)';
    }
  };

  const renderAiMessage = (msg) => {
    const d = msg.data;
    if (!d) return <div style={{ color: 'var(--error)', fontWeight: 600 }}>No response payload received.</div>;

    if (typeof d === 'string') {
      return <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>{d}</div>;
    }

    if (d.error) {
      return (
        <div style={{ color: 'var(--error)', fontWeight: 600, display: 'flex', gap: '8px' }}>
          <span>⚠️</span>
          <span>{d.error}</span>
        </div>
      );
    }

    // Standard LLM Answer (nl2sql or rag)
    if (d.answer) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5', color: 'var(--text-primary)', margin: 0 }}>{d.answer}</p>
          {d.sources && d.sources.length > 0 && (
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)', fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Sources:</span>
              {d.sources.map((s, idx) => (
                <span key={idx} style={{ background: 'var(--bg-surface)', color: '#c084fc', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)', fontFamily: 'monospace' }}>
                  📄 {s}
                </span>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Pick Path response in chat
    if (d.optimal_route) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--bg-surface)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div>Order: <span style={{ fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 700 }}>{d.order_id}</span></div>
            <div>Distance: <span style={{ color: 'var(--success)', fontWeight: 700 }}>{d.optimized_distance_m}m</span></div>
            <div>Saved: <span style={{ color: 'var(--success)', fontWeight: 700 }}>+{d.distance_saved_pct}%</span></div>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Route Sequence</div>
            <div style={{ fontFamily: 'monospace', fontSize: '12px', background: 'var(--bg-primary)', color: '#34d399', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', overflowX: 'auto' }}>
              {(d.optimal_route_labeled || d.optimal_route).join(' → ')}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{d.pick_steps?.length || 0} picking steps generated.</span>
            <Link to="/pickpath" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--success)', textDecoration: 'none' }}>
              View full route map →
            </Link>
          </div>
        </div>
      );
    }

    // Slotting response in chat
    if (d.summary || d.recommendations) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
          {d.summary && <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5', color: 'var(--text-primary)', margin: 0 }}>{d.summary}</p>}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: '8px', fontSize: '11px', fontWeight: 600 }}>
              <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                Analyzed: {d.total_skus_analyzed || 200} SKUs
              </span>
              <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.3)', fontWeight: 700 }}>
                ⚠️ {d.total_mismatches || 146} mismatches
              </span>
            </div>
            <Link to="/slotting" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--warning)', textDecoration: 'none' }}>
              View full report →
            </Link>
          </div>
        </div>
      );
    }

    return (
      <pre style={{ fontFamily: 'monospace', fontSize: '11px', overflowX: 'auto', background: 'var(--bg-surface)', padding: '10px', borderRadius: '6px', color: 'var(--text-secondary)' }}>
        {JSON.stringify(d, null, 2)}
      </pre>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', background: 'var(--bg-primary)' }}>
      
      <style>{`
        .suggestions-track {
          display: flex;
          gap: 10px;
          animation: scroll-chips 25s linear infinite;
          width: max-content;
        }
        .suggestions-track:hover {
          animation-play-state: paused;
        }
        @keyframes scroll-chips {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      {/* Messages Scroll Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Welcome State (2x2 Grid) */}
        {messages.length === 0 && (
          <div style={{ margin: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Warehouse AI Assistant
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                Ask questions in natural language, retrieve SOP policies, or optimize routes.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxWidth: '500px', width: '100%' }}>
              {exampleCards.map((card, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSend(null, card.query)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-card)'}
                >
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    {card.title}
                  </h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                    {card.desc}
                  </p>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)' }}>Run query →</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message History */}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            {msg.role === 'user' ? (
              <div style={{
                alignSelf: 'flex-end',
                maxWidth: '70%',
                background: 'var(--accent)',
                color: 'white',
                padding: '12px 16px',
                borderRadius: '16px 16px 4px 16px',
                fontSize: '14px',
                lineHeight: '1.5'
              }}>
                {msg.content}
              </div>
            ) : msg.role === 'error' ? (
              <div style={{
                alignSelf: 'flex-start',
                maxWidth: '80%',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid var(--error)',
                color: 'var(--error)',
                padding: '12px 16px',
                borderRadius: '4px 16px 16px 16px',
                fontSize: '14px'
              }}>
                {msg.content}
              </div>
            ) : (
              <div style={{
                alignSelf: 'flex-start',
                maxWidth: '80%',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderLeft: `3px solid ${getIntentBorderColor(msg.intent)}`,
                borderRadius: '4px 16px 16px 16px',
                padding: '16px',
                width: '100%'
              }}>
                {msg.intent && (
                  <span style={{
                    display: 'inline-block',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    background: 'var(--bg-surface)',
                    color: getIntentBorderColor(msg.intent),
                    border: '1px solid var(--border)'
                  }}>
                    INTENT: {msg.intent}
                  </span>
                )}
                {renderAiMessage(msg)}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{
            alignSelf: 'flex-start',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            padding: '12px 16px',
            borderRadius: '4px 16px 16px 16px',
            fontSize: '13px',
            color: 'var(--text-secondary)'
          }}>
            Thinking...
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Suggestions Wrapper */}
      <div style={{
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        padding: '10px 0',
        overflow: 'hidden'
      }}>
        <div className="suggestions-track">
          {[...suggestedQuestions, ...suggestedQuestions].map((text, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleChipClick(text)}
              style={{
                whiteSpace: 'nowrap',
                padding: '6px 14px',
                borderRadius: '20px',
                cursor: 'pointer',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                transition: 'all 0.2s'
              }}
            >
              {text}
            </button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div style={{
        padding: '16px 24px',
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        gap: '12px',
        alignItems: 'center'
      }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about your warehouse..."
          style={{
            flex: 1,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '12px 16px',
            color: 'var(--text-primary)',
            fontSize: '14px',
            outline: 'none'
          }}
          disabled={loading}
        />
        <button
          type="submit"
          onClick={(e) => handleSend(e)}
          disabled={loading || !query.trim()}
          style={{
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 20px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            opacity: loading || !query.trim() ? 0.5 : 1
          }}
        >
          Send
        </button>
      </div>

    </div>
  );
}
