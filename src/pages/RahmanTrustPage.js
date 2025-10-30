import React from 'react';
import { Link } from 'react-router-dom';

export default function RahmanTrustPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-4xl font-bold text-white mb-6">Rahman Family Trust</h1>
      <p className="text-xl text-gray-400 mb-8">This page is under construction.</p>
      <Link 
        to="/" 
        className="px-6 py-3 text-lg font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        Back to Home
      </Link>
    </div>
  );
}