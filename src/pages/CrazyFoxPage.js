import React, { useEffect, useRef, useState } from 'react'; // <-- useState ইম্পোর্ট করুন
import { Link } from 'react-router-dom';
import { FiEdit2, FiSave, FiXCircle } from 'react-icons/fi'; // <-- আইকন ইম্পোর্ট করুন

// --- DATA (Years 1-20) ---
const simulationData = [
    // ... (আপনার সম্পূর্ণ ডাটা এখানে থাকবে, কোনো পরিবর্তন করা হয়নি) ...
    { year: 1, startAUM: 30e6, loan: 0, grossReturn: 0.48, netProfit: 11.9e6, repayment: 0, endAUM: 41.9e6 },
    { year: 2, startAUM: 41.9e6, loan: 0, grossReturn: 0.52, netProfit: 19.29e6, repayment: 0, endAUM: 61.19e6 },
    { year: 3, startAUM: 261.19e6, loan: 0, grossReturn: 0.55, netProfit: 139.74e6, repayment: 0, endAUM: 400.92e6 }, // Includes +200M injection
    { year: 4, startAUM: 400.92e6, loan: 0, grossReturn: 0.41, netProfit: 158.36e6, repayment: 0, endAUM: 559.29e6 },
    { year: 5, startAUM: 559.29e6, loan: 1e9, grossReturn: 0.53, netProfit: 768.03e6, repayment: 0, endAUM: 1.33e9 },
    { year: 6, startAUM: 1.33e9, loan: 1e9, grossReturn: 2.00, netProfit: 4.58e9, repayment: 0, endAUM: 5.91e9 }, // Supernova year
    { year: 7, startAUM: 5.91e9, loan: 1e9, grossReturn: -0.10, netProfit: -829.89e6, repayment: 0, endAUM: 5.08e9 }, // Loss year
    { year: 8, startAUM: 5.08e9, loan: 1e9, grossReturn: 0.48, netProfit: 2.79e9, repayment: 0, endAUM: 7.88e9 },
    { year: 9, startAUM: 7.88e9, loan: 1e9, grossReturn: 0.35, netProfit: 2.94e9, repayment: 0, endAUM: 10.81e9 },
    { year: 10, startAUM: 10.81e9, loan: 1e9, grossReturn: 0.29, netProfit: 3.21e9, repayment: 0, endAUM: 14.03e9 },
    { year: 11, startAUM: 14.03e9, loan: 1e9, grossReturn: 0.42, netProfit: 6.05e9, repayment: 250e6, endAUM: 19.83e9 },
    { year: 12, startAUM: 19.83e9, loan: 750e6, grossReturn: 0.51, netProfit: 10.16e9, repayment: 250e6, endAUM: 29.74e9 },
    { year: 13, startAUM: 29.74e9, loan: 500e6, grossReturn: 0.31, netProfit: 8.90e9, repayment: 250e6, endAUM: 38.39e9 },
    { year: 14, startAUM: 38.39e9, loan: 250e6, grossReturn: -0.12, netProfit: -5.23e9, repayment: 250e6, endAUM: 32.92e9 }, // Loss year
    { year: 15, startAUM: 32.92e9, loan: 5e9, grossReturn: 0.50, netProfit: 18.22e9, repayment: 0, endAUM: 51.14e9 },
    { year: 16, startAUM: 51.14e9, loan: 5e9, grossReturn: 0.32, netProfit: 16.94e9, repayment: 500e6, endAUM: 67.58e9 },
    { year: 17, startAUM: 67.58e9, loan: 4.5e9, grossReturn: 0.24, netProfit: 16.07e9, repayment: 500e6, endAUM: 83.15e9 },
    { year: 18, startAUM: 83.15e9, loan: 4e9, grossReturn: 0.18, netProfit: 14.24e9, repayment: 500e6, endAUM: 96.89e9 },
    { year: 19, startAUM: 96.89e9, loan: 3.5e9, grossReturn: 0.13, netProfit: 11.43e9, repayment: 500e6, endAUM: 107.82e9 },
    { year: 20, startAUM: 107.82e9, loan: 3e9, grossReturn: 0.10, netProfit: 9.31e9, repayment: 500e6, endAUM: 116.63e9 }
];

