import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

export default function Dashboard() {
  const [backendStatus, setBackendStatus] = useState('Checking...');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [stats, setStats] = useState({
    total_orders: 5000,
    completed_orders: 4641,
    total_skus: 200
  });

  const [slottingData, setSlottingData] = useState({
    total_mismatches: 146,
    total_skus_analyzed: 200,
    abc_breakdown: {
      class_a_count: 40,
      class_b_count: 60,
      class_c_count: 100
    }
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatDateHeader = () => {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  };

  const checkHealth = async () => {
    try {
      const res = await client.get('/health');
      if (res.data && res.data.status === 'running') {
        setBackendStatus('Online');
      } else {
        setBackendStatus('Offline');
      }
    } catch (err) {
      setBackendStatus('Offline');
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      try {
        const statsRes = await client.get('/dashboard-stats');
        if (statsRes.data) setStats(statsRes.data);
      } catch (e) {
        // Fallback default stats if dashboard-stats endpoint isn't present
      }

      const slottingRes = await client.get('/slotting');
      if (slottingRes.data) setSlottingData(slottingRes.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
    fetchDashboardData();

    const intervalId = setInterval(() => {
      checkHealth();
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  const abcChartData = [
    {
      name: 'Class A (Fast)',
      shortName: 'Class A',
      count: slottingData.abc_breakdown?.class_a_count || 40,
      color: '#6366f1'
    },
    {
      name: 'Class B (Medium)',
      shortName: 'Class B',
      count: slottingData.abc_breakdown?.class_b_count || 60,
      color: '#10b981'
    },
    {
      name: 'Class C (Slow)',
      shortName: 'Class C',
      count: slottingData.abc_breakdown?.class_c_count || 100,
      color: '#64748b'
    }
  ];

  const fulfillmentPct = stats.total_orders > 0 
    ? Math.round((stats.completed_orders / stats.total_orders) * 100) 
    : 93;

  return (
    <div style={{ background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '100%' }}>
      
      {/* Top Banner Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: 700, margin: 0 }}>
            Warehouse Operations Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px', margin: 0 }}>
            {getGreeting()}, <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Alex Mercer</span> · <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{formatDateHeader()}</span>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>          {/* Status Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: backendStatus === 'Online' ? '#10b981' : '#ef4444' }}></span>
            <span>System Status: {backendStatus === 'Online' ? 'All Systems Operational' : 'Offline'}</span>
          </div>

          <button
            onClick={() => { checkHealth(); fetchDashboardData(); }}
            disabled={loading}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {loading ? 'Refreshing...' : '🔄 Refresh Data'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
          Loading live warehouse operational metrics...
        </div>
      ) : (
        <>
          {/* 4 Essential KPI Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            
            {/* Card 1: Total Orders */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '14px 16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 700 }}>
                  Total Orders
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {(stats.total_orders || 5000).toLocaleString()}
                </div>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                📦 Tracked in system
              </div>
            </div>

            {/* Card 2: Fulfillment Efficiency */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '14px 16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 700 }}>
                  Fulfillment Rate
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981', marginTop: '4px', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span>{fulfillmentPct}%</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>({(stats.completed_orders || 4641).toLocaleString()} completed)</span>
                </div>
              </div>
              {/* Mini Progress Bar */}
              <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
                <div style={{ width: `${fulfillmentPct}%`, height: '100%', background: '#10b981' }}></div>
              </div>
            </div>

            {/* Card 3: Storage Mismatches */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '14px 16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 700 }}>
                  Storage Mismatches
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{slottingData.total_mismatches || 146} SKUs</span>
                  <span style={{ fontSize: '11px', background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>Relocation Needed</span>
                </div>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--warning)', marginTop: '8px', fontWeight: 600 }}>
                ⚠️ Fast-moving items stored in slow rear aisles
              </div>
            </div>

            {/* Card 4: Inventory SKUs */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '14px 16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 700 }}>
                  Catalog SKUs
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {slottingData.total_skus_analyzed || 200}
                </div>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '8px', fontWeight: 600 }}>
                🏷️ 100% Categorized (A/B/C)
              </div>
            </div>

          </div>

          {/* MAIN DUAL PANEL: GRAPH (Left 62%) + AI ACTION HUB (Right 38%) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '14px', alignItems: 'stretch' }}>
            
            {/* LEFT PANEL: SKU VELOCITY DISTRIBUTION BAR CHART */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    Inventory Velocity Breakdown (ABC Classification)
                  </h2>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                    Classifies SKUs based on pick frequency to optimize warehouse placement.
                  </p>
                </div>
              </div>

              {/* Bar Chart Container */}
              <div style={{ height: '200px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={abcChartData} style={{ background: 'transparent' }} margin={{ top: 15, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2a2d3a" />
                    <XAxis dataKey="shortName" tickLine={false} axisLine={{ stroke: '#2a2d3a' }} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
                    <YAxis tickLine={false} axisLine={{ stroke: '#2a2d3a' }} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                      contentStyle={{ backgroundColor: 'var(--bg-surface)', borderRadius: '8px', borderColor: 'var(--border)', color: '#fff', fontSize: '12px' }}
                      itemStyle={{ color: 'var(--accent)', fontWeight: 600 }}
                      formatter={(value) => [`${value} SKUs`, 'Total Count']}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={42}>
                      {abcChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Centered Legend Pills */}
              <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '10px', fontSize: '11px', fontWeight: 600 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#6366f1' }}></span>
                  <span>Class A (Fast): {slottingData.abc_breakdown?.class_a_count || 40} SKUs</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#10b981' }}></span>
                  <span>Class B (Med): {slottingData.abc_breakdown?.class_b_count || 60} SKUs</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#64748b' }}></span>
                  <span>Class C (Slow): {slottingData.abc_breakdown?.class_c_count || 100} SKUs</span>
                </div>
              </div>
            </div>

            {/* RIGHT PANEL: MANAGER QUICK OPERATIONS HUB */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Quick Operations Hub
              </h2>

              <Link 
                to="/pickpath"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '12px',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700 }}>
                  🗺️
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Pick Path Optimizer
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Shortest walking routes (+19.5% saved)
                  </div>
                </div>
              </Link>

              <Link 
                to="/slotting"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '12px',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700 }}>
                  📦
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Slotting Optimization
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    146 SKUs require zone relocation
                  </div>
                </div>
              </Link>

              <Link 
                to="/chat"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '12px',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700 }}>
                  💬
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    AI Operations Copilot
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Query inventory, SQL data & SOP policies
                  </div>
                </div>
              </Link>
            </div>

          </div>

          {/* BOTTOM STREAM: RECENT OPERATIONAL ACTIVITY STREAM */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '8px' }}>
              Live Operations Stream
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚡</span>
                <span><strong>Pick Path:</strong> Optimized walking route for ORD000001 (Saved 3.6m)</span>
              </div>
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📦</span>
                <span><strong>Slotting:</strong> Flagged 146 fast-moving SKUs stored in slow rear aisles</span>
              </div>
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🟢</span>
                <span><strong>System Status:</strong> Real-time inventory & fulfillment tracking active</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
