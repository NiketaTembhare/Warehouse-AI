import React, { useState } from 'react';
import client from '../api/client';

export default function Slotting() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runAnalysis = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await client.get('/slotting');
      setData(res.data);
    } catch (err) {
      setError("Error running slotting optimization");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Slotting Optimization</h1>
          <p className="text-slate-500 mt-1">Analyze warehouse SKU velocity and identify mis-slotted items.</p>
        </div>
        <button 
          onClick={runAnalysis}
          disabled={loading}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 flex items-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Analyzing...
            </>
          ) : 'Run Slotting Analysis'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Top Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total SKUs Analyzed</span>
              <span className="text-4xl font-bold text-slate-800">{data.total_skus_analyzed}</span>
            </div>
            
            <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Mismatches</span>
              <span className="text-4xl font-bold text-red-600">{data.total_mismatches}</span>
            </div>

            <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">ABC Breakdown</span>
              <div className="flex justify-between items-center h-full">
                <div className="flex flex-col items-center">
                  <span className="text-xs text-slate-400 font-bold">CLASS A</span>
                  <span className="text-xl font-bold text-emerald-600">{data.abc_breakdown.class_a_count}</span>
                </div>
                <div className="flex flex-col items-center border-x border-slate-100 px-4">
                  <span className="text-xs text-slate-400 font-bold">CLASS B</span>
                  <span className="text-xl font-bold text-blue-600">{data.abc_breakdown.class_b_count}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-xs text-slate-400 font-bold">CLASS C</span>
                  <span className="text-xl font-bold text-slate-600">{data.abc_breakdown.class_c_count}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Top Priority Moves</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200 text-sm">
                    <th className="px-6 py-4 font-semibold text-slate-600">SKU ID</th>
                    <th className="px-6 py-4 font-semibold text-slate-600">Orders</th>
                    <th className="px-6 py-4 font-semibold text-slate-600">Class</th>
                    <th className="px-6 py-4 font-semibold text-slate-600">Current Zone</th>
                    <th className="px-6 py-4 font-semibold text-slate-600">Target Zone</th>
                    <th className="px-6 py-4 font-semibold text-slate-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recommendations.map((rec, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors text-sm">
                      <td className="px-6 py-4 font-bold text-slate-700">{rec.sku_id}</td>
                      <td className="px-6 py-4 text-slate-600">{rec.order_count}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded font-bold text-xs ${
                          rec.abc_class === 'A' ? 'bg-emerald-100 text-emerald-800' : 
                          rec.abc_class === 'B' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'
                        }`}>
                          Class {rec.abc_class}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-red-600 font-medium">{rec.current_zone}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-emerald-600 font-medium">{rec.target_zone}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{rec.action}</td>
                    </tr>
                  ))}
                  {data.recommendations.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                        No mismatches found. The warehouse is perfectly slotted!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
