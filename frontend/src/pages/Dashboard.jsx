import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Dashboard() {
  const navigate = useNavigate();
  const [backendStatus, setBackendStatus] = useState('Checking...');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await axios.get('http://localhost:8000/health');
        setBackendStatus('Online');
      } catch (err) {
        setBackendStatus('Offline');
      }
    };
    checkHealth();
  }, []);

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-10 pb-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-bold text-slate-800 tracking-tight">Warehouse AI Dashboard</h1>
        <p className="text-slate-500 mt-2 text-lg">Central hub for autonomous warehouse management.</p>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col gap-2">
          <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Agents</span>
          <span className="text-3xl font-extrabold text-slate-800">4</span>
        </div>
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col gap-2">
          <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Backend Status</span>
          <div className="flex items-center gap-3">
            <span className={`w-4 h-4 rounded-full shadow-inner ${backendStatus === 'Online' ? 'bg-emerald-500 animate-pulse' : backendStatus === 'Offline' ? 'bg-red-500' : 'bg-slate-300'}`}></span>
            <span className={`text-2xl font-extrabold ${backendStatus === 'Online' ? 'text-emerald-600' : backendStatus === 'Offline' ? 'text-red-600' : 'text-slate-600'}`}>
              {backendStatus}
            </span>
          </div>
        </div>
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col gap-2">
          <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Pages Available</span>
          <span className="text-3xl font-extrabold text-slate-800">4</span>
        </div>
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col gap-2">
          <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Stack</span>
          <span className="text-xl font-bold text-indigo-600 leading-tight">FastAPI +<br/>LangGraph + Groq</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Run Slotting Analysis */}
          <div 
            onClick={() => navigate('/slotting')}
            className="group cursor-pointer p-6 bg-white border border-slate-200 hover:border-purple-400 hover:shadow-md transition-all rounded-2xl flex flex-col gap-5"
          >
            <div className="w-14 h-14 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-purple-700 transition-colors">Run Slotting Analysis</h3>
              <p className="text-slate-500 text-[15px] leading-relaxed">Analyze SKU velocity and get zone relocation recommendations to optimize picking paths over time.</p>
            </div>
          </div>

          {/* Optimize Pick Path */}
          <div 
            onClick={() => navigate('/pickpath')}
            className="group cursor-pointer p-6 bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all rounded-2xl flex flex-col gap-5"
          >
            <div className="w-14 h-14 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-emerald-700 transition-colors">Optimize Pick Path</h3>
              <p className="text-slate-500 text-[15px] leading-relaxed">Calculate the most efficient walking route for picking orders using the TSP solver.</p>
            </div>
          </div>

          {/* Ask AI Assistant */}
          <div 
            onClick={() => navigate('/chat')}
            className="group cursor-pointer p-6 bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all rounded-2xl flex flex-col gap-5"
          >
            <div className="w-14 h-14 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-700 transition-colors">Ask AI Assistant</h3>
              <p className="text-slate-500 text-[15px] leading-relaxed">Query inventory data via NL2SQL or retrieve Standard Operating Procedures (SOPs) via RAG.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
