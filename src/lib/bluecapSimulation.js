import defaultScenario from '../data/bluecapDefaultScenario.json';

export const BLUECAP_TIMELINE = [1, 2, 3, 4];
export const BLUECAP_START_CALENDAR_YEAR = 2022;
export const BLUECAP_BASELINE_END_YEAR = 2025;
export const BLUECAP_PROJECTION_END_YEAR = 2030;
export const BLUECAP_STANDARD_PROJECTION_GROWTH_RATE_PERCENT = 10;
export const BLUECAP_CALENDAR_YEARS = Array.from(
  { length: BLUECAP_PROJECTION_END_YEAR - BLUECAP_START_CALENDAR_YEAR + 1 },
  (_, index) => BLUECAP_START_CALENDAR_YEAR + index
);

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
  businessLines: [
    {
      id: 'milk',
      name: 'Milk Production',
      startYear: 2026,
      baseRevenueCrore: 180,
      annualGrowthRatePercent: 12,
      netMarginPercent: 24,
    },
    {
      id: 'meat',
      name: 'Meat Production',
      startYear: 2026,
      baseRevenueCrore: 240,
      annualGrowthRatePercent: 14,
      netMarginPercent: 26,
    },
    {
      id: 'raw-chicken',
      name: 'Raw Chicken & Cuttings',
      startYear: 2026,
      baseRevenueCrore: 120,
      annualGrowthRatePercent: 11,
      netMarginPercent: 22,
    },
  ],
};

const STANDARD_ENTITY_REVENUE_SENSITIVITY = 0.45;
const STANDARD_ENTITY_MARGIN_DELTA = 6;
const BLUEBIRDS_REVENUE_SENSITIVITY = 0.55;
const BLUEBIRDS_MARGIN_DELTA = 4;

const roundCrore = (value) => Number(Number(value || 0).toFixed(2));

const toFiniteNumber = (value, fallback) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

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

const createDefaultInjectionSchedule = (annualCapitalInjectionCrore) =>
  BLUECAP_CALENDAR_YEARS.reduce((schedule, calendarYear) => {
    schedule[String(calendarYear)] = roundCrore(annualCapitalInjectionCrore);
    return schedule;
  }, {});

const normalizeInjectionSchedule = (sourceSchedule, fallbackAnnualCapitalInjectionCrore) => {
  const fallbackSchedule = createDefaultInjectionSchedule(fallbackAnnualCapitalInjectionCrore);

  return BLUECAP_CALENDAR_YEARS.reduce((schedule, calendarYear) => {
    const calendarYearKey = String(calendarYear);
    schedule[calendarYearKey] = roundCrore(
      toFiniteNumber(sourceSchedule?.[calendarYearKey], fallbackSchedule[calendarYearKey])
    );
    return schedule;
  }, {});
};

const getCalendarYear = (timelineYear) => BLUECAP_START_CALENDAR_YEAR + timelineYear - 1;

const getTimelineYear = (calendarYear) => calendarYear - BLUECAP_START_CALENDAR_YEAR + 1;

const getEntityLaunchCalendarYear = (entity) => getCalendarYear(entity.launchYear);

const getScenarioInjectionForYear = (config, calendarYear) =>
  roundCrore(
    toFiniteNumber(
      config?.yearlyCapitalInjectionsCrore?.[String(calendarYear)],
      config?.annualCapitalInjectionCrore ?? 0
    )
  );

const getRegulatoryRevenueMultiplier = (regulatoryConstraintPercent) =>
  clamp(1 - regulatoryConstraintPercent / 200, 0.4, 1);

const getAdjustedMarginPercent = (
  baseMarginPercent,
  allocationRatio,
  regulatoryConstraintPercent,
  marginDeltaCap
) =>
  roundCrore(
    clamp(
      baseMarginPercent +
        clamp((allocationRatio - 1) * marginDeltaCap, -marginDeltaCap, marginDeltaCap) -
        regulatoryConstraintPercent * 0.1,
      1,
      90
    )
  );

