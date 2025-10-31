import React, { useState, useEffect } from 'react'; // <-- useEffect ইম্পোর্ট করা হয়েছে
import { Link } from 'react-router-dom';
import { FiEdit2, FiSave, FiXCircle } from 'react-icons/fi';

// --- (এইখানে simulationData অ্যারেটি ডিলিট করা হয়েছে) ---

// --- ফরম্যাটিং হেল্পার (অপরিবর্তিত) ---
function formatCurrencyV2(num) {
    if (num === 0) return '$0';
    const sign = num < 0 ? '−' : '+';
    const absNum = Math.abs(num);
    if (absNum >= 1e12) return `${sign}$${(absNum / 1e12).toFixed(2)} T`;
    if (absNum >= 1e9) return `${sign}$${(absNum / 1e9).toFixed(2)} B`;
    if (absNum >= 1e6) return `${sign}$${(absNum / 1e6).toFixed(2)} M`;
    return `${sign}$${(absNum / 1e3).toFixed(0)} K`;
}
function formatCurrencyForTable(num) {
    if (num === 0) return '$0';
    const absNum = Math.abs(num);
    if (absNum >= 1e12) return `$${(absNum / 1e12).toFixed(2)} T`;
    if (absNum >= 1e9) return `$${(absNum / 1e9).toFixed(2)} B`;
    if (absNum >= 1e6) return `$${(absNum / 1e6).toFixed(2)} M`;
    return `$${(absNum / 1e3).toFixed(0)} K`;
}

// --- ক্যালকুলেশন লজিক (অপরিবর্তিত) ---
const calculateNewNetProfit = (startAUM, loan, grossReturn) => {
    const totalInvestable = startAUM + loan;
    const grossProfit = totalInvestable * grossReturn;
    const mgmtFee = startAUM * 0.02; 
    const loanInterest = loan * 0.05; 
    const performanceBase = grossProfit - mgmtFee - loanInterest;
    const performanceFee = Math.max(0, performanceBase * 0.20); 
    const netProfit = grossProfit - mgmtFee - loanInterest - performanceFee;
    return netProfit;
};

