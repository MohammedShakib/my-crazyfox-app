import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiChevronDown, FiChevronUp, FiDatabase, FiRefreshCw, FiSave } from 'react-icons/fi';
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

const BLUECAP_START_YEAR = 2022;

const KPI_ACCENT = {
  revenue: 'bc-kpi-revenue',
  profit: 'bc-kpi-profit',
  capital: 'bc-kpi-capital',
  'most-profitable': 'bc-kpi-entity',
};

const roundCrore = (value) => Number(Number(value || 0).toFixed(2));

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

const getCalendarYear = (timelineYear) => BLUECAP_START_YEAR + timelineYear - 1;

const formatCalendarYear = (timelineYear) => String(getCalendarYear(timelineYear));

function SectionHeader({ title, description, children }) {
  return (
    <div className="bc-section-header">
      <div style={{ minWidth: 0 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--bc-text-primary)', margin: 0 }}>
          {title}
        </h2>
        {description ? (
          <p style={{ fontSize: 13, color: 'var(--bc-text-secondary)', marginTop: 6, lineHeight: 1.5 }}>
            {description}
          </p>
        ) : null}
      </div>
      {children ? <div className="flex items-center gap-3 flex-wrap flex-shrink-0">{children}</div> : null}
    </div>
  );
}

function EntityTimelineDetails({ details }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--bc-text-muted)', marginBottom: 14 }}>
        Active-year breakdown from launch onward.
      </div>

      <div className="bc-desktop-only bc-table-wrap" style={{ overflowX: 'auto' }}>
        <table className="bc-table" style={{ minWidth: 620 }}>
          <thead>
            <tr>
              <th>Year</th>
              <th className="text-right">Revenue</th>
              <th className="text-right">Net Profit</th>
              <th className="text-right">Profit Margin</th>
            </tr>
          </thead>
          <tbody>
            {details.yearlyPerformance.map((yearEntry) => (
              <tr key={`${details.entityId}-${yearEntry.year}`}>
                <td style={{ fontWeight: 600 }}>{yearEntry.calendarYear}</td>
                <td className="text-right">{formatCrore(yearEntry.revenueCrore)}</td>
                <td className="text-right" style={{ color: 'var(--bc-positive)' }}>
                  {formatCrore(yearEntry.profitCrore)}
                </td>
                <td className="text-right" style={{ color: 'var(--bc-text-secondary)' }}>
                  {formatPercent(yearEntry.netMarginPercent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bc-mobile-only">
        {details.yearlyPerformance.map((yearEntry) => (
          <div key={`${details.entityId}-${yearEntry.year}`} className="bc-mobile-card">
            <div className="bc-mobile-card-header">
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--bc-text-primary)' }}>
                {yearEntry.calendarYear}
              </div>
            </div>
            <div className="bc-mobile-card-row">
              <span className="bc-mobile-card-label">Revenue</span>
              <span className="bc-mobile-card-value">{formatCrore(yearEntry.revenueCrore)}</span>
            </div>
            <div className="bc-mobile-card-row">
              <span className="bc-mobile-card-label">Net Profit</span>
              <span style={{ color: 'var(--bc-positive)', fontWeight: 600 }}>
                {formatCrore(yearEntry.profitCrore)}
              </span>
            </div>
            <div className="bc-mobile-card-row">
              <span className="bc-mobile-card-label">Profit Margin</span>
              <span style={{ color: 'var(--bc-text-secondary)' }}>
                {formatPercent(yearEntry.netMarginPercent)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EntityTableRow({ entity, details, updateEntityValue, finalYearLabel }) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = `bluecap-entity-${entity.id}`;

  return (
    <>
      <tr>
        <td>
          <button
            type="button"
            aria-label={`Toggle ${entity.name} yearly breakdown`}
            aria-expanded={isOpen}
            aria-controls={panelId}
            onClick={() => setIsOpen((current) => !current)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: 0,
              background: 'transparent',
              border: 0,
              cursor: 'pointer',
              color: 'inherit',
              textAlign: 'left',
            }}
          >
            <span style={{ color: 'var(--bc-accent)', display: 'inline-flex' }}>
              {isOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
            </span>
            <span>
              <div style={{ fontWeight: 600, color: 'var(--bc-text-primary)' }}>{entity.name}</div>
              <div style={{ fontSize: 11, color: 'var(--bc-text-muted)', marginTop: 2 }}>
                Click to view yearly performance
              </div>
            </span>
          </button>
        </td>
        <td style={{ color: 'var(--bc-text-secondary)', fontSize: 13 }}>{entity.sector}</td>
        <td className="text-center" style={{ fontWeight: 500 }}>
          {formatCalendarYear(entity.launchYear)}
        </td>
        <td className="text-right" style={{ width: 180 }}>
          <input
            aria-label={`${finalYearLabel} revenue target for ${entity.name}`}
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
            aria-label={`Profit margin for ${entity.name}`}
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
        <td className="text-right" style={{ fontWeight: 600, color: 'var(--bc-positive)' }}>
          {formatCrore(details.totalNetProfitCrore)}
        </td>
      </tr>
      {isOpen ? (
        <tr id={panelId}>
          <td colSpan={6} style={{ padding: '0 24px 20px 58px', background: 'rgba(148,163,184,0.02)' }}>
            <EntityTimelineDetails details={details} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function EntityMobileCard({ entity, details, updateEntityValue, finalYearLabel }) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = `bluecap-mobile-entity-${entity.id}`;

  return (
    <div className="bc-mobile-card">
      <button
        type="button"
        aria-label={`Toggle ${entity.name} yearly breakdown`}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((current) => !current)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: 0,
          background: 'transparent',
          border: 0,
          cursor: 'pointer',
          textAlign: 'left',
          color: 'inherit',
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--bc-text-primary)' }}>{entity.name}</div>
          <div style={{ fontSize: 11, color: 'var(--bc-text-muted)', marginTop: 2 }}>{entity.sector}</div>
        </div>
        <span style={{ color: 'var(--bc-accent)', display: 'inline-flex' }}>
          {isOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
        </span>
      </button>

      <div className="bc-mobile-card-row" style={{ marginTop: 12 }}>
        <span className="bc-mobile-card-label">Launch</span>
        <span className="bc-mobile-card-value">{formatCalendarYear(entity.launchYear)}</span>
      </div>

      <div style={{ padding: '8px 0' }}>
        <label
          className="bc-label"
          htmlFor={`bc-m-revenue-${entity.id}`}
          style={{ marginBottom: 6 }}
        >
          {finalYearLabel} Revenue Target
        </label>
        <input
          id={`bc-m-revenue-${entity.id}`}
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
          Profit Margin (%)
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
        <span className="bc-mobile-card-label">Total Net Profit</span>
        <span style={{ fontWeight: 700, color: 'var(--bc-positive)', fontSize: 15 }}>
          {formatCrore(details.totalNetProfitCrore)}
        </span>
      </div>

      {isOpen ? (
        <div id={panelId} style={{ marginTop: 14 }}>
          <EntityTimelineDetails details={details} />
        </div>
      ) : null}
    </div>
  );
}

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

    try {
      const response = await fetch(BLUECAP_ENDPOINTS.update, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildBlueCapSavePayload(scenario)),
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
  const finalYearLabel = formatCalendarYear(4);

  const entityBreakdownById = useMemo(() => {
    const breakdownMap = new Map();

    scenario.entities.forEach((entity) => {
      const yearlyPerformance = simulation.yearlyBreakdown
        .map((yearRow) => yearRow.entities.find((entry) => entry.id === entity.id))
        .filter((entry) => entry && entry.isActive)
        .map((entry) => ({
          ...entry,
          calendarYear: formatCalendarYear(entry.year),
        }));

      breakdownMap.set(entity.id, {
        entityId: entity.id,
        yearlyPerformance,
        totalNetProfitCrore: roundCrore(
          yearlyPerformance.reduce((sum, entry) => sum + entry.profitCrore, 0)
        ),
      });
    });

    return breakdownMap;
  }, [scenario.entities, simulation.yearlyBreakdown]);

  const summaryCards = [
    {
      id: 'revenue',
      label: `${finalYearLabel} Total Revenue`,
      value: formatCrore(simulation.year4Summary.totalRevenueCrore),
      helper: 'Aggregate revenue across all subsidiaries.',
    },
    {
      id: 'profit',
      label: `${finalYearLabel} Net Profit`,
      value: formatCrore(simulation.year4Summary.totalNetProfitCrore),
      helper: `${finalYearLabel} net profit from the current assumptions.`,
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
        ? `${formatCrore(simulation.year4Summary.mostProfitableEntity.profitCrore)} net profit in ${finalYearLabel}`
        : `No active entities in ${finalYearLabel}.`,
    },
  ];

  if (isLoading) {
    return <LoadingScreen title="Loading BlueCAP simulator..." />;
  }

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
            onMouseEnter={(event) => {
              event.currentTarget.style.color = 'var(--bc-accent)';
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color = 'var(--bc-text-secondary)';
            }}
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

        <section className="bc-card" style={{ marginTop: 24 }}>
          <SectionHeader
            title="Scenario Controls"
            description="Update global capital assumptions and final-year targets. All outputs recalculate immediately."
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

          {errorMessage || saveMessage ? (
            <div className={errorMessage ? 'bc-msg-error' : 'bc-msg-success'}>
              {errorMessage || saveMessage}
            </div>
          ) : null}

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

        <section className="bc-card" style={{ marginTop: 24 }}>
          <SectionHeader
            title="Entity Targets"
            description="Set the final-year revenue target and profit margin. Open any entity to inspect its active-year profit breakdown."
          >
            <div className="bc-badge">
              <FiDatabase size={13} />
              {scenario.entities.length} subsidiaries
            </div>
          </SectionHeader>

          <div className="bc-desktop-only bc-table-wrap" style={{ overflowX: 'auto', margin: '0 -24px' }}>
            <table className="bc-table" style={{ minWidth: 940 }}>
              <thead>
                <tr>
                  <th>Entity</th>
                  <th>Sector</th>
                  <th className="text-center">Launch</th>
                  <th className="text-right">{finalYearLabel} Revenue Target</th>
                  <th className="text-right">Profit Margin</th>
                  <th className="text-right">Total Net Profit</th>
                </tr>
              </thead>
              <tbody>
                {scenario.entities.map((entity) => (
                  <EntityTableRow
                    key={entity.id}
                    entity={entity}
                    details={entityBreakdownById.get(entity.id)}
                    updateEntityValue={updateEntityValue}
                    finalYearLabel={finalYearLabel}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="bc-mobile-only">
            {scenario.entities.map((entity) => (
              <EntityMobileCard
                key={entity.id}
                entity={entity}
                details={entityBreakdownById.get(entity.id)}
                updateEntityValue={updateEntityValue}
                finalYearLabel={finalYearLabel}
              />
            ))}
          </div>
        </section>

        <section className="bc-card" style={{ marginTop: 24, marginBottom: 40 }}>
          <SectionHeader
            title="Dependency Metrics"
            description="Ecosystem dependency loops showing provider relationships and revenue exposure."
          />

          <div className="bc-desktop-only bc-table-wrap" style={{ overflowX: 'auto', margin: '0 -24px' }}>
            <table className="bc-table" style={{ minWidth: 860 }}>
              <thead>
                <tr>
                  <th style={{ minWidth: 160 }}>Loop</th>
                  <th style={{ minWidth: 100 }}>Providers</th>
                  <th style={{ minWidth: 160 }}>Covered Entities</th>
                  <th className="text-right" style={{ minWidth: 160 }}>
                    {finalYearLabel} Revenue Exposure
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
                    <td className="text-right" style={{ fontWeight: 600, color: 'var(--bc-cyan)', fontSize: 14 }}>
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
