import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiEdit2, FiSave, FiXCircle, FiGrid, FiCopy } from 'react-icons/fi';

// --- ধাপ ১: প্রাথমিক ডেটা সেটআপ ---
const initialPortfolio = [
    { id: 1, pic: 'Rahman Matterhorn Ltd.', manager: 'UBS', location: 'Switzerland', value: 142857142, rate: 0.060, mandate: 'Stable Growth' },
    { id: 2, pic: 'Rahman Sierra Ltd.', manager: 'Goldman Sachs', location: 'USA', value: 142857142, rate: 0.075, mandate: 'Balanced Growth' },
    { id: 3, pic: 'Rahman Concorde Ltd.', manager: 'BNP Paribas', location: 'France', value: 142857142, rate: 0.075, mandate: 'Balanced Growth' },
    { id: 4, pic: 'Rahman Suhail Ltd.', manager: 'LGT', location: 'UAE', value: 142857142, rate: 0.090, mandate: 'Aggressive Growth' },
    { id: 5, pic: 'Rahman Liffey Ltd.', manager: 'Goodbody', location: 'Ireland', value: 142857142, rate: 0.060, mandate: 'Stable Growth' },
    { id: 6, pic: 'Rahman Merlion Ltd.', manager: 'DBS Private Bank', location: 'Singapore', value: 142857142, rate: 0.075, mandate: 'Balanced Growth' },
    { id: 7, pic: 'Rahman Andes Ltd.', manager: 'BTG Pactual', location: 'Brazil', value: 142857142, rate: 0.090, mandate: 'Aggressive Growth' },
];

