import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiDatabase, FiRefreshCw, FiSave, FiArrowLeft } from 'react-icons/fi';
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

/* ── Year filter options ── */
const YEAR_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 1, label: 'Year 1' },
  { key: 2, label: 'Year 2' },
  { key: 3, label: 'Year 3' },
  { key: 4, label: 'Year 4' },
];

/* ── KPI accent mapping ── */
const KPI_ACCENT = {
  revenue: 'bc-kpi-revenue',
  profit: 'bc-kpi-profit',
  capital: 'bc-kpi-capital',
  'most-profitable': 'bc-kpi-entity',
};

/* ── Section Header ── */
function SectionHeader({ title, description, children }) {
  return (
    <div className="bc-section-header">
      <div style={{ minWidth: 0 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--bc-text-primary)', margin: 0 }}>
          {title}
        </h2>
        {description && (
          <p style={{ fontSize: 13, color: 'var(--bc-text-secondary)', marginTop: 6, lineHeight: 1.5 }}>
            {description}
          </p>
        )}
      </div>
      {children && <div className="flex items-center gap-3 flex-wrap flex-shrink-0">{children}</div>}
    </div>
  );
}

/* ── Year Filter Tab Bar ── */
function YearTabs({ value, onChange }) {
  return (
    <div className="bc-tabs">
      {YEAR_FILTERS.map((filter) => (
        <button
          key={filter.key}
          type="button"
          className={`bc-tab ${value === filter.key ? 'bc-tab-active' : ''}`}
          onClick={() => onChange(filter.key)}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}

export default function BlueCapPage() {
  const [scenario, setScenario] = useState(() => createBlueCapScenarioSnapshot());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [yearFilter, setYearFilter] = useState('all');


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

  /* ── Filtered yearly data for the entity revenue/profit section ── */
  const filteredYearlyBreakdown =
    yearFilter === 'all'
      ? simulation.yearlyBreakdown
      : simulation.yearlyBreakdown.filter((row) => row.year === yearFilter);

  if (isLoading) return <LoadingScreen title="Loading BlueCAP simulator..." />;

  return (
    <div className="bc-page">
      <div
        style={{
          maxWidth: 1440,
          margin: '0 auto',
          padding: '0 16px',
        }}
        className="sm:px-6 lg:px-8 xl:px-10"
      >
        {/* ══════════════════════════════════════
            HEADER
        ══════════════════════════════════════ */}
        <header
          className="flex items-center justify-between gap-4"
          style={{
            height: 60,
            borderBottom: '1px solid var(--bc-border)',
          }}
        >
          <Link
            to="/"
            className="flex items-center gap-2 text-sm transition-colors"
            style={{ color: 'var(--bc-text-secondary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--bc-accent)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--bc-text-secondary)')}
          >
            <FiArrowLeft size={16} />
            <span className="hidden sm:inline">Back to Home</span>
          </Link>
          <div className="text-right">
            <h1
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--bc-text-primary)',
                margin: 0,
                letterSpacing: '-0.01em',
              }}
            >
              BlueCAP
            </h1>
            <p
              className="hidden sm:block"
              style={{
                fontSize: 12,
                color: 'var(--bc-text-muted)',
                margin: 0,
                marginTop: 1,
              }}
            >
              The Blue Ecosystem 4-year capital simulator
            </p>
          </div>
        </header>

        {/* ══════════════════════════════════════
            SCENARIO CONTROLS
        ══════════════════════════════════════ */}
        <section className="bc-card" style={{ marginTop: 24 }}>
          <SectionHeader
            title="Scenario Controls"
            description="Update global capital assumptions and Year 4 targets. All yearly outputs recalculate immediately."
          >
            <button type="button" onClick={resetScenario} className="bc-btn bc-btn-secondary">
              <FiRefreshCw size={14} />
              Reset Defaults
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="bc-btn bc-btn-primary"
            >
              <FiSave size={14} />
              {isSaving ? 'Saving...' : 'Save Scenario'}
            </button>
          </SectionHeader>

          {(errorMessage || saveMessage) && (
            <div className={errorMessage ? 'bc-msg-error' : 'bc-msg-success'}>
              {errorMessage || saveMessage}
            </div>
          )}

          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              marginTop: errorMessage || saveMessage ? 16 : 20,
            }}
          >
            <div>
              <label className="bc-label" htmlFor="bc-initial-capital">
                Initial Capital (Crore BDT)
              </label>
              <input
                id="bc-initial-capital"
                aria-label="Initial Capital"
                type="number"
                min="0"
                step="0.01"
                value={scenario.config.initialCapitalCrore}
                onChange={(event) => updateConfigValue('initialCapitalCrore', event.target.value)}
                className="bc-input"
              />
            </div>
            <div>
              <label className="bc-label" htmlFor="bc-annual-injection">
                Annual Injection (Crore BDT)
              </label>
              <input
                id="bc-annual-injection"
                aria-label="Annual Injection"
                type="number"
                min="0"
                step="0.01"
                value={scenario.config.annualCapitalInjectionCrore}
                onChange={(event) =>
                  updateConfigValue('annualCapitalInjectionCrore', event.target.value)
                }
                className="bc-input"
              />
            </div>
            <div>
              <label className="bc-label" htmlFor="bc-regulatory">
                Regulatory Constraint (%)
              </label>
              <input
                id="bc-regulatory"
                aria-label="Regulatory Constraint"
                type="number"
                min="0"
                step="0.01"
                value={scenario.config.regulatoryConstraintPercent}
                onChange={(event) =>
                  updateConfigValue('regulatoryConstraintPercent', event.target.value)
                }
                className="bc-input"
              />
            </div>
            <div>
              <label className="bc-label" htmlFor="bc-reinvestment">
                Reinvestment Rate (%)
              </label>
              <input
                id="bc-reinvestment"
                aria-label="Reinvestment Rate"
                type="number"
                min="0"
                step="0.01"
                value={scenario.config.reinvestmentRatePercent}
                onChange={(event) =>
                  updateConfigValue('reinvestmentRatePercent', event.target.value)
                }
                className="bc-input"
              />
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            KPI SUMMARY CARDS
        ══════════════════════════════════════ */}
        <div
          className="grid gap-4"
          style={{
            marginTop: 20,
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          }}
        >
          {summaryCards.map((card) => (
            <div key={card.id} className={`bc-kpi ${KPI_ACCENT[card.id] || ''}`}>
              <div className="bc-kpi-label">{card.label}</div>
              <div className="bc-kpi-value">{card.value}</div>
              <div className="bc-kpi-helper">{card.helper}</div>
            </div>
          ))}
        </div>

        {/* ══════════════════════════════════════
            ENTITY TARGETS
        ══════════════════════════════════════ */}
        <section className="bc-card" style={{ marginTop: 24 }}>
          <SectionHeader
            title="Entity Targets"
            description="Launch years stay fixed. Revenue and margin inputs drive the full 4-year simulation."
          >
            <div className="bc-badge">
              <FiDatabase size={13} />
              {scenario.entities.length} subsidiaries
            </div>
          </SectionHeader>

          {/* Desktop Table */}
          <div className="bc-desktop-only bc-table-wrap" style={{ overflowX: 'auto', margin: '0 -24px' }}>
            <table className="bc-table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th>Entity</th>
                  <th>Sector</th>
                  <th className="text-center">Launch</th>
                  <th className="text-right">Year 4 Revenue Target</th>
                  <th className="text-right">Net Margin</th>
                  <th className="text-right">Year 4 Profit</th>
                </tr>
              </thead>
              <tbody>
                {scenario.entities.map((entity) => {
                  const year4Projection = simulation.yearlyBreakdown[simulation.yearlyBreakdown.length - 1].entities.find(
                    (entry) => entry.id === entity.id
                  );
                  return (
                    <tr key={entity.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--bc-text-primary)' }}>
                          {entity.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--bc-text-muted)', marginTop: 2 }}>
                          {entity.id}
                        </div>
                      </td>
                      <td style={{ color: 'var(--bc-text-secondary)', fontSize: 13 }}>
                        {entity.sector}
                      </td>
                      <td className="text-center" style={{ fontWeight: 500 }}>
                        Year {entity.launchYear}
                      </td>
                      <td className="text-right" style={{ width: 180 }}>
                        <input
                          aria-label={`Year 4 revenue target for ${entity.name}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={entity.year4TargetRevenueCrore}
                          onChange={(event) =>
                            updateEntityValue(entity.id, 'year4TargetRevenueCrore', event.target.value)
                          }
                          className="bc-input bc-input-table"
                          style={{ width: 130 }}
                        />
                      </td>
                      <td className="text-right" style={{ width: 130 }}>
                        <input
                          aria-label={`Net margin for ${entity.name}`}
                          type="number"
                          step="0.01"
                          value={entity.netMarginPercent}
                          onChange={(event) =>
                            updateEntityValue(entity.id, 'netMarginPercent', event.target.value)
                          }
                          className="bc-input bc-input-table"
                          style={{ width: 90 }}
                        />
                      </td>
                      <td
                        className="text-right"
                        style={{
                          fontWeight: 600,
                          color: 'var(--bc-positive)',
                        }}
                      >
                        {formatCrore(year4Projection?.profitCrore || 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="bc-mobile-only">
            {scenario.entities.map((entity) => {
              const year4Projection = simulation.yearlyBreakdown[simulation.yearlyBreakdown.length - 1].entities.find(
                (entry) => entry.id === entity.id
              );
              return (
                <div key={entity.id} className="bc-mobile-card">
                  <div className="bc-mobile-card-header">
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--bc-text-primary)' }}>
                      {entity.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--bc-text-muted)', marginTop: 2 }}>
                      {entity.sector}
                    </div>
                  </div>
                  <div className="bc-mobile-card-row">
                    <span className="bc-mobile-card-label">Launch</span>
                    <span className="bc-mobile-card-value">Year {entity.launchYear}</span>
                  </div>
                  <div style={{ padding: '8px 0' }}>
                    <label
                      className="bc-label"
                      htmlFor={`bc-m-rev-${entity.id}`}
                      style={{ marginBottom: 6 }}
                    >
                      Revenue Target (Cr BDT)
                    </label>
                    <input
                      id={`bc-m-rev-${entity.id}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={entity.year4TargetRevenueCrore}
                      onChange={(event) =>
                        updateEntityValue(entity.id, 'year4TargetRevenueCrore', event.target.value)
                      }
                      className="bc-input"
                    />
                  </div>
                  <div style={{ padding: '8px 0' }}>
                    <label
                      className="bc-label"
                      htmlFor={`bc-m-margin-${entity.id}`}
                      style={{ marginBottom: 6 }}
                    >
                      Net Margin (%)
                    </label>
                    <input
                      id={`bc-m-margin-${entity.id}`}
                      type="number"
                      step="0.01"
                      value={entity.netMarginPercent}
                      onChange={(event) =>
                        updateEntityValue(entity.id, 'netMarginPercent', event.target.value)
                      }
                      className="bc-input"
                    />
                  </div>
                  <div
                    className="bc-mobile-card-row"
                    style={{
                      marginTop: 6,
                      paddingTop: 10,
                      borderTop: '1px solid var(--bc-border)',
                    }}
                  >
                    <span className="bc-mobile-card-label">Year 4 Profit</span>
                    <span style={{ fontWeight: 700, color: 'var(--bc-positive)', fontSize: 15 }}>
                      {formatCrore(year4Projection?.profitCrore || 0)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ══════════════════════════════════════
            YEARLY ECOSYSTEM ROLLUPS
        ══════════════════════════════════════ */}
        <section className="bc-card" style={{ marginTop: 24 }}>
          <SectionHeader
            title="Yearly Ecosystem Rollups"
            description="Aggregated view of ecosystem performance across all four years."
          />

          {/* Desktop Table */}
          <div className="bc-desktop-only bc-table-wrap" style={{ overflowX: 'auto', margin: '0 -24px' }}>
            <table className="bc-table" style={{ minWidth: 780 }}>
              <thead>
                <tr>
                  <th>Year</th>
                  <th className="text-center">Active Entities</th>
                  <th className="text-right">Total Revenue</th>
                  <th className="text-right">Total Net Profit</th>
                  <th className="text-right">Cumulative Net Profit</th>
                  <th className="text-right">Capital Pool</th>
                </tr>
              </thead>
              <tbody>
                {simulation.yearlyBreakdown.map((row, idx) => (
                  <tr
                    key={row.year}
                    style={{
                      backgroundColor: idx % 2 === 1 ? 'rgba(148,163,184,0.02)' : 'transparent',
                    }}
                  >
                    <td style={{ fontWeight: 600 }}>Year {row.year}</td>
                    <td className="text-center" style={{ color: 'var(--bc-text-secondary)' }}>
                      {row.activeEntityCount}
                    </td>
                    <td className="text-right">{formatCrore(row.totalRevenueCrore)}</td>
                    <td className="text-right" style={{ color: 'var(--bc-positive)' }}>
                      {formatCrore(row.totalNetProfitCrore)}
                    </td>
                    <td className="text-right" style={{ color: 'var(--bc-blue)' }}>
                      {formatCrore(row.cumulativeNetProfitCrore)}
                    </td>
                    <td className="text-right" style={{ fontWeight: 600 }}>
                      {formatCrore(row.capitalPoolEndOfYearCrore)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="bc-mobile-only">
            {simulation.yearlyBreakdown.map((row) => (
              <div key={row.year} className="bc-mobile-card">
                <div className="bc-mobile-card-header">
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--bc-text-primary)' }}>
                    Year {row.year}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--bc-text-muted)', marginTop: 2 }}>
                    {row.activeEntityCount} active {row.activeEntityCount === 1 ? 'entity' : 'entities'}
                  </div>
                </div>
                <div className="bc-mobile-card-row">
                  <span className="bc-mobile-card-label">Total Revenue</span>
                  <span className="bc-mobile-card-value">{formatCrore(row.totalRevenueCrore)}</span>
                </div>
                <div className="bc-mobile-card-row">
                  <span className="bc-mobile-card-label">Net Profit</span>
                  <span style={{ color: 'var(--bc-positive)', fontWeight: 600 }}>
                    {formatCrore(row.totalNetProfitCrore)}
                  </span>
                </div>
                <div className="bc-mobile-card-row">
                  <span className="bc-mobile-card-label">Cumulative Profit</span>
                  <span style={{ color: 'var(--bc-blue)', fontWeight: 500 }}>
                    {formatCrore(row.cumulativeNetProfitCrore)}
                  </span>
                </div>
                <div
                  className="bc-mobile-card-row"
                  style={{ marginTop: 4, paddingTop: 10, borderTop: '1px solid var(--bc-border)' }}
                >
                  <span className="bc-mobile-card-label">Capital Pool</span>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>
                    {formatCrore(row.capitalPoolEndOfYearCrore)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════
            YEARLY ENTITY REVENUE & PROFIT
        ══════════════════════════════════════ */}
        <section className="bc-card" style={{ marginTop: 24 }}>
          <SectionHeader
            title="Yearly Entity Revenue and Profit"
            description="Per-entity financial breakdown by year. Use the filter to focus on a specific year."
          >
            <div className="bc-desktop-only">
              <YearTabs value={yearFilter} onChange={setYearFilter} />
            </div>
          </SectionHeader>

          {/* Desktop Table */}
          <div className="bc-desktop-only bc-table-wrap" style={{ overflowX: 'auto', margin: '0 -24px' }}>
            <table className="bc-table" style={{ minWidth: 820 }}>
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Entity</th>
                  <th className="text-center">Launch</th>
                  <th className="text-right">Revenue</th>
                  <th className="text-right">Net Profit</th>
                  <th className="text-right">Margin</th>
                </tr>
              </thead>
              <tbody>
                {filteredYearlyBreakdown.flatMap((yearRow, yearIdx) => {
                  const rows = [];
                  /* Year separator row */
                  if (yearFilter === 'all') {
                    rows.push(
                      <tr key={`sep-${yearRow.year}`} className="bc-year-separator">
                        <td colSpan={6}>
                          Year {yearRow.year} — {yearRow.activeEntityCount} active{' '}
                          {yearRow.activeEntityCount === 1 ? 'entity' : 'entities'}
                        </td>
                      </tr>
                    );
                  }
                  yearRow.entities.forEach((entity) => {
                    rows.push(
                      <tr key={`${yearRow.year}-${entity.id}`}>
                        <td style={{ fontWeight: 500 }}>Year {yearRow.year}</td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{entity.name}</div>
                          <div
                            style={{
                              fontSize: 11,
                              color: 'var(--bc-text-muted)',
                              marginTop: 1,
                            }}
                          >
                            {entity.sector}
                          </div>
                        </td>
                        <td className="text-center" style={{ color: 'var(--bc-text-secondary)' }}>
                          Year {entity.launchYear}
                        </td>
                        <td className="text-right">{formatCrore(entity.revenueCrore)}</td>
                        <td className="text-right" style={{ color: 'var(--bc-positive)' }}>
                          {formatCrore(entity.profitCrore)}
                        </td>
                        <td className="text-right" style={{ color: 'var(--bc-text-secondary)' }}>
                          {formatPercent(entity.netMarginPercent)}
                        </td>
                      </tr>
                    );
                  });
                  return rows;
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="bc-mobile-only">
            {/* Mobile defaults to Year 1 via initial state, but user can switch */}
            <div style={{ marginBottom: 16 }}>
              <YearTabs value={yearFilter} onChange={setYearFilter} />
            </div>
            {(yearFilter === 'all'
              ? simulation.yearlyBreakdown
              : simulation.yearlyBreakdown.filter((r) => r.year === yearFilter)
            ).map((yearRow) => (
              <div key={yearRow.year}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--bc-accent)',
                    padding: '12px 0 8px',
                    letterSpacing: '0.03em',
                  }}
                >
                  Year {yearRow.year}
                </div>
                {yearRow.entities.map((entity) => (
                  <div key={`${yearRow.year}-${entity.id}`} className="bc-mobile-card">
                    <div className="bc-mobile-card-header">
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--bc-text-primary)' }}>
                        {entity.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--bc-text-muted)', marginTop: 2 }}>
                        {entity.sector}
                      </div>
                    </div>
                    <div className="bc-mobile-card-row">
                      <span className="bc-mobile-card-label">Launch</span>
                      <span className="bc-mobile-card-value">Year {entity.launchYear}</span>
                    </div>
                    <div className="bc-mobile-card-row">
                      <span className="bc-mobile-card-label">Revenue</span>
                      <span className="bc-mobile-card-value">{formatCrore(entity.revenueCrore)}</span>
                    </div>
                    <div className="bc-mobile-card-row">
                      <span className="bc-mobile-card-label">Net Profit</span>
                      <span style={{ color: 'var(--bc-positive)', fontWeight: 600 }}>
                        {formatCrore(entity.profitCrore)}
                      </span>
                    </div>
                    <div className="bc-mobile-card-row">
                      <span className="bc-mobile-card-label">Margin</span>
                      <span style={{ color: 'var(--bc-text-secondary)' }}>
                        {formatPercent(entity.netMarginPercent)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════
            DEPENDENCY METRICS
        ══════════════════════════════════════ */}
        <section className="bc-card" style={{ marginTop: 24, marginBottom: 40 }}>
          <SectionHeader
            title="Dependency Metrics"
            description="Ecosystem dependency loops showing provider relationships and revenue exposure."
          />

          {/* Desktop Table */}
          <div className="bc-desktop-only bc-table-wrap" style={{ overflowX: 'auto', margin: '0 -24px' }}>
            <table className="bc-table" style={{ minWidth: 860 }}>
              <thead>
                <tr>
                  <th style={{ minWidth: 160 }}>Loop</th>
                  <th style={{ minWidth: 100 }}>Providers</th>
                  <th style={{ minWidth: 160 }}>Covered Entities</th>
                  <th className="text-right" style={{ minWidth: 160 }}>
                    Year 4 Revenue Exposure
                  </th>
                  <th style={{ minWidth: 280 }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {simulation.dependencyMetrics.map((metric) => (
                  <tr key={metric.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--bc-text-primary)' }}>
                        {metric.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--bc-text-muted)', marginTop: 3 }}>
                        {metric.category}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {metric.providerNames.map((name) => (
                          <span key={name} className="bc-chip">
                            {name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {metric.coveredEntityNames.map((name) => (
                          <span key={name} className="bc-chip">
                            {name}
                          </span>
                        ))}
                        <span
                          style={{
                            fontSize: 11,
                            color: 'var(--bc-text-muted)',
                            alignSelf: 'center',
                            marginLeft: 2,
                          }}
                        >
                          ({metric.coveredEntityCount})
                        </span>
                      </div>
                    </td>
                    <td
                      className="text-right"
                      style={{
                        fontWeight: 600,
                        color: 'var(--bc-cyan)',
                        fontSize: 14,
                      }}
                    >
                      {formatCrore(metric.year4RevenueExposureCrore)}
                    </td>
                    <td style={{ color: 'var(--bc-text-secondary)', lineHeight: 1.5, fontSize: 13 }}>
                      {metric.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="bc-mobile-only">
            {simulation.dependencyMetrics.map((metric) => (
              <div key={metric.id} className="bc-mobile-card">
                <div className="bc-mobile-card-header">
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--bc-text-primary)' }}>
                    {metric.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--bc-text-muted)', marginTop: 3 }}>
                    {metric.category}
                  </div>
                </div>
                <div className="bc-mobile-card-row" style={{ alignItems: 'flex-start' }}>
                  <span className="bc-mobile-card-label">Provider</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end' }}>
                    {metric.providerNames.map((name) => (
                      <span key={name} className="bc-chip">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="bc-mobile-card-row" style={{ alignItems: 'flex-start' }}>
                  <span className="bc-mobile-card-label">Covered</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end' }}>
                    {metric.coveredEntityNames.map((name) => (
                      <span key={name} className="bc-chip">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="bc-mobile-card-row">
                  <span className="bc-mobile-card-label">Revenue Exposure</span>
                  <span style={{ fontWeight: 700, color: 'var(--bc-cyan)', fontSize: 15 }}>
                    {formatCrore(metric.year4RevenueExposureCrore)}
                  </span>
                </div>
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--bc-border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--bc-text-muted)', marginBottom: 4 }}>Notes</div>
                  <div style={{ fontSize: 13, color: 'var(--bc-text-secondary)', lineHeight: 1.5 }}>
                    {metric.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
