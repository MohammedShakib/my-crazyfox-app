import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FiEdit2, FiTrash2, FiXCircle, FiSave, FiChevronRight, FiChevronDown } from 'react-icons/fi';
import LoadingScreen from '../components/LoadingScreen';

const formatCr = (bdt) => `${(bdt / 1e7).toFixed(2)} Cr`;
const numCr = (bdt) => (bdt / 1e7).toFixed(2);

const BD_EP = {
  portfolio:      '/api/getBDTrustPortfolio',
  simulationConfig: '/api/getBDTrustSimulationConfig',
  updateSimulationConfig: '/api/updateBDTrustSimulationConfig',
  addPortfolio:   '/api/addBDTrustPortfolioEntry',
  updatePortfolio:'/api/updateBDTrustPortfolioEntry',
  deletePortfolio:'/api/deleteBDTrustPortfolioEntry',
  beneficiaries:  '/api/getBDTrustBeneficiaries',
  addBeneficiary: '/api/addBDTrustBeneficiary',
  updateBeneficiary: '/api/updateBDTrustBeneficiary',
  deleteBeneficiary: '/api/deleteBDTrustBeneficiary',
  deposit:        '/api/addBDTrustDeposit',
  addMember:      '/api/addBDTrustBeneficiaryMember',
  updateMember:   '/api/updateBDTrustBeneficiaryMember',
  deleteMember:   '/api/deleteBDTrustBeneficiaryMember',
};

const CATEGORY_CONFIG = {
  bond:           { label: 'Gov Bond',       cls: 'chip chip-blue' },
  fdr:            { label: 'FDR',            cls: 'chip chip-green' },
  real_estate:    { label: 'Real Estate',    cls: 'chip chip-yellow' },
  capital_market: { label: 'Capital Market', cls: 'chip chip-red' },
};

const BENEFICIARY_CONFIG = {
  family:   { label: 'Family',   cls: 'chip chip-blue' },
  ngo:      { label: 'NGO',      cls: 'chip chip-green' },
  donation: { label: 'Donation', cls: 'chip chip-yellow' },
};

const CHART_COLORS = {
  bond: '#3b82f6', fdr: '#22c55e', real_estate: '#f59e0b', capital_market: '#ef4444',
};
const SIMULATION_YEAR_OPTIONS = [5, 10, 20];
const DEFAULT_SIMULATION_YEARS = 10;
const DEFAULT_PAYOUT_MODE = 'growing';
const DEFAULT_PAYOUT_GROWTH_RATE = '10';
const BD_TRUST_INJECTION_PLANS_STORAGE_KEY = 'bd-trust-yearly-injection-plans';
const DEFAULT_INJECTION_PERCENT_BY_CATEGORY = {
  bond: '50',
  fdr: '20',
  capital_market: '30',
};

// Returns effective monthly payout in lakh (sum of active members if any, else direct value)
const getEffectivePayout = (ben) => {
  if (!ben.members || ben.members.length === 0) return ben.monthly_payout_lakh;
  return ben.members.filter((m) => m.active !== false).reduce((s, m) => s + m.monthly_payout_lakh, 0);
};

const buildDefaultInjectionPercentDraft = (assets) => {
  const assignedCategories = new Set();
  return assets.reduce((draft, asset) => {
    if (!assignedCategories.has(asset.category) && DEFAULT_INJECTION_PERCENT_BY_CATEGORY[asset.category]) {
      draft[asset.id] = DEFAULT_INJECTION_PERCENT_BY_CATEGORY[asset.category];
      assignedCategories.add(asset.category);
    } else {
      draft[asset.id] = '';
    }
    return draft;
  }, {});
};

const readStoredYearlyInjectionPlans = () => {
  if (typeof window === 'undefined') return {};
  try {
    const rawValue = window.localStorage.getItem(BD_TRUST_INJECTION_PLANS_STORAGE_KEY);
    if (!rawValue) return {};
    const parsedValue = JSON.parse(rawValue);
    return parsedValue && typeof parsedValue === 'object' ? parsedValue : {};
  } catch (error) {
    console.error('Unable to read stored BD Trust injection plans:', error);
    return {};
  }
};

const sanitizeYearlyInjectionPlans = (plans, assets) => {
  const validAssetIds = new Set(assets.map((asset) => String(asset.id)));
  return Object.entries(plans || {}).reduce((nextPlans, [year, plan]) => {
    if (!plan || typeof plan !== 'object') return nextPlans;
    const filteredPlan = Object.entries(plan).reduce((nextPlan, [assetId, amount]) => {
      const normalizedAmount = Number(amount);
      if (validAssetIds.has(String(assetId)) && Number.isFinite(normalizedAmount) && normalizedAmount > 0) {
        nextPlan[assetId] = normalizedAmount;
      }
      return nextPlan;
    }, {});
    if (Object.keys(filteredPlan).length > 0) {
      nextPlans[year] = filteredPlan;
    }
    return nextPlans;
  }, {});
};

