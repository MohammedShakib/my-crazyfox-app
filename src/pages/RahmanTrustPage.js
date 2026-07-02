import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiEdit2, FiSave, FiXCircle, FiGrid, FiCopy } from 'react-icons/fi';
import LoadingScreen from '../components/LoadingScreen';
import BDTrustPage from './BDTrustPage';

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#ec4899'];

function DonutChart({ data, total }) {
  const radius = 54;
  const cx = 70;
  const cy = 70;
  const circumference = 2 * Math.PI * radius;
  let cumulativeFraction = 0;

  return (
    <svg viewBox="0 0 140 140" className="w-full h-full">
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#1f2937" strokeWidth="18" />
      {data.map((seg, i) => {
        const fraction = seg.value / total;
        const dash = fraction * circumference;
        const offset = -(cumulativeFraction * circumference);
        cumulativeFraction += fraction;
        return (
          <circle
            key={i}
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke={CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth="18"
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="butt"
          />
        );
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="white" fontSize="11" fontWeight="700">
        {data.length}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#9ca3af" fontSize="8">
        banks
      </text>
    </svg>
  );
}

function MandateChip({ mandate, rate }) {
  const m = mandate.toLowerCase();
  let cls = 'chip ';
  if (m.includes('stable'))     cls += 'chip-blue';
  else if (m.includes('balanced')) cls += 'chip-yellow';
  else if (m.includes('aggressive')) cls += 'chip-red';
  else cls += 'chip-gray';
  return <span className={cls}>{mandate} ({(rate * 100).toFixed(1)}%)</span>;
}

const RAHMAN_ENDPOINTS = {
    fetch: '/api/getRahmanTrustData',
    update: '/api/updateRahmanTrustData',
    add: '/api/addRahmanTrustEntry',
};

const mapRahmanFromApi = (doc) => ({
    id: Number(doc.id),
    pic: doc.pic ?? '',
    manager: doc.manager ?? '',
    location: doc.location ?? '',
    value: Number(doc.value ?? 0),
    rate: Number(doc.rate ?? 0),
    mandate: doc.mandate ?? ''
});

const mapRahmanToApi = (row) => ({
    id: row.id,
    pic: row.pic,
    manager: row.manager,
    location: row.location,
    value: row.value,
    rate: row.rate,
    mandate: row.mandate
});

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
    const [portfolioData, setPortfolioData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnnual, setIsAnnual] = useState(true);
    const [editRowId, setEditRowId] = useState(null);
    const [isAddMode, setIsAddMode] = useState(false);
    const [editPic, setEditPic] = useState('');
    const [editManager, setEditManager] = useState('');
    const [editLocation, setEditLocation] = useState('');
    const [editMandate, setEditMandate] = useState('Stable Growth');
    const [editRate, setEditRate] = useState('0');
    const [editValue, setEditValue] = useState('0');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTrust, setActiveTrust] = useState('international');
    const [errorMessage, setErrorMessage] = useState(null);
    const inputRef = useRef(null);

    useEffect(() => {
        let isMounted = true;

        const loadRahmanTrustData = async () => {
            try {
                const response = await fetch(RAHMAN_ENDPOINTS.fetch);
                if (!response.ok) {
                    throw new Error(`Failed to load Rahman Trust data: ${response.status}`);
                }
                const payload = await response.json();
                if (isMounted && Array.isArray(payload)) {
                    setPortfolioData(payload.map(mapRahmanFromApi));
                }
            } catch (error) {
                console.error('Unable to fetch Rahman Trust data from API', error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        loadRahmanTrustData();

        return () => {
            isMounted = false;
        };
    }, []);

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

    // --- এডিট/সেভ ফাংশন ---
    const resetEditState = () => {
        setEditRowId(null);
        setIsAddMode(false);
        setEditPic('');
        setEditManager('');
        setEditLocation('');
        setEditMandate('Stable Growth');
        setEditRate('0');
        setEditValue('0');
        setErrorMessage(null);
    };

    const handleEdit = (row) => {
        setEditRowId(row.id);
        setIsAddMode(false);
        setEditPic(row.pic);
        setEditManager(row.manager);
        setEditLocation(row.location);
        setEditMandate(row.mandate);
        setEditRate((row.rate * 100).toFixed(1));
        setEditValue((row.value / 1e6).toFixed(2));
        setErrorMessage(null);
        setIsModalOpen(true);
    };

    const handleOpenAdd = () => {
        resetEditState();
        setIsAddMode(true);
        setIsModalOpen(true);
    };

    const handleCancel = () => {
        setIsModalOpen(false);
        resetEditState();
    };

    const callApi = async (url, body) => {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const message = await response.text();
            throw new Error(message || `Request failed with status ${response.status}`);
        }
        const payload = await response.json();
        if (!Array.isArray(payload)) throw new Error('Unexpected response from Firebase.');
        return payload.map(mapRahmanFromApi);
    };

    const handleSave = async () => {
        const parsedRate = parseFloat(editRate);
        const parsedValueMillions = parseFloat(editValue);
        if (Number.isNaN(parsedRate) || Number.isNaN(parsedValueMillions) || !editPic.trim() || !editManager.trim() || !editLocation.trim()) {
            setErrorMessage('Please fill in all fields before saving.');
            return;
        }

        const newRate = parsedRate / 100;
        const newValue = parsedValueMillions * 1e6;

        setIsSaving(true);
        try {
            let normalized;
            if (isAddMode) {
                normalized = await callApi(RAHMAN_ENDPOINTS.add, {
                    pic: editPic.trim(),
                    manager: editManager.trim(),
                    location: editLocation.trim(),
                    mandate: editMandate,
                    value: newValue,
                    rate: newRate,
                });
            } else {
                normalized = await callApi(RAHMAN_ENDPOINTS.update, {
                    id: editRowId,
                    pic: editPic.trim(),
                    manager: editManager.trim(),
                    location: editLocation.trim(),
                    mandate: editMandate,
                    value: newValue,
                    rate: newRate,
                });
            }
            setPortfolioData(normalized);
            setIsModalOpen(false);
            resetEditState();
        } catch (error) {
            setErrorMessage(error.message || 'Failed to save. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleMandateCellClick = (row) => {
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
            void handleSave();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            handleCancel();
        }
    };

    const getLocationFlag = (location) => {
        switch (location) {
            case 'Switzerland':
                return '🇨🇭';
            case 'USA':
                return '🇺🇸';
            case 'France':
                return '🇫🇷';
            case 'UAE':
                return '🇦🇪';
            case 'Ireland':
                return '🇮🇪';
            case 'Singapore':
                return '🇸🇬';
            case 'Brazil':
                return '🇧🇷';
            default:
                return '🌐';
        }
    };

    // --- ডাইনামিক সামারি গণনা ---
    const totalValue = portfolioData.reduce((acc, row) => acc + row.value, 0);
    const totalProjectedGain = portfolioData.reduce((acc, row) => acc + (row.value * row.rate), 0);
    const blendedRate = (totalProjectedGain / totalValue) * 100;
    
    // --- নতুন: মাসিক ইনকাম গণনা ---
    const monthlyIncome = totalProjectedGain / 12;

    if (activeTrust === 'bangladesh') return <BDTrustPage onSwitch={setActiveTrust} />;

    if (isLoading) return <LoadingScreen title="Loading trust portfolio..." />;

    return (
        <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-gray-900 via-[#030712] to-gray-900">
            <div className="max-w-7xl mx-auto">

                {/* হেডার: Back বাটন এবং টাইটেল */}
                <header className="flex items-center justify-between mb-10 flex-wrap gap-4">
                    <Link
                        to="/"
                        className="flex items-center text-sm text-gray-400 hover:text-blue-400 transition-colors"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                        Back to Home
                    </Link>

                    <div className="flex flex-col items-end gap-3">
                        <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
                            <button
                                onClick={() => setActiveTrust('international')}
                                className="px-3 py-1.5 text-sm rounded-md font-medium bg-blue-600 text-white cursor-default"
                            >
                                🌍 International
                            </button>
                            <button
                                onClick={() => setActiveTrust('bangladesh')}
                                className="px-3 py-1.5 text-sm rounded-md font-medium text-gray-400 hover:text-white transition-colors"
                            >
                                🇧🇩 Bangladesh
                            </button>
                        </div>
                        <div className="text-right">
                            <h1 className="text-3xl md:text-4xl font-bold text-white">Rahman Family Trust</h1>
                            <p className="text-md md:text-lg text-gray-400 mt-1">Global Wealth Dashboard</p>
                        </div>
                    </div>
                </header>

                {/* ডাইনামিক সামারি কার্ড (এটি উপরেই থাকছে) */}
                <div className="card p-6 md:p-8 mb-10 shadow-lg shadow-green-900/10 border border-gray-700/50">
                    <h2 className="text-xl font-semibold text-white mb-6">Global Portfolio Summary</h2>
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Donut Chart */}
                        <div className="flex flex-col items-center justify-center gap-3 w-full md:w-40 shrink-0">
                            <div className="w-32 h-32">
                                <DonutChart
                                    data={portfolioData.map((r) => ({ value: r.value }))}
                                    total={totalValue}
                                />
                            </div>
                            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
                                {portfolioData.map((r, i) => (
                                    <span key={r.id} className="flex items-center gap-1 text-xs text-gray-400">
                                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                                        {r.manager}
                                    </span>
                                ))}
                            </div>
                        </div>
                        {/* Stats */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1 text-gray-300">
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
                </div>

                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                        <div
                            className="relative w-full max-w-lg rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-xl max-h-[90vh] overflow-y-auto"
                            onKeyDown={handleModalKeyDown}
                            tabIndex={-1}
                        >
                            <button type="button" onClick={handleCancel} className="absolute right-3 top-3 text-gray-400 transition-colors hover:text-red-400" aria-label="Cancel">
                                <FiXCircle size={20} />
                            </button>

                            <h3 className="text-xl font-semibold text-white">
                                {isAddMode ? 'Add New PIC Entry' : 'Edit Portfolio Entry'}
                            </h3>
                            <p className="mt-1 text-sm text-gray-400 mb-5">
                                {isAddMode ? 'Fill in the details for the new company.' : 'Update the details for this entry.'}
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">BVI PIC Name</label>
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        placeholder="e.g. Rahman Alpine Ltd."
                                        value={editPic}
                                        onChange={(e) => setEditPic(e.target.value)}
                                        className="w-full rounded-md border border-blue-500/50 bg-gray-800 p-3 text-white outline-none focus:ring-2 focus:ring-blue-400"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Wealth Manager</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Credit Suisse"
                                            value={editManager}
                                            onChange={(e) => setEditManager(e.target.value)}
                                            className="w-full rounded-md border border-blue-500/50 bg-gray-800 p-3 text-white outline-none focus:ring-2 focus:ring-blue-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Banking Location</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Switzerland"
                                            value={editLocation}
                                            onChange={(e) => setEditLocation(e.target.value)}
                                            className="w-full rounded-md border border-blue-500/50 bg-gray-800 p-3 text-white outline-none focus:ring-2 focus:ring-blue-400"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Mandate Type</label>
                                    <select
                                        value={editMandate}
                                        onChange={(e) => setEditMandate(e.target.value)}
                                        className="w-full rounded-md border border-blue-500/50 bg-gray-800 p-3 text-white outline-none focus:ring-2 focus:ring-blue-400"
                                    >
                                        <option value="Stable Growth">Stable Growth</option>
                                        <option value="Balanced Growth">Balanced Growth</option>
                                        <option value="Aggressive Growth">Aggressive Growth</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Portfolio Value <span className="text-gray-500">(Millions USD)</span></label>
                                        <input
                                            type="number" min="0" step="0.01"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className="w-full rounded-md border border-blue-500/50 bg-gray-800 p-3 text-white outline-none focus:ring-2 focus:ring-blue-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Mandate Rate <span className="text-gray-500">(%)</span></label>
                                        <input
                                            type="number" step="0.1"
                                            value={editRate}
                                            onChange={(e) => setEditRate(e.target.value)}
                                            className="w-full rounded-md border border-blue-500/50 bg-gray-800 p-3 text-white outline-none focus:ring-2 focus:ring-blue-400"
                                        />
                                    </div>
                                </div>
                            </div>

                            {errorMessage && <p className="mt-3 text-sm text-rose-300">{errorMessage}</p>}

                            <div className="mt-6 flex justify-end space-x-3">
                                <button type="button" onClick={handleCancel} className="rounded-md border border-gray-600 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800">
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {isSaving ? (
                                        <><svg className="mr-2 h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>Saving...</>
                                    ) : (
                                        <><FiSave size={16} className="mr-2" />{isAddMode ? 'Add Entry' : 'Save Changes'}</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- Ownership Structure কার্ডটি এখান থেকে ডিলিট করা হয়েছে --- */}

                {/* ডাইনামিক টেবিল */}
                <div className="card shadow-lg shadow-green-900/10 border border-gray-700/50 overflow-hidden md:overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-300">
                        <thead className="text-xs text-gray-400 uppercase table-header-bg">
                            <tr>
                                <th scope="col" className="px-3 py-3 sticky-col w-[34%] md:w-auto whitespace-normal break-words">BVI PIC (Legal Owner)</th>
                                <th scope="col" className="px-3 py-3 hidden md:table-cell whitespace-normal break-words">Wealth Manager</th>
                                <th scope="col" className="px-3 py-3 hidden md:table-cell whitespace-normal break-words">Banking Location</th>
                                <th scope="col" className="px-3 py-3 w-[28%] md:w-auto whitespace-normal break-words">Portfolio Value</th>
                                <th scope="col" className="px-3 py-3 hidden md:table-cell whitespace-normal break-words">Mandate (Rate)</th>
                                <th scope="col" className="px-3 py-3 w-[38%] md:w-auto whitespace-normal break-words">Projected Gain</th>
                                <th scope="col" className="px-3 py-3 hidden md:table-cell whitespace-normal break-words">Actions</th>
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
                                        <td className="px-4 py-3 font-medium text-gray-100 sticky-col whitespace-normal break-words">
                                            <div className="block md:hidden">
                                                <div>{row.pic}</div>
                                                <div className="text-sm text-gray-400">
                                                    {getLocationFlag(row.location)} {row.location}
                                                </div>
                                            </div>
                                            <div className="hidden md:block">
                                                {row.pic}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 hidden md:table-cell">{row.manager}</td>
                                        <td className="px-4 py-3 hidden md:table-cell">{row.location}</td>
                                        <td
                                            className={`px-4 py-3 whitespace-normal break-words ${isMobile ? 'cursor-pointer' : ''}`}
                                            onClick={() => {
                                                if (isMobile) {
                                                    handleEdit(row);
                                                }
                                            }}
                                            role={isMobile ? 'button' : undefined}
                                            tabIndex={isMobile ? 0 : -1}
                                        >
                                            {formatMillions(row.value)}
                                        </td>
                                        
                                        <td className="px-4 py-3 hidden md:table-cell">
                                            <MandateChip mandate={row.mandate} rate={row.rate} />
                                        </td>
                                        
                                        {/* ডাইনামিক সেল */}
                                        <td className={`px-4 py-3 whitespace-normal break-words font-semibold ${gainClass}`}>
                                            <div>{formatCurrencyWithSign(projectedGain)}</div>
                                            <div className="text-xs text-gray-400 md:hidden">({(row.rate * 100).toFixed(1)}%)</div>
                                        </td>
                                        
                                        {/* অ্যাকশন বাটন */}
                                        <td className="px-4 py-3 hidden md:table-cell">
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
                                        <div className="flex items-center gap-4">
                                            <button className="flex items-center text-sm text-gray-400 hover:text-white transition-colors">
                                                <FiGrid className="mr-2" />
                                                Export to Sheets
                                            </button>
                                        </div>
                                        <button
                                            onClick={handleOpenAdd}
                                            className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                                            Add New PIC
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* --- নতুন: ইনকাম সামারি কার্ড (শেষে) --- */}
                <div className="card p-6 md:p-8 mt-10 shadow-lg shadow-green-900/10 border border-gray-700/50">
                    <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                        <h2 className="text-xl font-semibold text-white">Estimated Income Figures</h2>
                        {/* Toggle */}
                        <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
                            <button
                                onClick={() => setIsAnnual(true)}
                                className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${isAnnual ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                Annual
                            </button>
                            <button
                                onClick={() => setIsAnnual(false)}
                                className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${!isAnnual ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                Monthly
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <p className="text-sm text-gray-400 mb-1">{isAnnual ? 'Annual' : 'Monthly'} Income</p>
                            <p className="text-4xl font-bold text-white">
                                {formatCurrencyForTable(isAnnual ? totalProjectedGain : monthlyIncome)}
                            </p>
                            <p className="text-sm text-gray-500 mt-2">
                                {isAnnual
                                    ? `${blendedRate.toFixed(2)}% of ${formatCurrencyForTable(totalValue)} capital`
                                    : `${formatCurrencyForTable(totalProjectedGain)} annual ÷ 12 months`}
                            </p>
                        </div>
                        <div className="flex flex-col justify-center gap-2">
                            <div className="flex justify-between text-sm border-b border-gray-700/50 pb-2">
                                <span className="text-gray-400">Annual</span>
                                <span className="text-white font-semibold">{formatCurrencyForTable(totalProjectedGain)}</span>
                            </div>
                            <div className="flex justify-between text-sm border-b border-gray-700/50 pb-2">
                                <span className="text-gray-400">Monthly</span>
                                <span className="text-white font-semibold">{formatCurrencyForTable(monthlyIncome)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Weekly (est.)</span>
                                <span className="text-white font-semibold">{formatCurrencyForTable(totalProjectedGain / 52)}</span>
                            </div>
                        </div>
                    </div>
                </div>

            {isSaving && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
                    <div className="flex flex-col items-center space-y-3 text-sky-100">
                        <div className="h-16 w-16 rounded-full border-4 border-sky-200 border-t-sky-500 animate-spin" aria-hidden="true" />
                        <span className="text-sm font-medium tracking-wide">Syncing with Firebase&hellip;</span>
                    </div>
                </div>
            )}

            </div>
        </div>
    );
}





