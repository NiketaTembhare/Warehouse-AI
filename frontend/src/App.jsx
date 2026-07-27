import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Slotting from './pages/Slotting';
import PickPath from './pages/PickPath';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="chat" element={<Chat />} />
          <Route path="slotting" element={<Slotting />} />
          <Route path="pickpath" element={<PickPath />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
