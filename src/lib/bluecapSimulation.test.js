import defaultScenario from '../data/bluecapDefaultScenario.json';
import {
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

  test('computes default scenario year 4 rollups', () => {
    const simulation = simulateBlueCapScenario(defaultScenario);

    expect(simulation.year4Summary.totalRevenueCrore).toBe(2375);
    expect(simulation.year4Summary.totalNetProfitCrore).toBe(527.5);
    expect(simulation.year4Summary.mostProfitableEntity?.name).toBe('BlueBirds');
    expect(simulation.year4Summary.cumulativeNetProfitCrore).toBe(1004.5);
    expect(simulation.year4Summary.capitalPoolEndOfYearCrore).toBe(3504.5);
  });

  test('computes dependency exposure metrics from the current scenario', () => {
    const simulation = simulateBlueCapScenario(defaultScenario);
    const metricMap = new Map(simulation.dependencyMetrics.map((metric) => [metric.id, metric]));

    expect(metricMap.get('bluecash-payments')?.year4RevenueExposureCrore).toBe(1650);
    expect(metricMap.get('delivery-loop')?.year4RevenueExposureCrore).toBe(900);
    expect(metricMap.get('atech-tech-stack')?.year4RevenueExposureCrore).toBe(225);
    expect(metricMap.get('bluetex-supply-chain')?.year4RevenueExposureCrore).toBe(100);
  });

  test('builds the BlueBirds operational projection through 2030', () => {
    const projection = buildBlueBirdsOperationalProjection();
    const yearMap = new Map(projection.yearlyPerformance.map((entry) => [entry.year, entry]));

    expect(yearMap.get(2023)).toMatchObject({
      revenueCrore: 146,
      profitCrore: 109.5,
      netMarginPercent: 75,
    });

    expect(yearMap.get(2025)).toMatchObject({
      revenueCrore: 876,
      profitCrore: 684.38,
      netMarginPercent: 78.13,
    });

    expect(yearMap.get(2030)).toMatchObject({
      revenueCrore: 1410.81,
      profitCrore: 1102.19,
      netMarginPercent: 78.12,
    });

    expect(projection.totalNetProfitCrore).toBe(5846.11);
  });

  test('preserves the prompt-defined dependency providers and covered entities', () => {
    const simulation = simulateBlueCapScenario(defaultScenario);
    const metricMap = new Map(
      simulation.dependencyMetrics.map((metric) => [metric.id, metric])
    );

    expect(metricMap.get('atech-tech-stack')?.providerNames).toEqual(['Atech']);
    expect(metricMap.get('atech-tech-stack')?.coveredEntityNames).toEqual([
      'BlueSky',
      'BlueTaxi',
      'BlueCash',
    ]);

    expect(metricMap.get('delivery-loop')?.providerNames).toEqual([
      'BlueExpress',
      'BlueTaxi',
    ]);
    expect(metricMap.get('delivery-loop')?.coveredEntityNames).toEqual([
      'Hyundai Bangladesh',
      'Itra',
    ]);

    expect(metricMap.get('bluecash-payments')?.providerNames).toEqual(['BlueCash']);
    expect(metricMap.get('bluecash-payments')?.coveredEntityNames).toEqual([
      'Hyundai Bangladesh',
      'Itra',
      'BlueSky',
      'BlueBirds',
      'BlueExpress',
    ]);

    expect(metricMap.get('bluetex-supply-chain')?.providerNames).toEqual(['BlueTEX']);
    expect(metricMap.get('bluetex-supply-chain')?.coveredEntityNames).toEqual(['Itra']);
  });
});