// --- ফরম্যাটিং হেল্পার ---
function formatCurrencyWithSign(num) {
    if (num === 0) return '$0';
    const sign = num < 0 ? '−' : '+';
    const absNum = Math.abs(num);
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

function formatMillions(num) {
    return `$${(num / 1e6).toFixed(2)} M`;
}

// --- ডায়াগ্রামটি মুছে ফেলা হয়েছে ---
// const structureDiagram = ... (এই অংশটি ডিলিট করা হয়েছে)

export default function RahmanTrustPage() {
    
    // --- State তৈরি করা ---
    const [portfolioData, setPortfolioData] = useState(initialPortfolio);
    const [editRowId, setEditRowId] = useState(null);
    const [editRate, setEditRate] = useState('0');
    const [editValue, setEditValue] = useState('0');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isModalOpen && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isModalOpen]);

    // --- এডিট/সেভ ফাংশন ---
    const handleEdit = (row) => {
        setEditRowId(row.id);
        setEditRate((row.rate * 100).toFixed(1));
        setEditValue((row.value / 1e6).toFixed(2));
        setIsModalOpen(true);
    };

    const handleCancel = () => {
        setIsModalOpen(false);
        setEditRowId(null);
        setEditRate('0');
        setEditValue('0');
    };

    const handleSave = () => {
        if (editRowId === null) {
            return;
        }

        const parsedRate = parseFloat(editRate);
        const parsedValueMillions = parseFloat(editValue);
        if (Number.isNaN(parsedRate) || Number.isNaN(parsedValueMillions)) {
            return;
        }

        const newRate = parsedRate / 100;
        const newValue = parsedValueMillions * 1e6;

        setPortfolioData(prevData =>
            prevData.map(row =>
                row.id === editRowId ? { ...row, rate: newRate, value: newValue } : row
            )
        );

        setIsModalOpen(false);
        setEditRowId(null);
        setEditRate('0');
        setEditValue('0');
    };

    const handleModalKeyDown = (event) => {
        if (event.key === 'Enter') {
            if (event.target.tagName !== 'INPUT') {
                return;
            }
            event.preventDefault();
            handleSave();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            handleCancel();
        }
    };

    // --- ডাইনামিক সামারি গণনা ---
    const totalValue = portfolioData.reduce((acc, row) => acc + row.value, 0);
    const totalProjectedGain = portfolioData.reduce((acc, row) => acc + (row.value * row.rate), 0);
    const blendedRate = (totalProjectedGain / totalValue) * 100;
    
    // --- নতুন: মাসিক ইনকাম গণনা ---
    const monthlyIncome = totalProjectedGain / 12;

    return (
        <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-gray-900 via-[#030712] to-gray-900">
            <div className="max-w-7xl mx-auto">

                {/* হেডার: Back বাটন এবং টাইটেল */}
                <header className="flex items-center justify-between mb-10">
                    <Link 
                        to="/"
                        className="flex items-center text-sm text-gray-400 hover:text-blue-400 transition-colors"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                        Back to Home
                    </Link>
                    
                    <div className="text-right">
                        <h1 className="text-3xl md:text-4xl font-bold text-white">Rahman Family Trust</h1>
                        <p className="text-md md:text-lg text-gray-400 mt-1">Global Wealth Dashboard</p>
                    </div>
                </header>

                {/* ডাইনামিক সামারি কার্ড (এটি উপরেই থাকছে) */}
                <div className="card p-6 md:p-8 mb-10 shadow-lg shadow-green-900/10 border border-gray-700/50">
                    <h2 className="text-xl font-semibold text-white mb-6">Global Portfolio Summary</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-gray-300">
                        <div className="card p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                            <div className="text-sm text-gray-400 mb-1">Total Portfolio Value</div>
                            <div className="text-2xl lg:text-3xl font-bold text-white">{formatCurrencyForTable(totalValue)}</div>
                        </div>
                        <div className="card p-4 bg-gray-800/50 border border-green-500/30 rounded-lg">
                            <div className="text-sm text-gray-400 mb-1">Projected Annual Gain</div>
                            <div className="text-2xl lg:text-3xl font-bold profit">{formatCurrencyWithSign(totalProjectedGain)}</div>
                        </div>
                        <div className="card p-4 bg-gray-800/50 border border-blue-500/30 rounded-lg">
                            <div className="text-sm text-gray-400 mb-1">Blended Growth Rate</div>
                            <div className="text-2xl lg:text-3xl font-bold text-white">{blendedRate.toFixed(2)}%</div>
                        </div>
                    </div>
                </div>

                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                        <div
                            className="relative w-full max-w-lg rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-xl"
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
                            <h3 className="text-xl font-semibold text-white">Edit Portfolio Allocation</h3>
                            <p className="mt-1 text-sm text-gray-400">Adjust the capital (in millions) and target rate for the selected PIC.</p>

                            <label className="mt-4 block text-sm font-medium text-gray-300" htmlFor="portfolio-value-input">
                                Portfolio Value (Millions USD)
                            </label>
                            <input
                                id="portfolio-value-input"
                                ref={inputRef}
                                type="number"
                                min="0"
                                step="0.01"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="mt-2 w-full rounded-md border border-blue-500 bg-gray-800 p-3 text-white outline-none focus:ring-2 focus:ring-blue-400"
                            />

                            <label className="mt-4 block text-sm font-medium text-gray-300" htmlFor="portfolio-rate-input">
                                Mandate Rate (%)
                            </label>
                            <input
                                id="portfolio-rate-input"
                                type="number"
                                step="0.1"
                                value={editRate}
                                onChange={(e) => setEditRate(e.target.value)}
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
                                    onClick={handleSave}
                                    className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                >
                                    <FiSave size={16} className="mr-2" />
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- Ownership Structure কার্ডটি এখান থেকে ডিলিট করা হয়েছে --- */}

                {/* ডাইনামিক টেবিল */}
                <div className="overflow-x-auto card shadow-lg shadow-green-900/10 border border-gray-700/50">
                    <table className="w-full text-sm text-left text-gray-300">
                        <thead className="text-xs text-gray-400 uppercase table-header-bg">
                            <tr>
                                <th scope="col" className="px-6 py-4 sticky-col">BVI PIC (Legal Owner)</th>
                                <th scope="col" className="px-6 py-4">Wealth Manager</th>
                                <th scope="col" className="px-6 py-4">Banking Location</th>
                                <th scope="col" className="px-6 py-4">Portfolio Value</th>
                                <th scope="col" className="px-6 py-4">Mandate (Rate)</th>
                                <th scope="col" className="px-6 py-4">Projected Gain</th>
                                <th scope="col" className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {portfolioData.map((row) => {
                                const isEditing = editRowId === row.id;
                                const projectedGain = row.value * row.rate;
                                const gainClass = projectedGain >= 0 ? 'profit' : 'loss';
                                let rowClass = 'border-b table-row-border transition-colors duration-200 hover:bg-gray-800/50';
                                if (isEditing) { rowClass += ' ring-2 ring-blue-400/60'; }

                                return (
                                    <tr key={row.id} className={rowClass}>
                                        <td className="px-6 py-4 font-medium text-gray-100 sticky-col">{row.pic}</td>
                                        <td className="px-6 py-4">{row.manager}</td>
                                        <td className="px-6 py-4">{row.location}</td>
                                        <td className="px-6 py-4">{formatMillions(row.value)}</td>
                                        
                                        {/* এডিটেবল সেল */}
                                        <td className="px-6 py-4">
                                            <span>{row.mandate} ({(row.rate * 100).toFixed(1)}%)</span>
                                        </td>
                                        
                                        {/* ডাইনামিক সেল */}
                                        <td className={`px-6 py-4 font-semibold ${gainClass}`}>{formatCurrencyWithSign(projectedGain)}</td>
                                        
                                        {/* অ্যাকশন বাটন */}
                                        <td className="px-6 py-4">
                                            <button onClick={() => handleEdit(row)} className="text-blue-400 hover:text-blue-300">
                                                <FiEdit2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                         {/* টেবিল ফুটার */}
                        <tfoot className="table-header-bg">
                            <tr>
                                <td colSpan="7" className="px-6 py-3">
                                    <div className="flex justify-between items-center">
                                        <button className="flex items-center text-sm text-gray-400 hover:text-white">
                                            <FiGrid className="mr-2" />
                                            Export to Sheets
                                        </button>
                                        <button className="text-sm text-gray-400 hover:text-white">
                                            <FiCopy />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* --- নতুন: ইনকাম সামারি কার্ড (শেষে) --- */}
                <div className="card p-6 md:p-8 mt-10 shadow-lg shadow-green-900/10 border border-gray-700/50">
                    <h2 className="text-xl font-semibold text-white mb-6">Estimated Income Figures</h2>
                    
                    {/* Annual Income */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-300 mb-1">💰 Annual Income</h3>
                        <p className="text-3xl font-bold text-white">
                            {formatCurrencyForTable(totalProjectedGain)}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                            (This is calculated as {blendedRate.toFixed(2)}% of your {formatCurrencyForTable(totalValue)} capital.)
                        </p>
                    </div>

                    {/* Monthly Income */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-300 mb-1">💰 Monthly Income</h3>
                        <p className="text-3xl font-bold text-white">
                            {formatCurrencyForTable(monthlyIncome)}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                            (This is the {formatCurrencyForTable(totalProjectedGain)} annual income divided by 12 months.)
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}
