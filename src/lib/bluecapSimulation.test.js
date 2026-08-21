import defaultScenario from '../data/bluecapDefaultScenario.json';
import {
  BLUECAP_CALENDAR_YEARS,
  buildBlueCapEntityProjection,
  buildBlueBirdsOperationalProjection,
  calculateBlueCapEntityYear,
  normalizeBlueCapScenario,
  simulateBlueCapScenario,
} from './bluecapSimulation';

describe('bluecapSimulation', () => {
  const scenario = normalizeBlueCapScenario(defaultScenario);

  test('interpolates launch year 1 entities across four active years', () => {
    const atech = scenario.entities.find((entity) => entity.id === 'atech');

    expect(calculateBlueCapEntityYear(atech, 1).revenueCrore).toBe(37.5);
    expect(calculateBlueCapEntityYear(atech, 2).revenueCrore).toBe(75);
    expect(calculateBlueCapEntityYear(atech, 3).revenueCrore).toBe(112.5);
    expect(calculateBlueCapEntityYear(atech, 4).revenueCrore).toBe(150);
  });

  test('interpolates launch year 2 entities across three active years', () => {
    const bluesky = scenario.entities.find((entity) => entity.id === 'bluesky');

    expect(calculateBlueCapEntityYear(bluesky, 1).revenueCrore).toBe(0);
    expect(calculateBlueCapEntityYear(bluesky, 2).revenueCrore).toBe(50);
    expect(calculateBlueCapEntityYear(bluesky, 3).revenueCrore).toBe(100);
    expect(calculateBlueCapEntityYear(bluesky, 4).revenueCrore).toBe(150);
  });

  test('interpolates launch year 3 entities across two active years', () => {
    const bluecash = scenario.entities.find((entity) => entity.id === 'bluecash');

    expect(calculateBlueCapEntityYear(bluecash, 2).revenueCrore).toBe(0);
    expect(calculateBlueCapEntityYear(bluecash, 3).revenueCrore).toBe(22.5);
    expect(calculateBlueCapEntityYear(bluecash, 4).revenueCrore).toBe(45);
  });

  test('activates launch year 4 entities only in year 4', () => {
    const bluetaxi = scenario.entities.find((entity) => entity.id === 'bluetaxi');

    expect(calculateBlueCapEntityYear(bluetaxi, 3).revenueCrore).toBe(0);
    expect(calculateBlueCapEntityYear(bluetaxi, 4).revenueCrore).toBe(30);
    expect(calculateBlueCapEntityYear(bluetaxi, 4).profitCrore).toBe(4.5);
  });

  test('normalizes a yearly injection schedule through 2030', () => {
    expect(scenario.config.yearlyCapitalInjectionsCrore['2022']).toBe(500);
    expect(scenario.config.yearlyCapitalInjectionsCrore['2030']).toBe(500);
    expect(Object.keys(scenario.config.yearlyCapitalInjectionsCrore)).toHaveLength(
      BLUECAP_CALENDAR_YEARS.length
    );
  });

  test('builds the BlueBirds operational projection through 2030 with new business lines', () => {
    const projection = buildBlueBirdsOperationalProjection();
    const yearMap = new Map(projection.yearlyPerformance.map((entry) => [entry.year, entry]));

    expect(yearMap.get(2023)).toMatchObject({
      revenueCrore: 146,
      profitCrore: 109.5,
      netMarginPercent: 75,
    });

    expect(yearMap.get(2026)?.businessLines.map((line) => line.name)).toEqual([
      'Egg Production',
      'Milk Production',
      'Meat Production',
      'Raw Chicken & Cuttings',
    ]);
    expect(yearMap.get(2026)?.revenueCrore).toBeGreaterThan(yearMap.get(2025)?.revenueCrore);
    expect(yearMap.get(2030)?.revenueCrore).toBeGreaterThan(yearMap.get(2026)?.revenueCrore);
  });

  test('extends standard entity projections through 2030 with fixed baseline margin', () => {
    const atech = scenario.entities.find((entity) => entity.id === 'atech');
    const projection = buildBlueCapEntityProjection(atech);
    const yearMap = new Map(projection.yearlyPerformance.map((entry) => [entry.year, entry]));

    expect(yearMap.get(2025)).toMatchObject({
      revenueCrore: 150,
      profitCrore: 60,
      netMarginPercent: 40,
    });
    expect(yearMap.get(2030)?.revenueCrore).toBeGreaterThan(yearMap.get(2025)?.revenueCrore);
    expect(yearMap.get(2030)?.netMarginPercent).toBe(40);
  });

  test('simulates yearly funding allocations through 2030', () => {
    const simulation = simulateBlueCapScenario(defaultScenario);
    const yearMap = new Map(
      simulation.yearlyFundingBreakdown.map((entry) => [entry.calendarYear, entry])
    );

    expect(simulation.latestYearSummary.calendarYear).toBe(2030);
    expect(simulation.yearlyFundingBreakdown).toHaveLength(BLUECAP_CALENDAR_YEARS.length);
    expect(yearMap.get(2022)).toMatchObject({
      activeEntityCount: 2,
      capitalInjectionCrore: 500,
    });
    expect(yearMap.get(2026)?.equalAllocationCrore).toBeGreaterThan(0);
    expect(simulation.latestYearSummary.cumulativeNetProfitCrore).toBeGreaterThan(
      simulation.latestYearSummary.totalNetProfitCrore
    );
    expect(simulation.latestYearSummary.mostProfitableEntity?.name).toBe('BlueBirds');
  });

  test('computes dependency exposure metrics from the latest simulated year', () => {
    const simulation = simulateBlueCapScenario(defaultScenario);
    const metricMap = new Map(simulation.dependencyMetrics.map((metric) => [metric.id, metric]));

    expect(metricMap.get('bluecash-payments')?.latestYearRevenueExposureCrore).toBeGreaterThan(0);
    expect(metricMap.get('delivery-loop')?.latestYearRevenueExposureCrore).toBeGreaterThan(0);
    expect(metricMap.get('atech-tech-stack')?.providerNames).toEqual(['Atech']);
    expect(metricMap.get('bluetex-supply-chain')?.coveredEntityNames).toEqual(['Itra']);
  });
});
