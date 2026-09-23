/**
 * Fast Paisa — Collection Incentive Engine
 * Sourced directly from Collection_Team_Incentive.xlsx
 *
 * Supports:
 *  - Bucket 1 (Fresh Bucket): Current Month (75%–100% threshold)
 *  - Bucket 2 (Bucket II / T-1): Previous Month (25%–50% threshold)
 *  - Bucket 3 (Bucket III / T-2): Previous-to-Previous Month (15%–40% threshold)
 *  - Qualification Rule: Mandatory minimum >= 120 cases per executive
 *  - Dynamic Formula: Base Ratio Reference = Target Amount / 100, Slab = ROUND(Base Ref * Factor, 0)
 *  - Level 2: DPD Team Lead (Portfolio Volume x Recovery % 2D Matrix)
 *  - Team Agent Rollup
 */

// Mandatory minimum case threshold to qualify for incentive
export const MIN_CASES_THRESHOLD = 120;

// Standard Benchmark Constants from Collection_Team_Incentive.xlsx
export const BENCHMARK_FILE_COUNT = 143; // Executive sheet sample target
export const BENCHMARK_FILE_AVG_VALUE = 47000;
export const BENCHMARK_TARGET_AMOUNT = 6721000; // 143 * 47000 = ₹67.21 Lakhs
export const BENCHMARK_BASE_RATIO = 67210; // 1% of Target Amount

export const TEMPLATE_TEAM_TARGET = 56400000; // 1200 * 47000 = ₹5.64 Crores

/**
 * Bucket Definitions with exact multipliers from Collection_Team_Incentive.xlsx
 */
export const BUCKET_DEFINITIONS = {
  bucket1: {
    key: 'bucket1',
    name: 'Bucket 1 (Fresh)',
    title: 'Fresh Bucket (PRE-Collection)',
    periodLabel: 'Current Month (0–30 DPD)',
    cycleLabel: '22nd to 10th Cycle',
    minThreshold: 75.0,
    hasFixedCasesRequirement: true,
    minCases: 120,
    operationalDesc: 'Loans with repayment due in current month (e.g. In September, calling September repayments) · Fixed minimum 120 cases required',
    color: '#10b981', // emerald
    slabs: [
      { threshold: 75.0, factor: 0.025, label: '75.0%+' },
      { threshold: 80.0, factor: 0.050, label: '80.0%+' },
      { threshold: 83.0, factor: 0.0625, label: '83.0%+' },
      { threshold: 85.0, factor: 0.0833, label: '85.0%+' },
      { threshold: 87.0, factor: 0.100, label: '87.0%+' },
      { threshold: 90.0, factor: 0.125, label: '90.0%+' },
      { threshold: 92.5, factor: 0.200, label: '92.5%+' },
      { threshold: 95.0, factor: 0.300, label: '95.0%+' },
      { threshold: 98.0, factor: 0.350, label: '98.0%+' },
      { threshold: 100.0, factor: 0.500, label: '100.0%' },
    ],
  },
  bucket2: {
    key: 'bucket2',
    name: 'Bucket 2 (T-1)',
    title: 'Bucket II (1 Month Overdue)',
    periodLabel: 'Previous Month (31–60 DPD)',
    cycleLabel: '22nd to 10th Cycle',
    minThreshold: 25.0,
    hasFixedCasesRequirement: false,
    minCases: null,
    operationalDesc: 'Loans with repayment due in previous month (e.g. In September, calling August repayments) · No fixed cases requirement',
    color: '#f59e0b', // amber
    slabs: [
      { threshold: 25.0, factor: 0.025, label: '25.0%+' },
      { threshold: 28.0, factor: 0.050, label: '28.0%+' },
      { threshold: 30.0, factor: 0.0625, label: '30.0%+' },
      { threshold: 33.0, factor: 0.0833, label: '33.0%+' },
      { threshold: 35.0, factor: 0.100, label: '35.0%+' },
      { threshold: 38.0, factor: 0.125, label: '38.0%+' },
      { threshold: 40.0, factor: 0.1667, label: '40.0%+' },
      { threshold: 45.0, factor: 0.250, label: '45.0%+' },
      { threshold: 50.0, factor: 0.300, label: '50.0%+' },
    ],
  },
  bucket3: {
    key: 'bucket3',
    name: 'Bucket 3 (T-2)',
    title: 'Bucket III (2 Months Overdue)',
    periodLabel: 'Prev-to-Prev Month (61–90 DPD)',
    cycleLabel: '22nd to 10th Cycle',
    minThreshold: 15.0,
    hasFixedCasesRequirement: false,
    minCases: null,
    operationalDesc: 'Loans with repayment due 2 months prior (e.g. In September, calling July repayments) · No fixed cases requirement',
    color: '#ef4444', // rose
    slabs: [
      { threshold: 15.0, factor: 0.025, label: '15.0%+' },
      { threshold: 18.0, factor: 0.050, label: '18.0%+' },
      { threshold: 20.0, factor: 0.0625, label: '20.0%+' },
      { threshold: 23.0, factor: 0.0833, label: '23.0%+' },
      { threshold: 25.0, factor: 0.100, label: '25.0%+' },
      { threshold: 28.0, factor: 0.125, label: '28.0%+' },
      { threshold: 30.0, factor: 0.1667, label: '30.0%+' },
      { threshold: 35.0, factor: 0.250, label: '35.0%+' },
      { threshold: 40.0, factor: 0.300, label: '40.0%+' },
    ],
  },
};

