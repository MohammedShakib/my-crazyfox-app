import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SelectionPage from './pages/SelectionPage';
import CrazyFoxPage from './pages/CrazyFoxPage';
import RahmanTrustPage from './pages/RahmanTrustPage';
import BlueCapPage from './pages/BlueCapPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<SelectionPage />} />
      <Route path="/crazyfox" element={<CrazyFoxPage />} />
      <Route path="/bluecap" element={<BlueCapPage />} />
      <Route path="/rahman-family-trust" element={<RahmanTrustPage />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
