import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';

const Layout = () => {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/' },
    { name: 'AI Chat', path: '/chat' },
    { name: 'Slotting', path: '/slotting' },
    { name: 'Pick Path', path: '/pickpath' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <nav className="w-full md:w-64 bg-slate-900 text-white flex flex-col shadow-lg">
        <div className="p-6 text-2xl font-bold border-b border-slate-800 text-blue-400 tracking-wide">
          Warehouse AI
        </div>
        <div className="flex flex-col flex-1 mt-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`px-6 py-4 transition-colors duration-200 border-l-4 ${
                  isActive 
                    ? 'border-blue-500 bg-slate-800 text-white font-medium' 
                    : 'border-transparent text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 overflow-auto">
        <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-sm p-6 min-h-[80vh]">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