// Backwards-compatible export for Fresh Slabs at 143 cases benchmark
export const EXECUTIVE_FRESH_SLABS = BUCKET_DEFINITIONS.bucket1.slabs.map((s) => ({
  threshold: s.threshold,
  factor: s.factor,
  amount: Math.round(BENCHMARK_BASE_RATIO * s.factor),
  label: s.label,
}));

// Special performance bonuses factors
export const SPECIAL_REWARDS = {
  BEST_PERFORMER_FACTOR: 0.05,
  EARLIEST_ACHIEVER_FACTOR: 0.05,
  BEST_PERFORMER: Math.round(BENCHMARK_BASE_RATIO * 0.05),
  EARLIEST_ACHIEVER: Math.round(BENCHMARK_BASE_RATIO * 0.05),
};

// Team Leader Portfolio Value Buckets (Columns)
export const PORTFOLIO_BUCKETS = [
  { max: 50000000, label: '≤ ₹5 Cr' },
  { max: 100000000, label: '≤ ₹10 Cr' },
  { max: 200000000, label: '≤ ₹20 Cr' },
  { max: 300000000, label: '≤ ₹30 Cr' },
  { max: 400000000, label: '≤ ₹40 Cr' },
  { max: 500000000, label: '≤ ₹50 Cr' },
  { max: 600000000, label: '≤ ₹60 Cr' },
  { max: 700000000, label: '≤ ₹70 Cr' },
];

// Team Leader 2D Matrix for Fresh Portfolio (Rows = Achievement %, Columns = Portfolio Buckets)
export const LEADER_FRESH_MATRIX = [
  { threshold: 85.0, payouts: [5000, 10000, 15000, 20000, 25000, 30000, 35000, 40000] },
  { threshold: 88.0, payouts: [6250, 12500, 17500, 22500, 27500, 32500, 37500, 42500] },
  { threshold: 90.0, payouts: [8000, 16000, 21000, 26000, 31000, 36000, 41000, 46000] },
  { threshold: 93.0, payouts: [10000, 20000, 25000, 30000, 35000, 40000, 45000, 50000] },
  { threshold: 95.0, payouts: [12500, 25000, 30000, 35000, 40000, 45000, 50000, 55000] },
];

/**
 * Get the calculated slab ladder for any given target amount and bucket
 */
export function getSlabsForTarget(targetAmount, bucketKey = 'bucket1') {
  const bucket = BUCKET_DEFINITIONS[bucketKey] || BUCKET_DEFINITIONS.bucket1;
  const baseRef = (targetAmount || BENCHMARK_TARGET_AMOUNT) / 100;
  return bucket.slabs.map((s) => ({
    threshold: s.threshold,
    factor: s.factor,
    amount: Math.round(baseRef * s.factor),
    label: s.label,
  }));
}