const scaleRevenueByAllocation = (
  baseRevenueCrore,
  allocationRatio,
  sensitivity,
  regulatoryConstraintPercent
) =>
  roundCrore(
    baseRevenueCrore *
      Math.pow(Math.max(allocationRatio, 0.2), sensitivity) *
      getRegulatoryRevenueMultiplier(regulatoryConstraintPercent)
  );

const buildBlueBirdsBaseYear = (calendarYear) => {
  const {
    startYear,
    annualGrowthRatePercent,
    sellPriceTakaPerEgg,
    productionCostByYear,
    dailyCapacityByYear,
    businessLines,
  } = BLUEBIRDS_OPERATIONAL_BASE;

  if (calendarYear < startYear) {
    return null;
  }

  let dailyCapacityEggs = dailyCapacityByYear[2025];
  if (dailyCapacityByYear[calendarYear]) {
    dailyCapacityEggs = dailyCapacityByYear[calendarYear];
  } else if (calendarYear > 2025) {
    dailyCapacityEggs = Math.round(
      dailyCapacityByYear[2025] * Math.pow(1 + annualGrowthRatePercent / 100, calendarYear - 2025)
    );
  }

  const productionCostTakaPerEgg = productionCostByYear[calendarYear] ?? productionCostByYear[2025];
  const yearlyVolumeEggs = dailyCapacityEggs * 365;
  const eggRevenueCrore = roundCrore((yearlyVolumeEggs * sellPriceTakaPerEgg) / 10000000);
  const eggProfitCrore = roundCrore(
    (yearlyVolumeEggs * (sellPriceTakaPerEgg - productionCostTakaPerEgg)) / 10000000
  );
  const eggMarginPercent = roundCrore(
    eggRevenueCrore === 0 ? 0 : (eggProfitCrore / eggRevenueCrore) * 100
  );

  const baseBusinessLines = [
    {
      id: 'eggs',
      name: 'Egg Production',
      revenueCrore: eggRevenueCrore,
      profitCrore: eggProfitCrore,
      netMarginPercent: eggMarginPercent,
    },
  ];

  businessLines.forEach((line) => {
    if (calendarYear < line.startYear) {
      return;
    }

    const activeYears = calendarYear - line.startYear;
    const revenueCrore = roundCrore(
      line.baseRevenueCrore * Math.pow(1 + line.annualGrowthRatePercent / 100, activeYears)
    );
    const profitCrore = roundCrore(revenueCrore * (line.netMarginPercent / 100));

    baseBusinessLines.push({
      id: line.id,
      name: line.name,
      revenueCrore,
      profitCrore,
      netMarginPercent: roundCrore(line.netMarginPercent),
    });
  });

  const revenueCrore = roundCrore(
    baseBusinessLines.reduce((sum, line) => sum + line.revenueCrore, 0)
  );
  const profitCrore = roundCrore(
    baseBusinessLines.reduce((sum, line) => sum + line.profitCrore, 0)
  );

  return {
    entityId: BLUEBIRDS_OPERATIONAL_BASE.id,
    year: calendarYear,
    calendarYear: String(calendarYear),
    dailyCapacityEggs,
    yearlyVolumeEggs,
    revenueCrore,
    profitCrore,
    netMarginPercent: roundCrore(revenueCrore === 0 ? 0 : (profitCrore / revenueCrore) * 100),
    businessLines: baseBusinessLines,
  };
};

const applyAllocationToBlueBirdsYear = (baseEntry, allocationRatio, regulatoryConstraintPercent) => {
  if (!baseEntry) {
    return null;
  }

  const businessLines = baseEntry.businessLines.map((line) => {
    const revenueCrore = scaleRevenueByAllocation(
      line.revenueCrore,
      allocationRatio,
      BLUEBIRDS_REVENUE_SENSITIVITY,
      regulatoryConstraintPercent
    );
    const netMarginPercent = getAdjustedMarginPercent(
      line.netMarginPercent,
      allocationRatio,
      regulatoryConstraintPercent,
      BLUEBIRDS_MARGIN_DELTA
    );
    const profitCrore = roundCrore(revenueCrore * (netMarginPercent / 100));

    return {
      ...line,
      revenueCrore,
      profitCrore,
      netMarginPercent,
    };
  });

  const revenueCrore = roundCrore(businessLines.reduce((sum, line) => sum + line.revenueCrore, 0));
  const profitCrore = roundCrore(businessLines.reduce((sum, line) => sum + line.profitCrore, 0));

  return {
    ...baseEntry,
    revenueCrore,
    profitCrore,
    netMarginPercent: roundCrore(revenueCrore === 0 ? 0 : (profitCrore / revenueCrore) * 100),
    businessLines,
    allocationRatio: roundCrore(allocationRatio),
  };
};

