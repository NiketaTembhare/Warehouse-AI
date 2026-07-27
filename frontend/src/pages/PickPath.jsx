import React, { useState } from 'react';
import client from '../api/client';

export default function PickPath() {
  const [orderId, setOrderId] = useState('ORD001929');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRun = async (e) => {
    e.preventDefault();
    if (!orderId.trim()) return;
    
    setLoading(true);
    setError('');
    setData(null);

    try {
      const res = await client.post('/pickpath', { order_id: orderId.trim() });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Error running pick path optimization");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Pick Path Optimizer</h1>
          <p className="text-slate-500 mt-1">Find the most efficient walking route to pick an order.</p>
        </div>
      </div>
      
      <form onSubmit={handleRun} className="flex gap-4 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <input 
          type="text" 
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          placeholder="Enter Order ID (e.g. ORD001929)"
          className="flex-1 p-4 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-slate-700 font-medium"
          disabled={loading}
        />
        <button 
          type="submit"
          disabled={loading}
          className="px-8 py-4 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 flex items-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Optimizing...
            </>
          ) : 'Get Pick Path'}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* 3 Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Items</span>
              <span className="text-4xl font-bold text-slate-800">{data.total_items}</span>
            </div>
            <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Optimized Distance (m)</span>
              <span className="text-4xl font-bold text-slate-800">{data.optimized_distance_m}</span>
            </div>
            <div className="p-6 bg-white border border-emerald-200 rounded-2xl shadow-sm flex flex-col gap-1 relative overflow-hidden">
              <span className="text-sm font-semibold text-emerald-700 uppercase tracking-wider">Distance Saved (%)</span>
              <span className="text-4xl font-bold text-emerald-600">{data.distance_saved_pct}%</span>
            </div>
          </div>

          {/* Horizontal Route Visual */}
          <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
            <h2 className="text-lg font-bold text-slate-800 mb-6">Optimal Route Map</h2>
            <div className="flex items-center gap-3 min-w-max pb-4 px-2">
              {data.optimal_route.map((node, index) => (
                <React.Fragment key={index}>
                  <div className={`flex items-center justify-center h-12 px-6 rounded-full font-bold text-sm border-2 shadow-sm ${
                    node === 'RECEIVE' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                    node === 'PACK' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                    'bg-slate-50 border-slate-300 text-slate-700'
                  }`}>
                    {node}
                  </div>
                  {index < data.optimal_route.length - 1 && (
                    <div className="flex items-center text-slate-400">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Numbered Steps List */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Pick Instructions</h2>
            </div>
            <div className="p-0">
              <ul className="divide-y divide-slate-100">
                {data.pick_steps.map((step, i) => (
                  <li key={i} className="p-6 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-bold shrink-0 border border-emerald-200">
                      {step.step}
                    </div>
                    <div className="pt-2">
                      <h3 className="font-bold text-slate-800 mb-1">Node: {step.node_id}</h3>
                      <p className="text-slate-600">{step.action}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
