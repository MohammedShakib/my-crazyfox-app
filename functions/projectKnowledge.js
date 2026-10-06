/* eslint-disable */
const getNumber = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const pickNumber = (source, fields, fallback = 0) => {
  for (const field of fields) {
    if (source?.[field] !== undefined && source?.[field] !== null) {
      return getNumber(source[field], fallback);
    }
  }
  return fallback;
};

const formatUsd = (value) => {
  const amount = getNumber(value);
  const sign = amount < 0 ? "-" : "";
  const absAmount = Math.abs(amount);
  if (absAmount >= 1e12) return `${sign}$${(absAmount / 1e12).toFixed(2)}T`;
  if (absAmount >= 1e9) return `${sign}$${(absAmount / 1e9).toFixed(2)}B`;
  if (absAmount >= 1e6) return `${sign}$${(absAmount / 1e6).toFixed(2)}M`;
  if (absAmount >= 1e3) return `${sign}$${(absAmount / 1e3).toFixed(0)}K`;
  return `${sign}$${absAmount.toFixed(0)}`;
};

const formatBDT = (value) => {
  const amount = getNumber(value);
  const sign = amount < 0 ? "-" : "";
  const absAmount = Math.abs(amount);
  if (absAmount >= 10000000) return `${sign}${(absAmount / 10000000).toFixed(2)} crore BDT`;
  if (absAmount >= 100000) return `${sign}${(absAmount / 100000).toFixed(2)} lakh BDT`;
  return `${sign}${absAmount.toLocaleString("en-US")} BDT`;
};

const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getCrazyFoxKnowledge = (rows = []) => {
  const sortedRows = [...rows].sort((a, b) => pickNumber(a, ["year"]) - pickNumber(b, ["year"]));
  const firstYear = sortedRows[0] || null;
  const year20 = sortedRows.find((row) => pickNumber(row, ["year"]) === 20) || sortedRows[sortedRows.length - 1] || null;

  if (!year20) {
    return {
      available: false,
      quickFacts: ["CrazyFox simulation data is not loaded."],
    };
  }

  const startAum = pickNumber(year20, ["start_aum", "startAUM"]);
  const loan = pickNumber(year20, ["loan"]);
  const grossReturn = pickNumber(year20, ["gross_return", "grossReturn"]);
  const netProfit = pickNumber(year20, ["net_profit", "netProfit"]);
  const repayment = pickNumber(year20, ["repayment"]);
  const endAum = pickNumber(year20, ["end_aum", "endAUM"]);

  return {
    available: true,
    rowCount: sortedRows.length,
    firstYear: firstYear ? pickNumber(firstYear, ["year"]) : null,
    targetYear: pickNumber(year20, ["year"]),
    startAum,
    loan,
    grossReturn,
    netProfit,
    repayment,
    endAum,
    quickFacts: [
      `CrazyFox Year ${pickNumber(year20, ["year"])} ending equity/end AUM: ${formatUsd(endAum)}.`,
      `CrazyFox Year ${pickNumber(year20, ["year"])} starts with ${formatUsd(startAum)}, loan ${formatUsd(loan)}, gross return ${(grossReturn * 100).toFixed(1)}%, net profit ${formatUsd(netProfit)}, repayment ${formatUsd(repayment)}.`,
    ],
  };
};

const getRahmanTrustKnowledge = (rows = []) => {
  const totalValue = rows.reduce((sum, row) => sum + pickNumber(row, ["value", "amount"]), 0);
  const annualIncome = rows.reduce(
    (sum, row) => sum + pickNumber(row, ["value", "amount"]) * pickNumber(row, ["rate"]),
    0,
  );
  const monthlyIncome = annualIncome / 12;
  const topHoldings = [...rows]
    .sort((a, b) => pickNumber(b, ["value", "amount"]) - pickNumber(a, ["value", "amount"]))
    .slice(0, 5)
    .map((row) => ({
      id: row.id,
      name: row.manager || row.pic || row.location || `Asset ${row.id}`,
      value: pickNumber(row, ["value", "amount"]),
      rate: pickNumber(row, ["rate"]),
      mandate: row.mandate || "",
    }));

  return {
    available: rows.length > 0,
    assetCount: rows.length,
    totalValue,
    annualIncome,
    monthlyIncome,
    topHoldings,
    quickFacts:
      rows.length > 0
        ? [
            `Rahman Family Trust international portfolio total: ${formatUsd(totalValue)} across ${rows.length} positions.`,
            `Rahman Family Trust estimated annual income: ${formatUsd(annualIncome)}; monthly income: ${formatUsd(monthlyIncome)}.`,
            `Top Rahman holdings: ${topHoldings.map((item) => `${item.name} (${formatUsd(item.value)})`).join(", ")}.`,
          ]
        : ["Rahman Family Trust international portfolio data is not loaded."],
  };
};

