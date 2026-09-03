import React, { useState, useEffect, useMemo } from 'react';
import client from '../api/client';

export default function Slotting() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [approvals, setApprovals] = useState({});

  // Filter states
  const [classFilter, setClassFilter] = useState('ALL');
  const [zoneFilter, setZoneFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const runAnalysis = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await client.get('/slotting');
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Error running slotting analysis.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAnalysis();
  }, []);

  const filteredRecommendations = useMemo(() => {
    if (!data?.recommendations) return [];
    return data.recommendations.filter((rec) => {
      if (classFilter !== 'ALL' && rec.abc_class !== classFilter) return false;
      if (zoneFilter !== 'ALL') {
        const targetMatch = rec.target_zone?.toUpperCase() === zoneFilter.toUpperCase();
        const currentMatch = rec.current_zone?.toUpperCase() === zoneFilter.toUpperCase();
        if (!targetMatch && !currentMatch) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const skuMatch = rec.sku_id?.toLowerCase().includes(q);
        const nameMatch = rec.sku_name?.toLowerCase().includes(q);
        if (!skuMatch && !nameMatch) return false;
      }
      return true;
    });
  }, [data, classFilter, zoneFilter, searchQuery]);

  const getPriorityBadge = (abcClass) => {
    switch (abcClass) {
      case 'A':
        return <span style={{ background: '#7f1d1d', color: '#fca5a5', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>High (A)</span>;
      case 'B':
        return <span style={{ background: '#78350f', color: '#fde68a', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>Medium (B)</span>;
      case 'C':
        return <span style={{ background: '#1e293b', color: '#94a3b8', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>Low (C)</span>;
      default:
        return <span style={{ background: '#1e293b', color: '#94a3b8', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>{abcClass}</span>;
    }
  };

  const getCurrentZoneBadge = (zone) => {
    const z = zone?.toLowerCase() || '';
    if (z.includes('fast')) {
      return <span style={{ background: '#7f1d1d', color: '#fca5a5', border: '1px solid #ef4444', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>{zone}</span>;
    }
    if (z.includes('med')) {
      return <span style={{ background: '#78350f', color: '#fde68a', border: '1px solid #f59e0b', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>{zone}</span>;
    }
    return <span style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #475569', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>{zone}</span>;
  };

  const getTargetZoneBadge = (zone) => {
    const z = zone?.toLowerCase() || '';
    if (z.includes('fast')) {
      return <span style={{ background: '#064e3b', color: '#6ee7b7', border: '1px solid #10b981', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>{zone}</span>;
    }
    if (z.includes('med')) {
      return <span style={{ background: '#1e3a5f', color: '#93c5fd', border: '1px solid #3b82f6', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>{zone}</span>;
    }
    return <span style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #475569', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>{zone}</span>;
  };

  return (
    <div style={{ background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '24px', fontWeight: 700, margin: 0 }}>
            Slotting Optimization
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px', margin: 0 }}>
            Analyze warehouse SKU velocity and identify mis-slotted storage items.
          </p>
        </div>
        <button 
          onClick={runAnalysis}
          disabled={loading}
          style={{
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            opacity: loading ? 0.5 : 1
          }}
        >
          {loading ? 'Analyzing...' : 'Re-run Analysis'}
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--error)', color: 'var(--error)', padding: '12px 16px', borderRadius: '8px', fontSize: '14px' }}>
          ⚠️ {error}
        </div>
      )}

      {loading && !data && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
          Performing SKU velocity & zone classification...
        </div>
      )}

      {data && (
        <>
          {/* Top Stat Cards (3 Cards) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '20px', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '8px', fontWeight: 700 }}>
                SKUs Analyzed
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {data.total_skus_analyzed || 200}
              </div>
            </div>
            
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '20px', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '8px', fontWeight: 700 }}>
                Mismatches
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--error)' }}>
                {data.total_mismatches || 146} ⚠️
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '20px', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '8px', fontWeight: 700 }}>
                ABC Breakdown
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', gap: '16px', marginTop: '4px' }}>
                <span>A: <strong style={{ color: 'var(--accent)' }}>{data.abc_breakdown?.class_a_count ?? 40}</strong></span>
                <span>B: <strong style={{ color: 'var(--success)' }}>{data.abc_breakdown?.class_b_count ?? 60}</strong></span>
                <span>C: <strong style={{ color: 'var(--text-secondary)' }}>{data.abc_breakdown?.class_c_count ?? 100}</strong></span>
              </div>
            </div>

          </div>

          {/* AI Summary Box */}
          {data.summary && (
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderLeft: '3px solid var(--accent)',
              borderRadius: '8px',
              padding: '16px 20px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: '0.1em', marginBottom: '4px' }}>
                🤖 AI Optimization Summary
              </div>
              <p style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
                {data.summary}
              </p>
            </div>
          )}

          {/* Filter Row */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Classes</option>
              <option value="A">Class A (Fast)</option>
              <option value="B">Class B (Medium)</option>
              <option value="C">Class C (Slow)</option>
            </select>

            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Zones</option>
              <option value="FAST">Fast Zone</option>
              <option value="MEDIUM">Medium Zone</option>
              <option value="SLOW">Slow Zone</option>
            </select>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product or SKU..."
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '13px',
                outline: 'none',
                flex: 1
              }}
            />

            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
              Showing {filteredRecommendations.length} of {data.recommendations?.length || 146} items
            </span>
          </div>

          {/* Table Container with Internal Scroll */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', maxHeight: 'calc(100vh - 240px)', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr style={{ background: 'var(--bg-surface)' }}>
                  <th style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '10px 16px', textAlign: 'left' }}>PRODUCT</th>
                  <th style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '10px 16px', textAlign: 'left' }}>VEL</th>
                  <th style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '10px 16px', textAlign: 'left' }}>PRI</th>
                  <th style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '10px 16px', textAlign: 'left' }}>NOW</th>
                  <th style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '10px 16px', textAlign: 'left' }}>MOVE TO</th>
                  <th style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '10px 16px', textAlign: 'left' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecommendations.map((rec, i) => {
                  const status = approvals[rec.sku_id];
                  const isApproved = status === 'approved';
                  const isSkipped = status === 'skipped';
                  const isOdd = i % 2 !== 0;

                  return (
                    <tr 
                      key={rec.sku_id || i}
                      style={{
                        background: isApproved ? 'rgba(16, 185, 129, 0.15)' : isSkipped ? '#161822' : isOdd ? 'var(--bg-surface)' : 'var(--bg-card)',
                        opacity: isSkipped ? 0.4 : 1,
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isApproved && !isSkipped) e.currentTarget.style.background = 'var(--bg-card-hover)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isApproved && !isSkipped) e.currentTarget.style.background = isOdd ? 'var(--bg-surface)' : 'var(--bg-card)';
                      }}
                    >
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '13px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{rec.sku_name || rec.sku_id}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{rec.sku_id}</div>
                      </td>

                      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600 }}>
                        {rec.order_count}
                      </td>

                      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                        {getPriorityBadge(rec.abc_class)}
                      </td>

                      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                        {getCurrentZoneBadge(rec.current_zone)}
                      </td>

                      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                        {getTargetZoneBadge(rec.target_zone)}
                      </td>

                      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                        {isApproved ? (
                          <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: '12px' }}>✓ Approved</span>
                        ) : isSkipped ? (
                          <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '12px' }}>Skipped</span>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => setApprovals(prev => ({ ...prev, [rec.sku_id]: 'approved' }))}
                              style={{ background: 'var(--success)', color: 'white', border: 'none', borderRadius: '4px', padding: '6px 10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                            >
                              ✅ Approve
                            </button>
                            <button
                              onClick={() => setApprovals(prev => ({ ...prev, [rec.sku_id]: 'skipped' }))}
                              style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '4px', padding: '6px 10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                            >
                              ❌ Skip
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </>
      )}
    </div>
  );
}
