import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SelectionPage from './pages/SelectionPage';
import CrazyFoxPage from './pages/CrazyFoxPage';
import RahmanTrustPage from './pages/RahmanTrustPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SelectionPage />} />
        <Route path="/crazyfox" element={<CrazyFoxPage />} />
        <Route path="/rahman-family-trust" element={<RahmanTrustPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;