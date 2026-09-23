import { useMemo, useState } from 'react';
import {
  Search, Award, Users, TrendingUp, CheckCircle2,
  ChevronDown, ChevronUp, ArrowLeft, HelpCircle, Layers
} from 'lucide-react';
import {
  computeLeaderRows, filterRows, fmtINR, fmtINRFull, fmtMonth,
  titleCase, initials, META, AGENTS
} from '../utils/data';
import {
  calculateLeaderIncentive, calculateTeamAgentsRollup,
  PORTFOLIO_BUCKETS, LEADER_FRESH_MATRIX
} from '../utils/incentives';

export default function LeaderIncentivesPage({ onOpenLeader, onNavigatePage }) {
  // Period filter: 'month' | 'overall' | 'custom'
  const [filterMode, setFilterMode] = useState('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Slicing filters
  const [selectedBucket, setSelectedBucket] = useState('all');
  const [qualificationFilter, setQualificationFilter] = useState('all'); // 'all' | 'qualified' | 'unqualified'
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('earnedAmount'); // 'earnedAmount' | 'pct' | 'due' | 'teamPool'

  // Guide toggle
  const [showGuide, setShowGuide] = useState(false);

  // Month boundary resolution
  const latestMonthStr = useMemo(() => (META.dateMax ? META.dateMax.slice(0, 7) : '2026-07'), []);
  const earliestMonthStr = useMemo(() => (META.dateMin ? META.dateMin.slice(0, 7) : '2026-05'), []);
  const thisMonthFrom = useMemo(() => `${latestMonthStr}-01`, [latestMonthStr]);
  const thisMonthTo = useMemo(() => META.dateMax || `${latestMonthStr}-31`, [latestMonthStr]);

  const activeFrom = filterMode === 'month' ? thisMonthFrom : filterMode === 'custom' ? customFrom : '';
  const activeTo = filterMode === 'month' ? thisMonthTo : filterMode === 'custom' ? customTo : '';

  // 1. Calculate leader incentives & team rollups across all leaders
  const allRows = useMemo(() => {
    const rawLeaders = computeLeaderRows({ from: activeFrom, to: activeTo });
    if (!rawLeaders.length) return [];

    return rawLeaders.map((leader) => {
      // Get all agents under this leader within the active timeframe
      const leaderRows = filterRows({ leader: leader.name, from: activeFrom, to: activeTo });
      const empAgg = {};
      leaderRows.forEach((r) => {
        const a = AGENTS[r[0]];
        if (!empAgg[a]) empAgg[a] = { due: 0, recvd: 0, cases: 0 };
        empAgg[a].due += r[5];
        empAgg[a].recvd += r[6];
        empAgg[a].cases++;
      });
      const teamList = Object.entries(empAgg);
      const rollup = calculateTeamAgentsRollup(teamList);

      const inc = calculateLeaderIncentive(leader.due, leader.pct, leader.recvd);

      return {
        ...leader,
        ...inc,
        rollup,
      };
    });
  }, [activeFrom, activeTo]);

  // 2. Filter & Sort rows for table display
  const displayedRows = useMemo(() => {
    let list = [...allRows];

    if (selectedBucket !== 'all') {
      list = list.filter((l) => l.bucketLabel === selectedBucket);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((l) => l.name.toLowerCase().includes(q));
    }

    if (qualificationFilter === 'qualified') {
      list = list.filter((l) => l.isQualified);
    } else if (qualificationFilter === 'unqualified') {
      list = list.filter((l) => !l.isQualified);
    }

    list.sort((a, b) => {
      if (sortKey === 'earnedAmount') return b.earnedAmount - a.earnedAmount || b.pct - a.pct;
      if (sortKey === 'pct') return b.pct - a.pct;
      if (sortKey === 'due') return b.due - a.due;
      if (sortKey === 'teamPool') return b.rollup.totalPool - a.rollup.totalPool;
      return 0;
    });

    return list;
  }, [allRows, selectedBucket, search, qualificationFilter, sortKey]);

  // 3. High-level Summary Metrics
  const summary = useMemo(() => {
    let totalLeaderPool = 0;
    let totalTeamAgentsPool = 0;
    let qualifiedCount = 0;
    let topLeader = null;
    let totalDue = 0;
    let totalRecvd = 0;

    allRows.forEach((r) => {
      totalLeaderPool += r.earnedAmount;
      totalTeamAgentsPool += r.rollup.totalPool;
      totalDue += r.due;
      totalRecvd += r.recvd;
      if (r.isQualified) qualifiedCount++;
      if (!topLeader || r.earnedAmount > topLeader.earnedAmount) {
        topLeader = r;
      }
    });

    const avgLeaderPayout = qualifiedCount ? Math.round(totalLeaderPool / qualifiedCount) : 0;

    return {
      totalLeaderPool,
      totalTeamAgentsPool,
      qualifiedCount,
      totalLeaders: allRows.length,
      topLeader,
      avgLeaderPayout,
      totalDue,
      totalRecvd,
    };
  }, [allRows]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header with Tab Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#ff5e3a] to-[#ff3b30] flex items-center justify-center text-white shadow-[0_0_15px_rgba(255,59,48,0.35)]">
              <TrendingUp size={18} />
            </div>
            <h1 className="text-[24px] font-black text-white font-display tracking-tight">
              Team Leader Incentive Matrix
            </h1>
            <span className="text-[10.5px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-white/[0.08] text-zinc-300 border border-white/[0.08]">
              2D Portfolio × Recovery Matrix
            </span>
          </div>
          <p className="text-[12.5px] font-medium text-zinc-400 mt-1">
            Official 2-dimensional incentive matrix based on team managed portfolio size and recovery achievement.
          </p>
        </div>

        {/* View Switcher Sub-Tabs */}
        <div className="flex items-center bg-[#12131b] border border-white/[0.08] p-1 rounded-2xl gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onNavigatePage && onNavigatePage('agent-incentives')}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[12px] font-semibold text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all cursor-pointer"
          >
            <ArrowLeft size={13} className="text-zinc-500" />
            <Award size={14} />
            <span>Agent Incentives</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[12px] font-bold bg-gradient-to-r from-[#ff5e3a] to-[#ff3b30] text-white shadow-[0_0_12px_rgba(255,59,48,0.4)] cursor-pointer"
          >
            <Users size={14} />
            <span>Leader Matrix</span>
          </button>
        </div>
      </div>

      {/* Top Executive KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Leader Incentive Pool */}
        <div className="bg-gradient-to-br from-[#161726] to-[#12131d] border border-[#ff3b30]/25 rounded-2xl p-4 shadow-lg">
          <div className="text-[10px] font-bold text-[#ff5533] uppercase tracking-wider font-display flex items-center gap-1.5">
            <Award size={13} />
            <span>Total Leader Incentive Pool</span>
          </div>
          <div className="text-[26px] font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-100 to-zinc-300 font-display tracking-tight mt-1">
            {fmtINRFull(summary.totalLeaderPool)}
          </div>
          <div className="text-[10.5px] font-mono text-zinc-400 mt-1">
            Across {summary.totalLeaders} team leaders
          </div>
        </div>

        {/* Qualified Leaders */}
        <div className="bg-[#12131c] border border-white/[0.06] rounded-2xl p-4 shadow-md">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-display">
            Qualified Leaders (≥85%)
          </div>
          <div className="text-[26px] font-black text-white font-display tracking-tight mt-1 flex items-baseline gap-2">
            <span>{summary.qualifiedCount}</span>
            <span className="text-[13px] font-mono font-bold text-emerald-400">
              ({summary.totalLeaders ? Math.round((summary.qualifiedCount / summary.totalLeaders) * 100) : 0}%)
            </span>
          </div>
          <div className="text-[10.5px] font-mono text-zinc-500 mt-1">
            {summary.totalLeaders - summary.qualifiedCount} below 85% qualification
          </div>
        </div>

        {/* Highest Earning Leader */}
        <div className="bg-[#12131c] border border-white/[0.06] rounded-2xl p-4 shadow-md">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-display">
            Top Earning Leader
          </div>
          <div className="text-[17px] font-bold text-white font-display truncate mt-1">
            {summary.topLeader ? titleCase(summary.topLeader.name) : '—'}
          </div>
          <div className="text-[12px] font-mono font-bold text-amber-300 mt-0.5">
            {summary.topLeader ? fmtINRFull(summary.topLeader.earnedAmount) : '₹0'}
            <span className="text-zinc-500 text-[10px] ml-1">({summary.topLeader?.bucketLabel})</span>
          </div>
        </div>

        {/* Total Team Agents Pool Rollup */}
        <div className="bg-[#12131c] border border-white/[0.06] rounded-2xl p-4 shadow-md">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-display">
            Team Agents Total Pool
          </div>
          <div className="text-[24px] font-bold font-mono text-emerald-400 tracking-tight mt-1">
            {fmtINR(summary.totalTeamAgentsPool)}
          </div>
          <div className="text-[10.5px] font-mono text-zinc-500 mt-1">
            Total incentives earned by all agents
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#0f111d]/45 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 space-y-3 shadow-xl">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Search by Leader */}
          <div className="flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] focus-within:border-[#ff3b30]/50 rounded-xl px-3 py-1.5 transition-all">
            <Search size={14} className="text-[#ff5533]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team leader…"
              className="bg-transparent text-[12px] text-zinc-200 placeholder-zinc-500 outline-none w-48"
            />
          </div>

          {/* Period Selector */}
          <div className="flex items-center gap-1.5 bg-black/40 border border-white/[0.08] p-0.5 rounded-xl">
            <button
              onClick={() => setFilterMode('month')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filterMode === 'month'
                  ? 'bg-gradient-to-r from-[#ff5e3a] to-[#ff3b30] text-white shadow-[0_0_10px_rgba(255,59,48,0.4)]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              This Month ({fmtMonth(latestMonthStr).slice(0, 3)})
            </button>
            <button
              onClick={() => setFilterMode('overall')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filterMode === 'overall'
                  ? 'bg-gradient-to-r from-[#ff5e3a] to-[#ff3b30] text-white shadow-[0_0_10px_rgba(255,59,48,0.4)]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Overall ({fmtMonth(earliestMonthStr).slice(0, 3)}–{fmtMonth(latestMonthStr).slice(0, 3)})
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

          {/* Portfolio Bucket Filter */}
          <select
            value={selectedBucket}
            onChange={(e) => setSelectedBucket(e.target.value)}
            className="text-[12px] font-semibold bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] text-zinc-200 rounded-xl px-3 py-1.5 outline-none focus:border-[#ff3b30]/60 transition-all cursor-pointer"
          >
            <option value="all" className="bg-[#12131a] text-zinc-200">All Portfolio Buckets</option>
            {PORTFOLIO_BUCKETS.map((b) => (
              <option key={b.label} value={b.label} className="bg-[#12131a] text-zinc-200">
                {b.label}
              </option>
            ))}
          </select>

          {/* Qualification Filter */}
          <div className="flex bg-black/40 border border-white/[0.08] rounded-xl p-0.5 gap-0.5">
            {[
              { id: 'all', label: 'All' },
              { id: 'qualified', label: 'Qualified (≥85%)' },
              { id: 'unqualified', label: 'Below 85%' },
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

          {/* Matrix Guide Toggle */}
          <div className="ml-auto">
            <button
              onClick={() => setShowGuide((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11.5px] font-semibold transition-all cursor-pointer ${
                showGuide
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-200'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-zinc-300'
              }`}
            >
              <HelpCircle size={13} />
              <span>{showGuide ? 'Hide' : 'View'} 2D Incentive Matrix</span>
              {showGuide ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
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
          </div>
        )}
      </div>

      {/* Interactive 2D Matrix Explainer Module */}
      {showGuide && (
        <div className="bg-[#141522] border border-amber-500/25 rounded-2xl p-5 shadow-2xl space-y-4 animate-fade-in-up">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-amber-400" />
              <div>
                <h3 className="text-[16px] font-bold text-white font-display">
                  Official Team Leader 2D Incentive Matrix (Fresh Portfolio)
                </h3>
                <div className="text-[11px] text-zinc-400">
                  X-Axis = Team Portfolio Size (₹ Cr) · Y-Axis = Team Achievement %
                </div>
              </div>
            </div>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Min Threshold: 85.0%
            </span>
          </div>

          {/* The 2D Grid Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse text-[11px] font-mono">
              <thead>
                <tr className="bg-black/50 text-zinc-400">
                  <th className="py-2.5 px-3 text-left font-sans text-[11px] font-bold text-amber-300">
                    Achievement % (≤)
                  </th>
                  {PORTFOLIO_BUCKETS.map((b) => (
                    <th key={b.label} className="py-2.5 px-3 border-l border-white/[0.06] text-white font-bold">
                      {b.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {LEADER_FRESH_MATRIX.map((row) => (
                  <tr key={row.threshold} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3 text-left font-bold text-amber-200">
                      {row.threshold.toFixed(2)}%
                    </td>
                    {row.payouts.map((p, idx) => (
                      <td key={idx} className="py-2.5 px-3 border-l border-white/[0.04] text-zinc-200">
                        {fmtINRFull(p)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-[11.5px] text-zinc-300">
            <div className="bg-black/30 p-3 rounded-xl border border-white/[0.06]">
              <strong className="text-white block mb-1">📌 How Portfolio Bucket Is Determined:</strong>
              The total amount due under the team leader's agents is categorized into one of 8 columns (from ≤ ₹5 Cr up to ≤ ₹70 Cr).
            </div>
            <div className="bg-black/30 p-3 rounded-xl border border-white/[0.06]">
              <strong className="text-white block mb-1">📌 How Achievement % Is Rewarded:</strong>
              Once the portfolio bucket is fixed, the team's combined recovery rate determines the payout row (starts at 85% and tops at 95% = up to ₹55,000).
            </div>
          </div>
        </div>
      )}

      {/* Main Team Leaders Table */}
      <div className="bg-[#12131b] border border-white/[0.07] rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-white font-display">
              Team Leaders Incentive Matrix Ledger ({displayedRows.length})
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-zinc-500 font-medium">Sort:</span>
            {[
              { key: 'earnedAmount', label: 'Leader Incentive' },
              { key: 'pct', label: 'Recovery %' },
              { key: 'due', label: 'Portfolio Due' },
              { key: 'teamPool', label: 'Team Pool' },
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
              <tr className="bg-[#141520] text-zinc-400 text-[10px] uppercase font-bold tracking-wider border-b border-white/[0.06]">
                <th className="py-3 px-4">Leader Name</th>
                <th className="py-3 px-3 text-center">Team Agents</th>
                <th className="py-3 px-3 text-right">Portfolio Due</th>
                <th className="py-3 px-3 text-center">Portfolio Bracket</th>
                <th className="py-3 px-3 text-right">Team Collected</th>
                <th className="py-3 px-3 text-center">Achievement %</th>
                <th className="py-3 px-4 text-right">Leader Incentive</th>
                <th className="py-3 px-4 text-right">Team Earned Pool</th>
                <th className="py-3 px-4">Next Target Jump</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03] text-[12px]">
              {displayedRows.map((leader) => (
                <tr
                  key={leader.name}
                  onClick={() => onOpenLeader && onOpenLeader(leader.name)}
                  className="hover:bg-white/[0.025] transition-colors cursor-pointer group"
                >
                  {/* Leader Name */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-600 border border-white/10 flex items-center justify-center text-[10.5px] font-bold text-white shrink-0">
                        {initials(leader.name)}
                      </div>
                      <div className="font-bold text-white group-hover:text-[#ff5533] transition-colors font-display text-[13px]">
                        {titleCase(leader.name)}
                      </div>
                    </div>
                  </td>

                  {/* Team Agents Count */}
                  <td className="py-3 px-3 text-center font-mono text-zinc-300">
                    <span className="px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.06]">
                      {leader.agentCount} agents
                    </span>
                  </td>

                  {/* Portfolio Due */}
                  <td className="py-3 px-3 text-right font-mono font-bold text-zinc-300">
                    {fmtINR(leader.due)}
                  </td>

                  {/* Portfolio Bracket */}
                  <td className="py-3 px-3 text-center">
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      {leader.bucketLabel}
                    </span>
                  </td>

                  {/* Team Collected */}
                  <td className="py-3 px-3 text-right font-mono text-white font-bold">
                    {fmtINR(leader.recvd)}
                  </td>

                  {/* Achievement % */}
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-block font-mono font-bold text-[11px] px-2.5 py-0.5 rounded-full border ${
                        leader.pct >= 85
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      {leader.pct.toFixed(1)}%
                    </span>
                  </td>

                  {/* Leader Incentive Payout */}
                  <td className="py-3 px-4 text-right">
                    <span className="font-mono font-black text-[14px] text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-amber-400">
                      {leader.earnedAmount > 0 ? fmtINRFull(leader.earnedAmount) : '₹0'}
                    </span>
                  </td>

                  {/* Team Agents Total Pool */}
                  <td className="py-3 px-4 text-right">
                    <div className="font-mono font-bold text-[12.5px] text-emerald-400">
                      {fmtINR(leader.rollup.totalPool)}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-500">
                      {leader.rollup.qualifiedCount} of {leader.rollup.totalAgents} agents
                    </div>
                  </td>

                  {/* Next Target Jump */}
                  <td className="py-3 px-4 min-w-[180px]">
                    {leader.nextRow ? (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-zinc-400">Target: <strong className="text-white">{leader.nextThreshold}%</strong></span>
                          <span className="text-amber-300 font-bold">+{fmtINR(leader.incrementalJump)}</span>
                        </div>
                        <div className="w-full bg-white/[0.08] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-[#ff5533] to-amber-400 h-full rounded-full"
                            style={{ width: `${leader.pctProgress}%` }}
                          />
                        </div>
                        <div className="text-[9.5px] font-mono text-zinc-400">
                          Need <strong className="text-white font-semibold">{fmtINR(leader.amountNeeded)}</strong>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[10.5px] text-emerald-400 font-semibold font-mono">
                        <CheckCircle2 size={12} />
                        <span>Max 95.0% Tier</span>
                      </div>
                    )}
                  </td>

                  {/* Action */}
                  <td className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenLeader && onOpenLeader(leader.name);
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
