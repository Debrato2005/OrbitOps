import React from 'react';
import { Routes, Route } from 'react-router-dom';
import EarthPage from './pages/Earth/EarthPage';

function App() {
  return (
    <Routes>

      <Route path="/" element={<EarthPage />} />


      {/* <Route path="/dashboard" element={<DashboardPage />} /> */}
    </Routes>
  );
}

export default App;
