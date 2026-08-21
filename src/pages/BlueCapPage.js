import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiDatabase, FiRefreshCw, FiSave } from 'react-icons/fi';
import LoadingScreen from '../components/LoadingScreen';
import {
  buildBlueCapSavePayload,
  createBlueCapScenarioSnapshot,
  normalizeBlueCapScenario,
  simulateBlueCapScenario,
} from '../lib/bluecapSimulation';

const BLUECAP_ENDPOINTS = {
  fetch: '/api/getBlueCapData',
  update: '/api/updateBlueCapData',
};

const formatCrore = (value) =>
  `${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} Cr BDT`;

const formatPercent = (value) =>
  `${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)}%`;

const getSummaryTone = (metricId) => {
  if (metricId === 'profit') return 'border-green-500/30';
  if (metricId === 'capital') return 'border-blue-500/30';
  if (metricId === 'most-profitable') return 'border-cyan-500/30';
  return 'border-gray-700';
};

export default function BlueCapPage() {
  const [scenario, setScenario] = useState(() => createBlueCapScenarioSnapshot());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadScenario = async () => {
      try {
        const response = await fetch(BLUECAP_ENDPOINTS.fetch);
        if (!response.ok) {
          throw new Error(`Failed to load BlueCAP data: ${response.status}`);
        }
        const payload = await response.json();
        if (isMounted) {
          setScenario(normalizeBlueCapScenario(payload));
        }
      } catch (error) {
        console.error('Unable to fetch BlueCAP data from API', error);
        if (isMounted) {
          setErrorMessage('Unable to load saved BlueCAP data. Default scenario loaded.');
          setScenario(createBlueCapScenarioSnapshot());
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadScenario();
    return () => {
      isMounted = false;
    };
  }, []);

  const updateConfigValue = (field, nextValue) => {
    setSaveMessage('');
    setErrorMessage('');
    setScenario((currentScenario) =>
      normalizeBlueCapScenario({
        ...currentScenario,
        config: {
          ...currentScenario.config,
          [field]: nextValue === '' ? 0 : Number(nextValue),
        },
      })
    );
  };

  const updateEntityValue = (entityId, field, nextValue) => {
    setSaveMessage('');
    setErrorMessage('');
    setScenario((currentScenario) =>
      normalizeBlueCapScenario({
        ...currentScenario,
        entities: currentScenario.entities.map((entity) =>
          entity.id === entityId
            ? {
                ...entity,
                [field]: nextValue === '' ? 0 : Number(nextValue),
              }
            : entity
        ),
      })
    );
  };

  const resetScenario = () => {
    setScenario(createBlueCapScenarioSnapshot());
    setSaveMessage('');
    setErrorMessage('');
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveMessage('');
    setErrorMessage('');

    const payload = buildBlueCapSavePayload(scenario);

    try {
      const response = await fetch(BLUECAP_ENDPOINTS.update, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Unable to save BlueCAP scenario.');
      }

      const savedScenario = await response.json();
      setScenario(normalizeBlueCapScenario(savedScenario));
      setSaveMessage('BlueCAP scenario saved.');
    } catch (error) {
      console.error('Unable to persist BlueCAP data', error);
      setErrorMessage(error.message || 'Unable to save BlueCAP scenario.');
    } finally {
      setIsSaving(false);
    }
  };

  const simulation = simulateBlueCapScenario(scenario);
  const summaryCards = [
    {
      id: 'revenue',
      label: 'Year 4 Total Revenue',
      value: formatCrore(simulation.year4Summary.totalRevenueCrore),
      helper: 'Aggregate revenue across all subsidiaries.',
    },
    {
      id: 'profit',
      label: 'Year 4 Net Profit',
      value: formatCrore(simulation.year4Summary.totalNetProfitCrore),
      helper: 'Year 4 profit using the current margin assumptions.',
    },
    {
      id: 'capital',
      label: 'Capital Pool Tracker',
      value: formatCrore(simulation.year4Summary.capitalPoolEndOfYearCrore),
      helper: `Cumulative net profit: ${formatCrore(simulation.year4Summary.cumulativeNetProfitCrore)}`,
    },
    {
      id: 'most-profitable',
      label: 'Most Profitable Entity',
      value: simulation.year4Summary.mostProfitableEntity?.name || 'N/A',
      helper: simulation.year4Summary.mostProfitableEntity
        ? `${formatCrore(simulation.year4Summary.mostProfitableEntity.profitCrore)} net profit in Year 4`
        : 'No active entities in Year 4.',
    },
  ];

  if (isLoading) return <LoadingScreen title="Loading BlueCAP simulator..." />;

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-gray-900 via-[#030712] to-gray-900">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-start justify-between gap-4 mb-10 flex-wrap">
          <Link
            to="/"
            className="flex items-center text-sm text-gray-400 hover:text-blue-400 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
          <div className="text-right">
            <h1 className="text-3xl md:text-4xl font-bold text-white">BlueCAP</h1>
            <p className="text-md md:text-lg text-gray-400 mt-1">
              The Blue Ecosystem 4-year capital simulator
            </p>
          </div>
        </header>

        <div className="card p-6 md:p-8 mb-8 shadow-lg shadow-cyan-900/10 border border-gray-700/50">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-semibold text-white">Scenario Controls</h2>
              <p className="text-sm text-gray-400 mt-1">
                Update global capital assumptions and Year 4 targets. All yearly outputs recalculate
                immediately.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={resetScenario}
                className="inline-flex items-center rounded-md border border-gray-600 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800"
              >
                <FiRefreshCw size={16} className="mr-2" />
                Reset Defaults
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaving}
                className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FiSave size={16} className="mr-2" />
                {isSaving ? 'Saving...' : 'Save Scenario'}
              </button>
            </div>
          </div>

          {(errorMessage || saveMessage) && (
            <div
              className={`mt-5 rounded-md px-4 py-3 text-sm ${
                errorMessage
                  ? 'border border-red-500/40 bg-red-500/10 text-red-200'
                  : 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
              }`}
            >
              {errorMessage || saveMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
            <label className="rounded-lg border border-gray-700 bg-gray-800/40 p-4">
              <span className="block text-xs uppercase tracking-wide text-gray-400 mb-2">
                Initial Capital (Crore BDT)
              </span>
              <input
                aria-label="Initial Capital"
                type="number"
                min="0"
                step="0.01"
                value={scenario.config.initialCapitalCrore}
                onChange={(event) => updateConfigValue('initialCapitalCrore', event.target.value)}
                className="w-full rounded-md border border-blue-500/40 bg-gray-950 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-400"
              />
            </label>
            <label className="rounded-lg border border-gray-700 bg-gray-800/40 p-4">
              <span className="block text-xs uppercase tracking-wide text-gray-400 mb-2">
                Annual Injection (Crore BDT)
              </span>
              <input
                aria-label="Annual Injection"
                type="number"
                min="0"
                step="0.01"
                value={scenario.config.annualCapitalInjectionCrore}
                onChange={(event) =>
                  updateConfigValue('annualCapitalInjectionCrore', event.target.value)
                }
                className="w-full rounded-md border border-blue-500/40 bg-gray-950 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-400"
              />
            </label>
            <label className="rounded-lg border border-gray-700 bg-gray-800/40 p-4">
              <span className="block text-xs uppercase tracking-wide text-gray-400 mb-2">
                Regulatory Constraint (%)
              </span>
              <input
                aria-label="Regulatory Constraint"
                type="number"
                min="0"
                step="0.01"
                value={scenario.config.regulatoryConstraintPercent}
                onChange={(event) =>
                  updateConfigValue('regulatoryConstraintPercent', event.target.value)
                }
                className="w-full rounded-md border border-blue-500/40 bg-gray-950 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-400"
              />
            </label>
            <label className="rounded-lg border border-gray-700 bg-gray-800/40 p-4">
              <span className="block text-xs uppercase tracking-wide text-gray-400 mb-2">
                Reinvestment Rate (%)
              </span>
              <input
                aria-label="Reinvestment Rate"
                type="number"
                min="0"
                step="0.01"
                value={scenario.config.reinvestmentRatePercent}
                onChange={(event) =>
                  updateConfigValue('reinvestmentRatePercent', event.target.value)
                }
                className="w-full rounded-md border border-blue-500/40 bg-gray-950 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-400"
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {summaryCards.map((card) => (
            <div
              key={card.id}
              className={`card p-5 bg-gray-800/40 rounded-lg border ${getSummaryTone(card.id)}`}
            >
              <div className="text-sm text-gray-400 mb-2">{card.label}</div>
              <div className="text-2xl font-bold text-white">{card.value}</div>
              <div className="text-xs text-gray-500 mt-2">{card.helper}</div>
            </div>
          ))}
        </div>

        <div className="card p-6 md:p-8 mb-8 shadow-lg shadow-cyan-900/10 border border-gray-700/50 overflow-hidden">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
            <div>
              <h2 className="text-xl font-semibold text-white">Entity Targets</h2>
              <p className="text-sm text-gray-400 mt-1">
                Launch years stay fixed. Revenue and margin inputs drive the full 4-year simulation.
              </p>
            </div>
            <div className="inline-flex items-center rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
              <FiDatabase className="mr-2" />
              9 subsidiaries
            </div>
          </div>

          <div className="overflow-x-auto -mx-6 md:-mx-8">
            <table className="w-full min-w-[1080px] text-sm text-left text-gray-300">
              <thead className="text-xs text-gray-400 uppercase table-header-bg">
                <tr>
                  <th className="px-6 md:px-8 py-3">Entity</th>
                  <th className="px-4 py-3">Sector</th>
                  <th className="px-4 py-3">Launch Year</th>
                  <th className="px-4 py-3">Year 4 Revenue Target</th>
                  <th className="px-4 py-3">Net Margin</th>
                  <th className="px-6 md:px-8 py-3">Year 4 Profit</th>
                </tr>
              </thead>
              <tbody>
                {scenario.entities.map((entity) => {
                  const year4Projection = simulation.yearlyBreakdown[simulation.yearlyBreakdown.length - 1].entities.find(
                    (entry) => entry.id === entity.id
                  );
                  return (
                    <tr
                      key={entity.id}
                      className="border-b table-row-border transition-colors hover:bg-gray-800/40"
                    >
                      <td className="px-6 md:px-8 py-4">
                        <div className="font-semibold text-white">{entity.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{entity.id}</div>
                      </td>
                      <td className="px-4 py-4 text-gray-400">{entity.sector}</td>
                      <td className="px-4 py-4 text-white">Year {entity.launchYear}</td>
                      <td className="px-4 py-4">
                        <input
                          aria-label={`Year 4 revenue target for ${entity.name}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={entity.year4TargetRevenueCrore}
                          onChange={(event) =>
                            updateEntityValue(entity.id, 'year4TargetRevenueCrore', event.target.value)
                          }
                          className="w-full rounded-md border border-cyan-500/30 bg-gray-950 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-cyan-400"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <input
                          aria-label={`Net margin for ${entity.name}`}
                          type="number"
                          step="0.01"
                          value={entity.netMarginPercent}
                          onChange={(event) =>
                            updateEntityValue(entity.id, 'netMarginPercent', event.target.value)
                          }
                          className="w-full rounded-md border border-cyan-500/30 bg-gray-950 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-cyan-400"
                        />
                      </td>
                      <td className="px-6 md:px-8 py-4 font-semibold text-emerald-300">
                        {formatCrore(year4Projection?.profitCrore || 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-6 md:p-8 mb-8 shadow-lg shadow-cyan-900/10 border border-gray-700/50 overflow-hidden">
          <h2 className="text-xl font-semibold text-white mb-5">Yearly Ecosystem Rollups</h2>
          <div className="overflow-x-auto -mx-6 md:-mx-8">
            <table className="w-full min-w-[900px] text-sm text-left text-gray-300">
              <thead className="text-xs text-gray-400 uppercase table-header-bg">
                <tr>
                  <th className="px-6 md:px-8 py-3">Year</th>
                  <th className="px-4 py-3">Active Entities</th>
                  <th className="px-4 py-3">Total Revenue</th>
                  <th className="px-4 py-3">Total Net Profit</th>
                  <th className="px-4 py-3">Cumulative Net Profit</th>
                  <th className="px-6 md:px-8 py-3">Capital Pool</th>
                </tr>
              </thead>
              <tbody>
                {simulation.yearlyBreakdown.map((row) => (
                  <tr
                    key={row.year}
                    className="border-b table-row-border transition-colors hover:bg-gray-800/40"
                  >
                    <td className="px-6 md:px-8 py-4 font-semibold text-white">Year {row.year}</td>
                    <td className="px-4 py-4 text-gray-300">{row.activeEntityCount}</td>
                    <td className="px-4 py-4 text-gray-100">{formatCrore(row.totalRevenueCrore)}</td>
                    <td className="px-4 py-4 text-emerald-300">{formatCrore(row.totalNetProfitCrore)}</td>
                    <td className="px-4 py-4 text-blue-300">{formatCrore(row.cumulativeNetProfitCrore)}</td>
                    <td className="px-6 md:px-8 py-4 font-semibold text-white">
                      {formatCrore(row.capitalPoolEndOfYearCrore)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-6 md:p-8 mb-8 shadow-lg shadow-cyan-900/10 border border-gray-700/50 overflow-hidden">
          <h2 className="text-xl font-semibold text-white mb-5">Yearly Entity Revenue and Profit</h2>
          <div className="overflow-x-auto -mx-6 md:-mx-8">
            <table className="w-full min-w-[980px] text-sm text-left text-gray-300">
              <thead className="text-xs text-gray-400 uppercase table-header-bg">
                <tr>
                  <th className="px-6 md:px-8 py-3">Year</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Launch</th>
                  <th className="px-4 py-3">Revenue</th>
                  <th className="px-4 py-3">Net Profit</th>
                  <th className="px-6 md:px-8 py-3">Margin</th>
                </tr>
              </thead>
              <tbody>
                {simulation.yearlyBreakdown.flatMap((yearRow) =>
                  yearRow.entities.map((entity) => (
                    <tr
                      key={`${yearRow.year}-${entity.id}`}
                      className="border-b table-row-border transition-colors hover:bg-gray-800/40"
                    >
                      <td className="px-6 md:px-8 py-3 text-white font-medium">Year {yearRow.year}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-100">{entity.name}</div>
                        <div className="text-xs text-gray-500">{entity.sector}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-400">Year {entity.launchYear}</td>
                      <td className="px-4 py-3 text-gray-100">{formatCrore(entity.revenueCrore)}</td>
                      <td className="px-4 py-3 text-emerald-300">{formatCrore(entity.profitCrore)}</td>
                      <td className="px-6 md:px-8 py-3 text-gray-300">
                        {formatPercent(entity.netMarginPercent)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-6 md:p-8 shadow-lg shadow-cyan-900/10 border border-gray-700/50 overflow-hidden">
          <h2 className="text-xl font-semibold text-white mb-5">Dependency Metrics</h2>
          <div className="overflow-x-auto -mx-6 md:-mx-8">
            <table className="w-full min-w-[920px] text-sm text-left text-gray-300">
              <thead className="text-xs text-gray-400 uppercase table-header-bg">
                <tr>
                  <th className="px-6 md:px-8 py-3">Loop</th>
                  <th className="px-4 py-3">Providers</th>
                  <th className="px-4 py-3">Covered Entities</th>
                  <th className="px-4 py-3">Year 4 Revenue Exposure</th>
                  <th className="px-6 md:px-8 py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {simulation.dependencyMetrics.map((metric) => (
                  <tr
                    key={metric.id}
                    className="border-b table-row-border transition-colors hover:bg-gray-800/40"
                  >
                    <td className="px-6 md:px-8 py-4">
                      <div className="font-semibold text-white">{metric.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{metric.category}</div>
                    </td>
                    <td className="px-4 py-4 text-gray-100">{metric.providerNames.join(', ')}</td>
                    <td className="px-4 py-4 text-gray-300">
                      {metric.coveredEntityNames.join(', ')} ({metric.coveredEntityCount})
                    </td>
                    <td className="px-4 py-4 text-cyan-300">
                      {formatCrore(metric.year4RevenueExposureCrore)}
                    </td>
                    <td className="px-6 md:px-8 py-4 text-gray-400">{metric.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
