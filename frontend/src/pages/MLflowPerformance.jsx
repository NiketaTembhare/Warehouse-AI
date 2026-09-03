import React, { useState, useEffect } from 'react';
import client from '../api/client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';

const MLflowPerformance = () => {
  const [performance, setPerformance] = useState(null);
  const [runs, setRuns] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTelemetry = async () => {
    setRefreshing(true);
    try {
      const [perfRes, runsRes] = await Promise.all([
        client.get('/mlflow/performance'),
        client.get(`/mlflow/runs?agent=${selectedAgent}&limit=${limit}`)
      ]);
      setPerformance(perfRes.data);
      setRuns(runsRes.data);
    } catch (err) {
      console.error('Error fetching MLflow telemetry:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, [selectedAgent, limit]);

  const filteredRuns = runs.filter(run => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (run.run_id && run.run_id.toLowerCase().includes(q)) ||
      (run.agent_display && run.agent_display.toLowerCase().includes(q)) ||
      (run.query && run.query.toLowerCase().includes(q)) ||
      (run.model && run.model.toLowerCase().includes(q))
    );
  });

  const agentColors = {
    nl2sql: '#6366f1',
    rag: '#10b981',
    slotting: '#f59e0b',
    pick_path: '#8b5cf6'
  };

  // Prepare chart data
  const chartData = performance?.agents
    ? Object.values(performance.agents).map(agent => ({
        name: agent.name.replace(' Agent', '').replace(' Search', '').replace(' Optimization', ''),
        key: agent.agent_id,
        avg_time: agent.avg_response_time,
        runs: agent.total_runs,
        color: agentColors[agent.agent_id] || '#6366f1'
      }))
    : [];

  return (
    <div style={{ paddingBottom: '30px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 33, 48, 0.9) 0%, rgba(15, 17, 23, 0.95) 100%)',
        borderRadius: '16px',
        padding: '24px 28px',
        border: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              background: 'rgba(99, 102, 241, 0.15)',
              color: 'var(--accent)',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              border: '1px solid rgba(99, 102, 241, 0.3)'
            }}>
              MLflow Telemetry Engine
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              Experiment: warehouse_agents
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'white', marginTop: '8px', marginBottom: '4px' }}>
            Gen AI Agent Performance Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
            Real-time execution latency metrics, model benchmarks, and run traces logged into MLflow
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={fetchTelemetry}
            disabled={refreshing}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              color: 'white',
              padding: '10px 16px',
              borderRadius: '10px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px'
            }}
          >
            <svg style={{ width: '16px', height: '16px', animation: refreshing ? 'spin 1s linear infinite' : 'none' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Metrics
          </button>

          <a
            href="http://localhost:5000"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: 'white',
              padding: '10px 18px',
              borderRadius: '10px',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
            }}
          >
            Open MLflow UI (Port 5000)
            <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        
        {/* Total Runs */}
        <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
            TOTAL TRACKED EXECUTIONS
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'white' }}>
            {performance?.total_runs || 0}
          </div>
          <div style={{ fontSize: '12px', color: '#10b981', marginTop: '6px', fontWeight: 600 }}>
            Logged in sqlite:///mlflow.db
          </div>
        </div>

        {/* Overall Latency */}
        <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
            AVERAGE RESPONSE TIME
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#6366f1' }}>
            {performance?.overall_avg_response_time ? `${performance.overall_avg_response_time}s` : '0.00s'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Across all 4 AI agents
          </div>
        </div>

        {/* Fastest Agent */}
        <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
            FASTEST AGENT LATENCY
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981' }}>
            {performance?.agents?.pick_path?.avg_response_time ? `${performance.agents.pick_path.avg_response_time}s` : '0.10s'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Pick Path TSP Solver (OR-Tools)
          </div>
        </div>

        {/* Primary LLM Model */}
        <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
            PRIMARY LLM ENGINE
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b', wordBreak: 'break-word' }}>
            llama-3.1-8b
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Groq Llama 3 Instant + ChromaDB
          </div>
        </div>

      </div>

      {/* Recharts Performance Visualizations */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '20px' }}>
        
        {/* Latency Bar Chart */}
        <div style={{ background: 'var(--bg-surface)', padding: '20px 24px', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>
            Agent Response Time Comparison (Seconds)
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Average execution latency per agent tracked in MLflow
          </p>

          <div style={{ height: '240px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} />
                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} unit="s" />
                <Tooltip
                  contentStyle={{ background: '#1e2130', borderColor: '#374151', borderRadius: '8px', color: '#fff' }}
                  formatter={(val) => [`${val} seconds`, 'Avg Latency']}
                />
                <Bar dataKey="avg_time" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Execution Volume Distribution */}
        <div style={{ background: 'var(--bg-surface)', padding: '20px 24px', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>
            Execution Volume Share
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Total runs logged per agent in MLflow
          </p>

          <div style={{ height: '240px', width: '100%', display: 'flex', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="runs"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`pie-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1e2130', borderColor: '#374151', borderRadius: '8px', color: '#fff' }}
                  formatter={(val) => [`${val} runs`, 'Total Executions']}
                />
              </PieChart>
            </ResponsiveContainer>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '130px' }}>
              {chartData.map(item => (
                <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: item.color }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{item.name}:</span>
                  <strong style={{ color: 'white' }}>{item.runs}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Agent Telemetry Cards Grid */}
      <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginTop: '10px', marginBottom: '-10px' }}>
        Autonomous Agent Breakdown
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {performance?.agents && Object.values(performance.agents).map((agent) => (
          <div
            key={agent.agent_id}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '16px'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{
                  background: `${agentColors[agent.agent_id]}20`,
                  color: agentColors[agent.agent_id],
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  border: `1px solid ${agentColors[agent.agent_id]}40`
                }}>
                  {agent.agent_id.toUpperCase()}
                </span>
                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ● MLflow Tracked
                </span>
              </div>

              <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'white', margin: '0 0 4px 0' }}>
                {agent.name}
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, minHeight: '36px' }}>
                {agent.description}
              </p>
            </div>

            <div style={{
              background: 'var(--bg-card)',
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Model:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{agent.model}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Executions:</span>
                <span style={{ color: 'white', fontWeight: 700 }}>{agent.total_runs}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Avg Response Time:</span>
                <span style={{ color: agentColors[agent.agent_id], fontWeight: 700 }}>{agent.avg_response_time}s</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Searchable Live MLflow Runs Table */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border)', padding: '24px' }}>
        
        {/* Table Header Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'white', margin: 0 }}>
              Live MLflow Execution Run Log
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Inspect detailed queries, execution latency, and parameters stored in MLflow database
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            {/* Search Input */}
            <input
              type="text"
              placeholder="Search query, run ID, model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'white',
                padding: '8px 14px',
                fontSize: '13px',
                width: '240px',
                outline: 'none'
              }}
            />

            {/* Agent Filter Dropdown */}
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'white',
                padding: '8px 12px',
                fontSize: '13px',
                outline: 'none'
              }}
            >
              <option value="all">All Agents</option>
              <option value="nl2sql">NL2SQL Agent</option>
              <option value="rag">RAG SOP Agent</option>
              <option value="slotting">Slotting Agent</option>
              <option value="pick_path">Pick Path Agent</option>
            </select>
          </div>
        </div>

        {/* Table Container */}
        <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Run ID</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Agent</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Model / Strategy</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Input Query / Parameter</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Latency</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filteredRuns.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No MLflow runs found matching your search query.
                  </td>
                </tr>
              ) : (
                filteredRuns.map((run) => (
                  <tr key={run.run_id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s ease' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '12px' }}>
                      {run.run_id.substring(0, 8)}...
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        background: `${agentColors[run.agent] || '#6366f1'}20`,
                        color: agentColors[run.agent] || '#6366f1',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700
                      }}>
                        {run.agent_display}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontSize: '12px' }}>
                      {run.model}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'white', fontWeight: 500, maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {run.query}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: run.response_time < 0.5 ? '#10b981' : run.response_time < 1.8 ? '#6366f1' : '#f59e0b' }}>
                      {run.response_time}s
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#10b981',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700
                      }}>
                        {run.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                      {run.timestamp}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default MLflowPerformance;