// --- React Component ---
export default function CrazyFoxPage() {
    
    // --- State এখন ডাটাবেস লোড করার জন্য পরিবর্তিত ---
    const [simData, setSimData] = useState([]);
    const [isLoading, setIsLoading] = useState(true); // লোডিং স্টেট
    const [editRowId, setEditRowId] = useState(null); 
    const [editGrossReturn, setEditGrossReturn] = useState(0);

    // --- নতুন: useEffect - ডেটা লোড করার জন্য ---
    useEffect(() => {
      async function fetchData() {
        try {
          const response = await fetch('/api/getCrazyFoxData');
          const data = await response.json();
          // ডাটাবেস থেকে আসা string ডেটাগুলোকে float/number-এ কনভার্ট করা
          const numericData = data.map(row => ({
            ...row,
            start_aum: parseFloat(row.start_aum),
            loan: parseFloat(row.loan),
            gross_return: parseFloat(row.gross_return),
            net_profit: parseFloat(row.net_profit),
            repayment: parseFloat(row.repayment),
            end_aum: parseFloat(row.end_aum),
          }));
          setSimData(numericData);
          setIsLoading(false);
        } catch (error) {
          console.error("Failed to fetch data:", error);
          setIsLoading(false);
        }
      }
      fetchData();
    }, []); 

    // --- UPDATED: handleSave function - এখন API-তে সেভ করবে ---
    const handleSave = async (changedYear, newGrossReturn) => {
        let recalculatedData = [];

        // ১. State-এ ডেটা ক্যালকুলেট করা
        setSimData(prevData => {
            const newData = structuredClone(prevData); 
            const startIndex = newData.findIndex(row => row.year === changedYear);

            for (let i = startIndex; i < newData.length; i++) {
                const row = newData[i];
                
                let currentStartAUM = (i === 0) ? 30e6 : newData[i - 1].end_aum;
                if (row.year === 3) {
                    currentStartAUM += 200e6; 
                }
                row.start_aum = currentStartAUM;

                if (row.year === changedYear) {
                    row.gross_return = newGrossReturn;
                }

                const newNetProfit = calculateNewNetProfit(row.start_aum, row.loan, row.gross_return);
                row.net_profit = newNetProfit;
                row.end_aum = row.start_aum + newNetProfit - row.repayment;
            }
            
            recalculatedData = newData; // সেভ করার জন্য ডেটা রাখা হলো
            return newData; // State আপডেট
        });

        // ২. নতুন: সম্পূর্ণ recalculated ডেটা অ্যারেটি API-এর মাধ্যমে ডাটাবেসে POST করা
        try {
          await fetch('/api/updateCrazyFoxData', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(recalculatedData),
          });
        } catch (error) {
          console.error("Failed to save data:", error);
          alert("Data could not be saved to database. Check server logs.");
        }

        setEditRowId(null);
    };

    const handleEdit = (row) => {
        setEditRowId(row.year);
        // ডাটাবেস কলামের নাম (snake_case) ব্যবহার
        setEditGrossReturn((row.gross_return * 100).toFixed(0)); 
    };

    const handleCancel = () => {
        setEditRowId(null);
    };

    // --- ডাইনামিক সামারি ---
    const totalNetProfit = simData.reduce((acc, row) => acc + row.net_profit, 0);
    const endingEquity = simData.length > 0 ? simData[simData.length - 1].end_aum : 0;

    // --- নতুন: লোডিং স্ক্রিন ---
    if (isLoading) {
      return (
        <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-gray-900 via-[#030712] to-gray-900 text-white flex justify-center items-center">
          <h2 className="text-2xl font-semibold">Loading Database...</h2>
        </div>
      );
    }

    return (
        <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-gray-900 via-[#030712] to-gray-900">
            <div className="max-w-7xl mx-auto">
                
                {/* Header (অপরিবর্তিত) */}
                <header className="flex items-center justify-between mb-10">
                    <Link to="/" className="flex items-center text-sm text-gray-400 hover:text-blue-400 transition-colors">
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                        Back to Home
                    </Link>
                    <div className="text-right">
                        <h1 className="text-3xl md:text-4xl font-bold text-white">CrazyFox</h1>
                        <p className="text-md md:text-lg text-gray-400 mt-1">The "Realistic Titan" Simulation (20 Years)</p>
                    </div>
                </header>

                {/* সামারি কার্ড (এখন state থেকে চলছে) */}
                <div className="card p-6 md:p-8 mb-10 shadow-lg shadow-blue-900/10 border border-gray-700/50">
                    <h2 className="text-xl font-semibold text-white mb-6">20-Year Performance Summary</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-gray-300">
                        <div className="card p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                            <div className="text-sm text-gray-400 mb-1">Starting Capital (Y1)</div>
                            <div className="text-2xl lg:text-3xl font-bold text-white">{formatCurrencyForTable(30e6)}</div>
                        </div>
                        <div className="card p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                            <div className="text-sm text-gray-400 mb-1">Total Equity Injected</div>
                            <div className="text-2xl lg:text-3xl font-bold text-white">{formatCurrencyForTable(200e6)}</div>
                        </div>
                        <div className="card p-4 bg-gray-800/50 border border-green-500/30 rounded-lg">
                            <div className="text-sm text-gray-400 mb-1">Total Net Profit</div>
                            <div className="text-2xl lg:text-3xl font-bold profit">{formatCurrencyV2(totalNetProfit)}</div>
                        </div>
                        <div className="card p-4 bg-gray-800/50 border border-blue-500/30 rounded-lg">
                            <div className="text-sm text-gray-400 mb-1">Ending Equity (Y20)</div>
                            <div className="text-2xl lg:text-3xl font-bold text-white">{formatCurrencyForTable(endingEquity)}</div>
                        </div>
                    </div>
                </div>
                
                {/* সিমুলেশন টেবিল (এখন state থেকে চলছে) */}
                <div className="overflow-x-auto card shadow-lg shadow-blue-900/10 border border-gray-700/50">
                    <table className="w-full text-sm text-left text-gray-300">
                        <thead className="text-xs text-gray-400 uppercase table-header-bg">
                            <tr>
                                <th scope="col" className="px-6 py-4 sticky-col">Year</th>
                                <th scope="col" className="px-6 py-4">Starting Equity (AUM)</th>
                                <th scope="col" className="px-6 py-4">Outstanding Loan</th>
                                <th scope="col" className="px-6 py-4">Gross Return %</th>
                                <th scope="col" className="px-6 py-4">Net Profit / Loss</th>
                                <th scope="col" className="px-6 py-4">Principal Repayment</th>
                                <th scope="col" className="px-6 py-4">Ending Equity (AUM)</th>
                                <th scope="col" className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {simData.map((row) => {
                                const isEditing = editRowId === row.year; 
                                const netProfitClass = row.net_profit >= 0 ? 'profit' : 'loss';
                                let grossReturnClass = row.gross_return >= 0 ? 'text-gray-300' : 'loss font-semibold';
                                if (row.year === 6) { grossReturnClass = 'text-yellow-300 font-bold'; }
                                let rowClass = `border-b table-row-border transition-colors duration-200 hover:bg-gray-800/50`;
                                if (row.year === 6) { rowClass += ' supernova'; }

                                return (
                                    <tr key={row.year} className={rowClass}>
                                        <td className="px-6 py-4 font-medium text-gray-100 sticky-col">{row.year}</td>
                                        {/* snake_case কলামের নাম ব্যবহার করা হয়েছে */}
                                        <td className="px-6 py-4">{formatCurrencyForTable(row.start_aum)}</td>
                                        <td className="px-6 py-4 highlight-loan">{formatCurrencyForTable(row.loan)}</td>
                                        
                                        <td className={`px-6 py-4 ${grossReturnClass}`}>
                                            {isEditing ? (
                                                <input 
                                                    type="number"
                                                    value={editGrossReturn}
                                                    onChange={(e) => setEditGrossReturn(e.target.value)}
                                                    className="w-20 bg-gray-700 text-white p-1 rounded border border-blue-500"
                                                />
                                            ) : (
                                                <span>{(row.gross_return * 100).toFixed(0)}%</span>
                                            )}
                                        </td>
                                        
                                        <td className={`px-6 py-4 font-semibold ${netProfitClass}`}>{formatCurrencyV2(row.net_profit)}</td>
                                        <td className="px-6 py-4 repayment">{formatCurrencyForTable(row.repayment)}</td>
                                        <td className="px-6 py-4 font-bold text-white">{formatCurrencyForTable(row.end_aum)}</td>
                                        
                                        <td className="px-6 py-4">
                                            {isEditing ? (
                                                <div className="flex space-x-3">
                                                    <button onClick={() => handleSave(row.year, parseFloat(editGrossReturn) / 100)} className="text-green-400 hover:text-green-300">
                                                        <FiSave size={18} />
                                                    </button>
                                                    <button onClick={handleCancel} className="text-red-400 hover:text-red-300">
                                                        <FiXCircle size={18} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button onClick={() => handleEdit(row)} className="text-blue-400 hover:text-blue-300">
                                                    <FiEdit2 size={18} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Core Assumptions Card (অপরিবর্তিত) */}
                <div className="card p-6 mt-10 shadow-lg shadow-blue-900/10 border border-gray-700/50">
                    <h2 className="text-xl font-semibold text-white mb-6">Core Assumptions</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-gray-300">
                        <div className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg">
                            <svg className="w-6 h-6 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01"></path></svg>
                            <span>Starting Capital (Y1): <strong>$30 Million</strong></span>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg">
                            <svg className="w-6 h-6 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                            <span>Equity Injection (Y3): <strong>+$200 Million</strong></span>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg">
                            <svg className="w-6 h-6 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                            <span>Loan Structure: <strong>Two major loans</strong></span>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg">
                            <svg className="w-6 h-6 text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                            <span className="font-bold">Gross Return: <strong>Realistic Scaling Model</strong></span>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg">
                            <svg className="w-6 h-6 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M12 6V3m0 18v-3"></path></svg>
                            <span>Cost Model: <strong>Institutional Grade</strong></span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}