const buildBlueCapBaseEntityYear = (entity, calendarYear) => {
  if (calendarYear < getEntityLaunchCalendarYear(entity)) {
    return null;
  }

  let revenueCrore = 0;
  if (calendarYear <= BLUECAP_BASELINE_END_YEAR) {
    revenueCrore = calculateBlueCapEntityYear(entity, getTimelineYear(calendarYear)).revenueCrore;
  } else {
    revenueCrore = roundCrore(
      entity.year4TargetRevenueCrore *
        Math.pow(
          1 + BLUECAP_STANDARD_PROJECTION_GROWTH_RATE_PERCENT / 100,
          calendarYear - BLUECAP_BASELINE_END_YEAR
        )
    );
  }

  const netMarginPercent = roundCrore(entity.netMarginPercent);
  const profitCrore = roundCrore(revenueCrore * (netMarginPercent / 100));

  return {
    ...entity,
    year: calendarYear,
    calendarYear: String(calendarYear),
    revenueCrore,
    profitCrore,
    netMarginPercent,
  };
};

const applyAllocationToStandardEntityYear = (
  entity,
  baseEntry,
  allocationRatio,
  regulatoryConstraintPercent
) => {
  if (!baseEntry) {
    return null;
  }

  const revenueCrore = scaleRevenueByAllocation(
    baseEntry.revenueCrore,
    allocationRatio,
    STANDARD_ENTITY_REVENUE_SENSITIVITY,
    regulatoryConstraintPercent
  );
  const netMarginPercent = getAdjustedMarginPercent(
    entity.netMarginPercent,
    allocationRatio,
    regulatoryConstraintPercent,
    STANDARD_ENTITY_MARGIN_DELTA
  );
  const profitCrore = roundCrore(revenueCrore * (netMarginPercent / 100));

  return {
    ...baseEntry,
    revenueCrore,
    profitCrore,
    netMarginPercent,
    allocationRatio: roundCrore(allocationRatio),
  };
};

const buildBaselineProjectionByEntity = (scenario) => {
  const projectionByEntity = new Map();

  scenario.entities.forEach((entity) => {
    if (entity.id === BLUEBIRDS_OPERATIONAL_BASE.id) {
      const blueBirdsProjection = buildBlueBirdsOperationalProjection();
      projectionByEntity.set(entity.id, blueBirdsProjection.yearlyPerformance);
      return;
    }

    const projection = buildBlueCapEntityProjection(entity);
    projectionByEntity.set(entity.id, projection.yearlyPerformance);
  });

  return projectionByEntity;
};