/**
 * Calculate incentive and next milestone for a Collection Executive
 * Supports both individual dynamic target calculation and benchmark calculation
 */
export function calculateExecutiveIncentive(
  recoveryPct,
  totalDue = 0,
  totalRecvd = 0,
  casesCount = 0,
  isTopPerformer = false,
  bucketKey = 'bucket1',
  benchmarkTarget = null
) {
  // Support options object signature if passed
  if (typeof recoveryPct === 'object' && recoveryPct !== null) {
    const opts = recoveryPct;
    return calculateExecutiveIncentive(
      opts.recoveryPct,
      opts.totalDue,
      opts.totalRecvd,
      opts.casesCount,
      opts.isTopPerformer,
      opts.bucketKey,
      opts.benchmarkTarget
    );
  }

  const pct = Math.round((recoveryPct || 0) * 10) / 10;
  const due = totalDue || 0;
  const recvd = totalRecvd || 0;
  const cases = Number(casesCount) || 0;
  const bucket = BUCKET_DEFINITIONS[bucketKey] || BUCKET_DEFINITIONS.bucket1;

  // 1. Cases Qualification Check
  // Bucket 1 (Fresh Bucket) requires >= 120 cases.
  // Bucket 2 (T-1) and Bucket 3 (T-2) have NO fixed cases requirement.
  const hasFixedCases = bucket.hasFixedCasesRequirement ?? (bucketKey === 'bucket1');
  const isEligibleCases = hasFixedCases ? cases >= MIN_CASES_THRESHOLD : true;

  // 2. Base Ratio Reference Calculation
  const target = benchmarkTarget != null ? benchmarkTarget : (due > 0 ? due : BENCHMARK_TARGET_AMOUNT);
  const baseRatioRef = target / 100;

  // 3. Build active slabs for this target
  const activeSlabs = bucket.slabs.map((s) => ({
    threshold: s.threshold,
    factor: s.factor,
    amount: Math.round(baseRatioRef * s.factor),
    label: s.label,
  }));

  // 4. Find achieved and next slab
  const currentSlab = [...activeSlabs].reverse().find((s) => pct >= s.threshold) || null;
  const earnedAmount = (isEligibleCases && currentSlab) ? currentSlab.amount : 0;
  const nextSlab = activeSlabs.find((s) => s.threshold > pct) || null;

  let nextThreshold = null;
  let nextAmount = null;
  let incrementalJump = 0;
  let amountNeeded = 0;
  let pctProgress;

  if (nextSlab) {
    nextThreshold = nextSlab.threshold;
    nextAmount = nextSlab.amount;
    incrementalJump = nextAmount - (currentSlab ? currentSlab.amount : 0);

    const targetRecvdNeeded = (nextThreshold / 100) * due;
    amountNeeded = Math.max(0, Math.round(targetRecvdNeeded - recvd));

    const prevThreshold = currentSlab ? currentSlab.threshold : (bucket.minThreshold - 5);
    const range = nextThreshold - prevThreshold;
    pctProgress = range > 0 ? Math.min(100, Math.max(0, Math.round(((pct - prevThreshold) / range) * 100))) : 0;
  } else {
    pctProgress = 100;
  }

  // Special reward (+5% of Base Ratio Reference)
  const specialReward = (isEligibleCases && isTopPerformer && earnedAmount > 0)
    ? Math.round(baseRatioRef * SPECIAL_REWARDS.BEST_PERFORMER_FACTOR)
    : 0;
  const totalPayable = earnedAmount + specialReward;

  // Disqualification reason
  let statusReason = 'Qualified';
  if (!isEligibleCases) {
    statusReason = `Disqualified: Assigned ${cases} cases (minimum threshold is ${MIN_CASES_THRESHOLD})`;
  } else if (earnedAmount === 0) {
    statusReason = `Below ${bucket.minThreshold}% qualification rate`;
  }

  return {
    pct,
    due,
    recvd,
    cases,
    hasFixedCases,
    isEligibleCases,
    minCasesNeeded: hasFixedCases ? MIN_CASES_THRESHOLD : null,
    bucketKey: bucket.key,
    bucketName: bucket.name,
    targetAmount: target,
    baseRatioRef,
    currentSlab,
    earnedAmount,
    nextSlab,
    nextThreshold,
    nextAmount,
    incrementalJump,
    amountNeeded,
    pctProgress,
    isTopPerformer,
    specialReward,
    totalPayable,
    statusReason,
    isQualified: isEligibleCases && earnedAmount > 0,
    activeSlabs,
  };
}