// --- FORMATTING HELPERS ---
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

// --- React Component ---
export default function CrazyFoxPage() {
    
    // --- ধাপ ১: State তৈরি করা ---
    // স্ট্যাটিক ডেটাকে state-এ রূপান্তর করা হলো
    const [simData, setSimData] = useState(simulationData);
    // কোনটি এডিট হচ্ছে তা ট্র্যাক করার জন্য
    const [editRowId, setEditRowId] = useState(null); 
    // ইনপুট ফিল্ডের ভ্যালু রাখার জন্য
    const [editGrossReturn, setEditGrossReturn] = useState('0');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isModalOpen && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isModalOpen]);

    useEffect(() => {
        const updateIsMobile = () => setIsMobile(window.innerWidth < 768);
        updateIsMobile();
        window.addEventListener('resize', updateIsMobile);
        return () => window.removeEventListener('resize', updateIsMobile);
    }, []);

    // --- ধাপ ২: Recalculation Logic ---
    // এটি একটি কাল্পনিক কিন্তু বাস্তবসম্মত "2 and 20" ফি মডেল (2% ম্যানেজমেন্ট ফি, 20% পারফরম্যান্স ফি)
    // এবং 5% লোন ইন্টারেস্ট ধরে গণনা করা হয়েছে।
    const calculateNewNetProfit = (startAUM, loan, grossReturn) => {
        const totalInvestable = startAUM + loan;
        const grossProfit = totalInvestable * grossReturn;
        
        // ফি গণনা (Institutional Model)
        const mgmtFee = startAUM * 0.02; // 2% ম্যানেজমেন্ট ফি (AUM-এর উপর)
        const loanInterest = loan * 0.05; // 5% লোন ইন্টারেস্ট (ধরে নেওয়া)
        
        // পারফরম্যান্স ফি (High-water mark ছাড়া সহজ গণনা)
        const performanceBase = grossProfit - mgmtFee - loanInterest;
        const performanceFee = Math.max(0, performanceBase * 0.20); // 20% পারফরম্যান্স ফি
        
        const netProfit = grossProfit - mgmtFee - loanInterest - performanceFee;
        return netProfit;
    };

    // সেভ বাটনে ক্লিক করলে এই ফাংশনটি কাজ করবে
    const handleSave = (changedYear, newGrossReturn) => {
        if (Number.isNaN(newGrossReturn)) {
            return;
        }

        setSimData(prevData => {
            // সম্পূর্ণ ডেটার একটি নতুন কপি তৈরি করুন
            const newData = structuredClone(prevData); 
            const startIndex = newData.findIndex(row => row.year === changedYear);

            // যে বছর পরিবর্তন হয়েছে, সেখান থেকে শেষ পর্যন্ত লুপ চালান
            for (let i = startIndex; i < newData.length; i++) {
                const row = newData[i];
                
                // 1. Start AUM আপডেট করুন (আগের বছরের End AUM)
                // বিশেষ দ্রষ্টব্য: বছর ৩-এর 200M ইনজেকশন লজিক এখানে যুক্ত করা হয়েছে
                let currentStartAUM = (i === 0) ? 30e6 : newData[i - 1].endAUM;
                if (row.year === 3) {
                    currentStartAUM += 200e6; 
                }
                row.startAUM = currentStartAUM;

                // 2. Gross Return আপডেট করুন (শুধু পরিবর্তিত বছরের জন্য)
                if (row.year === changedYear) {
                    row.grossReturn = newGrossReturn;
                }

                // 3. Net Profit ও End AUM রি-ক্যালকুলেট করুন
                const newNetProfit = calculateNewNetProfit(row.startAUM, row.loan, row.grossReturn);
                row.netProfit = newNetProfit;
                row.endAUM = row.startAUM + newNetProfit - row.repayment;
            }
            
            return newData;
        });

        setEditRowId(null);
        setIsModalOpen(false);
        setEditGrossReturn('0');
    };

    const handleEdit = (row) => {
        setEditRowId(row.year);
        setEditGrossReturn((row.grossReturn * 100).toFixed(0));
        setIsModalOpen(true);
    };

    const handleCancel = () => {
        setEditRowId(null);
        setIsModalOpen(false);
        setEditGrossReturn('0');
    };

    const handleGrossReturnCellClick = (row) => {
        if (isMobile) {
            handleEdit(row);
        }
    };

    const handleModalKeyDown = (event) => {
        if (event.key === 'Enter') {
            if (event.target.tagName !== 'INPUT') {
                return;
            }
            event.preventDefault();
            if (editRowId !== null) {
                handleSave(editRowId, parseFloat(editGrossReturn) / 100);
            }
        } else if (event.key === 'Escape') {
            event.preventDefault();
            handleCancel();
        }
    };

    // --- ধাপ ৩: সামারি কার্ডকে ডাইনামিক করা ---
    // simData (state) থেকে মোট লাভ ও শেষ ইক্যুইটি গণনা করুন
    const totalNetProfit = simData.reduce((acc, row) => acc + row.netProfit, 0);
    const endingEquity = simData.length > 0 ? simData[simData.length - 1].endAUM : 0;

    return (
        <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-gray-900 via-[#030712] to-gray-900">
            <div className="max-w-7xl mx-auto">
                
                {/* Header (No change) */}
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

                {/* Summary Card (এখন state-এর উপর নির্ভরশীল) */}
                <div className="card p-6 md:p-8 mb-10 shadow-lg shadow-blue-900/10 border border-gray-700/50">
                    <h2 className="text-xl font-semibold text-white mb-6">20-Year Performance Summary</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-gray-300">
                        {/* ... (Summary Item 1 & 2 unchanged) ... */}
                        <div className="card p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                            <div className="text-sm text-gray-400 mb-1">Starting Capital (Y1)</div>
                            <div className="text-2xl lg:text-3xl font-bold text-white">{formatCurrencyForTable(30e6)}</div>
                        </div>
                        <div className="card p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                            <div className="text-sm text-gray-400 mb-1">Total Equity Injected</div>
                            <div className="text-2xl lg:text-3xl font-bold text-white">{formatCurrencyForTable(200e6)}</div>
                        </div>
                        {/* (আইটেম ৩ ও ৪ এখন ডাইনামিক) */}
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
                
                {/* Simulation Table Card */}
                <div className="card shadow-lg shadow-blue-900/10 border border-gray-700/50 overflow-hidden md:overflow-x-auto">
                    <table className="w-full table-fixed text-sm text-left text-gray-300">
                        <thead className="text-xs text-gray-400 uppercase table-header-bg">
                            <tr>
                                <th scope="col" className="px-3 py-3 sticky-col w-[18%] md:w-auto whitespace-normal break-words">Year</th>
                                <th scope="col" className="px-3 py-3 w-[32%] md:w-auto whitespace-normal break-words">Starting Equity (AUM)</th>
                                <th scope="col" className="px-3 py-3 hidden md:table-cell">Outstanding Loan</th>
                                <th scope="col" className="px-3 py-3 hidden md:table-cell">Gross Return %</th>
                                <th scope="col" className="px-3 py-3 w-[30%] md:w-auto whitespace-normal break-words">Net Profit / Loss</th>
                                <th scope="col" className="px-3 py-3 hidden md:table-cell">Principal Repayment</th>
                                <th scope="col" className="px-3 py-3 w-[20%] md:w-auto whitespace-normal break-words">Ending Equity (AUM)</th>
                                {/* --- ধাপ ৪: নতুন 'Actions' কলাম --- */}
                                <th scope="col" className="px-3 py-3 hidden md:table-cell">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* --- ধাপ ৫: simData (state) ম্যাপ করুন --- */}
                            {simData.map((row) => {
                                const isEditing = editRowId === row.year; // এই সারিটি কি এডিট মোডে আছে?

                                const netProfitClass = row.netProfit >= 0 ? 'profit' : 'loss';
                                let grossReturnClass = row.grossReturn >= 0 ? 'text-gray-300' : 'loss font-semibold';
                                if (row.year === 6) { grossReturnClass = 'text-yellow-300 font-bold'; }
                                
                                let rowClass = `border-b table-row-border transition-colors duration-200 hover:bg-gray-800/50`;
                                if (row.year === 6) { rowClass += ' supernova'; }
                                if (isEditing) { rowClass += ' ring-2 ring-blue-400/60'; }

                                return (
                                    <tr key={row.year} className={rowClass}>
                                        <td className="px-3 py-3 font-medium text-gray-100 sticky-col">{row.year}</td>
                                        <td className="px-3 py-3 whitespace-normal break-words">{formatCurrencyForTable(row.startAUM)}</td>
                                        <td className="px-3 py-3 hidden md:table-cell highlight-loan">{formatCurrencyForTable(row.loan)}</td>

                                        <td className={`px-3 py-3 hidden md:table-cell ${grossReturnClass}`}>{(row.grossReturn * 100).toFixed(0)}%</td>
                                        
                                        {/* --- ধাপ ৬: Gross Return সেল (ইনপুট ফিল্ড) --- */}
                                        <td className={`px-3 py-3 font-semibold whitespace-normal break-words ${netProfitClass}`}>
                                            <div
                                                className={`${isMobile ? 'cursor-pointer' : ''}`}
                                                onClick={() => handleGrossReturnCellClick(row)}
                                                role={isMobile ? 'button' : undefined}
                                                tabIndex={isMobile ? 0 : -1}
                                            >
                                                <span>{formatCurrencyV2(row.netProfit)}</span>
                                                <span className="block text-xs text-gray-400 md:hidden">({(row.grossReturn * 100).toFixed(0)}%)</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 hidden md:table-cell repayment">{formatCurrencyForTable(row.repayment)}</td>
                                        <td className="px-3 py-3 font-bold text-white whitespace-normal break-words">{formatCurrencyForTable(row.endAUM)}</td>
                                        
                                        {/* --- ধাপ ৭: Action বাটন সেল --- */}
                                        <td className="px-3 py-3 hidden md:table-cell">
                                            <button onClick={() => handleEdit(row)} className="text-blue-400 hover:text-blue-300">
                                                <FiEdit2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                        <div
                            className="relative w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-xl"
                            onKeyDown={handleModalKeyDown}
                            tabIndex={-1}
                        >
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="absolute right-3 top-3 text-gray-400 transition-colors hover:text-red-400"
                                aria-label="Cancel editing"
                            >
                                <FiXCircle size={20} />
                            </button>
                            <h3 className="text-xl font-semibold text-white">Edit Gross Return</h3>
                            <p className="mt-1 text-sm text-gray-400">Adjust the gross return for year {editRowId}.</p>
                            <label className="mt-4 block text-sm font-medium text-gray-300" htmlFor="gross-return-input">
                                Gross Return (%)
                            </label>
                            <input
                                id="gross-return-input"
                                ref={inputRef}
                                type="number"
                                value={editGrossReturn}
                                onChange={(e) => setEditGrossReturn(e.target.value)}
                                className="mt-2 w-full rounded-md border border-blue-500 bg-gray-800 p-3 text-white outline-none focus:ring-2 focus:ring-blue-400"
                            />
                            <p className="mt-2 text-xs text-gray-500">Press Enter to save or Esc to cancel.</p>
                            <div className="mt-6 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="rounded-md border border-gray-600 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSave(editRowId, parseFloat(editGrossReturn) / 100)}
                                    className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                >
                                    <FiSave size={16} className="mr-2" />
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Core Assumptions Card (No change) */}
                <div className="card p-6 mt-10 shadow-lg shadow-blue-900/10 border border-gray-700/50">
                    {/* ... (আপনার Assumptions কার্ডের সব কোড এখানে থাকবে) ... */}
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




