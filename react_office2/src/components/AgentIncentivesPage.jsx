import { useMemo, useState } from 'react';
import {
  Search, Award, Sparkles, Users, Target, CheckCircle2,
  ChevronDown, ChevronUp, Calculator, ArrowRight, HelpCircle,
  AlertCircle, ShieldCheck
} from 'lucide-react';
import {
  computeEmployeeRows, fmtINR, fmtINRFull, fmtMonth,
  titleCase, initials, META, LEADERS
} from '../utils/data';
import {
  calculateExecutiveIncentive,
  BUCKET_DEFINITIONS,
  MIN_CASES_THRESHOLD,
  BENCHMARK_FILE_COUNT,
  BENCHMARK_FILE_AVG_VALUE,
  BENCHMARK_TARGET_AMOUNT,
  getSlabsForTarget
} from '../utils/incentives';

export default function AgentIncentivesPage({ onOpenAgent, onNavigatePage }) {
  // Locked to Bucket 1 (Fresh / Current Month Loans)
  const activeBucket = BUCKET_DEFINITIONS.bucket1;

  // Month boundary resolution
  const latestMonthStr = useMemo(() => (META.dateMax ? META.dateMax.slice(0, 7) : '2026-07'), []);

  // Period filter: 'bucket_month' | 'overall' | 'custom'
  const [filterMode, setFilterMode] = useState('bucket_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Slicing filters
  const [selectedLeader, setSelectedLeader] = useState('');
  const [qualificationFilter, setQualificationFilter] = useState('all'); // 'all' | 'qualified' | 'eligible_cases' | 'disqualified_cases' | 'unqualified'
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('totalPayable'); // 'totalPayable' | 'pct' | 'recvd' | 'due' | 'cases'

  // Guide and Simulator Toggles
  const [showGuide, setShowGuide] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);

  // Simulator Dynamic Inputs (Bucket 1 Fresh)
  const [simFileCount, setSimFileCount] = useState(BENCHMARK_FILE_COUNT); // default 143
  const [simAvgValue, setSimAvgValue] = useState(BENCHMARK_FILE_AVG_VALUE); // default 47000
  const [simPct, setSimPct] = useState(88.5);

  const activeFrom = useMemo(() => {
    if (filterMode === 'bucket_month') return `${latestMonthStr}-01`;
    if (filterMode === 'custom') return customFrom;
    return ''; // overall
  }, [filterMode, latestMonthStr, customFrom]);

  const activeTo = useMemo(() => {
    if (filterMode === 'bucket_month') {
      return META.dateMax || `${latestMonthStr}-31`;
    }
    if (filterMode === 'custom') return customTo;
    return ''; // overall
  }, [filterMode, latestMonthStr, customTo]);

  // 1. Calculate incentives across all employees in the filtered time window
  const allRows = useMemo(() => {
    const raw = computeEmployeeRows({ from: activeFrom, to: activeTo });
    if (!raw.length) return [];

    // Identify top performer (highest recovery % among agents eligible in this bucket)
    const hasFixedCases = true;
    const sortedByPct = [...raw]
      .filter((a) => (hasFixedCases ? a.cases >= MIN_CASES_THRESHOLD : true))
      .sort((a, b) => b.pct - a.pct);
    const topPerformerName = sortedByPct.length && sortedByPct[0].pct >= activeBucket.minThreshold
      ? sortedByPct[0].name
      : null;

    return raw.map((agent) => {
      const isTop = topPerformerName === agent.name;
      const inc = calculateExecutiveIncentive(
        agent.pct,
        agent.due,
        agent.recvd,
        agent.cases,
        isTop,
        'bucket1'
      );

      return {
        ...agent,
        ...inc,
      };
    });
  }, [activeFrom, activeTo, activeBucket.minThreshold]);

  // 2. Filter & Sort rows for table display
  const displayedRows = useMemo(() => {
    let list = [...allRows];

    if (selectedLeader) {
      list = list.filter((a) => a.leader === selectedLeader || (META.agentMultiLeaders[a.name] || []).includes(selectedLeader));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => a.name.toLowerCase().includes(q) || (a.leader && a.leader.toLowerCase().includes(q)));
    }

    if (qualificationFilter === 'qualified') {
      list = list.filter((a) => a.isQualified);
    } else if (qualificationFilter === 'eligible_cases') {
      list = list.filter((a) => a.isEligibleCases);
    } else if (qualificationFilter === 'disqualified_cases') {
      list = list.filter((a) => !a.isEligibleCases);
    } else if (qualificationFilter === 'unqualified') {
      list = list.filter((a) => !a.isQualified);
    }

    list.sort((a, b) => {
      if (sortKey === 'totalPayable') return b.totalPayable - a.totalPayable || b.pct - a.pct;
      if (sortKey === 'pct') return b.pct - a.pct;
      if (sortKey === 'recvd') return b.recvd - a.recvd;
      if (sortKey === 'due') return b.due - a.due;
      if (sortKey === 'cases') return b.cases - a.cases;
      return 0;
    });

    return list;
  }, [allRows, selectedLeader, search, qualificationFilter, sortKey]);

  // 3. High-level Summary Metrics
  const summary = useMemo(() => {
    let totalIncentivePool = 0;
    let qualifiedCount = 0;
    let eligibleCasesCount = 0;
    let topEarner = null;
    let totalDue = 0;
    let totalRecvd = 0;

    allRows.forEach((r) => {
      totalIncentivePool += r.totalPayable;
      totalDue += r.due;
      totalRecvd += r.recvd;
      if (r.isEligibleCases) eligibleCasesCount++;
      if (r.isQualified) qualifiedCount++;
      if (!topEarner || r.totalPayable > topEarner.totalPayable) {
        topEarner = r;
      }
    });

    const avgPayout = qualifiedCount ? Math.round(totalIncentivePool / qualifiedCount) : 0;
    const cocPct = totalRecvd ? Math.round((totalIncentivePool / totalRecvd) * 1000) / 10 : 0;

    return {
      totalIncentivePool,
      qualifiedCount,
      eligibleCasesCount,
      disqualifiedCasesCount: allRows.length - eligibleCasesCount,
      totalAgents: allRows.length,
      topEarner,
      avgPayout,
      cocPct,
      totalDue,
      totalRecvd,
    };
  }, [allRows]);

  // 4. Simulator calculation using dynamic File Count and Average Ticket
  const simTargetAmount = useMemo(() => simFileCount * simAvgValue, [simFileCount, simAvgValue]);
  const simBaseRatio = useMemo(() => simTargetAmount / 100, [simTargetAmount]);
  const simResult = useMemo(() => {
    return calculateExecutiveIncentive(
      simPct,
      simTargetAmount,
      (simPct / 100) * simTargetAmount,
      simFileCount,
      false,
      'bucket1',
      simTargetAmount
    );
  }, [simPct, simTargetAmount, simFileCount]);

  const simBucketDef = BUCKET_DEFINITIONS.bucket1;
  const guideBucketDef = BUCKET_DEFINITIONS.bucket1;
  const guideSlabs = useMemo(() => getSlabsForTarget(BENCHMARK_TARGET_AMOUNT, 'bucket1'), []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header with Tab Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-[0_0_15px_rgba(245,158,11,0.35)]">
              <Award size={18} />
            </div>
            <h1 className="text-[24px] font-black text-white font-display tracking-tight">
              Collection Agent Incentives
            </h1>
            <span
              className="text-[10.5px] font-mono font-bold px-2.5 py-0.5 rounded-full border"
              style={{
                backgroundColor: `${activeBucket.color}15`,
                color: activeBucket.color,
                borderColor: `${activeBucket.color}40`,
              }}
            >
              {activeBucket.name} · {activeBucket.cycleLabel}
            </span>
          </div>
          <p className="text-[12.5px] font-medium text-zinc-400 mt-1">
            {activeBucket.hasFixedCasesRequirement ? (
              <>
                Dynamic incentive calculator & payout ledger. Qualification requires <strong className="text-white font-mono">≥ {MIN_CASES_THRESHOLD} cases</strong> and achieving the {activeBucket.minThreshold}% recovery threshold.
              </>
            ) : (
              <>
                Dynamic incentive calculator & payout ledger. <strong className="text-emerald-400">No fixed cases requirement</strong> in {activeBucket.name} — qualification requires achieving <strong className="text-white font-mono">≥ {activeBucket.minThreshold}%</strong> recovery.
              </>
            )}
          </p>
        </div>

        {/* View Switcher Sub-Tabs */}
        <div className="flex items-center bg-[#12131b] border border-white/[0.08] p-1 rounded-2xl gap-1 shrink-0">
          <button
            type="button"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[12px] font-bold bg-gradient-to-r from-[#ff5e3a] to-[#ff3b30] text-white shadow-[0_0_12px_rgba(255,59,48,0.4)] cursor-pointer"
          >
            <Award size={14} />
            <span>Agent Incentives</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigatePage && onNavigatePage('leader-incentives')}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[12px] font-semibold text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all cursor-pointer"
          >
            <Users size={14} />
            <span>Team Leader Matrix</span>
            <ArrowRight size={13} className="text-zinc-500" />
          </button>
        </div>
      </div>

      {/* Top Executive KPI Row (Bucket 1 Fresh) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Incentive Pool */}
        <div className="bg-[#0f111d]/45 backdrop-blur-xl border border-amber-500/25 rounded-2xl p-4 shadow-lg">
          <div className="text-[10px] font-bold text-amber-400/90 uppercase tracking-wider font-display flex items-center gap-1.5">
            <Award size={13} />
            <span>Total Incentive Pool</span>
          </div>
          <div className="text-[26px] font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-amber-300 font-display tracking-tight mt-1">
            {fmtINRFull(summary.totalIncentivePool)}
          </div>
          <div className="text-[10.5px] font-mono text-zinc-400 mt-1">
            Across {summary.totalAgents} active agents
          </div>
        </div>

        {/* Qualified Agents */}
        <div className="bg-[#0f111d]/45 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-md">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-display">
            Qualified (≥75%)
          </div>
          <div className="text-[26px] font-black text-white font-display tracking-tight mt-1 flex items-baseline gap-2">
            <span>{summary.qualifiedCount}</span>
            <span className="text-[13px] font-mono font-bold text-emerald-400">
              ({summary.totalAgents ? Math.round((summary.qualifiedCount / summary.totalAgents) * 100) : 0}%)
            </span>
          </div>
          <div className="text-[10.5px] font-mono text-zinc-500 mt-1">
            {summary.totalAgents - summary.qualifiedCount} unqualified in this period
          </div>
        </div>

        {/* Cases Threshold Check */}
        <div className="bg-[#0f111d]/45 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-md">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-display flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-emerald-400" />
            <span>Cases Criteria (≥120)</span>
          </div>
          <div className="text-[26px] font-black text-white font-display tracking-tight mt-1 flex items-baseline gap-2">
            <span className="text-emerald-400">{summary.eligibleCasesCount}</span>
            <span className="text-[12px] font-mono text-zinc-400">
              / {summary.totalAgents}
            </span>
          </div>
          <div className="text-[10.5px] font-mono text-amber-400 mt-1">
            {summary.disqualifiedCasesCount} agents below 120 cases
          </div>
        </div>

        {/* Top Earner */}
        <div className="bg-[#0f111d]/45 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-md">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-display flex items-center gap-1">
            <Sparkles size={12} className="text-amber-400" />
            <span>Highest Earner</span>
          </div>
          <div className="text-[17px] font-bold text-white font-display truncate mt-1">
            {summary.topEarner ? summary.topEarner.name : '—'}
          </div>
          <div className="text-[12px] font-mono font-bold text-amber-300 mt-0.5">
            {summary.topEarner ? fmtINRFull(summary.topEarner.totalPayable) : '₹0'}
            <span className="text-zinc-500 text-[10px] ml-1">({summary.topEarner?.pct}%)</span>
          </div>
        </div>

        {/* Average Qualified Payout */}
        <div className="bg-[#0f111d]/45 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-md">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-display">
            Avg Qualified Payout
          </div>
          <div className="text-[24px] font-bold font-mono text-zinc-100 tracking-tight mt-1">
            {fmtINRFull(summary.avgPayout)}
          </div>
          <div className="text-[10.5px] font-mono text-zinc-500 mt-1">
            Per qualified collection agent
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#0f111d]/45 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 space-y-3 shadow-xl">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Search by Agent */}
          <div className="flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] focus-within:border-[#ff3b30]/50 rounded-xl px-3 py-1.5 transition-all">
            <Search size={14} className="text-[#ff5533]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agent or leader…"
              className="bg-transparent text-[12px] text-zinc-200 placeholder-zinc-500 outline-none w-48"
            />
          </div>

          {/* Period Selector */}
          <div className="flex items-center gap-1.5 bg-black/40 border border-white/[0.08] p-0.5 rounded-xl">
            <button
              onClick={() => setFilterMode('bucket_month')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filterMode === 'bucket_month'
                  ? 'bg-gradient-to-r from-[#ff5e3a] to-[#ff3b30] text-white shadow-[0_0_10px_rgba(255,59,48,0.4)]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {fmtMonth(latestMonthStr)} (Current Month)
            </button>
            <button
              onClick={() => setFilterMode('overall')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filterMode === 'overall'
                  ? 'bg-gradient-to-r from-[#ff5e3a] to-[#ff3b30] text-white shadow-[0_0_10px_rgba(255,59,48,0.4)]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Overall All-Time
            </button>
            <button
              onClick={() => setFilterMode('custom')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filterMode === 'custom'
                  ? 'bg-gradient-to-r from-[#ff5e3a] to-[#ff3b30] text-white shadow-[0_0_10px_rgba(255,59,48,0.4)]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Custom
            </button>
          </div>

          {/* Team Leader Filter Dropdown */}
          <select
            value={selectedLeader}
            onChange={(e) => setSelectedLeader(e.target.value)}
            className="text-[12px] font-semibold bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] text-zinc-200 rounded-xl px-3 py-1.5 outline-none focus:border-[#ff3b30]/60 transition-all cursor-pointer"
          >
            <option value="" className="bg-[#12131a] text-zinc-200">All Team Leaders</option>
            {LEADERS.map((l) => (
              <option key={l} value={l} className="bg-[#12131a] text-zinc-200">
                {titleCase(l)}
              </option>
            ))}
          </select>

          {/* Qualification Filter Pills */}
          <div className="flex bg-black/40 border border-white/[0.08] rounded-xl p-0.5 gap-0.5 flex-wrap">
            {[
              { id: 'all', label: `All (${summary.totalAgents})` },
              { id: 'qualified', label: `Qualified (${summary.qualifiedCount})` },
              ...(activeBucket.hasFixedCasesRequirement ? [
                { id: 'eligible_cases', label: `≥120 Cases (${summary.eligibleCasesCount})` },
                { id: 'disqualified_cases', label: `<120 Cases (${summary.disqualifiedCasesCount})` },
              ] : []),
              { id: 'unqualified', label: `Unqualified (${summary.totalAgents - summary.qualifiedCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setQualificationFilter(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  qualificationFilter === tab.id
                    ? 'bg-white/[0.12] text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Guide & Simulator Toggles */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={() => setShowGuide((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11.5px] font-semibold transition-all cursor-pointer ${
                showGuide
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-200'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-zinc-300'
              }`}
            >
              <HelpCircle size={13} />
              <span>How It Is Calculated</span>
              {showGuide ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            <button
              onClick={() => setShowSimulator((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11.5px] font-semibold transition-all cursor-pointer ${
                showSimulator
                  ? 'bg-[#ff5533]/20 border-[#ff5533]/40 text-[#ff6b57]'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-zinc-300'
              }`}
            >
              <Calculator size={13} />
              <span>Simulator</span>
              {showSimulator ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
        </div>

        {/* Custom Date Pickers */}
        {filterMode === 'custom' && (
          <div className="flex items-center gap-2 pt-2.5 border-t border-white/[0.06] flex-wrap text-[11.5px] animate-fade-in-up">
            <div className="flex items-center gap-2 bg-black/40 border border-white/[0.08] px-2.5 py-1 rounded-xl">
              <span className="text-zinc-400 text-[10.5px] uppercase font-bold">From</span>
              <input
                type="date"
                value={customFrom}
                min={META.dateMin}
                max={META.dateMax}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-transparent text-white font-mono text-[11px] outline-none cursor-pointer"
              />
            </div>
            <span className="text-zinc-500 font-bold">to</span>
            <div className="flex items-center gap-2 bg-black/40 border border-white/[0.08] px-2.5 py-1 rounded-xl">
              <span className="text-zinc-400 text-[10.5px] uppercase font-bold">To</span>
              <input
                type="date"
                value={customTo}
                min={META.dateMin}
                max={META.dateMax}
                onChange={(e) => setCustomTo(e.target.value)}
                className="bg-transparent text-white font-mono text-[11px] outline-none cursor-pointer"
              />
            </div>
            {(customFrom || customTo) && (
              <button
                onClick={() => {
                  setCustomFrom('');
                  setCustomTo('');
                }}
                className="text-[11px] text-[#ff5533] hover:text-[#ff3b30] font-semibold ml-2 cursor-pointer"
              >
                Reset Dates
              </button>
            )}
          </div>
        )}
      </div>

      {/* Explainer: How It Is Calculated Module */}
      {showGuide && (
        <div className="bg-[#141522] border border-amber-500/25 rounded-2xl p-5 shadow-2xl space-y-4 animate-fade-in-up">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Award size={18} className="text-amber-400" />
              <h3 className="text-[16px] font-bold text-white font-display">
                Executive Incentive Calculation Model & Formula Reference
              </h3>
            </div>
            <span className="text-[10.5px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
              Bucket 1 (Fresh) · 10 Slabs
            </span>
          </div>

          {/* Qualification Banner */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
            <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11.5px] leading-relaxed">
              {guideBucketDef.hasFixedCasesRequirement ? (
                <>
                  <span className="font-bold text-amber-300">Bucket 1 Policy: Mandatory ≥ 120 Cases Worked. </span>
                  <span className="text-zinc-300">
                    Bucket 1 calls loans due in the <strong className="text-white">current month</strong> (e.g. September calling September repayments). Policy (Excel Cell C4) mandates working at least 120 cases. Agents with fewer than 120 cases are marked <strong className="text-amber-300">Disqualified</strong> and earn ₹0 incentive regardless of recovery rate.
                  </span>
                </>
              ) : (
                <>
                  <span className="font-bold text-emerald-300">{guideBucketDef.name} Policy: No Fixed Cases Requirement. </span>
                  <span className="text-zinc-300">
                    {guideBucketDef.name} calls loans due in <strong className="text-white">{guideBucketDef.key === 'bucket2' ? 'the previous month (e.g. September calling August repayments)' : '2 months prior (e.g. September calling July repayments)'}</strong>. There is <strong className="text-emerald-400">NO minimum case requirement</strong> — qualification and payout tier depend solely on achieving the <strong className="text-white">≥ {guideBucketDef.minThreshold}%</strong> recovery rate.
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[12px]">
            {/* Slabs Grid for Selected Bucket */}
            <div className="bg-black/30 border border-white/[0.06] rounded-xl p-3.5 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300 font-display mb-2 flex items-center justify-between">
                  <span>{guideBucketDef.title} ({guideSlabs.length} Tiers)</span>
                  <span className="text-zinc-400 text-[10px]">Benchmark Payout</span>
                </div>
                <div className="space-y-1 font-mono text-[11px]">
                  {guideSlabs.map((s) => (
                    <div key={s.threshold} className="flex justify-between items-center py-0.5 border-b border-white/[0.03]">
                      <span className="text-zinc-300 font-medium">{s.label}</span>
                      <span className="text-zinc-500 text-[10px]">factor {s.factor.toFixed(4).replace(/0+$/, '')}</span>
                      <span className="text-white font-bold">{fmtINRFull(s.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-white/[0.06] text-[10px] font-mono text-zinc-400">
                Benchmark: 143 cases × ₹47,000 = ₹67,21,000 target (1% Base = ₹67,210)
              </div>
            </div>

            {/* Exact Formula Mechanics (from Excel XML) */}
            <div className="bg-black/30 border border-white/[0.06] rounded-xl p-3.5 space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300 font-display">
                Exact Formulas (Excel Sourced)
              </div>
              <div className="space-y-2 text-[11px] text-zinc-300">
                <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                  <strong className="text-white font-mono">1. Target Amount (B5):</strong>
                  <div className="font-mono text-zinc-400 text-[10.5px] mt-0.5">
                    = Target Cases (B4) × Average Ticket (B7)
                  </div>
                  <div className="text-amber-300/80 text-[10px] font-mono mt-0.5">
                    143 cases × ₹47,000 = ₹67,21,000
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                  <strong className="text-white font-mono">2. Base Ratio Reference (B6):</strong>
                  <div className="font-mono text-zinc-400 text-[10.5px] mt-0.5">
                    = Target Amount / 100 (1% Portfolio)
                  </div>
                  <div className="text-amber-300/80 text-[10px] font-mono mt-0.5">
                    ₹67,21,000 / 100 = ₹67,210
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                  <strong className="text-white font-mono">3. Tier Payout (Rows 13–46):</strong>
                  <div className="font-mono text-zinc-400 text-[10.5px] mt-0.5">
                    = ROUND(Base Ratio Reference × Factor, 0)
                  </div>
                  <div className="text-zinc-400 text-[10px] mt-0.5">
                    Agent receives the flat payout of the highest threshold reached.
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                  <strong className="text-white font-mono">4. Cases Qualification Gate:</strong>
                  <div className="text-zinc-400 text-[10px] mt-0.5">
                    {guideBucketDef.hasFixedCasesRequirement ? (
                      <span className="text-amber-300/90 font-mono">Bucket 1: IF Cases &lt; 120 THEN Payout = ₹0</span>
                    ) : (
                      <span className="text-emerald-300/90 font-mono">{guideBucketDef.name}: No fixed case gate (All cases eligible)</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Special Rewards & Dynamic Behavior */}
            <div className="bg-black/30 border border-white/[0.06] rounded-xl p-3.5 space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300 font-display">
                Special Rewards & Dynamic Scaling
              </div>
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25">
                <div className="flex items-center gap-1.5 font-bold text-amber-300 text-[11.5px]">
                  <Sparkles size={13} />
                  <span>Best Performer (+5% of Base Ref)</span>
                </div>
                <div className="text-zinc-400 text-[10.5px] mt-0.5">
                  Formula: <code className="text-white font-mono">ROUND(B6 * 0.05, 0)</code>. Awarded to highest recovery % agent {guideBucketDef.hasFixedCasesRequirement ? 'meeting the 120 cases rule.' : 'in the bucket.'}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25">
                <div className="flex items-center gap-1.5 font-bold text-emerald-300 text-[11.5px]">
                  <Target size={13} />
                  <span>Earliest Achiever (+5% of Base Ref)</span>
                </div>
                <div className="text-zinc-400 text-[10.5px] mt-0.5">
                  Formula: <code className="text-white font-mono">ROUND(B6 * 0.05, 0)</code>. Awarded to first collector crossing 85% milestone.
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05] text-[10.5px] text-zinc-300">
                <strong className="text-white">Dynamic Scale:</strong> If Target Amount or Average Ticket changes, the 1% Base Reference re-evaluates and all slab amounts scale automatically in exact proportion.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* What-If Simulator Module */}
      {showSimulator && (
        <div className="bg-gradient-to-r from-[#181926] via-[#141520] to-[#161726] border border-[#ff5533]/30 rounded-2xl p-5 shadow-2xl space-y-4 animate-fade-in-up">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.08] flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Calculator size={18} className="text-[#ff5533]" />
              <h3 className="text-[15px] font-bold text-white font-display">
                What-If Incentive Simulator (Dynamic Parameter Testing)
              </h3>
            </div>
            <span className="text-[10.5px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#ff5533]/20 text-[#ff6b57] border border-[#ff5533]/40">
              Bucket 1 (Fresh) · ≥120 Cases Gate
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            {/* Controls Left Column */}
            <div className="md:col-span-7 space-y-4">
              {/* Slider 1: Target File Count (Cases) */}
              <div>
                <div className="flex justify-between items-center text-[11.5px] mb-1">
                  <span className="text-zinc-400 font-semibold flex items-center gap-1.5">
                    <span>Target Cases (File Count):</span>
                    {simBucketDef.hasFixedCasesRequirement ? (
                      simFileCount >= MIN_CASES_THRESHOLD ? (
                        <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Eligible (≥120)
                        </span>
                      ) : (
                        <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold">
                          Disqualified (&lt;120)
                        </span>
                      )
                    ) : (
                      <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30">
                        No Fixed Cases Req
                      </span>
                    )}
                  </span>
                  <span className="text-white font-bold font-mono text-[13px]">{simFileCount} cases</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="300"
                  step="1"
                  value={simFileCount}
                  onChange={(e) => setSimFileCount(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex gap-1.5 mt-1">
                  {(simBucketDef.hasFixedCasesRequirement ? [
                    { val: 100, label: '100 (Disqualified)' },
                    { val: 120, label: '120 (Min Gate)' },
                    { val: 143, label: '143 (Benchmark)' },
                    { val: 180, label: '180' },
                    { val: 220, label: '220' },
                  ] : [
                    { val: 60, label: '60 cases' },
                    { val: 100, label: '100 cases' },
                    { val: 143, label: '143 (Benchmark)' },
                    { val: 180, label: '180 cases' },
                    { val: 220, label: '220 cases' },
                  ]).map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setSimFileCount(p.val)}
                      className={`text-[9.5px] font-mono px-2 py-0.5 rounded border transition-all cursor-pointer ${
                        simFileCount === p.val
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                          : 'bg-white/[0.03] text-zinc-400 border-white/[0.06] hover:bg-white/[0.07]'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slider 2: Average File Value (Ticket) */}
              <div>
                <div className="flex justify-between items-center text-[11.5px] mb-1">
                  <span className="text-zinc-400 font-semibold">Average File Value (Ticket Size):</span>
                  <span className="text-white font-bold font-mono text-[13px]">{fmtINRFull(simAvgValue)}</span>
                </div>
                <input
                  type="range"
                  min="20000"
                  max="100000"
                  step="1000"
                  value={simAvgValue}
                  onChange={(e) => setSimAvgValue(parseInt(e.target.value, 10))}
                  className="w-full accent-[#ff5533] cursor-pointer"
                />
                <div className="flex gap-1.5 mt-1">
                  {[
                    { val: 35000, label: '₹35,000' },
                    { val: 47000, label: '₹47,000 (Benchmark)' },
                    { val: 60000, label: '₹60,000' },
                    { val: 75000, label: '₹75,000' },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setSimAvgValue(p.val)}
                      className={`text-[9.5px] font-mono px-2 py-0.5 rounded border transition-all cursor-pointer ${
                        simAvgValue === p.val
                          ? 'bg-[#ff5533]/20 text-[#ff6b57] border-[#ff5533]/50 font-bold'
                          : 'bg-white/[0.03] text-zinc-400 border-white/[0.06] hover:bg-white/[0.07]'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Target Metrics Bar */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-black/40 border border-white/[0.06] text-[11px] font-mono">
                <div>
                  <span className="text-zinc-500 text-[10px] block uppercase font-sans">Target Amount (B5)</span>
                  <span className="text-white font-bold text-[12.5px]">{fmtINRFull(simTargetAmount)}</span>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] block uppercase font-sans">Base Reference 1% (B6)</span>
                  <span className="text-amber-400 font-bold text-[12.5px]">{fmtINRFull(simBaseRatio)}</span>
                </div>
              </div>

              {/* Slider 3: Recovery Rate % */}
              <div>
                <div className="flex justify-between text-[11.5px] mb-1">
                  <span className="text-zinc-400 font-semibold">Simulated Recovery Rate:</span>
                  <span className="text-[#ff5533] font-bold font-mono text-[14px]">{simPct}%</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="100"
                  step="0.5"
                  value={simPct}
                  onChange={(e) => setSimPct(parseFloat(e.target.value))}
                  className="w-full accent-[#ff5533] cursor-pointer"
                />
                <div className="flex justify-between text-[9.5px] font-mono text-zinc-500 mt-0.5">
                  <span>60% (Min)</span>
                  <span className="text-amber-400 font-bold">75% (Qual. Threshold)</span>
                  <span>100% (Max)</span>
                </div>
              </div>
            </div>

            {/* Calculated Result Card Right Column */}
            <div className="md:col-span-5 bg-black/50 border border-white/[0.08] rounded-xl p-4 text-center space-y-2">
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-400 font-display">
                Simulated Payout Outcome
              </div>

              {simBucketDef.hasFixedCasesRequirement && simFileCount < MIN_CASES_THRESHOLD ? (
                <div className="py-3 space-y-2">
                  <div className="text-[32px] font-black text-amber-400 font-display tracking-tight">
                    ₹0
                  </div>
                  <div className="inline-block font-mono text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    Disqualified: &lt; 120 Cases Requirement
                  </div>
                  <p className="text-[11px] text-zinc-400 max-w-xs mx-auto leading-relaxed pt-1">
                    Agent has worked <strong className="text-white">{simFileCount}</strong> cases. Bucket 1 requires at least 120 cases. Need <strong className="text-amber-300">{MIN_CASES_THRESHOLD - simFileCount}</strong> more cases to unlock eligibility.
                  </p>
                </div>
              ) : (
                <div className="py-2 space-y-2">
                  <div className="text-[32px] font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-amber-400 font-display tracking-tight">
                    {simResult.isQualified ? fmtINRFull(simResult.earnedAmount) : '₹0'}
                  </div>
                  <div className="text-[11.5px] font-mono font-semibold">
                    {simResult.isQualified ? (
                      <span className="text-emerald-400">
                        Tier {simResult.currentSlab?.label} Unlocked ({fmtINRFull(simResult.earnedAmount)})
                      </span>
                    ) : (
                      <span className="text-zinc-500">
                        Below {simBucketDef.minThreshold}% threshold (₹0 payout)
                      </span>
                    )}
                  </div>
                  {simResult.nextSlab ? (
                    <div className="text-[11px] text-zinc-400 pt-2 border-t border-white/[0.06]">
                      Collect <strong className="text-amber-300 font-mono font-bold">{fmtINR(simResult.amountNeeded)}</strong> more to unlock <strong className="text-white font-mono">{fmtINR(simResult.nextAmount)}</strong> (+{fmtINR(simResult.incrementalJump)})
                    </div>
                  ) : simResult.isQualified && (
                    <div className="text-[11px] text-emerald-400 font-mono font-bold pt-2 border-t border-white/[0.06]">
                      ✓ Maximum Slab Milestone Reached
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Agent Incentive Table */}
      <div className="bg-[#0f111d]/45 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-white font-display">
              Collection Agents Payout Ledger ({displayedRows.length})
            </span>
            <span className="text-[11px] font-mono text-zinc-400">
              Sorted by {sortKey === 'totalPayable' ? 'Highest Incentive' : sortKey}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-zinc-500 font-medium">Sort:</span>
            {[
              { key: 'totalPayable', label: 'Incentive' },
              { key: 'pct', label: 'Recovery %' },
              { key: 'cases', label: 'Cases' },
              { key: 'recvd', label: 'Collected' },
              { key: 'due', label: 'Due' },
            ].map((s) => (
              <button
                key={s.key}
                onClick={() => setSortKey(s.key)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  sortKey === s.key ? 'bg-white/[0.1] text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0f111d]/80 backdrop-blur-md text-zinc-400 text-[10px] uppercase font-bold tracking-wider border-b border-white/10">
                <th className="py-3 px-4">Agent Name</th>
                <th className="py-3 px-3">Leader</th>
                <th className="py-3 px-3 text-right">Cases</th>
                <th className="py-3 px-3 text-right">Total Due</th>
                <th className="py-3 px-3 text-right">Collected</th>
                <th className="py-3 px-3 text-center">Recovery %</th>
                <th className="py-3 px-3 text-center">Active Tier</th>
                <th className="py-3 px-3 text-right">Base Payout</th>
                <th className="py-3 px-4 text-right">Total Payable</th>
                <th className="py-3 px-4">Next Milestone Gap</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03] text-[12px]">
              {displayedRows.map((agent) => (
                <tr
                  key={agent.name}
                  onClick={() => onOpenAgent && onOpenAgent(agent.name)}
                  className="hover:bg-white/[0.025] transition-colors cursor-pointer group"
                >
                  {/* Agent Name with Avatar */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-600 border border-white/10 flex items-center justify-center text-[10.5px] font-bold text-white shrink-0">
                        {initials(agent.name)}
                      </div>
                      <div>
                        <div className="font-bold text-white group-hover:text-[#ff5533] transition-colors font-display text-[13px] flex items-center gap-1.5">
                          <span>{agent.name}</span>
                          {agent.isTopPerformer && (
                            <span title="Top Performer in Company" className="text-amber-400">
                              🏆
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Leader */}
                  <td className="py-3 px-3 text-zinc-400 text-[11.5px]">
                    {titleCase(agent.leader || '—')}
                  </td>

                  {/* Cases with Qualification Badge */}
                  <td className="py-3 px-3 text-right">
                    {activeBucket.hasFixedCasesRequirement ? (
                      agent.isEligibleCases ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="font-mono text-zinc-200 font-semibold">{agent.cases.toLocaleString('en-IN')}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold" title="Eligible: ≥120 Cases Worked">
                            ≥120
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="font-mono text-amber-400 font-bold">{agent.cases.toLocaleString('en-IN')}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-sans font-semibold" title="Disqualified: Worked fewer than 120 cases in Bucket 1">
                            &lt;120 Min
                          </span>
                        </div>
                      )
                    ) : (
                      <span className="font-mono text-zinc-200 font-semibold">{agent.cases.toLocaleString('en-IN')}</span>
                    )}
                  </td>

                  {/* Due */}
                  <td className="py-3 px-3 text-right font-mono text-zinc-400">
                    {fmtINR(agent.due)}
                  </td>

                  {/* Collected */}
                  <td className="py-3 px-3 text-right font-mono font-bold text-white">
                    {fmtINR(agent.recvd)}
                  </td>

                  {/* Recovery % */}
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-block font-mono font-bold text-[11px] px-2 py-0.5 rounded-full border ${
                        agent.pct >= 85
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : agent.pct >= activeBucket.minThreshold
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      {agent.pct.toFixed(2)}%
                    </span>
                  </td>

                  {/* Active Tier */}
                  <td className="py-3 px-3 text-center">
                    {activeBucket.hasFixedCasesRequirement && !agent.isEligibleCases ? (
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30" title="Disqualified: Must have at least 120 cases worked in Bucket 1">
                        Disqualified (&lt;120)
                      </span>
                    ) : agent.isQualified ? (
                      <span className="font-mono text-[10.5px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        {agent.currentSlab?.label}
                      </span>
                    ) : (
                      <span className="font-mono text-[10.5px] text-zinc-500">
                        Below {activeBucket.minThreshold}%
                      </span>
                    )}
                  </td>

                  {/* Base Payout */}
                  <td className="py-3 px-3 text-right font-mono text-zinc-300">
                    {agent.earnedAmount > 0 ? fmtINRFull(agent.earnedAmount) : '—'}
                  </td>

                  {/* Total Payable */}
                  <td className="py-3 px-4 text-right">
                    <span className="font-mono font-bold text-[13.5px] text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-400">
                      {agent.totalPayable > 0 ? fmtINRFull(agent.totalPayable) : '₹0'}
                    </span>
                    {agent.specialReward > 0 && (
                      <div className="text-[9.5px] font-mono text-amber-300">
                        (+{fmtINR(agent.specialReward)} bonus)
                      </div>
                    )}
                  </td>

                  {/* Next Milestone Gap */}
                  <td className="py-3 px-4 min-w-[190px]">
                    {activeBucket.hasFixedCasesRequirement && !agent.isEligibleCases ? (
                      <div className="flex items-center gap-1.5 text-[10.5px] text-amber-400/90 font-mono">
                        <AlertCircle size={12} className="shrink-0 text-amber-400" />
                        <span>Needs ≥120 cases ({MIN_CASES_THRESHOLD - agent.cases} more)</span>
                      </div>
                    ) : agent.nextSlab ? (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-zinc-400">Next: <strong className="text-white">{agent.nextThreshold}%</strong></span>
                          <span className="text-amber-300 font-bold">+{fmtINR(agent.incrementalJump)}</span>
                        </div>
                        <div className="w-full bg-white/[0.08] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-[#ff5e3a] to-amber-400 h-full rounded-full"
                            style={{ width: `${agent.pctProgress}%` }}
                          />
                        </div>
                        <div className="text-[9.5px] font-mono text-zinc-400">
                          Need <strong className="text-white font-semibold">{fmtINR(agent.amountNeeded)}</strong>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[10.5px] text-emerald-400 font-semibold font-mono">
                        <CheckCircle2 size={12} />
                        <span>Max Tier Achieved</span>
                      </div>
                    )}
                  </td>

                  {/* Action */}
                  <td className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenAgent && onOpenAgent(agent.name);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-[#ff5533] hover:text-white border border-white/[0.08] text-zinc-400 text-[11px] font-semibold transition-all cursor-pointer"
                    >
                      Dossier
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