const getBangladeshTrustKnowledge = (portfolio = [], beneficiaries = []) => {
  const totalAmountBdt = portfolio.reduce((sum, row) => sum + pickNumber(row, ["amount_bdt"]), 0);
  const annualGrossIncomeBdt = portfolio.reduce(
    (sum, row) => sum + pickNumber(row, ["amount_bdt"]) * pickNumber(row, ["rate"]),
    0,
  );
  const annualNetIncomeBdt = portfolio.reduce((sum, row) => {
    const amount = pickNumber(row, ["amount_bdt"]);
    const rate = pickNumber(row, ["rate"]);
    const taxRate = pickNumber(row, ["tax_rate"]);
    return sum + amount * rate * (1 - taxRate);
  }, 0);
  const activeBeneficiaries = beneficiaries.filter((item) => item.active !== false);
  const monthlyPayoutBdt = activeBeneficiaries.reduce(
    (sum, item) => sum + pickNumber(item, ["monthly_payout_lakh"]) * 100000,
    0,
  );

  return {
    available: portfolio.length > 0,
    assetCount: portfolio.length,
    beneficiaryCount: activeBeneficiaries.length,
    totalAmountBdt,
    annualGrossIncomeBdt,
    annualNetIncomeBdt,
    monthlyPayoutBdt,
    quickFacts:
      portfolio.length > 0
        ? [
            `Bangladesh Trust portfolio total: ${formatBDT(totalAmountBdt)} across ${portfolio.length} assets.`,
            `Bangladesh Trust annual net income estimate: ${formatBDT(annualNetIncomeBdt)}; active monthly payouts: ${formatBDT(monthlyPayoutBdt)}.`,
          ]
        : ["Bangladesh Trust portfolio data is not loaded."],
  };
};

const getBlueCapKnowledge = (scenario) => {
  const entities = Array.isArray(scenario?.entities) ? scenario.entities : [];
  const rankedEntities = entities
    .map((entity) => {
      const revenueCrore = pickNumber(entity, ["year4TargetRevenueCrore"]);
      const marginPercent = pickNumber(entity, ["netMarginPercent"]);
      return {
        id: entity.id,
        name: entity.name || entity.id,
        sector: entity.sector || "",
        revenueCrore,
        marginPercent,
        profitCrore: Number((revenueCrore * marginPercent / 100).toFixed(2)),
      };
    })
    .sort((a, b) => b.profitCrore - a.profitCrore);

  const totalYear4RevenueCrore = rankedEntities.reduce((sum, entity) => sum + entity.revenueCrore, 0);
  const totalYear4ProfitCrore = rankedEntities.reduce((sum, entity) => sum + entity.profitCrore, 0);

  return {
    available: rankedEntities.length > 0,
    entityCount: rankedEntities.length,
    totalYear4RevenueCrore,
    totalYear4ProfitCrore,
    topEntities: rankedEntities.slice(0, 6),
    quickFacts:
      rankedEntities.length > 0
        ? [
            `BlueCAP has ${rankedEntities.length} entities with Year 4 target revenue ${totalYear4RevenueCrore.toFixed(2)} crore and profit ${totalYear4ProfitCrore.toFixed(2)} crore.`,
            `BlueCAP top profit entities: ${rankedEntities.slice(0, 5).map((item) => `${item.name} (${item.profitCrore.toFixed(2)} crore)`).join(", ")}.`,
          ]
        : ["BlueCAP scenario data is not loaded."],
  };
};

