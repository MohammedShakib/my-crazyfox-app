import defaultScenario from '../data/bluecapDefaultScenario.json';

export const BLUECAP_TIMELINE = [1, 2, 3, 4];
export const BLUEBIRDS_OPERATIONAL_PROJECTION_END_YEAR = 2030;

const BLUEBIRDS_OPERATIONAL_BASE = {
  id: 'bluebirds',
  startYear: 2023,
  annualGrowthRatePercent: 10,
  sellPriceTakaPerEgg: 8,
  productionCostByYear: {
    2023: 2,
    2024: 1.75,
    2025: 1.75,
  },
  dailyCapacityByYear: {
    2023: 500000,
    2024: 2000000,
    2025: 3000000,
  },
};

const roundCrore = (value) => Number(Number(value || 0).toFixed(2));

const toFiniteNumber = (value, fallback) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const cloneScenario = (scenario) => JSON.parse(JSON.stringify(scenario));

const normalizeDependency = (dependency, fallbackDependency) => ({
  id: typeof dependency?.id === 'string' && dependency.id.trim() ? dependency.id : fallbackDependency.id,
  name: typeof dependency?.name === 'string' && dependency.name.trim() ? dependency.name : fallbackDependency.name,
  category:
    typeof dependency?.category === 'string' && dependency.category.trim()
      ? dependency.category
      : fallbackDependency.category,
  description:
    typeof dependency?.description === 'string' && dependency.description.trim()
      ? dependency.description
      : fallbackDependency.description,
  sourceEntityIds: Array.isArray(dependency?.sourceEntityIds) && dependency.sourceEntityIds.length > 0
    ? dependency.sourceEntityIds
    : fallbackDependency.sourceEntityIds,
  targetEntityIds: Array.isArray(dependency?.targetEntityIds) && dependency.targetEntityIds.length > 0
    ? dependency.targetEntityIds
    : fallbackDependency.targetEntityIds,
  exposureEntityIds: Array.isArray(dependency?.exposureEntityIds) && dependency.exposureEntityIds.length > 0
    ? dependency.exposureEntityIds
    : fallbackDependency.exposureEntityIds,
});

export function createBlueCapScenarioSnapshot() {
  return cloneScenario(defaultScenario);
}

export function normalizeBlueCapScenario(inputScenario) {
  const baseScenario = createBlueCapScenarioSnapshot();
  const sourceScenario = inputScenario && typeof inputScenario === 'object' ? inputScenario : {};
  const sourceConfig = sourceScenario.config && typeof sourceScenario.config === 'object' ? sourceScenario.config : {};
  const sourceEntities = Array.isArray(sourceScenario.entities) ? sourceScenario.entities : [];
  const sourceEntitiesById = new Map(
    sourceEntities
      .filter((entity) => entity && typeof entity.id === 'string')
      .map((entity) => [entity.id, entity])
  );
  const sourceDependencies = Array.isArray(sourceScenario.dependencies) ? sourceScenario.dependencies : [];
  const sourceDependenciesById = new Map(
    sourceDependencies
      .filter((dependency) => dependency && typeof dependency.id === 'string')
      .map((dependency) => [dependency.id, dependency])
  );

  return {
    slug:
      typeof sourceScenario.slug === 'string' && sourceScenario.slug.trim()
        ? sourceScenario.slug.trim()
        : baseScenario.slug,
    config: {
      initialCapitalCrore: toFiniteNumber(
        sourceConfig.initialCapitalCrore,
        baseScenario.config.initialCapitalCrore
      ),
      annualCapitalInjectionCrore: toFiniteNumber(
        sourceConfig.annualCapitalInjectionCrore,
        baseScenario.config.annualCapitalInjectionCrore
      ),
      regulatoryConstraintPercent: toFiniteNumber(
        sourceConfig.regulatoryConstraintPercent,
        baseScenario.config.regulatoryConstraintPercent
      ),
      reinvestmentRatePercent: toFiniteNumber(
        sourceConfig.reinvestmentRatePercent,
        baseScenario.config.reinvestmentRatePercent
      ),
    },
    entities: baseScenario.entities.map((baseEntity) => {
      const sourceEntity = sourceEntitiesById.get(baseEntity.id) || {};
      return {
        ...baseEntity,
        year4TargetRevenueCrore: toFiniteNumber(
          sourceEntity.year4TargetRevenueCrore,
          baseEntity.year4TargetRevenueCrore
        ),
        netMarginPercent: toFiniteNumber(
          sourceEntity.netMarginPercent,
          baseEntity.netMarginPercent
        ),
      };
    }),
    dependencies: baseScenario.dependencies.map((baseDependency) =>
      normalizeDependency(sourceDependenciesById.get(baseDependency.id), baseDependency)
    ),
  };
}

export function buildBlueCapSavePayload(inputScenario) {
  const scenario = normalizeBlueCapScenario(inputScenario);
  return {
    slug: scenario.slug,
    config: { ...scenario.config },
    entities: scenario.entities.map((entity) => ({
      id: entity.id,
      name: entity.name,
      sector: entity.sector,
      launchYear: entity.launchYear,
      year4TargetRevenueCrore: roundCrore(entity.year4TargetRevenueCrore),
      netMarginPercent: roundCrore(entity.netMarginPercent),
    })),
    dependencies: scenario.dependencies.map((dependency) => ({
      id: dependency.id,
      name: dependency.name,
      category: dependency.category,
      description: dependency.description,
      sourceEntityIds: [...dependency.sourceEntityIds],
      targetEntityIds: [...dependency.targetEntityIds],
      exposureEntityIds: [...dependency.exposureEntityIds],
    })),
  };
}