const buildYearlySimulation = ({ portfolio, trustTaxRate, baseAnnualPayout, payoutGrowthRate, annualInjectionPlansByYear, years }) => {
  const simulation = [];
  let assetBalances = portfolio.map((asset) => ({
    id: asset.id,
    asset_class: asset.asset_class,
    institution: asset.institution,
    category: asset.category,
    rate: asset.rate,
    tax_rate: asset.tax_rate,
    amount_bdt: asset.amount_bdt,
  }));

  for (let year = 1; year <= years; year += 1) {
    const yearPlan = annualInjectionPlansByYear[year] || {};
    const assetBreakdown = assetBalances.map((asset) => {
      const injectionAmount = yearPlan[asset.id] || 0;
      return {
        ...asset,
        openingAmount: asset.amount_bdt,
        injectionAmount,
        investedAmount: asset.amount_bdt + injectionAmount,
      };
    });
    const openingBalance = assetBreakdown.reduce((sum, asset) => sum + asset.openingAmount, 0);
    const injectionAmount = assetBreakdown.reduce((sum, asset) => sum + asset.injectionAmount, 0);
    const investedBalance = assetBreakdown.reduce((sum, asset) => sum + asset.investedAmount, 0);
    const annualPayout = baseAnnualPayout * ((1 + payoutGrowthRate) ** (year - 1));
    const annualGrossIncome = assetBreakdown.reduce((sum, asset) => sum + (asset.investedAmount * asset.rate), 0);
    const annualTax = annualGrossIncome * trustTaxRate;
    const annualNetIncome = annualGrossIncome - annualTax;
    const monthlyNetProfit = annualNetIncome / 12;
    const projectedReinvestment = annualNetIncome - annualPayout;
    const projectedClosingBalance = investedBalance + projectedReinvestment;
    const closingBalance = Math.max(0, projectedClosingBalance);
    const annualReinvestment = closingBalance - investedBalance;
    const closingAssets = investedBalance > 0
      ? assetBreakdown.map((asset) => ({
          ...asset,
          closingAmount: asset.investedAmount + (annualReinvestment * asset.investedAmount) / investedBalance,
        }))
      : assetBreakdown.map((asset) => ({ ...asset, closingAmount: 0 }));

    simulation.push({
      year,
      openingBalance,
      injectionAmount,
      investedBalance,
      annualGrossIncome,
      annualTax,
      annualNetIncome,
      monthlyNetProfit,
      annualPayout,
      annualReinvestment,
      closingBalance,
      assetBreakdown: closingAssets,
    });

    assetBalances = closingAssets.map((asset) => ({
      id: asset.id,
      asset_class: asset.asset_class,
      institution: asset.institution,
      category: asset.category,
      rate: asset.rate,
      tax_rate: asset.tax_rate,
      amount_bdt: asset.closingAmount,
    }));
  }

  return simulation;
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function DonutChart({ slices }) {
  const radius = 54, cx = 70, cy = 70;
  const circumference = 2 * Math.PI * radius;
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total === 0) return null;
  let cumFrac = 0;
  return (
    <svg viewBox="0 0 140 140" className="w-full h-full">
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#1f2937" strokeWidth="20" />
      {slices.map((sl, i) => {
        const frac = sl.value / total;
        const dash = frac * circumference;
        const offset = -(cumFrac * circumference);
        cumFrac += frac;
        return (
          <circle key={i} cx={cx} cy={cy} r={radius} fill="none"
            stroke={sl.color} strokeWidth="20"
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="butt"
          />
        );
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize="13" fontWeight="700">
        {numCr(total)}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#9ca3af" fontSize="9">Cr BDT</text>
    </svg>
  );
}

function StatCard({ label, value, subValue, color }) {
  return (
    <div className="card p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color || 'text-white'}`}>{value}</div>
      {subValue && <div className="text-xs text-gray-500 mt-1">{subValue}</div>}
    </div>
  );
}

function FlowRow({ label, amount_bdt, subLabel, colorClass, indent }) {
  return (
    <div className={`flex items-center justify-between py-2.5 border-b border-gray-700/50 ${indent ? 'pl-6' : ''}`}>
      <span className="flex items-center gap-1.5 text-sm text-gray-300">
        {indent && <span className="text-gray-600 text-xs">└</span>}
        {label}
        {subLabel && <span className="text-xs text-gray-500">{subLabel}</span>}
      </span>
      <span className={`text-sm font-semibold ${colorClass || 'text-white'}`}>{formatCr(Math.abs(amount_bdt))}</span>
    </div>
  );
}

function MInput({ label, hint, type = 'text', value, onChange, placeholder, step, min }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">
        {label} {hint && <span className="text-gray-500 font-normal">{hint}</span>}
      </label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} step={step} min={min}
        className="w-full rounded-md border border-blue-500/50 bg-gray-800 p-3 text-white outline-none focus:ring-2 focus:ring-blue-400" />
    </div>
  );
}

function ModalWrapper({ title, subtitle, onClose, children, error, onSave, saving, saveLabel, maxWidthClass = 'max-w-lg' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className={`relative w-full ${maxWidthClass} rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-xl max-h-[90vh] overflow-y-auto`}>
        <button type="button" onClick={onClose} className="absolute right-3 top-3 text-gray-400 hover:text-red-400 transition-colors">
          <FiXCircle size={20} />
        </button>
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-gray-400 mb-5">{subtitle}</p>}
        <div className="space-y-4 mt-4">{children}</div>
        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose}
            className="rounded-md border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors">
            Cancel
          </button>
          <button type="button" onClick={onSave} disabled={saving}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors disabled:opacity-70 disabled:cursor-not-allowed">
            {saving
              ? <><svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>Saving...</>
              : <><FiSave size={16} className="mr-2" />{saveLabel || 'Save Changes'}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────────

export default function BDTrustPage({ onSwitch }) {
  const [portfolio, setPortfolio] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedBenId, setExpandedBenId] = useState(null);
  const [simulationYears, setSimulationYears] = useState(DEFAULT_SIMULATION_YEARS);
  const [payoutMode, setPayoutMode] = useState(DEFAULT_PAYOUT_MODE);
  const [payoutGrowthInput, setPayoutGrowthInput] = useState(DEFAULT_PAYOUT_GROWTH_RATE);
  const [yearlyInjectionPlans, setYearlyInjectionPlans] = useState(() => readStoredYearlyInjectionPlans());
  const [hasLoadedSimulationConfig, setHasLoadedSimulationConfig] = useState(false);
  const [injectionModalYear, setInjectionModalYear] = useState(null);
  const [injectionInputMode, setInjectionInputMode] = useState('manual');
  const [injectionDraft, setInjectionDraft] = useState({});
  const [injectionPercentDraft, setInjectionPercentDraft] = useState({});
  const [injectionTotalDraft, setInjectionTotalDraft] = useState('');
  const [injectionError, setInjectionError] = useState('');

  // Portfolio modal
  const [pModal, setPModal] = useState(null);
  const [pAssetClass, setPAssetClass] = useState('');
  const [pInstitution, setPInstitution] = useState('');
  const [pCategory, setPCategory] = useState('bond');
  const [pAmountCr, setPAmountCr] = useState('');
  const [pRate, setPRate] = useState('');
  const [pTaxRate, setPTaxRate] = useState('');
  const [pError, setPError] = useState('');

  // Beneficiary (group) modal
  const [bModal, setBModal] = useState(null);
  const [bName, setBName] = useState('');
  const [bType, setBType] = useState('family');
  const [bActive, setBActive] = useState(true);
  const [bError, setBError] = useState('');

  // Member modal
  const [mModal, setMModal] = useState(null); // null | { mode: 'add'|'edit', parentId, member? }
  const [mName, setMName] = useState('');
  const [mPayout, setMPayout] = useState('');
  const [mActive, setMActive] = useState(true);
  const [mError, setMError] = useState('');

  // Deposit modal
  const [dModal, setDModal] = useState(false);
  const [dAssetId, setDAssetId] = useState('');
  const [dAmountCr, setDAmountCr] = useState('');
  const [dNote, setDNote] = useState('');
  const [dError, setDError] = useState('');

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [portfolioResult, beneficiariesResult, simulationConfigResult] = await Promise.allSettled([
        fetch(BD_EP.portfolio),
        fetch(BD_EP.beneficiaries),
        fetch(BD_EP.simulationConfig),
      ]);

      if (portfolioResult.status === 'fulfilled' && portfolioResult.value.ok) {
        setPortfolio(await portfolioResult.value.json());
      }
      if (beneficiariesResult.status === 'fulfilled' && beneficiariesResult.value.ok) {
        setBeneficiaries(await beneficiariesResult.value.json());
      }
      if (simulationConfigResult.status === 'fulfilled' && simulationConfigResult.value.ok) {
        const config = await simulationConfigResult.value.json();
        if (config) {
          setSimulationYears(Number(config.simulationYears) || DEFAULT_SIMULATION_YEARS);
          setPayoutMode(config.payoutMode === 'fixed' ? 'fixed' : DEFAULT_PAYOUT_MODE);
          setPayoutGrowthInput(config.payoutGrowthInput !== undefined ? String(config.payoutGrowthInput) : DEFAULT_PAYOUT_GROWTH_RATE);
          setYearlyInjectionPlans(config.yearlyInjectionPlans && typeof config.yearlyInjectionPlans === 'object' ? config.yearlyInjectionPlans : {});
        }
      }
    } catch (e) {
      console.error('BD Trust fetch error:', e);
    } finally {
      setHasLoadedSimulationConfig(true);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (portfolio.length === 0) return;
    setYearlyInjectionPlans((current) => {
      const sanitizedPlans = sanitizeYearlyInjectionPlans(current, portfolio);
      return JSON.stringify(current) === JSON.stringify(sanitizedPlans) ? current : sanitizedPlans;
    });
  }, [portfolio]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(BD_TRUST_INJECTION_PLANS_STORAGE_KEY, JSON.stringify(yearlyInjectionPlans));
    } catch (error) {
      console.error('Unable to store BD Trust injection plans:', error);
    }
  }, [yearlyInjectionPlans]);

  // Computed — 24% flat AOP trust tax (Bangladesh tax law for Association of Persons)
  useEffect(() => {
    if (!hasLoadedSimulationConfig) return undefined;
    const timeoutId = window.setTimeout(async () => {
      try {
        await fetch(BD_EP.updateSimulationConfig, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            simulationYears,
            payoutMode,
            payoutGrowthInput,
            yearlyInjectionPlans,
          }),
        });
      } catch (error) {
        console.error('Unable to persist BD Trust simulation config:', error);
      }
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [hasLoadedSimulationConfig, simulationYears, payoutMode, payoutGrowthInput, yearlyInjectionPlans]);

  const TRUST_TAX_RATE = 0.24;
  const totalBDT        = portfolio.reduce((s, r) => s + r.amount_bdt, 0);
  const monthlyGross    = portfolio.reduce((s, r) => s + (r.amount_bdt * r.rate / 12), 0);
  const monthlySourceTax = portfolio.reduce((s, r) => s + (r.amount_bdt * r.rate * r.tax_rate / 12), 0);
  const monthlyTrustTax  = monthlyGross * TRUST_TAX_RATE;
  const additionalTax    = Math.max(0, monthlyTrustTax - monthlySourceTax);
  const monthlyTax       = monthlyTrustTax; // total = 24% of gross
  const monthlyNet       = monthlyGross - monthlyTax;
  const grossYieldRate   = totalBDT > 0 ? portfolio.reduce((s, r) => s + r.amount_bdt * r.rate, 0) / totalBDT : 0;
  const blendedYield     = grossYieldRate * 100;

  const activeBens     = beneficiaries.filter((b) => b.active !== false);
  const familyPayout   = activeBens.filter((b) => b.type === 'family').reduce((s, b) => s + getEffectivePayout(b) * 1e5, 0);
  const ngoPayout      = activeBens.filter((b) => b.type === 'ngo').reduce((s, b) => s + getEffectivePayout(b) * 1e5, 0);
  const donationPayout = activeBens.filter((b) => b.type === 'donation').reduce((s, b) => s + getEffectivePayout(b) * 1e5, 0);
  const totalPayout    = familyPayout + ngoPayout + donationPayout;
  const reinvestment   = monthlyNet - totalPayout;
  const payoutRatio    = monthlyNet > 0 ? (totalPayout / monthlyNet) * 100 : 0;
  const annualPayout   = totalPayout * 12;
  const annualNetIncome = monthlyNet * 12;
  const parsedPayoutGrowth = Number.parseFloat(payoutGrowthInput);
  const payoutGrowthRate = payoutMode === 'growing' && Number.isFinite(parsedPayoutGrowth) && parsedPayoutGrowth > 0
    ? parsedPayoutGrowth / 100
    : 0;
  const yearlySimulation = buildYearlySimulation({
    portfolio,
    trustTaxRate: TRUST_TAX_RATE,
    baseAnnualPayout: annualPayout,
    payoutGrowthRate,
    annualInjectionPlansByYear: yearlyInjectionPlans,
    years: simulationYears,
  });
  const finalSimulationYear = yearlySimulation[yearlySimulation.length - 1];
  const cumulativeReinvestment = yearlySimulation.reduce((sum, row) => sum + row.annualReinvestment, 0);
  const totalInjectedCapital = yearlySimulation.reduce((sum, row) => sum + row.injectionAmount, 0);
  const finalPortfolioGain = (finalSimulationYear?.closingBalance || 0) - totalBDT - totalInjectedCapital;
  const contributionBase = totalBDT + totalInjectedCapital;
  const finalPortfolioGainPct = contributionBase > 0 ? (finalPortfolioGain / contributionBase) * 100 : 0;
  const activeInjectionModalRow = injectionModalYear ? yearlySimulation.find((row) => row.year === injectionModalYear) : null;
  const injectionDraftTotal = portfolio.reduce((sum, asset) => {
    const parsedValue = Number.parseFloat(injectionDraft[asset.id] ?? '');
    return sum + (Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue * 1e7 : 0);
  }, 0);
  const parsedInjectionTotalDraft = Number.parseFloat(injectionTotalDraft);
  const percentageTotalInjection = Number.isFinite(parsedInjectionTotalDraft) && parsedInjectionTotalDraft > 0 ? parsedInjectionTotalDraft * 1e7 : 0;
  const injectionPercentSum = portfolio.reduce((sum, asset) => {
    const parsedValue = Number.parseFloat(injectionPercentDraft[asset.id] ?? '');
    return sum + (Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0);
  }, 0);
  const percentageAllocationTotal = portfolio.reduce((sum, asset) => {
    const parsedValue = Number.parseFloat(injectionPercentDraft[asset.id] ?? '');
    return sum + (Number.isFinite(parsedValue) && parsedValue > 0 ? (percentageTotalInjection * parsedValue) / 100 : 0);
  }, 0);

  const postApi = async (url, body) => {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error((await res.text()) || `Request failed: ${res.status}`);
    return res.json();
  };

  // ── Portfolio handlers ──
  const openAddPortfolio = () => {
    setPAssetClass(''); setPInstitution(''); setPCategory('bond'); setPAmountCr(''); setPRate(''); setPTaxRate(''); setPError('');
    setPModal('add');
  };
  const openEditPortfolio = (row) => {
    setPAssetClass(row.asset_class); setPInstitution(row.institution); setPCategory(row.category);
    setPAmountCr(numCr(row.amount_bdt)); setPRate((row.rate * 100).toFixed(2)); setPTaxRate((row.tax_rate * 100).toFixed(1));
    setPError(''); setPModal(row);
  };
  const savePortfolio = async () => {
    const amountBdt = parseFloat(pAmountCr) * 1e7;
    const rate = parseFloat(pRate) / 100;
    const taxRate = parseFloat(pTaxRate) / 100;
    if (!pAssetClass.trim() || !pInstitution.trim() || isNaN(amountBdt) || isNaN(rate) || isNaN(taxRate)) { setPError('Please fill in all fields correctly.'); return; }
    setSaving(true);
    try {
      const body = { asset_class: pAssetClass.trim(), institution: pInstitution.trim(), category: pCategory, amount_bdt: amountBdt, rate, tax_rate: taxRate };
      setPortfolio(pModal === 'add' ? await postApi(BD_EP.addPortfolio, body) : await postApi(BD_EP.updatePortfolio, { id: pModal.id, ...body }));
      setPModal(null);
    } catch (e) { setPError(e.message); }
    finally { setSaving(false); }
  };
  const deletePortfolio = async (id) => {
    if (!window.confirm('Remove this asset from the portfolio?')) return;
    setSaving(true);
    try {
      setPortfolio(await postApi(BD_EP.deletePortfolio, { id }));
      setYearlyInjectionPlans((current) => {
        const next = {};
        Object.entries(current).forEach(([year, plan]) => {
          const filtered = Object.fromEntries(Object.entries(plan).filter(([assetId]) => Number(assetId) !== id));
          if (Object.keys(filtered).length > 0) next[year] = filtered;
        });
        return next;
      });
    }
    catch (e) { console.error(e); }
    finally { setSaving(false); }
  };
  const openInjectionEditor = (year) => {
    const currentPlan = yearlyInjectionPlans[year] || {};
    const nextDraft = {};
    const nextPercentDraft = {};
    const defaultPercentDraft = buildDefaultInjectionPercentDraft(portfolio);
    const totalPlannedBdt = Object.values(currentPlan).reduce((sum, value) => sum + value, 0);
    portfolio.forEach((asset) => {
      const plannedAmount = currentPlan[asset.id] || 0;
      nextDraft[asset.id] = plannedAmount > 0 ? (plannedAmount / 1e7).toFixed(2) : '';
      nextPercentDraft[asset.id] = totalPlannedBdt > 0 ? ((plannedAmount / totalPlannedBdt) * 100).toFixed(2) : defaultPercentDraft[asset.id];
    });
    setInjectionInputMode('manual');
    setInjectionDraft(nextDraft);
    setInjectionPercentDraft(nextPercentDraft);
    setInjectionTotalDraft(totalPlannedBdt > 0 ? (totalPlannedBdt / 1e7).toFixed(2) : '');
    setInjectionError('');
    setInjectionModalYear(year);
  };
  const closeInjectionEditor = () => {
    setInjectionModalYear(null);
    setInjectionInputMode('manual');
    setInjectionDraft({});
    setInjectionPercentDraft({});
    setInjectionTotalDraft('');
    setInjectionError('');
  };
  const updateInjectionDraft = (assetId, value) => {
    setInjectionDraft((current) => ({ ...current, [assetId]: value }));
    setInjectionError('');
  };
  const updateInjectionPercentDraft = (assetId, value) => {
    setInjectionPercentDraft((current) => ({ ...current, [assetId]: value }));
    setInjectionError('');
  };
  const switchInjectionMode = (mode) => {
    if (mode === injectionInputMode) return;
    if (mode === 'percentage') {
      const nextTotalCr = injectionDraftTotal > 0 ? (injectionDraftTotal / 1e7).toFixed(2) : injectionTotalDraft;
      const nextPercentDraft = injectionDraftTotal > 0
        ? portfolio.reduce((draft, asset) => {
            const parsedValue = Number.parseFloat(injectionDraft[asset.id] ?? '');
            draft[asset.id] = Number.isFinite(parsedValue) && parsedValue > 0
              ? ((parsedValue * 1e7 * 100) / injectionDraftTotal).toFixed(2)
              : '';
            return draft;
          }, {})
        : buildDefaultInjectionPercentDraft(portfolio);
      setInjectionPercentDraft(nextPercentDraft);
      setInjectionTotalDraft(nextTotalCr);
    } else {
      const nextDraft = {};
      portfolio.forEach((asset) => {
        const parsedPercent = Number.parseFloat(injectionPercentDraft[asset.id] ?? '');
        const allocatedBdt = Number.isFinite(parsedPercent) && parsedPercent > 0 ? (percentageTotalInjection * parsedPercent) / 100 : 0;
        nextDraft[asset.id] = allocatedBdt > 0 ? (allocatedBdt / 1e7).toFixed(2) : '';
      });
      setInjectionDraft(nextDraft);
    }
    setInjectionInputMode(mode);
    setInjectionError('');
  };
  const saveInjectionPlan = () => {
    const nextPlan = {};
    if (injectionInputMode === 'manual') {
      portfolio.forEach((asset) => {
        const parsedValue = Number.parseFloat(injectionDraft[asset.id] ?? '');
        if (Number.isFinite(parsedValue) && parsedValue > 0) {
          nextPlan[asset.id] = parsedValue * 1e7;
        }
      });
    } else {
      if (percentageTotalInjection <= 0) {
        setInjectionError('Enter a total injection amount first.');
        return;
      }
      if (Math.abs(injectionPercentSum - 100) > 0.05) {
        setInjectionError('Percentage allocations must add up to 100%.');
        return;
      }
      portfolio.forEach((asset) => {
        const parsedPercent = Number.parseFloat(injectionPercentDraft[asset.id] ?? '');
        if (Number.isFinite(parsedPercent) && parsedPercent > 0) {
          nextPlan[asset.id] = (percentageTotalInjection * parsedPercent) / 100;
        }
      });
    }
    setYearlyInjectionPlans((current) => {
      const next = { ...current };
      if (Object.keys(nextPlan).length > 0) next[injectionModalYear] = nextPlan;
      else delete next[injectionModalYear];
      return next;
    });
    closeInjectionEditor();
  };
  const clearYearlyInjections = () => {
    setYearlyInjectionPlans({});
  };

  // ── Beneficiary group handlers ──
  const openAddBeneficiary = () => { setBName(''); setBType('family'); setBActive(true); setBError(''); setBModal('add'); };
  const openEditBeneficiary = (row) => { setBName(row.name); setBType(row.type); setBActive(row.active !== false); setBError(''); setBModal(row); };
  const saveBeneficiary = async () => {
    if (!bName.trim()) { setBError('Please enter a name.'); return; }
    setSaving(true);
    try {
      const body = { name: bName.trim(), type: bType, monthly_payout_lakh: 0, active: bActive };
      setBeneficiaries(bModal === 'add' ? await postApi(BD_EP.addBeneficiary, body) : await postApi(BD_EP.updateBeneficiary, { id: bModal.id, name: bName.trim(), type: bType, active: bActive }));
      setBModal(null);
    } catch (e) { setBError(e.message); }
    finally { setSaving(false); }
  };
  const deleteBeneficiary = async (id) => {
    if (!window.confirm('Remove this group and all its members?')) return;
    setSaving(true);
    try { setBeneficiaries(await postApi(BD_EP.deleteBeneficiary, { id })); }
    catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  // ── Member handlers ──
  const openAddMember = (parentId) => {
    setMName(''); setMPayout(''); setMActive(true); setMError('');
    setMModal({ mode: 'add', parentId });
  };
  const openEditMember = (parentId, member) => {
    setMName(member.name); setMPayout(String(member.monthly_payout_lakh)); setMActive(member.active !== false); setMError('');
    setMModal({ mode: 'edit', parentId, member });
  };
  const saveMember = async () => {
    const payout = parseFloat(mPayout);
    if (!mName.trim() || isNaN(payout) || payout < 0) { setMError('Please fill in all fields correctly.'); return; }
    setSaving(true);
    try {
      if (mModal.mode === 'add') {
        setBeneficiaries(await postApi(BD_EP.addMember, { beneficiary_id: mModal.parentId, name: mName.trim(), monthly_payout_lakh: payout, active: mActive }));
      } else {
        setBeneficiaries(await postApi(BD_EP.updateMember, { beneficiary_id: mModal.parentId, member_id: mModal.member.id, name: mName.trim(), monthly_payout_lakh: payout, active: mActive }));
      }
      setMModal(null);
    } catch (e) { setMError(e.message); }
    finally { setSaving(false); }
  };
  const deleteMember = async (parentId, memberId) => {
    if (!window.confirm('Remove this member?')) return;
    setSaving(true);
    try { setBeneficiaries(await postApi(BD_EP.deleteMember, { beneficiary_id: parentId, member_id: memberId })); }
    catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  // ── Deposit handlers ──
  const openDeposit = () => { setDAssetId(portfolio[0]?.id ?? ''); setDAmountCr(''); setDNote(''); setDError(''); setDModal(true); };
  const saveDeposit = async () => {
    const amount = parseFloat(dAmountCr) * 1e7;
    if (!dAssetId || isNaN(amount) || amount <= 0) { setDError('Please fill in all fields correctly.'); return; }
    setSaving(true);
    try { setPortfolio(await postApi(BD_EP.deposit, { asset_id: Number(dAssetId), amount_bdt: amount, note: dNote })); setDModal(false); }
    catch (e) { setDError(e.message); }
    finally { setSaving(false); }
  };

  if (isLoading) return <LoadingScreen title="Loading BD Trust data..." />;

  const donutSlices = portfolio.map((r) => ({ value: r.amount_bdt, color: CHART_COLORS[r.category] || '#9ca3af' }));

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-gray-900 via-[#030712] to-gray-900">
      <div className="max-w-7xl mx-auto flex flex-col">

        {/* ── Header ── */}
        <header className="flex items-center justify-between mb-10 flex-wrap gap-4">
          <Link to="/" className="flex items-center text-sm text-gray-400 hover:text-blue-400 transition-colors">
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            Back to Home
          </Link>
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
              <button onClick={() => onSwitch && onSwitch('international')}
                className="px-3 py-1.5 text-sm rounded-md font-medium text-gray-400 hover:text-white transition-colors">
                🌍 International
              </button>
              <button className="px-3 py-1.5 text-sm rounded-md font-medium bg-green-700 text-white cursor-default">
                🇧🇩 Bangladesh
              </button>
            </div>
            <div className="text-right">
              <h1 className="text-3xl md:text-4xl font-bold text-white">Rahman Family Trust</h1>
              <p className="text-md text-gray-400 mt-1">Bangladesh Portfolio Dashboard</p>
            </div>
          </div>
        </header>

        {/* ── Hero Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Portfolio"     value={formatCr(totalBDT)}   subValue="BDT" />
          <StatCard label="Monthly Net Income"  value={formatCr(monthlyNet)} subValue={`${formatCr(monthlyGross)} gross`} color="text-green-400" />
          <StatCard label="Blended Yield"       value={`${blendedYield.toFixed(2)}%`} subValue="weighted avg" color="text-blue-400" />
          <StatCard label="Monthly Payouts"     value={formatCr(totalPayout)} subValue={`${payoutRatio.toFixed(0)}% of net`} color="text-yellow-400" />
        </div>

        {/* ── Portfolio Summary ── */}
        <div className="card p-6 md:p-8 mb-8 shadow-lg border border-gray-700/50">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <h2 className="text-xl font-semibold text-white">Portfolio Summary</h2>
            <div className="flex gap-2 flex-wrap">
              <button onClick={openDeposit} className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-green-700 hover:bg-green-600 text-white text-sm font-medium transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>Add Funds
              </button>
              <button onClick={openAddPortfolio} className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>Add Asset
              </button>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex flex-col items-center gap-3 w-full md:w-44 shrink-0">
              <div className="w-36 h-36"><DonutChart slices={donutSlices} /></div>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
                {portfolio.map((r) => {
                  const cfg = CATEGORY_CONFIG[r.category];
                  return (
                    <span key={r.id} className="flex items-center gap-1 text-xs text-gray-400">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ background: CHART_COLORS[r.category] || '#9ca3af' }} />
                      {cfg ? cfg.label : r.category}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
              <StatCard label="Annual Gross Income" value={formatCr(monthlyGross * 12)} subValue={`${blendedYield.toFixed(2)}% avg rate`} />
              <StatCard label="Annual Tax (AOP 24%)"   value={formatCr(monthlyTax * 12)}   subValue="flat trust rate"       color="text-red-400" />
              <StatCard label="Annual Net Income"    value={formatCr(monthlyNet * 12)}   subValue="after tax"             color="text-green-400" />
              <StatCard label="Annual Reinvestment"  value={formatCr(reinvestment * 12)} subValue="net minus payouts"     color={reinvestment >= 0 ? 'text-blue-400' : 'text-red-400'} />
            </div>
          </div>
        </div>

        {/* ── Asset Allocation Table ── */}
        <div className="card shadow-lg border border-gray-700/50 overflow-hidden md:overflow-x-auto mb-8">
          <div className="px-6 py-4 border-b border-gray-700"><h2 className="text-lg font-semibold text-white">Asset Allocation</h2></div>
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="text-xs text-gray-400 uppercase table-header-bg">
              <tr>
                <th className="px-4 py-3">Asset Class</th>
                <th className="px-4 py-3 hidden md:table-cell">Institution</th>
                <th className="px-4 py-3 hidden sm:table-cell">Category</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3 hidden md:table-cell">Rate</th>
                <th className="px-4 py-3 hidden md:table-cell">Tax</th>
                <th className="px-4 py-3">Monthly Net</th>
                <th className="px-4 py-3 hidden md:table-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.map((row) => {
                const mNet = row.amount_bdt * row.rate * (1 - row.tax_rate) / 12;
                const catCfg = CATEGORY_CONFIG[row.category] || { label: row.category, cls: 'chip chip-gray' };
                return (
                  <tr key={row.id} className="border-b table-row-border hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-100">
                      {row.asset_class}
                      <div className="sm:hidden mt-0.5 text-xs text-gray-500">{row.institution}</div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-400">{row.institution}</td>
                    <td className="px-4 py-3 hidden sm:table-cell"><span className={catCfg.cls}>{catCfg.label}</span></td>
                    <td className="px-4 py-3 text-white">{formatCr(row.amount_bdt)}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-blue-400">{(row.rate * 100).toFixed(2)}%</td>
                    <td className="px-4 py-3 hidden md:table-cell text-red-400">{(row.tax_rate * 100).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-green-400 font-semibold">{formatCr(mNet)}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-3">
                        <button onClick={() => openEditPortfolio(row)} className="text-blue-400 hover:text-blue-300"><FiEdit2 size={16} /></button>
                        <button onClick={() => deletePortfolio(row.id)} className="text-red-500 hover:text-red-400"><FiTrash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="table-header-bg">
              <tr>
                <td colSpan="8" className="px-4 py-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">{portfolio.length} assets · {formatCr(totalBDT)} total</span>
                    <button onClick={openAddPortfolio} className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>Add Asset
                    </button>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ── Monthly Cash Flow ── */}
        <div className="card shadow-lg border border-gray-700/50 overflow-hidden mb-8 order-last">
          <div className="px-6 py-5 border-b border-gray-700">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
              <div>
                <h2 className="text-lg font-semibold text-white">{simulationYears}-Year Growth Simulation</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Each yearly injection is applied at the start of that year, then income is calculated on the updated invested base.
                </p>
              </div>
              <button
                type="button"
                onClick={clearYearlyInjections}
                className="px-3 py-1.5 rounded-md text-sm font-medium bg-gray-800 text-gray-400 hover:text-white transition-colors"
              >
                Clear All Plans
              </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[auto_auto] gap-4 items-start">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Time Horizon</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {SIMULATION_YEAR_OPTIONS.map((years) => (
                    <button
                      key={years}
                      type="button"
                      onClick={() => setSimulationYears(years)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        simulationYears === years ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      {years}Y
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Payout Strategy</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { key: 'fixed', label: 'Fixed' },
                    { key: 'growing', label: 'Growing' },
                  ].map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setPayoutMode(option.key)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        payoutMode === option.key ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={payoutGrowthInput}
                      onChange={(e) => setPayoutGrowthInput(e.target.value)}
                      disabled={payoutMode !== 'growing'}
                      className="w-20 rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-40"
                    />
                    <span className="text-sm text-gray-400">% yearly</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-5">
              <div className="rounded-lg border border-gray-700 bg-gray-800/40 p-4">
                <div className="text-xs text-gray-400 mb-1">Current Annual Net</div>
                <div className="text-xl font-bold text-green-400">{formatCr(annualNetIncome)}</div>
              </div>
              <div className="rounded-lg border border-gray-700 bg-gray-800/40 p-4">
                <div className="text-xs text-gray-400 mb-1">Total Injections</div>
                <div className="text-xl font-bold text-cyan-400">{formatCr(totalInjectedCapital)}</div>
              </div>
              <div className="rounded-lg border border-gray-700 bg-gray-800/40 p-4">
                <div className="text-xs text-gray-400 mb-1">Cumulative Reinvestment</div>
                <div className={`text-xl font-bold ${cumulativeReinvestment >= 0 ? 'text-blue-400' : 'text-red-400'}`}>{formatCr(cumulativeReinvestment)}</div>
              </div>
              <div className="rounded-lg border border-gray-700 bg-gray-800/40 p-4">
                <div className="text-xs text-gray-400 mb-1">End Portfolio</div>
                <div className="text-xl font-bold text-white">{formatCr(finalSimulationYear?.closingBalance || 0)}</div>
                <div className={`text-xs mt-1 ${finalPortfolioGain >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                  {finalPortfolioGain >= 0 ? '+' : ''}{formatCr(finalPortfolioGain)} net growth ({finalPortfolioGainPct.toFixed(1)}%)
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1300px] text-sm text-left text-gray-300">
              <thead className="text-xs text-gray-400 uppercase table-header-bg">
                <tr>
                  <th className="px-4 py-3">Year</th>
                  <th className="px-4 py-3">Opening</th>
                  <th className="px-4 py-3">Injection</th>
                  <th className="px-4 py-3">Net Income</th>
                  <th className="px-4 py-3">Monthly Net Profit</th>
                  <th className="px-4 py-3">Payouts</th>
                  <th className="px-4 py-3">Reinvestment</th>
                  <th className="px-4 py-3">Closing</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {yearlySimulation.map((row) => (
                  <tr key={row.year} className="border-b table-row-border hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">Year {row.year}</td>
                    <td className="px-4 py-3 text-gray-200">{formatCr(row.openingBalance)}</td>
                    <td className="px-4 py-3 text-cyan-300">{formatCr(row.injectionAmount)}</td>
                    <td className="px-4 py-3 text-green-400">{formatCr(row.annualNetIncome)}</td>
                    <td className="px-4 py-3 text-emerald-300">{formatCr(row.monthlyNetProfit)}</td>
                    <td className="px-4 py-3 text-yellow-400">{formatCr(row.annualPayout)}</td>
                    <td className={`px-4 py-3 font-semibold ${row.annualReinvestment >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                      {formatCr(row.annualReinvestment)}
                    </td>
                    <td className="px-4 py-3 text-white font-semibold">{formatCr(row.closingBalance)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openInjectionEditor(row.year)}
                        className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                      >
                        {row.injectionAmount > 0 ? 'Edit Plan' : 'Add Plan'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="card p-6 border border-gray-700/50">
            <h2 className="text-lg font-semibold text-white mb-4">Monthly Cash Flow</h2>
            <FlowRow label="Gross Income"          amount_bdt={monthlyGross}      colorClass="text-white" />
            <FlowRow label="Source Tax Withheld"  amount_bdt={monthlySourceTax}  colorClass="text-red-400"    subLabel="(AIT / withholding)" indent />
            <FlowRow label="Additional Trust Tax" amount_bdt={additionalTax}     colorClass="text-red-300"    subLabel="(AOP 24% filing)"    indent />
            <FlowRow label="Net Income"            amount_bdt={monthlyNet}        colorClass="text-green-400" />
            <div className="pt-0.5">
              <FlowRow label="Family Payouts"   amount_bdt={familyPayout}   colorClass="text-blue-400"   indent />
              <FlowRow label="NGO Disbursement" amount_bdt={ngoPayout}      colorClass="text-green-400"  indent />
              <FlowRow label="Donations"        amount_bdt={donationPayout} colorClass="text-yellow-400" indent />
              <div className="flex items-center justify-between py-2.5 pl-6 border-b border-gray-700/50">
                <span className="flex items-center gap-1.5 text-sm text-gray-300"><span className="text-gray-600 text-xs">└</span> Total Payouts</span>
                <span className="text-sm font-semibold text-orange-400">{formatCr(totalPayout)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-t border-gray-600 mt-1">
              <span className="text-sm font-semibold text-gray-200">Reinvestment</span>
              <span className={`text-base font-bold ${reinvestment >= 0 ? 'text-blue-400' : 'text-red-400'}`}>{formatCr(reinvestment)}</span>
            </div>
          </div>

          <div className="card p-6 border border-gray-700/50">
            <h2 className="text-lg font-semibold text-white mb-4">Payout Distribution</h2>
            <div className="space-y-4">
              {[
                { label: 'Family', value: familyPayout, barColor: 'bg-blue-500', textColor: 'text-blue-400' },
                { label: 'NGO', value: ngoPayout, barColor: 'bg-green-500', textColor: 'text-green-400' },
                { label: 'Donations', value: donationPayout, barColor: 'bg-yellow-500', textColor: 'text-yellow-400' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">{item.label}</span>
                    <span className={item.textColor}>{formatCr(item.value)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-700 overflow-hidden">
                    <div className={`h-full rounded-full ${item.barColor}`}
                      style={{ width: totalPayout > 0 ? `${(item.value / totalPayout) * 100}%` : '0%' }} />
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-700">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300 font-medium">Total Monthly</span>
                  <span className="text-white font-bold">{formatCr(totalPayout)}</span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-gray-500">Payout Ratio</span>
                  <span className={payoutRatio > 80 ? 'text-red-400' : payoutRatio > 60 ? 'text-yellow-400' : 'text-green-400'}>
                    {payoutRatio.toFixed(1)}% of net income
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Beneficiaries Table (two-level) ── */}
        <div className="card shadow-lg border border-gray-700/50 overflow-hidden md:overflow-x-auto">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">Beneficiaries</h2>
            <p className="text-xs text-gray-500 mt-0.5">Click ▶ to expand a group and manage individual members</p>
          </div>
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="text-xs text-gray-400 uppercase table-header-bg">
              <tr>
                <th className="px-4 py-3">Group / Member</th>
                <th className="px-4 py-3 hidden sm:table-cell">Type</th>
                <th className="px-4 py-3">Monthly Payout</th>
                <th className="px-4 py-3 hidden md:table-cell">Status</th>
                <th className="px-4 py-3 hidden md:table-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {beneficiaries.length === 0 && (
                <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">No beneficiary groups added yet.</td></tr>
              )}
              {beneficiaries.map((row) => {
                const typeCfg  = BENEFICIARY_CONFIG[row.type] || { label: row.type, cls: 'chip chip-gray' };
                const isActive = row.active !== false;
                const isExpanded = expandedBenId === row.id;
                const members  = row.members || [];
                const effectivePayout = getEffectivePayout(row);

                return (
                  <React.Fragment key={row.id}>
                    {/* ── Group row ── */}
                    <tr className={`border-b table-row-border transition-colors hover:bg-gray-800/30 ${!isActive ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 font-medium text-gray-100">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setExpandedBenId(isExpanded ? null : row.id)}
                            className="text-gray-500 hover:text-blue-400 transition-colors flex-shrink-0"
                          >
                            {isExpanded ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                          </button>
                          <span>{row.name}</span>
                          {members.length > 0 && (
                            <span className="chip chip-gray text-xs">{members.length} members</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell"><span className={typeCfg.cls}>{typeCfg.label}</span></td>
                      <td className="px-4 py-3 text-white font-semibold">
                        {effectivePayout.toFixed(2)} L
                        {members.length > 0 && <span className="text-xs text-gray-500 ml-1">(sum)</span>}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`chip ${isActive ? 'chip-green' : 'chip-gray'}`}>{isActive ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex items-center gap-3">
                          <button onClick={() => openEditBeneficiary(row)} className="text-blue-400 hover:text-blue-300"><FiEdit2 size={16} /></button>
                          <button onClick={() => deleteBeneficiary(row.id)} className="text-red-500 hover:text-red-400"><FiTrash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>

                    {/* ── Member rows (expanded) ── */}
                    {isExpanded && members.map((member) => (
                      <tr key={`m-${member.id}`} className="border-b table-row-border bg-gray-900/60 hover:bg-gray-800/40 transition-colors">
                        <td className="px-4 py-2.5 pl-12 text-gray-400">
                          <span className="flex items-center gap-2">
                            <span className="text-gray-600">└</span>
                            {member.name}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 hidden sm:table-cell"></td>
                        <td className="px-4 py-2.5 text-gray-200">{member.monthly_payout_lakh.toFixed(2)} L</td>
                        <td className="px-4 py-2.5 hidden md:table-cell">
                          <span className={`chip ${member.active !== false ? 'chip-green' : 'chip-gray'}`}>
                            {member.active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 hidden md:table-cell">
                          <div className="flex items-center gap-3">
                            <button onClick={() => openEditMember(row.id, member)} className="text-blue-400 hover:text-blue-300"><FiEdit2 size={15} /></button>
                            <button onClick={() => deleteMember(row.id, member.id)} className="text-red-500 hover:text-red-400"><FiTrash2 size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {/* ── Add Member row (expanded) ── */}
                    {isExpanded && (
                      <tr className="border-b table-row-border bg-gray-900/60">
                        <td colSpan="5" className="px-4 py-2 pl-12">
                          <button onClick={() => openAddMember(row.id)}
                            className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                            Add Member
                          </button>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot className="table-header-bg">
              <tr>
                <td colSpan="5" className="px-4 py-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      {activeBens.length} active groups · {formatCr(totalPayout)}/month total
                    </span>
                    <button onClick={openAddBeneficiary}
                      className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                      Add Group
                    </button>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

      </div>

      {/* ── Portfolio Modal ── */}
      {pModal !== null && (
        <ModalWrapper title={pModal === 'add' ? 'Add Portfolio Asset' : 'Edit Portfolio Asset'}
          subtitle={pModal === 'add' ? 'Add a new asset to the BD Trust portfolio.' : "Update this asset's details."}
          onClose={() => setPModal(null)} error={pError} onSave={savePortfolio} saving={saving}
          saveLabel={pModal === 'add' ? 'Add Asset' : 'Save Changes'}>
          <MInput label="Asset Class" value={pAssetClass} onChange={(e) => setPAssetClass(e.target.value)} placeholder="e.g. Government Treasury Bond" />
          <MInput label="Institution" value={pInstitution} onChange={(e) => setPInstitution(e.target.value)} placeholder="e.g. Bangladesh Bank" />
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Category</label>
            <select value={pCategory} onChange={(e) => setPCategory(e.target.value)}
              className="w-full rounded-md border border-blue-500/50 bg-gray-800 p-3 text-white outline-none focus:ring-2 focus:ring-blue-400">
              <option value="bond">Government Bond</option>
              <option value="fdr">FDR / Fixed Deposit</option>
              <option value="real_estate">Real Estate</option>
              <option value="capital_market">Capital Market</option>
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <MInput label="Amount" hint="(Cr BDT)" type="number" min="0" step="0.01" value={pAmountCr} onChange={(e) => setPAmountCr(e.target.value)} placeholder="175.00" />
            <MInput label="Rate" hint="(%)" type="number" step="0.01" value={pRate} onChange={(e) => setPRate(e.target.value)} placeholder="12.5" />
            <MInput label="Tax Rate" hint="(%)" type="number" step="0.1" value={pTaxRate} onChange={(e) => setPTaxRate(e.target.value)} placeholder="5.0" />
          </div>
        </ModalWrapper>
      )}

      {/* ── Beneficiary Group Modal ── */}
      {bModal !== null && (
        <ModalWrapper title={bModal === 'add' ? 'Add Beneficiary Group' : 'Edit Beneficiary Group'}
          subtitle="A group holds individual members. Add members by expanding the row."
          onClose={() => setBModal(null)} error={bError} onSave={saveBeneficiary} saving={saving}
          saveLabel={bModal === 'add' ? 'Add Group' : 'Save Changes'}>
          <MInput label="Group Name" value={bName} onChange={(e) => setBName(e.target.value)} placeholder="e.g. Rahman Family Monthly" />
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Type</label>
            <select value={bType} onChange={(e) => setBType(e.target.value)}
              className="w-full rounded-md border border-blue-500/50 bg-gray-800 p-3 text-white outline-none focus:ring-2 focus:ring-blue-400">
              <option value="family">Family</option>
              <option value="ngo">NGO</option>
              <option value="donation">Donation</option>
            </select>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={bActive} onChange={(e) => setBActive(e.target.checked)} className="w-4 h-4 rounded" />
            <span className="text-sm text-gray-300">Active</span>
          </label>
        </ModalWrapper>
      )}

      {/* ── Member Modal ── */}
      {mModal !== null && (
        <ModalWrapper title={mModal.mode === 'add' ? 'Add Member' : 'Edit Member'}
          subtitle="Monthly payout in Lakh BDT (e.g. 3 = 3 lakh = ৳300,000)."
          onClose={() => setMModal(null)} error={mError} onSave={saveMember} saving={saving}
          saveLabel={mModal.mode === 'add' ? 'Add Member' : 'Save Changes'}>
          <MInput label="Name" value={mName} onChange={(e) => setMName(e.target.value)} placeholder="e.g. Father" />
          <MInput label="Monthly Payout" hint="(Lakh BDT)" type="number" min="0" step="0.01"
            value={mPayout} onChange={(e) => setMPayout(e.target.value)} placeholder="e.g. 3.0" />
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={mActive} onChange={(e) => setMActive(e.target.checked)} className="w-4 h-4 rounded" />
            <span className="text-sm text-gray-300">Active (included in payout calculations)</span>
          </label>
        </ModalWrapper>
      )}

      {/* ── Deposit Modal ── */}
      {dModal && (
        <ModalWrapper title="Add Funds" subtitle="Deposit funds into an existing portfolio asset."
          onClose={() => setDModal(false)} error={dError} onSave={saveDeposit} saving={saving} saveLabel="Add Funds">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Select Asset</label>
            <select value={dAssetId} onChange={(e) => setDAssetId(e.target.value)}
              className="w-full rounded-md border border-blue-500/50 bg-gray-800 p-3 text-white outline-none focus:ring-2 focus:ring-blue-400">
              {portfolio.map((r) => <option key={r.id} value={r.id}>{r.asset_class} ({formatCr(r.amount_bdt)})</option>)}
            </select>
          </div>
          <MInput label="Amount" hint="(Crore BDT)" type="number" min="0" step="0.01"
            value={dAmountCr} onChange={(e) => setDAmountCr(e.target.value)} placeholder="e.g. 10.00" />
          <MInput label="Note" value={dNote} onChange={(e) => setDNote(e.target.value)} placeholder="e.g. Q3 2026 reinvestment" />
        </ModalWrapper>
      )}

      {injectionModalYear !== null && (
        <ModalWrapper
          title={`Year ${injectionModalYear} Injection Plan`}
          subtitle=""
          onClose={closeInjectionEditor}
          error={injectionError}
          onSave={saveInjectionPlan}
          saving={saving}
          saveLabel="Save Plan"
          maxWidthClass="max-w-5xl"
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-gray-800/70 via-gray-900 to-gray-900 p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <div className="inline-flex rounded-xl border border-gray-700 bg-gray-950/60 p-1">
                  {[
                    { key: 'manual', label: 'Manual' },
                    { key: 'percentage', label: 'Percentage' },
                  ].map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => switchInjectionMode(option.key)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        injectionInputMode === option.key ? 'bg-cyan-500 text-slate-950' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setInjectionDraft({});
                    setInjectionPercentDraft(buildDefaultInjectionPercentDraft(portfolio));
                    setInjectionTotalDraft('');
                    setInjectionError('');
                  }}
                  className="rounded-xl border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
                >
                  Reset
                </button>
              </div>

              {injectionInputMode === 'percentage' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                    <div className="text-xs text-gray-500 mb-1">Total Injection</div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={injectionTotalDraft}
                      onChange={(e) => { setInjectionTotalDraft(e.target.value); setInjectionError(''); }}
                      placeholder="100.00"
                      className="w-full rounded-md border border-cyan-500/40 bg-gray-950 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div className="rounded-xl border border-gray-700 bg-gray-900/80 p-4">
                    <div className="text-xs text-gray-500 mb-1">Allocated</div>
                    <div className="text-xl font-semibold text-cyan-300">{formatCr(percentageAllocationTotal)}</div>
                  </div>
                  <div className="rounded-xl border border-gray-700 bg-gray-900/80 p-4">
                    <div className="text-xs text-gray-500 mb-1">Percent Total</div>
                    <div className={`text-xl font-semibold ${Math.abs(injectionPercentSum - 100) <= 0.05 ? 'text-emerald-300' : 'text-amber-300'}`}>
                      {injectionPercentSum.toFixed(2)}%
                    </div>
                  </div>
                </div>
              )}

              {injectionInputMode === 'manual' && (
                <div className="rounded-xl border border-gray-700 bg-gray-900/80 p-4">
                  <div className="text-xs text-gray-500 mb-1">Manual Total</div>
                  <div className="text-xl font-semibold text-cyan-300">{formatCr(injectionDraftTotal)}</div>
                </div>
              )}
            </div>

            {(activeInjectionModalRow?.assetBreakdown || portfolio).map((asset) => {
              const openingAmount = asset.openingAmount ?? asset.amount_bdt;
              const manualAmountCr = injectionDraft[asset.id] ?? '';
              const parsedPercent = Number.parseFloat(injectionPercentDraft[asset.id] ?? '');
              const allocatedBdt = Number.isFinite(parsedPercent) && parsedPercent > 0 ? (percentageTotalInjection * parsedPercent) / 100 : 0;
              const previewBase = openingAmount + (injectionInputMode === 'manual'
                ? ((Number.parseFloat(manualAmountCr) > 0 ? Number.parseFloat(manualAmountCr) : 0) * 1e7)
                : allocatedBdt);

              return (
                <div key={asset.id} className="rounded-2xl border border-gray-700 bg-gray-800/30 p-4">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <div className="text-sm font-medium text-white">{asset.asset_class}</div>
                      <div className="text-xs text-gray-500 mt-1">{asset.institution}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-blue-400">{(asset.rate * 100).toFixed(2)}%</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div className="rounded-xl border border-gray-700 bg-gray-900/60 p-3">
                      <div className="text-xs text-gray-500 mb-1">Opening Amount</div>
                      <div className="text-sm font-semibold text-gray-200">{formatCr(openingAmount)}</div>
                    </div>
                    <div className="rounded-xl border border-gray-700 bg-gray-900/60 p-3">
                      <div className="text-xs text-gray-500 mb-1">Preview Base</div>
                      <div className="text-sm font-semibold text-cyan-300">{formatCr(previewBase)}</div>
                    </div>
                    {injectionInputMode === 'manual' ? (
                      <div className="md:col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">Manual Inject (Cr)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={manualAmountCr}
                          onChange={(e) => updateInjectionDraft(asset.id, e.target.value)}
                          placeholder="0.00"
                          className="w-full rounded-xl border border-cyan-500/40 bg-gray-950 px-3 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Allocation %</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={injectionPercentDraft[asset.id] ?? ''}
                            onChange={(e) => updateInjectionPercentDraft(asset.id, e.target.value)}
                            placeholder="0.00"
                            className="w-full rounded-xl border border-emerald-500/30 bg-gray-950 px-3 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div className="rounded-xl border border-gray-700 bg-gray-900/60 p-3">
                          <div className="text-xs text-gray-500 mb-1">Allocated Amount</div>
                          <div className="text-sm font-semibold text-emerald-300">{formatCr(allocatedBdt)}</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ModalWrapper>
      )}

    </div>
  );
}