const buildBaselineFundingPlan = (scenario, baselineProjectionByEntity) => {
  let retainedProfitCarryForwardCrore = 0;
  let cumulativeNetProfitCrore = 0;
  let cumulativeRetainedProfitCrore = 0;
  let cumulativeCapitalInjectionCrore = 0;

  return BLUECAP_CALENDAR_YEARS.map((calendarYear) => {
    const activeEntities = scenario.entities.filter(
      (entity) => getEntityLaunchCalendarYear(entity) <= calendarYear
    );
    const capitalInjectionCrore = getScenarioInjectionForYear(
      {
        ...scenario.config,
        yearlyCapitalInjectionsCrore: createDefaultInjectionSchedule(
          scenario.config.annualCapitalInjectionCrore
        ),
      },
      calendarYear
    );
    const deployableCapitalCrore = roundCrore(
      capitalInjectionCrore + retainedProfitCarryForwardCrore
    );
    const equalAllocationCrore = roundCrore(
      activeEntities.length === 0 ? 0 : deployableCapitalCrore / activeEntities.length
    );
    const yearEntries = activeEntities
      .map((entity) =>
        baselineProjectionByEntity
          .get(entity.id)
          ?.find((entry) => entry.year === calendarYear)
      )
      .filter(Boolean);

    const totalRevenueCrore = roundCrore(
      yearEntries.reduce((sum, entry) => sum + entry.revenueCrore, 0)
    );
    const totalNetProfitCrore = roundCrore(
      yearEntries.reduce((sum, entry) => sum + entry.profitCrore, 0)
    );
    const retainedProfitCrore = roundCrore(
      totalNetProfitCrore * (scenario.config.reinvestmentRatePercent / 100)
    );

    retainedProfitCarryForwardCrore = retainedProfitCrore;
    cumulativeNetProfitCrore = roundCrore(cumulativeNetProfitCrore + totalNetProfitCrore);
    cumulativeRetainedProfitCrore = roundCrore(
      cumulativeRetainedProfitCrore + retainedProfitCrore
    );
    cumulativeCapitalInjectionCrore = roundCrore(
      cumulativeCapitalInjectionCrore + capitalInjectionCrore
    );

    return {
      calendarYear,
      capitalInjectionCrore,
      retainedProfitCarryForwardCrore: roundCrore(retainedProfitCarryForwardCrore),
      retainedProfitCrore,
      deployableCapitalCrore,
      equalAllocationCrore,
      totalRevenueCrore,
      totalNetProfitCrore,
      cumulativeNetProfitCrore,
      cumulativeRetainedProfitCrore,
      capitalPoolEndOfYearCrore: roundCrore(
        scenario.config.initialCapitalCrore +
          cumulativeCapitalInjectionCrore +
          cumulativeRetainedProfitCrore
      ),
    };
  });
};

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

  const annualCapitalInjectionCrore = toFiniteNumber(
    sourceConfig.annualCapitalInjectionCrore,
    baseScenario.config.annualCapitalInjectionCrore
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
      annualCapitalInjectionCrore,
      yearlyCapitalInjectionsCrore: normalizeInjectionSchedule(
        sourceConfig.yearlyCapitalInjectionsCrore,
        annualCapitalInjectionCrore
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
    config: {
      ...scenario.config,
      yearlyCapitalInjectionsCrore: { ...scenario.config.yearlyCapitalInjectionsCrore },
    },
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

export function buildBlueBirdsOperationalProjection({
  endYear = BLUECAP_PROJECTION_END_YEAR,
  allocationRatioByYear = {},
  regulatoryConstraintPercent = 0,
} = {}) {
  const yearlyPerformance = [];

  for (
    let calendarYear = BLUEBIRDS_OPERATIONAL_BASE.startYear;
    calendarYear <= endYear;
    calendarYear += 1
  ) {
    const baseEntry = buildBlueBirdsBaseYear(calendarYear);
    const allocationRatio = toFiniteNumber(allocationRatioByYear[calendarYear], 1);
    const actualEntry = applyAllocationToBlueBirdsYear(
      baseEntry,
      allocationRatio,
      regulatoryConstraintPercent
    );

    yearlyPerformance.push(actualEntry);
  }

  return {
    entityId: BLUEBIRDS_OPERATIONAL_BASE.id,
    heading: `Projected breakdown through ${endYear}`,
    description:
      'Egg production starts in 2023. Milk, meat, and raw chicken lines are layered in from 2026, then scaled by equal capital allocation versus the baseline plan.',
    yearlyPerformance,
    totalNetProfitCrore: roundCrore(
      yearlyPerformance.reduce((sum, entry) => sum + entry.profitCrore, 0)
    ),
  };
}

export function buildBlueCapEntityProjection(
  entity,
  {
    endYear = BLUECAP_PROJECTION_END_YEAR,
    allocationRatioByYear = {},
    regulatoryConstraintPercent = 0,
  } = {}
) {
  const launchCalendarYear = getEntityLaunchCalendarYear(entity);
  const yearlyPerformance = [];

  for (let calendarYear = launchCalendarYear; calendarYear <= endYear; calendarYear += 1) {
    const baseEntry = buildBlueCapBaseEntityYear(entity, calendarYear);
    const allocationRatio = toFiniteNumber(allocationRatioByYear[calendarYear], 1);
    const actualEntry = applyAllocationToStandardEntityYear(
      entity,
      baseEntry,
      allocationRatio,
      regulatoryConstraintPercent
    );

    yearlyPerformance.push(actualEntry);
  }

  return {
    entityId: entity.id,
    heading: `Projected breakdown through ${endYear}`,
    description:
      'Uses the 2022-2025 business ramp as the baseline, then extends growth to 2030 while scaling against equal capital allocation per active entity.',
    yearlyPerformance,
    totalNetProfitCrore: roundCrore(
      yearlyPerformance.reduce((sum, entry) => sum + entry.profitCrore, 0)
    ),
  };
}

export function simulateBlueCapScenario(inputScenario) {
  const scenario = normalizeBlueCapScenario(inputScenario);
  const baselineProjectionByEntity = buildBaselineProjectionByEntity(scenario);
  const baselineFundingPlan = buildBaselineFundingPlan(scenario, baselineProjectionByEntity);
  const baselineFundingByYear = new Map(
    baselineFundingPlan.map((entry) => [entry.calendarYear, entry])
  );
  const entityLookup = new Map(scenario.entities.map((entity) => [entity.id, entity]));
  const entityBreakdownState = new Map(
    scenario.entities.map((entity) => [
      entity.id,
      {
        entity,
        entityId: entity.id,
        heading: `Projected breakdown through ${BLUECAP_PROJECTION_END_YEAR}`,
        description:
          entity.id === BLUEBIRDS_OPERATIONAL_BASE.id
            ? 'Operational model includes eggs from 2023, then milk, meat, and raw chicken lines from 2026 onward.'
            : 'Projection tracks baseline business ramp, equal capital allocation, and retained-profit reinvestment through 2030.',
        projectionWindowLabel: `${getEntityLaunchCalendarYear(entity)}-${BLUECAP_PROJECTION_END_YEAR}`,
        totalNetProfitCrore: 0,
        showScenarioInputs: entity.id !== BLUEBIRDS_OPERATIONAL_BASE.id,
        yearlyPerformance: [],
      },
    ])
  );

  let retainedProfitCarryForwardCrore = 0;
  let cumulativeNetProfitCrore = 0;
  let cumulativeRetainedProfitCrore = 0;
  let cumulativeCapitalInjectionCrore = 0;

  const yearlyFundingBreakdown = BLUECAP_CALENDAR_YEARS.map((calendarYear) => {
    const activeEntities = scenario.entities.filter(
      (entity) => getEntityLaunchCalendarYear(entity) <= calendarYear
    );
    const capitalInjectionCrore = getScenarioInjectionForYear(scenario.config, calendarYear);
    const deployableCapitalCrore = roundCrore(
      capitalInjectionCrore + retainedProfitCarryForwardCrore
    );
    const equalAllocationCrore = roundCrore(
      activeEntities.length === 0 ? 0 : deployableCapitalCrore / activeEntities.length
    );
    const baselineEqualAllocationCrore =
      baselineFundingByYear.get(calendarYear)?.equalAllocationCrore || equalAllocationCrore || 1;
    const allocationRatio =
      baselineEqualAllocationCrore === 0 ? 1 : equalAllocationCrore / baselineEqualAllocationCrore;

    const entityYearEntries = activeEntities
      .map((entity) => {
        const baseEntry = baselineProjectionByEntity
          .get(entity.id)
          ?.find((entry) => entry.year === calendarYear);

        const entry =
          entity.id === BLUEBIRDS_OPERATIONAL_BASE.id
            ? applyAllocationToBlueBirdsYear(
                baseEntry,
                allocationRatio,
                scenario.config.regulatoryConstraintPercent
              )
            : applyAllocationToStandardEntityYear(
                entity,
                baseEntry,
                allocationRatio,
                scenario.config.regulatoryConstraintPercent
              );

        const enrichedEntry = entry
          ? {
              ...entity,
              ...entry,
            }
          : null;

        if (enrichedEntry) {
          entityBreakdownState.get(entity.id)?.yearlyPerformance.push({
            ...enrichedEntry,
            allocatedCapitalCrore: equalAllocationCrore,
          });
          entityBreakdownState.get(entity.id).totalNetProfitCrore = roundCrore(
            entityBreakdownState.get(entity.id).totalNetProfitCrore + enrichedEntry.profitCrore
          );
        }

        return enrichedEntry;
      })
      .filter(Boolean);

    const totalRevenueCrore = roundCrore(
      entityYearEntries.reduce((sum, entry) => sum + entry.revenueCrore, 0)
    );
    const totalNetProfitCrore = roundCrore(
      entityYearEntries.reduce((sum, entry) => sum + entry.profitCrore, 0)
    );
    const retainedProfitCrore = roundCrore(
      totalNetProfitCrore * (scenario.config.reinvestmentRatePercent / 100)
    );

    retainedProfitCarryForwardCrore = retainedProfitCrore;
    cumulativeNetProfitCrore = roundCrore(cumulativeNetProfitCrore + totalNetProfitCrore);
    cumulativeRetainedProfitCrore = roundCrore(
      cumulativeRetainedProfitCrore + retainedProfitCrore
    );
    cumulativeCapitalInjectionCrore = roundCrore(
      cumulativeCapitalInjectionCrore + capitalInjectionCrore
    );

    return {
      calendarYear,
      totalRevenueCrore,
      totalNetProfitCrore,
      retainedProfitCrore,
      retainedProfitCarryForwardCrore,
      capitalInjectionCrore,
      deployableCapitalCrore,
      equalAllocationCrore,
      allocationRatio: roundCrore(allocationRatio),
      activeEntityCount: activeEntities.length,
      activeEntityIds: activeEntities.map((entity) => entity.id),
      cumulativeNetProfitCrore,
      cumulativeRetainedProfitCrore,
      capitalPoolEndOfYearCrore: roundCrore(
        scenario.config.initialCapitalCrore +
          cumulativeCapitalInjectionCrore +
          cumulativeRetainedProfitCrore
      ),
    };
  });

  const latestYear = yearlyFundingBreakdown[yearlyFundingBreakdown.length - 1];
  const latestYearEntries = scenario.entities
    .map((entity) =>
      entityBreakdownState
        .get(entity.id)
        ?.yearlyPerformance.find((entry) => entry.year === latestYear.calendarYear)
    )
    .filter(Boolean);
  const mostProfitableEntity =
    latestYearEntries
      .slice()
      .sort(
        (left, right) =>
          right.profitCrore - left.profitCrore || left.name.localeCompare(right.name)
      )[0] || null;

  const dependencyMetrics = scenario.dependencies.map((dependency) => {
    const exposureEntities = dependency.exposureEntityIds
      .map((entityId) =>
        entityBreakdownState
          .get(entityId)
          ?.yearlyPerformance.find((entry) => entry.year === latestYear.calendarYear)
      )
      .filter(Boolean);
    const sourceEntities = dependency.sourceEntityIds
      .map((entityId) => entityLookup.get(entityId))
      .filter(Boolean);

    return {
      ...dependency,
      providerNames: sourceEntities.map((entity) => entity.name),
      coveredEntityNames: exposureEntities.map((entity) => entity.name),
      coveredEntityCount: exposureEntities.length,
      latestYearRevenueExposureCrore: roundCrore(
        exposureEntities.reduce((sum, entity) => sum + entity.revenueCrore, 0)
      ),
    };
  });

  return {
    scenario,
    calendarYears: [...BLUECAP_CALENDAR_YEARS],
    yearlyFundingBreakdown,
    entityBreakdowns: scenario.entities.map((entity) => entityBreakdownState.get(entity.id)),
    latestYearSummary: {
      calendarYear: latestYear.calendarYear,
      totalRevenueCrore: latestYear.totalRevenueCrore,
      totalNetProfitCrore: latestYear.totalNetProfitCrore,
      cumulativeNetProfitCrore: latestYear.cumulativeNetProfitCrore,
      cumulativeRetainedProfitCrore: latestYear.cumulativeRetainedProfitCrore,
      capitalPoolEndOfYearCrore: latestYear.capitalPoolEndOfYearCrore,
      mostProfitableEntity,
    },
    dependencyMetrics,
  };
}