export function interpolateBlueCapEntityRevenue(entity, year) {
  if (year < entity.launchYear) return 0;
  const activeYears = BLUECAP_TIMELINE[BLUECAP_TIMELINE.length - 1] - entity.launchYear + 1;
  const elapsedYears = year - entity.launchYear + 1;
  return roundCrore(entity.year4TargetRevenueCrore * (elapsedYears / activeYears));
}

export function calculateBlueCapEntityYear(entity, year) {
  const revenueCrore = interpolateBlueCapEntityRevenue(entity, year);
  const profitCrore = roundCrore(revenueCrore * (entity.netMarginPercent / 100));
  return {
    ...entity,
    year,
    revenueCrore,
    profitCrore,
    isActive: year >= entity.launchYear,
  };
}

export function buildBlueBirdsOperationalProjection(endYear = BLUEBIRDS_OPERATIONAL_PROJECTION_END_YEAR) {
  const {
    id,
    startYear,
    annualGrowthRatePercent,
    sellPriceTakaPerEgg,
    productionCostByYear,
    dailyCapacityByYear,
  } = BLUEBIRDS_OPERATIONAL_BASE;

  let lastKnownDailyCapacity = dailyCapacityByYear[2025];
  const yearlyPerformance = [];

  for (let calendarYear = startYear; calendarYear <= endYear; calendarYear += 1) {
    const configuredCapacity = dailyCapacityByYear[calendarYear];
    const dailyCapacityEggs =
      typeof configuredCapacity === 'number'
        ? configuredCapacity
        : Math.round(lastKnownDailyCapacity * (1 + annualGrowthRatePercent / 100));

    lastKnownDailyCapacity = dailyCapacityEggs;

    const productionCostTakaPerEgg =
      productionCostByYear[calendarYear] ?? productionCostByYear[2025];
    const yearlyVolumeEggs = dailyCapacityEggs * 365;
    const revenueCrore = roundCrore((yearlyVolumeEggs * sellPriceTakaPerEgg) / 10000000);
    const profitCrore = roundCrore(
      (yearlyVolumeEggs * (sellPriceTakaPerEgg - productionCostTakaPerEgg)) / 10000000
    );
    const netMarginPercent = roundCrore(
      revenueCrore === 0 ? 0 : (profitCrore / revenueCrore) * 100
    );

    yearlyPerformance.push({
      entityId: id,
      year: calendarYear,
      calendarYear: String(calendarYear),
      dailyCapacityEggs,
      yearlyVolumeEggs,
      revenueCrore,
      profitCrore,
      netMarginPercent,
    });
  }

  return {
    entityId: id,
    heading: `Operational projection through ${endYear}`,
    description: 'Egg capacity model using fixed sell price, production cost, and 10% annual growth after 2025.',
    yearlyPerformance,
    totalNetProfitCrore: roundCrore(
      yearlyPerformance.reduce((sum, entry) => sum + entry.profitCrore, 0)
    ),
  };
}

export function simulateBlueCapScenario(inputScenario) {
  const scenario = normalizeBlueCapScenario(inputScenario);
  let cumulativeNetProfitCrore = 0;

  const entityLookup = new Map(scenario.entities.map((entity) => [entity.id, entity]));
  const yearlyBreakdown = BLUECAP_TIMELINE.map((year) => {
    const entities = scenario.entities.map((entity) => calculateBlueCapEntityYear(entity, year));
    const totalRevenueCrore = roundCrore(
      entities.reduce((sum, entity) => sum + entity.revenueCrore, 0)
    );
    const totalNetProfitCrore = roundCrore(
      entities.reduce((sum, entity) => sum + entity.profitCrore, 0)
    );
    cumulativeNetProfitCrore = roundCrore(cumulativeNetProfitCrore + totalNetProfitCrore);
    const capitalPoolEndOfYearCrore = roundCrore(
      scenario.config.initialCapitalCrore +
        year * scenario.config.annualCapitalInjectionCrore +
        cumulativeNetProfitCrore
    );

    return {
      year,
      entities,
      totalRevenueCrore,
      totalNetProfitCrore,
      cumulativeNetProfitCrore,
      capitalPoolEndOfYearCrore,
      activeEntityCount: entities.filter((entity) => entity.isActive).length,
    };
  });

  const year4 = yearlyBreakdown[yearlyBreakdown.length - 1];
  const mostProfitableEntity =
    year4.entities
      .slice()
      .sort(
        (left, right) =>
          right.profitCrore - left.profitCrore || left.name.localeCompare(right.name)
      )[0] || null;

  const dependencyMetrics = scenario.dependencies.map((dependency) => {
    const exposureEntities = dependency.exposureEntityIds
      .map((entityId) => year4.entities.find((entity) => entity.id === entityId))
      .filter(Boolean);
    const sourceEntities = dependency.sourceEntityIds
      .map((entityId) => entityLookup.get(entityId))
      .filter(Boolean);

    return {
      ...dependency,
      providerNames: sourceEntities.map((entity) => entity.name),
      coveredEntityNames: exposureEntities.map((entity) => entity.name),
      coveredEntityCount: exposureEntities.length,
      year4RevenueExposureCrore: roundCrore(
        exposureEntities.reduce((sum, entity) => sum + entity.revenueCrore, 0)
      ),
    };
  });

  return {
    scenario,
    yearlyBreakdown,
    year4Summary: {
      totalRevenueCrore: year4.totalRevenueCrore,
      totalNetProfitCrore: year4.totalNetProfitCrore,
      cumulativeNetProfitCrore: year4.cumulativeNetProfitCrore,
      capitalPoolEndOfYearCrore: year4.capitalPoolEndOfYearCrore,
      mostProfitableEntity,
    },
    dependencyMetrics,
  };
}