const buildProjectKnowledge = (projectContext = {}) => {
  const dataSources = projectContext.dataSources || {};
  const crazyFox = getCrazyFoxKnowledge(dataSources.crazyFox || []);
  const rahmanTrust = getRahmanTrustKnowledge(dataSources.rahmanTrust || []);
  const bangladeshTrust = getBangladeshTrustKnowledge(
    dataSources.bdTrustPortfolio || [],
    dataSources.bdTrustBeneficiaries || [],
  );
  const blueCap = getBlueCapKnowledge(dataSources.blueCap);
  const quickFacts = [
    ...crazyFox.quickFacts,
    ...rahmanTrust.quickFacts,
    ...bangladeshTrust.quickFacts,
    ...blueCap.quickFacts,
  ];

  return {
    generatedAt: projectContext.generatedAt || new Date().toISOString(),
    crazyFox,
    rahmanTrust,
    bangladeshTrust,
    blueCap,
    quickFacts,
  };
};

const asQuickFactText = (knowledge) => (knowledge?.quickFacts || []).join("\n");

const answerFromKnowledge = (question, knowledge) => {
  const rawText = String(question || "").toLowerCase();
  const text = normalizeText(question);
  const wantsAmount =
    /\b(koto|ase|amount|total|balance|value|fund|taka|money|portfolio)\b/.test(text) ||
    rawText.includes("কত") ||
    rawText.includes("টাকা") ||
    rawText.includes("আছে");
  const mentionsTrust =
    /\b(family trust|rahman|trust|bd trust|bangladesh trust)\b/.test(text) ||
    rawText.includes("ট্রাস্ট") ||
    rawText.includes("ফ্যামিলি");
  const mentionsBlueCap = /\b(bluecap|blue cap|entity|entities)\b/.test(text);
  const mentionsCrazyFox = /\b(crazyfox|crazy fox|year 20|ending equity|end equity|aum)\b/.test(text);
  const wantsTop = /\b(top|best|strongest|profitable|profit)\b/.test(text);
  const wantsSummary = /\b(summary|overview|dashboard|status|snapshot)\b/.test(text);

  if (mentionsTrust && wantsAmount) {
    const parts = [];
    if (knowledge.rahmanTrust?.available) {
      parts.push(
        `Rahman Family Trust international portfolio total is **${formatUsd(knowledge.rahmanTrust.totalValue)}** across ${knowledge.rahmanTrust.assetCount} positions.`,
      );
      parts.push(
        `Estimated income is **${formatUsd(knowledge.rahmanTrust.annualIncome)} per year** or **${formatUsd(knowledge.rahmanTrust.monthlyIncome)} per month**.`,
      );
    }
    if (knowledge.bangladeshTrust?.available) {
      parts.push(
        `Bangladesh Trust portfolio total is **${formatBDT(knowledge.bangladeshTrust.totalAmountBdt)}** with active monthly payouts of **${formatBDT(knowledge.bangladeshTrust.monthlyPayoutBdt)}**.`,
      );
    }
    return parts.length > 0 ? parts.join("\n\n") : null;
  }

  if (mentionsCrazyFox && (text.includes("year 20") || text.includes("ending") || text.includes("equity") || text.includes("aum"))) {
    const data = knowledge.crazyFox;
    if (!data?.available) return null;
    return [
      `CrazyFox Year ${data.targetYear} ending equity/end AUM is **${formatUsd(data.endAum)}**.`,
      `Formula: start AUM ${formatUsd(data.startAum)} + net profit ${formatUsd(data.netProfit)} - repayment ${formatUsd(data.repayment)} = ${formatUsd(data.endAum)}.`,
    ].join("\n\n");
  }

  if (mentionsBlueCap && wantsTop) {
    const data = knowledge.blueCap;
    if (!data?.available) return null;
    return [
      `BlueCAP's most profitable Year 4 entity is **${data.topEntities[0].name}** with projected profit of **${data.topEntities[0].profitCrore.toFixed(2)} crore**.`,
      "Top entities:",
      ...data.topEntities.slice(0, 5).map(
        (entity) =>
          `* **${entity.name}**: ${entity.revenueCrore.toFixed(2)} crore revenue x ${entity.marginPercent.toFixed(1)}% margin = ${entity.profitCrore.toFixed(2)} crore profit`,
      ),
    ].join("\n");
  }

  if (wantsSummary) {
    return asQuickFactText(knowledge);
  }

  return null;
};

module.exports = {
  asQuickFactText,
  answerFromKnowledge,
  buildProjectKnowledge,
};