/**
 * Calculate incentive and next milestone for a Team Leader
 */
export function calculateLeaderIncentive(teamDue, teamRecoveryPct, teamRecvd) {
  const due = teamDue || 0;
  const pct = Math.round((teamRecoveryPct || 0) * 10) / 10;
  const recvd = teamRecvd || 0;

  // 1. Determine portfolio bucket column
  let bucketIdx = PORTFOLIO_BUCKETS.findIndex((b) => due <= b.max);
  if (bucketIdx === -1) bucketIdx = PORTFOLIO_BUCKETS.length - 1; // Cap at max bucket (≤ 70 Cr)
  const bucket = PORTFOLIO_BUCKETS[bucketIdx];

  // 2. Determine achievement row
  const currentRow = [...LEADER_FRESH_MATRIX].reverse().find((r) => pct >= r.threshold) || null;
  const earnedAmount = currentRow ? currentRow.payouts[bucketIdx] : 0;
  const currentThreshold = currentRow ? currentRow.threshold : null;

  // 3. Determine next achievement milestone
  const nextRow = LEADER_FRESH_MATRIX.find((r) => r.threshold > pct) || null;
  let nextThreshold = null;
  let nextAmount = null;
  let incrementalJump = 0;
  let amountNeeded = 0;
  let pctProgress;

  if (nextRow) {
    nextThreshold = nextRow.threshold;
    nextAmount = nextRow.payouts[bucketIdx];
    incrementalJump = nextAmount - earnedAmount;

    const targetRecvdNeeded = (nextThreshold / 100) * due;
    amountNeeded = Math.max(0, Math.round(targetRecvdNeeded - recvd));

    const prevThreshold = currentRow ? currentRow.threshold : 80;
    const range = nextThreshold - prevThreshold;
    pctProgress = range > 0 ? Math.min(100, Math.max(0, Math.round(((pct - prevThreshold) / range) * 100))) : 0;
  } else {
    pctProgress = 100;
  }

  return {
    pct,
    due,
    recvd,
    bucketIdx,
    bucketLabel: bucket.label,
    currentThreshold,
    earnedAmount,
    nextRow,
    nextThreshold,
    nextAmount,
    incrementalJump,
    amountNeeded,
    pctProgress,
    isQualified: earnedAmount > 0,
  };
}

/**
 * Calculate the total incentive roll-up for all agents in a team
 */
export function calculateTeamAgentsRollup(teamAgentsList = [], bucketKey = 'bucket1') {
  let totalPool = 0;
  let qualifiedCount = 0;
  let eligibleCasesCount = 0;
  let topAgent = null;
  let highestRecvd = -1;

  teamAgentsList.forEach(([name, v]) => {
    const pct = v.due ? (v.recvd / v.due) * 100 : 0;
    const cases = v.cases || 0;
    const calc = calculateExecutiveIncentive(pct, v.due, v.recvd, cases, false, bucketKey);
    totalPool += calc.earnedAmount;
    if (calc.isQualified) qualifiedCount++;
    if (calc.isEligibleCases) eligibleCasesCount++;

    if (v.recvd > highestRecvd) {
      highestRecvd = v.recvd;
      topAgent = {
        name,
        recvd: v.recvd,
        pct: Math.round(pct * 10) / 10,
        earnedAmount: calc.earnedAmount,
        cases,
        isQualified: calc.isQualified,
      };
    }
  });

  return {
    totalPool,
    qualifiedCount,
    eligibleCasesCount,
    totalAgents: teamAgentsList.length,
    topAgent,
  };
}
