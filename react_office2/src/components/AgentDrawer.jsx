import { useState, useMemo } from 'react';
import {
  X, Calendar, ChevronDown, ChevronUp, TrendingUp, CalendarDays, BarChart2,
  Maximize2, Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, Area, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  filterRows, aggregate, STATUSES, STATUS_COLORS, YESTERDAY_STR, META,
  fmtINR, fmtINRFull, fmtDateShort, fmtMonth, titleCase, round1
} from '../utils/data';
import { useLiveCollection } from '../context/LiveCollectionContext';

export default function AgentDrawer({ name, onClose }) {
  const { getAgentLive } = useLiveCollection();
  const agentLive = useMemo(() => getAgentLive(name), [getAgentLive, name]);
  const [isMaximized, setIsMaximized] = useState(true);

  // Date filter state: 'overall' | 'month' | 'custom'
  const [filterMode, setFilterMode] = useState('overall');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Trajectory view state
  const [selectedTrajMonth, setSelectedTrajMonth] = useState('all');
  const [showDayLedger, setShowDayLedger] = useState(false);

  // Month date range boundaries from dataset
  const latestMonthStr = useMemo(() => (META.dateMax ? META.dateMax.slice(0, 7) : '2026-07'), []);
  const earliestMonthStr = useMemo(() => (META.dateMin ? META.dateMin.slice(0, 7) : '2026-05'), []);
  const thisMonthFrom = useMemo(() => `${latestMonthStr}-01`, [latestMonthStr]);
  const thisMonthTo = useMemo(() => META.dateMax || `${latestMonthStr}-31`, [latestMonthStr]);

  // Compute active date boundaries based on filter mode
  const activeFrom = filterMode === 'month' ? thisMonthFrom : filterMode === 'custom' ? customFrom : '';
  const activeTo = filterMode === 'month' ? thisMonthTo : filterMode === 'custom' ? customTo : '';

  // Filtered rows & aggregated metrics for this agent
  const rows = useMemo(
    () => filterRows({ agent: name, from: activeFrom, to: activeTo }),
    [name, activeFrom, activeTo]
  );
  const agg = useMemo(() => aggregate(rows), [rows]);

  // Agent metadata
  const leader = META.agentPrimaryLeader[name];
  const multi = META.agentMultiLeaders[name];

  // 1. Dedicated Yesterday Due Date Cases (strictly cases where Due Date = Yesterday)
  const ydayDueAgg = useMemo(() => {
    if (!YESTERDAY_STR) return { due: 0, recvd: 0, cases: 0, pct: 0 };
    const yRows = filterRows({ agent: name, from: YESTERDAY_STR, to: YESTERDAY_STR });
    return aggregate(yRows);
  }, [name]);
  const ydayDueAmt = ydayDueAgg.recvd;
  const ydayDueCases = ydayDueAgg.cases;

  // 2. Dedicated Yesterday Total Cash Received (RCV DATE = Yesterday across all cases: due date, preclosed, overdue)
  const actualYdayCash = useMemo(() => {
    if (!YESTERDAY_STR || !META?.agentActualCollectionByDate) return null;
    return META.agentActualCollectionByDate[name]?.[YESTERDAY_STR] || null;
  }, [name]);
  const ydayCashAmt = actualYdayCash?.amount ?? 0;
  const ydayCashCases = actualYdayCash?.cases ?? 0;

  // Dynamic Inspection Context:
  // When a user filters a single date (e.g. 01/09/2026), these blocks adapt dynamically to that date!
  const singleDate = (filterMode === 'custom' && customFrom && customFrom === customTo) ? customFrom : null;
  const isCustomRange = (filterMode === 'custom' && customFrom && customTo && customFrom !== customTo);

  const dynamicDueLabel = singleDate
    ? `${fmtDateShort(singleDate)} Due Reco`
    : isCustomRange
    ? 'Period Due Reco'
    : 'Yday Due Reco';

  const dynamicCashLabel = singleDate
    ? `${fmtDateShort(singleDate)} Bank Cash`
    : isCustomRange
    ? 'Period Bank Cash'
    : 'Yday Bank Cash';

  const dynamicDueData = useMemo(() => {
    if (singleDate) {
      const dRows = filterRows({ agent: name, from: singleDate, to: singleDate });
      const a = aggregate(dRows);
      return { amt: a.recvd, cases: a.cases };
    }
    if (isCustomRange) {
      return { amt: agg.recvd, cases: agg.cases };
    }
    return { amt: ydayDueAmt, cases: ydayDueCases };
  }, [singleDate, isCustomRange, name, agg.recvd, agg.cases, ydayDueAmt, ydayDueCases]);

  const dynamicCashData = useMemo(() => {
    if (!META?.agentActualCollectionByDate || !META.agentActualCollectionByDate[name]) {
      return { amt: 0, cases: 0 };
    }
    const datesMap = META.agentActualCollectionByDate[name];

    if (singleDate) {
      const val = datesMap[singleDate] || { amount: 0, cases: 0 };
      return { amt: val.amount || 0, cases: val.cases || 0 };
    }

    if (isCustomRange) {
      let totalAmt = 0;
      let totalCases = 0;
      Object.entries(datesMap).forEach(([dt, val]) => {
        if (dt >= customFrom && dt <= customTo) {
          totalAmt += val.amount || 0;
          totalCases += val.cases || 0;
        }
      });
      return { amt: totalAmt, cases: totalCases };
    }

    return { amt: ydayCashAmt, cases: ydayCashCases };
  }, [singleDate, isCustomRange, customFrom, customTo, name, ydayCashAmt, ydayCashCases]);

  const ydayRow = agg.daily.find((d) => d.date === YESTERDAY_STR);

  const lastMonth = agg.monthly.length ? agg.monthly[agg.monthly.length - 1] : null;

  // Month-wise performance bar chart data
  const monthlyData = useMemo(
    () => agg.monthly.map((m) => ({ ...m, label: fmtMonth(m.month) })),
    [agg.monthly]
  );

  // All distinct months available for this agent across full dataset (for trajectory switcher tabs)
  const availableMonths = useMemo(() => {
    const allAgentRows = filterRows({ agent: name });
    const allAgg = aggregate(allAgentRows);
    return allAgg.monthly.map((m) => m.month);
  }, [name]);


  // Daily Trajectory Data: either filtered to selected month or across active dataset
  const { trajectoryData, trajSummary } = useMemo(() => {
    let sourceDays = [...agg.daily];

    // If a specific month is selected in trajectory tabs
    if (selectedTrajMonth !== 'all') {
      sourceDays = sourceDays.filter((d) => d.date.startsWith(selectedTrajMonth));
    }

    let runningTotal = 0;
    let maxRecvd = 0;
    let peakDay = null;
    let totalDue = 0;
    let totalRecvd = 0;
    let activeDays = 0;

    const list = sourceDays.map((d) => {
      runningTotal += d.recvd;
      totalDue += d.due;
      totalRecvd += d.recvd;
      if (d.recvd > 0) activeDays++;
      if (d.recvd > maxRecvd) {
        maxRecvd = d.recvd;
        peakDay = d;
      }
      return {
        ...d,
        label: fmtDateShort(d.date),
        cumulative: runningTotal,
      };
    });

    // Append today's live daily collection point from Google Sheets
    if (agentLive?.liveRecvd > 0) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const todayMonth = todayStr.slice(0, 7);
      if (selectedTrajMonth === 'all' || selectedTrajMonth === todayMonth) {
        runningTotal += agentLive.liveRecvd;
        totalDue += Math.round(agentLive.liveRecvd * 1.15);
        totalRecvd += agentLive.liveRecvd;
        activeDays++;
        list.push({
          date: todayStr,
          label: `${fmtDateShort(todayStr)} (Live)`,
          recvd: agentLive.liveRecvd,
          due: Math.round(agentLive.liveRecvd * 1.15),
          cases: agentLive.liveCases || 1,
          cumulative: runningTotal,
          pct: 86.9,
          isLive: true,
        });
      }
    }

    const recoveryPct = totalDue ? round1((totalRecvd / totalDue) * 100) : 0;
    const avgDaily = activeDays ? Math.round(totalRecvd / activeDays) : 0;

    return {
      trajectoryData: list,
      trajSummary: {
        totalRecvd,
        totalDue,
        recoveryPct,
        peakDay,
        avgDaily,
        activeDays,
      },
    };
  }, [agg.daily, selectedTrajMonth, agentLive]);

  const activeMonthLabel =
    selectedTrajMonth === 'all'
      ? filterMode === 'month'
        ? fmtMonth(latestMonthStr)
        : 'All Months'
      : fmtMonth(selectedTrajMonth);

  return (
    <Drawer onClose={onClose} isMaximized={isMaximized}>
      {/* Drawer Header */}
      <div className="flex items-start justify-between mb-5 pb-4 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-[24px] font-black text-white font-display tracking-tight">{name}</h2>
            <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-white/[0.08] text-zinc-300 border border-white/[0.08]">
              Collection Agent Dossier
            </span>
          </div>
          <div className="text-[12.5px] font-medium text-zinc-400 mt-1">
            Leader: <span className="text-zinc-200 font-semibold">{titleCase(leader)}</span>
            {multi ? ` · also under: ${multi.map(titleCase).join(', ')}` : ''}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Maximize / Restore Toggle */}
          <button
            type="button"
            onClick={() => setIsMaximized((v) => !v)}
            title={isMaximized ? 'Exit Full Screen (Drawer Mode)' : 'Expand to Full Screen'}
            className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Date Filter Toolbar */}
      <div className="bg-[#141520] border border-white/[0.07] rounded-2xl p-3.5 mb-6 space-y-2.5 shadow-lg">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <CalendarDays size={14} className="text-[#ff5533]" />
            <span className="text-[12px] font-bold text-zinc-300 font-display">Date Filter:</span>
          </div>

          <div className="flex bg-black/40 border border-white/[0.08] rounded-xl p-0.5 gap-0.5">
            <button
              onClick={() => {
                setFilterMode('month');
                setSelectedTrajMonth(latestMonthStr);
              }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filterMode === 'month'
                  ? 'bg-gradient-to-r from-[#ff5e3a] to-[#ff3b30] text-white shadow-[0_0_10px_rgba(255,59,48,0.4)]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => {
                setFilterMode('overall');
                setSelectedTrajMonth('all');
              }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filterMode === 'overall'
                  ? 'bg-gradient-to-r from-[#ff5e3a] to-[#ff3b30] text-white shadow-[0_0_10px_rgba(255,59,48,0.4)]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Overall
            </button>
            <button
              onClick={() => setFilterMode('custom')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filterMode === 'custom'
                  ? 'bg-gradient-to-r from-[#ff5e3a] to-[#ff3b30] text-white shadow-[0_0_10px_rgba(255,59,48,0.4)]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Custom Range
            </button>
          </div>
        </div>

        {/* Date scope label */}
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 px-1">
          <span>Active Period:</span>
          {filterMode === 'month' && (
            <span className="text-[#ff5533] font-bold">{fmtMonth(latestMonthStr)} (Latest Ledger)</span>
          )}
          {filterMode === 'overall' && (
            <span className="text-zinc-300 font-medium">
              Full Dataset ({fmtMonth(earliestMonthStr)} – {fmtMonth(latestMonthStr)})
            </span>
          )}
          {filterMode === 'custom' && (
            <span className="text-zinc-300 font-medium">
              {customFrom ? fmtDateShort(customFrom) : 'Start'} to {customTo ? fmtDateShort(customTo) : 'End'}
            </span>
          )}
        </div>

        {/* Custom Range Date Pickers */}
        {filterMode === 'custom' && (
          <div className="flex items-center gap-2 pt-2.5 border-t border-white/[0.06] flex-wrap text-[11.5px] animate-fade-in-up">
            <div className="flex items-center gap-2 bg-black/40 border border-white/[0.08] px-2.5 py-1.5 rounded-xl">
              <Calendar size={13} className="text-[#ff5533]" />
              <span className="text-zinc-400 text-[10.5px] uppercase font-bold">From</span>
              <input
                type="date"
                value={customFrom}
                min={META.dateMin}
                max={META.dateMax}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-transparent text-white font-mono text-[11.5px] outline-none cursor-pointer"
              />
            </div>
            <span className="text-zinc-500 font-bold">to</span>
            <div className="flex items-center gap-2 bg-black/40 border border-white/[0.08] px-2.5 py-1.5 rounded-xl">
              <Calendar size={13} className="text-[#ff5533]" />
              <span className="text-zinc-400 text-[10.5px] uppercase font-bold">To</span>
              <input
                type="date"
                value={customTo}
                min={META.dateMin}
                max={META.dateMax}
                onChange={(e) => setCustomTo(e.target.value)}
                className="bg-transparent text-white font-mono text-[11.5px] outline-none cursor-pointer"
              />
            </div>
            {(customFrom || customTo) && (
              <button
                onClick={() => {
                  setCustomFrom('');
                  setCustomTo('');
                }}
                className="text-[11px] text-[#ff5533] hover:text-[#ff3b30] font-semibold ml-auto flex items-center gap-1 cursor-pointer"
              >
                Reset Dates
              </button>
            )}
          </div>
        )}
      </div>

      {/* Mini KPI Grid: Spans 8 columns across the big screen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 mb-6">
        <MiniKpi label="Total Due" value={fmtINR(agg.due)} />
        <MiniKpi label="Total Collection" value={fmtINR(agg.recvd)} accent />
        <MiniKpi label="Recovery" value={`${agg.pct.toFixed(2)}%`} />
        <MiniKpi label="Live Today" value={fmtINR(agentLive?.liveRecvd || 0)} live />
        <MiniKpi
          label={dynamicDueLabel}
          value={fmtINR(dynamicDueData.amt)}
          sub={singleDate ? `${dynamicDueData.cases} cases (Due date)` : `${dynamicDueData.cases} cases (Due)`}
          badge="DUE DATE"
        />
        <MiniKpi
          label={dynamicCashLabel}
          value={fmtINR(dynamicCashData.amt)}
          sub={singleDate ? `${dynamicCashData.cases} txns (Bank cash)` : `${dynamicCashData.cases} cases (All)`}
          badge="RCV DATE"
        />
        <MiniKpi
          label={filterMode === 'month' ? 'Period Due' : 'This Month'}
          value={filterMode === 'month' ? fmtINR(agg.due) : lastMonth ? fmtINR(lastMonth.recvd) : '—'}
        />
        <MiniKpi label="Cases" value={agg.cases.toLocaleString('en-IN')} />
      </div>

      {/* 2-Column Responsive Layout for Big Screen Experience */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 cols): Case Status Breakdown + Month-Wise Performance */}
        <div className="lg:col-span-5 space-y-6">

          {/* Case Status Distribution */}
          <div>
            <SectionLabel>Case Status Distribution</SectionLabel>
            <div className="flex flex-col gap-2.5 bg-[#141520] border border-white/[0.06] rounded-2xl p-4 shadow-md">
              {STATUSES.map((s) => {
                const c = agg.statusCount[s] || 0;
                const pct = agg.cases ? Math.round((c / agg.cases) * 1000) / 10 : 0;
                return (
                  <div key={s} className="flex items-center gap-2.5 text-[12px]">
                    <span
                      className="w-2 h-2 rounded-full shrink-0 shadow-[0_0_6px_currentColor]"
                      style={{ background: STATUS_COLORS[s] || '#94a3b8', color: STATUS_COLORS[s] || '#94a3b8' }}
                    />
                    <span className="flex-1 font-medium text-zinc-300">{titleCase(s)}</span>
                    <span className="font-mono font-semibold text-white">{c.toLocaleString('en-IN')}</span>
                    <span className="font-mono text-zinc-500 w-12 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Month-wise Performance */}
          {monthlyData.length > 0 && (
            <div>
              <SectionLabel>Month-wise Performance</SectionLabel>
              <div className="bg-[#141520] border border-white/[0.06] rounded-2xl p-4 shadow-md">
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#1f212e" strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8e99ac' }} axisLine={{ stroke: '#1f212e' }} tickLine={false} />
                    <YAxis tickFormatter={(v) => fmtINR(v)} tick={{ fontSize: 10, fill: '#8e99ac' }} axisLine={{ stroke: '#1f212e' }} tickLine={false} />
                    <Tooltip content={<DrawerTooltip />} />
                    <Bar dataKey="due" name="Due" fill="#242634" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="recvd" name="Recovered" fill="#ff5533" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (7 cols): Big Day-wise Collection Trajectory + Total Collection Card + Day Ledger */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06] flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-[#ff5533]" />
              <SectionLabel noMargin>Daily Collection Trajectory</SectionLabel>
            </div>

            {/* Trajectory Month Selector Pills */}
            <div className="flex bg-black/40 border border-white/[0.08] rounded-xl p-0.5 gap-0.5 flex-wrap">
              <button
                onClick={() => setSelectedTrajMonth('all')}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                  selectedTrajMonth === 'all'
                    ? 'bg-gradient-to-r from-[#ff5e3a] to-[#ff3b30] text-white shadow-[0_0_8px_rgba(255,59,48,0.4)]'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                All Months
              </button>
              {availableMonths.map((m) => (
                <button
                  key={m}
                  onClick={() => setSelectedTrajMonth(m)}
                  className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                    selectedTrajMonth === m
                      ? 'bg-gradient-to-r from-[#ff5e3a] to-[#ff3b30] text-white shadow-[0_0_8px_rgba(255,59,48,0.4)]'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {fmtMonth(m)}
                </button>
              ))}
            </div>
          </div>

          {/* Big Day-wise Collection Chart (Height 290px) */}
          <div className="bg-[#141520] border border-white/[0.07] rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-3 px-1">
              <span className="font-display font-semibold text-zinc-300">
                Showing {trajectoryData.length} days ({activeMonthLabel})
              </span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2 rounded-sm bg-[#ff5533]/50 border border-[#ff5533]" />
                  <span>Daily Spike</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#ff3b30]" />
                  <span>Trajectory Curve</span>
                </span>
              </div>
            </div>

            <div className="w-full h-[290px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trajectoryData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="agentCrimsonAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff3b30" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ff3b30" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#1f212e" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 9.5, fill: '#8e99ac' }}
                    axisLine={{ stroke: '#1f212e' }}
                    tickLine={false}
                    minTickGap={16}
                  />
                  <YAxis
                    tickFormatter={(v) => fmtINR(v)}
                    tick={{ fontSize: 10, fill: '#8e99ac' }}
                    axisLine={{ stroke: '#1f212e' }}
                    tickLine={false}
                  />
                  <Tooltip content={<TrajectoryTooltip />} />
                  <Bar
                    dataKey="recvd"
                    name="Daily Collected"
                    fill="#ff5533"
                    fillOpacity={0.38}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={18}
                  />
                  <Area
                    type="monotone"
                    dataKey="recvd"
                    name="Trajectory"
                    stroke="#ff3b30"
                    strokeWidth={2.4}
                    fill="url(#agentCrimsonAreaGrad)"
                    dot={{ r: 2.5, fill: '#ff3b30', stroke: '#ffffff', strokeWidth: 1 }}
                    activeDot={{ r: 5.5, fill: '#ff3b30', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Trajectory Summary Card matching user request: 'and last they total colletion' */}
          <div className="p-4 rounded-2xl bg-gradient-to-tr from-[#161826] to-[#12131d] border border-[#ff3b30]/25 shadow-xl">
            <div className="flex items-center justify-between gap-4 flex-wrap pb-3 border-b border-white/[0.06]">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-display flex items-center gap-1.5">
                  <TrendingUp size={12} className="text-[#ff5533]" />
                  <span>Total Collection · {activeMonthLabel}</span>
                </div>
                <div className="text-[26px] font-black font-display text-white tracking-tight mt-0.5 flex items-baseline gap-2 flex-wrap">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-zinc-200">
                    {fmtINRFull(trajSummary.totalRecvd)}
                  </span>
                  <span className="text-[14px] font-bold text-[#ff5533] font-mono">
                    ({trajSummary.recoveryPct.toFixed(2)}% recovery)
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] font-bold px-3 py-1 rounded-full font-mono border ${
                    trajSummary.recoveryPct >= 80
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : trajSummary.recoveryPct >= 65
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {trajSummary.recoveryPct >= 80 ? 'On track' : trajSummary.recoveryPct >= 65 ? 'Needs review' : 'Below target'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-[11.5px]">
              <div>
                <div className="text-zinc-500 text-[10px] uppercase font-bold">Total Due</div>
                <div className="font-mono font-bold text-zinc-300 text-[13px] mt-0.5">
                  {fmtINR(trajSummary.totalDue)}
                </div>
              </div>
              <div>
                <div className="text-zinc-500 text-[10px] uppercase font-bold">Peak Day</div>
                <div className="font-mono font-bold text-white text-[13px] mt-0.5">
                  {trajSummary.peakDay ? `${fmtDateShort(trajSummary.peakDay.date)} (${fmtINR(trajSummary.peakDay.recvd)})` : '—'}
                </div>
              </div>
              <div>
                <div className="text-zinc-500 text-[10px] uppercase font-bold">Daily Average</div>
                <div className="font-mono font-bold text-[#ff5533] text-[13px] mt-0.5">
                  {fmtINR(trajSummary.avgDaily)}/day
                </div>
              </div>
              <div>
                <div className="text-zinc-500 text-[10px] uppercase font-bold">Active Days</div>
                <div className="font-mono font-bold text-zinc-200 text-[13px] mt-0.5">
                  {trajSummary.activeDays} days
                </div>
              </div>
            </div>
          </div>

          {/* Expandable Day-by-Day Ledger Table */}
          <div>
            <button
              onClick={() => setShowDayLedger((v) => !v)}
              className="w-full py-2 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] flex items-center justify-between text-[11.5px] font-bold text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <BarChart2 size={13} className="text-[#ff5533]" />
                <span>{showDayLedger ? 'Hide' : 'View'} Day-by-Day Breakdown Table ({trajectoryData.length} days)</span>
              </span>
              {showDayLedger ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showDayLedger && (
              <div className="mt-2.5 max-h-[260px] overflow-y-auto scroll-theme border border-white/[0.06] rounded-xl bg-[#12131b] p-2 text-[11px] animate-fade-in-up">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-[#12131b] text-zinc-500 text-[9.5px] uppercase font-bold border-b border-white/[0.06]">
                    <tr>
                      <th className="pb-2 px-2">Date</th>
                      <th className="pb-2 px-2">Cases</th>
                      <th className="pb-2 px-2">Due</th>
                      <th className="pb-2 px-2">Collected</th>
                      <th className="pb-2 px-2">Recovery %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {trajectoryData.map((d) => (
                      <tr key={d.date} className={`hover:bg-white/[0.02] ${d.isLive ? 'bg-emerald-500/[0.08] font-semibold' : ''}`}>
                        <td className="py-2 px-2 font-mono text-zinc-300 font-semibold flex items-center gap-1.5">
                          {d.isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />}
                          <span>{d.date}</span>
                          {d.isLive && <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">LIVE TODAY</span>}
                        </td>
                        <td className="py-2 px-2 font-mono text-zinc-400">{d.cases}</td>
                        <td className="py-2 px-2 font-mono text-zinc-400">{fmtINR(d.due)}</td>
                        <td className={`py-2 px-2 font-mono font-bold ${d.isLive ? 'text-emerald-400' : 'text-white'}`}>{fmtINR(d.recvd)}</td>
                        <td className="py-2 px-2">
                          <span
                            className={`font-mono font-bold ${
                              d.pct >= 80 ? 'text-emerald-400' : d.pct >= 65 ? 'text-amber-400' : 'text-rose-400'
                            }`}
                          >
                            {d.pct.toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
}

export function Drawer({ onClose, isMaximized = false, children }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex ${
          isMaximized ? 'justify-center items-stretch' : 'justify-end'
        }`}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ x: isMaximized ? 0 : 60, y: isMaximized ? 15 : 0, opacity: 0 }}
          animate={{ x: 0, y: 0, opacity: 1 }}
          exit={{ x: isMaximized ? 0 : 60, y: isMaximized ? 15 : 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 32 }}
          className={`h-full bg-[#0d0e15] overflow-y-auto scroll-theme shadow-2xl text-zinc-100 transition-all duration-200 ${
            isMaximized
              ? 'w-full h-full max-w-full p-6 sm:p-8 lg:p-10 border-0'
              : 'w-[940px] xl:w-[1100px] 2xl:w-[1260px] max-w-[96vw] border-l border-white/[0.08] p-6 sm:p-8 backdrop-blur-2xl'
          }`}
        >
          <div className={isMaximized ? 'max-w-[1720px] mx-auto w-full' : 'w-full'}>
            {children}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function MiniKpi({ label, value, sub, badge, accent, live }) {
  return (
    <div className={`bg-[#141520] border rounded-xl p-3 shadow-md transition-colors flex flex-col justify-between ${
      live ? 'border-emerald-500/30 bg-emerald-500/[0.04]' : 'border-white/[0.06]'
    }`}>
      <div className="text-[9.5px] font-bold text-zinc-500 uppercase tracking-wider font-display flex items-center justify-between gap-1">
        <span className="flex items-center gap-1 truncate">
          {live && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />}
          <span>{label}</span>
        </span>
        {badge && (
          <span className="text-[8px] px-1 py-0.2 rounded font-mono font-bold bg-white/[0.06] text-zinc-400 border border-white/[0.06] shrink-0">
            {badge}
          </span>
        )}
      </div>
      <div className={`text-[15px] font-mono font-bold mt-1 ${
        live ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.35)]' : accent ? 'text-[#ff5533]' : 'text-white'
      }`}>{value}</div>
      {sub && <div className="text-[9px] text-zinc-400 mt-0.5 font-medium truncate">{sub}</div>}
    </div>
  );
}

export function SectionLabel({ children, noMargin }) {
  return (
    <div className={`text-[10.5px] font-bold uppercase tracking-wider text-zinc-400 font-display ${noMargin ? '' : 'mb-2.5'}`}>
      {children}
    </div>
  );
}

function DrawerTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#181924]/95 border border-white/10 rounded-xl p-2.5 shadow-2xl backdrop-blur-md text-white text-[11px]">
        {label && <div className="font-bold text-zinc-400 mb-1 font-display">{label}</div>}
        {payload.map((item, index) => (
          <div key={index} className="flex items-center gap-1.5 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color || item.fill || '#ff3b30' }} />
            <span className="text-zinc-400">{item.name}:</span>
            <span className="font-mono font-bold text-white">{fmtINRFull(item.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

function TrajectoryTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#161724]/95 border border-white/15 rounded-xl p-3 shadow-2xl backdrop-blur-md text-white text-[11.5px] min-w-[170px]">
        <div className="font-bold text-zinc-300 font-display pb-1.5 mb-1.5 border-b border-white/10 flex items-center justify-between">
          <span>{data.date}</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
            data.pct >= 80 ? 'bg-emerald-500/20 text-emerald-400' : data.pct >= 65 ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-400'
          }`}>
            {data.pct.toFixed(2)}%
          </span>
        </div>
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between text-zinc-400">
            <span>Collected:</span>
            <span className="font-mono font-bold text-[#ff5533]">{fmtINRFull(data.recvd)}</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>Repay Due:</span>
            <span className="font-mono text-zinc-300">{fmtINRFull(data.due)}</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>Cases:</span>
            <span className="font-mono font-semibold text-white">{data.cases}</span>
          </div>
          <div className="flex justify-between text-zinc-500 pt-1 border-t border-white/[0.06] text-[10px]">
            <span>Cumulative:</span>
            <span className="font-mono text-zinc-300">{fmtINR(data.cumulative)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}
