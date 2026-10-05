import { useState, useMemo } from 'react';
import {
  X, Calendar, ChevronDown, ChevronUp, TrendingUp, CalendarDays, BarChart2, Users,
  Maximize2, Minimize2
} from 'lucide-react';
import {
  BarChart, Bar, Area, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  filterRows, aggregate, YESTERDAY_STR, AGENTS, META, DOMAINS,
  fmtINR, fmtINRFull, fmtDateShort, fmtMonth, titleCase, round1, DOMAIN_DOT_COLORS
} from '../utils/data';
import { Drawer, MiniKpi, SectionLabel } from './AgentDrawer';
import { useLiveCollection } from '../context/LiveCollectionContext';

export default function LeaderDrawer({ name, onClose, onOpenAgent }) {
  const { getLeaderLive, getAgentLive } = useLiveCollection();
  const leaderLive = useMemo(() => getLeaderLive(name), [getLeaderLive, name]);
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

  // Filtered rows for this leader
  const rows = useMemo(
    () => filterRows({ leader: name, from: activeFrom, to: activeTo }),
    [name, activeFrom, activeTo]
  );
  const agg = useMemo(() => aggregate(rows), [rows]);

  // 1. Dedicated Yesterday Due Date Cases for this leader (strictly cases where Due Date = Yesterday)
  const ydayDueAgg = useMemo(() => {
    if (!YESTERDAY_STR) return { due: 0, recvd: 0, cases: 0, pct: 0 };
    const yRows = filterRows({ leader: name, from: YESTERDAY_STR, to: YESTERDAY_STR });
    return aggregate(yRows);
  }, [name]);
  const ydayDueAmt = ydayDueAgg.recvd;
  const ydayDueCases = ydayDueAgg.cases;

  // 2. Dedicated Yesterday Total Cash Received for this leader (RCV DATE = Yesterday across all cases: due date, preclosed, overdue)
  const actualYdayCash = useMemo(() => {
    if (!YESTERDAY_STR || !META?.leaderActualCollectionByDate) return null;
    return META.leaderActualCollectionByDate[name]?.[YESTERDAY_STR] || null;
  }, [name]);
  const ydayCashAmt = actualYdayCash?.amount ?? 0;
  const ydayCashCases = actualYdayCash?.cases ?? 0;

  // Dynamic Inspection Context for Leader:
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
      const dRows = filterRows({ leader: name, from: singleDate, to: singleDate });
      const a = aggregate(dRows);
      return { amt: a.recvd, cases: a.cases };
    }
    if (isCustomRange) {
      return { amt: agg.recvd, cases: agg.cases };
    }
    return { amt: ydayDueAmt, cases: ydayDueCases };
  }, [singleDate, isCustomRange, name, agg.recvd, agg.cases, ydayDueAmt, ydayDueCases]);

  const dynamicCashData = useMemo(() => {
    if (!META?.leaderActualCollectionByDate || !META.leaderActualCollectionByDate[name]) {
      return { amt: 0, cases: 0 };
    }
    const datesMap = META.leaderActualCollectionByDate[name];

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

  // Team aggregation within filtered date window
  const team = useMemo(() => {
    const empAgg = {};
    rows.forEach((r) => {
      const a = AGENTS[r[0]];
      if (!empAgg[a]) empAgg[a] = { due: 0, recvd: 0, cases: 0, domains: new Set() };
      empAgg[a].due += r[5];
      empAgg[a].recvd += r[6];
      empAgg[a].cases++;
      if (r[8] !== undefined && DOMAINS[r[8]]) {
        empAgg[a].domains.add(DOMAINS[r[8]]);
      }
    });
    return Object.entries(empAgg).sort((a, b) => b[1].recvd - a[1].recvd);
  }, [rows]);

  const monthlyData = useMemo(
    () => agg.monthly.map((m) => ({ ...m, label: fmtMonth(m.month) })),
    [agg.monthly]
  );

  // Available months across all-time data
  const availableMonths = useMemo(() => {
    const allLeaderRows = filterRows({ leader: name });
    const allAgg = aggregate(allLeaderRows);
    return allAgg.monthly.map((m) => m.month);
  }, [name]);


  // Daily Trajectory Data & Summary
  const { trajectoryData, trajSummary } = useMemo(() => {
    let sourceDays = [...agg.daily];

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

    // Append today's live team collection point from Google Sheets
    if (leaderLive?.liveRecvd > 0) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const todayMonth = todayStr.slice(0, 7);
      if (selectedTrajMonth === 'all' || selectedTrajMonth === todayMonth) {
        runningTotal += leaderLive.liveRecvd;
        totalDue += Math.round(leaderLive.liveRecvd * 1.15);
        totalRecvd += leaderLive.liveRecvd;
        activeDays++;
        list.push({
          date: todayStr,
          label: `${fmtDateShort(todayStr)} (Live)`,
          recvd: leaderLive.liveRecvd,
          due: Math.round(leaderLive.liveRecvd * 1.15),
          cases: leaderLive.liveCases || 1,
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
  }, [agg.daily, selectedTrajMonth, leaderLive]);

  const activeMonthLabel =
    selectedTrajMonth === 'all'
      ? filterMode === 'month'
        ? fmtMonth(latestMonthStr)
        : 'All Months'
      : fmtMonth(selectedTrajMonth);

  return (
    <Drawer onClose={onClose} isMaximized={isMaximized}>
      {/* Header */}
      <div className="flex items-start justify-between mb-5 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-[23px] font-extrabold text-slate-900 font-display tracking-tight">{titleCase(name)}</h2>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Team Leader
            </span>
          </div>
          <div className="text-[12px] font-medium text-slate-500 mt-1 flex items-center gap-1.5">
            <Users size={13} className="text-[#ff4d30]" />
            <span>{team.length} agents in team</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Maximize / Restore Toggle */}
          <button
            type="button"
            onClick={() => setIsMaximized((v) => !v)}
            title={isMaximized ? 'Exit Full Screen (Drawer Mode)' : 'Expand to Full Screen'}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200/70 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
          >
            {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200/70 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Date Filter Toolbar */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 mb-6 space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <CalendarDays size={14} className="text-[#ff4d30]" />
            <span className="text-[11.5px] font-bold text-slate-700 font-display">Date Filter:</span>
          </div>

          <div className="flex bg-slate-100 border border-slate-200 rounded-xl p-0.5 gap-0.5">
            <button
              onClick={() => {
                setFilterMode('month');
                setSelectedTrajMonth(latestMonthStr);
              }}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filterMode === 'month'
                  ? 'bg-gradient-to-r from-[#ff5e3a] to-[#ff3b30] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => {
                setFilterMode('overall');
                setSelectedTrajMonth('all');
              }}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filterMode === 'overall'
                  ? 'bg-gradient-to-r from-[#ff5e3a] to-[#ff3b30] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Overall
            </button>
            <button
              onClick={() => setFilterMode('custom')}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filterMode === 'custom'
                  ? 'bg-gradient-to-r from-[#ff5e3a] to-[#ff3b30] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Custom Range
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 px-1">
          <span>Active Period:</span>
          {filterMode === 'month' && (
            <span className="text-[#ff4d30] font-bold">{fmtMonth(latestMonthStr)} (Latest Ledger)</span>
          )}
          {filterMode === 'overall' && (
            <span className="text-slate-700 font-medium">
              Full Dataset ({fmtMonth(earliestMonthStr)} – {fmtMonth(latestMonthStr)})
            </span>
          )}
          {filterMode === 'custom' && (
            <span className="text-slate-700 font-medium">
              {customFrom ? fmtDateShort(customFrom) : 'Start'} to {customTo ? fmtDateShort(customTo) : 'End'}
            </span>
          )}
        </div>

        {filterMode === 'custom' && (
          <div className="flex items-center gap-2 pt-2.5 border-t border-slate-200 flex-wrap text-[11.5px] animate-fade-in-up">
            <div className="flex items-center gap-2 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl shadow-xs">
              <Calendar size={13} className="text-[#ff4d30]" />
              <span className="text-slate-400 text-[10.5px] uppercase font-bold">From</span>
              <input
                type="date"
                value={customFrom}
                min={META.dateMin}
                max={META.dateMax}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-transparent text-slate-800 font-mono text-[11.5px] outline-none cursor-pointer"
              />
            </div>
            <span className="text-slate-400 font-bold">to</span>
            <div className="flex items-center gap-2 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl shadow-xs">
              <Calendar size={13} className="text-[#ff4d30]" />
              <span className="text-slate-400 text-[10.5px] uppercase font-bold">To</span>
              <input
                type="date"
                value={customTo}
                min={META.dateMin}
                max={META.dateMax}
                onChange={(e) => setCustomTo(e.target.value)}
                className="bg-transparent text-slate-800 font-mono text-[11.5px] outline-none cursor-pointer"
              />
            </div>
            {(customFrom || customTo) && (
              <button
                onClick={() => {
                  setCustomFrom('');
                  setCustomTo('');
                }}
                className="text-[11px] text-[#ff4d30] hover:text-[#e6352b] font-semibold ml-auto flex items-center gap-1 cursor-pointer"
              >
                Reset Dates
              </button>
            )}
          </div>
        )}
      </div>

      {/* Mini KPI Grid: Spans 8 columns across big screen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 mb-6">
        <MiniKpi
          label="Live Today"
          value={leaderLive?.liveRecvd ? fmtINR(leaderLive.liveRecvd) : '₹0'}
          live
        />
        <MiniKpi label="Total Due" value={fmtINR(agg.due)} />
        <MiniKpi label="Total Collection" value={fmtINR(agg.recvd)} accent />
        <MiniKpi label="Recovery" value={`${agg.pct.toFixed(2)}%`} />
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
        {/* Left Column (5 cols): Team Members List + Month-wise Collection */}
        <div className="lg:col-span-5 space-y-6">

          {/* Team members list */}
          <div>
            <SectionLabel>Team Members ({team.length})</SectionLabel>
            <div className="flex flex-col gap-2 max-h-[440px] overflow-y-auto scroll-theme pr-1">
              {team.map(([empName, v]) => {
                const pct = v.due ? round1((v.recvd / v.due) * 100) : 0;
                const aLive = getAgentLive(empName);
                return (
                  <button
                    key={empName}
                    onClick={() => onOpenAgent(empName)}
                    className="flex items-center justify-between bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-2.5 text-left transition-all cursor-pointer group shadow-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-bold text-slate-900 group-hover:text-[#ff4d30] transition-colors font-display">
                          {empName}
                        </span>
                        {aLive?.liveRecvd > 0 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 text-[9.5px] font-mono font-bold text-emerald-800">
                            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                            +{fmtINR(aLive.liveRecvd)}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-medium text-slate-500">
                        {v.cases} cases · <span title={fmtINRFull(v.due)}>{fmtINR(v.due)}</span> due
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[13px] font-mono font-bold text-slate-900 group-hover:text-[#ff4d30] transition-colors" title={fmtINRFull(v.recvd)}>
                        {fmtINR(v.recvd)}
                      </div>
                      <div
                        className={`text-[11px] font-mono font-semibold ${
                          pct >= 80 ? 'text-emerald-700' : pct >= 65 ? 'text-amber-700' : 'text-rose-700'
                        }`}
                      >
                        {pct.toFixed(2)}%
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Month-wise Performance */}
          {monthlyData.length > 1 && (
            <div>
              <SectionLabel>Team Month-wise Collection</SectionLabel>
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 shadow-xs">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                    <YAxis tickFormatter={(v) => fmtINR(v)} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                    <Tooltip content={<LeaderDrawerTooltip />} />
                    <Bar dataKey="due" name="Due" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="recvd" name="Recovered" fill="#ff4d30" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (7 cols): Big Day-wise Collection Trajectory Module */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-[#ff5533]" />
              <SectionLabel noMargin>Team Daily Collection Trajectory</SectionLabel>
            </div>

            <div className="flex bg-slate-100 border border-slate-200 rounded-xl p-0.5 gap-0.5 flex-wrap">
              <button
                onClick={() => setSelectedTrajMonth('all')}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                  selectedTrajMonth === 'all'
                    ? 'bg-gradient-to-r from-[#ff5e3a] to-[#ff3b30] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
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
                      ? 'bg-gradient-to-r from-[#ff5e3a] to-[#ff3b30] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {fmtMonth(m)}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-3 px-1">
              <span className="font-display font-semibold text-slate-700">
                Showing {trajectoryData.length} days ({activeMonthLabel})
              </span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2 rounded-sm bg-[#ff5533]/40 border border-[#ff5533]" />
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
                    <linearGradient id="leaderCrimsonAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff3b30" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#ff3b30" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 9.5, fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                    minTickGap={16}
                  />
                  <YAxis
                    tickFormatter={(v) => fmtINR(v)}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <Tooltip content={<LeaderTrajectoryTooltip />} />
                  <Bar
                    dataKey="recvd"
                    name="Daily Collected"
                    fill="#ff5533"
                    fillOpacity={0.28}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={18}
                  />
                  <Area
                    type="monotone"
                    dataKey="recvd"
                    name="Trajectory"
                    stroke="#ff3b30"
                    strokeWidth={2.4}
                    fill="url(#leaderCrimsonAreaGrad)"
                    dot={{ r: 2.5, fill: '#ff3b30', stroke: '#ffffff', strokeWidth: 1.5 }}
                    activeDot={{ r: 5.5, fill: '#ff3b30', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Total Collection Summary Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-tr from-orange-50/60 via-white to-amber-50/40 border border-orange-200/80 shadow-sm">
            <div className="flex items-center justify-between gap-4 flex-wrap pb-3 border-b border-slate-200">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-display flex items-center gap-1.5">
                  <TrendingUp size={12} className="text-[#ff5533]" />
                  <span>Total Collection · {activeMonthLabel}</span>
                </div>
                <div className="text-[26px] font-black font-display text-slate-900 tracking-tight mt-0.5 flex items-baseline gap-2 flex-wrap">
                  <span>
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
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : trajSummary.recoveryPct >= 65
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {trajSummary.recoveryPct >= 80 ? 'On track' : trajSummary.recoveryPct >= 65 ? 'Needs review' : 'Below target'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-[11.5px]">
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-bold">Total Due</div>
                <div className="font-mono font-bold text-slate-800 text-[13px] mt-0.5">
                  {fmtINR(trajSummary.totalDue)}
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-bold">Peak Day</div>
                <div className="font-mono font-bold text-slate-800 text-[13px] mt-0.5">
                  {trajSummary.peakDay ? `${fmtDateShort(trajSummary.peakDay.date)} (${fmtINR(trajSummary.peakDay.recvd)})` : '—'}
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-bold">Daily Average</div>
                <div className="font-mono font-bold text-[#ff5533] text-[13px] mt-0.5">
                  {fmtINR(trajSummary.avgDaily)}/day
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-bold">Active Days</div>
                <div className="font-mono font-bold text-slate-800 text-[13px] mt-0.5">
                  {trajSummary.activeDays} days
                </div>
              </div>
            </div>
          </div>

          {/* Expandable Day Ledger */}
          <div>
            <button
              onClick={() => setShowDayLedger((v) => !v)}
              className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 flex items-center justify-between text-[11.5px] font-bold text-slate-700 hover:text-slate-900 transition-all cursor-pointer shadow-sm"
            >
              <span className="flex items-center gap-2">
                <BarChart2 size={13} className="text-[#ff5533]" />
                <span>{showDayLedger ? 'Hide' : 'View'} Day-by-Day Breakdown Table ({trajectoryData.length} days)</span>
              </span>
              {showDayLedger ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showDayLedger && (
              <div className="mt-2.5 max-h-[260px] overflow-y-auto scroll-theme border border-slate-200 rounded-xl bg-white p-2 text-[11px] shadow-sm animate-fade-in-up">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-slate-50 text-slate-500 text-[9.5px] uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="pb-2 px-2">Date</th>
                      <th className="pb-2 px-2">Cases</th>
                      <th className="pb-2 px-2">Due</th>
                      <th className="pb-2 px-2">Collected</th>
                      <th className="pb-2 px-2">Recovery %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {trajectoryData.map((d) => (
                      <tr
                        key={d.date}
                        className={d.isLive ? 'bg-emerald-50/70 hover:bg-emerald-50' : 'hover:bg-slate-50/70'}
                      >
                        <td className="py-2 px-2 font-mono text-slate-800 font-semibold flex items-center gap-1.5">
                          {d.date}
                          {d.isLive && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-emerald-100 border border-emerald-300 text-[9px] font-mono font-bold text-emerald-700">
                              <span className="w-1 h-1 rounded-full bg-emerald-600 animate-pulse" />
                              LIVE TODAY
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 font-mono text-slate-600">{d.cases}</td>
                        <td className="py-2 px-2 font-mono text-slate-600">{fmtINR(d.due)}</td>
                        <td className={`py-2 px-2 font-mono font-bold ${d.isLive ? 'text-emerald-700 font-extrabold' : 'text-slate-900'}`}>
                          {fmtINR(d.recvd)}
                        </td>
                        <td className="py-2 px-2">
                          <span
                            className={`font-mono font-bold ${
                              d.pct >= 80 ? 'text-emerald-600' : d.pct >= 65 ? 'text-amber-600' : 'text-rose-600'
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

function LeaderDrawerTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 border border-slate-200 rounded-xl p-2.5 shadow-xl backdrop-blur-md text-slate-800 text-[11px]">
        {label && <div className="font-bold text-slate-500 mb-1 font-display">{label}</div>}
        {payload.map((item, index) => (
          <div key={index} className="flex items-center gap-1.5 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color || item.fill || '#ff3b30' }} />
            <span className="text-slate-500">{item.name}:</span>
            <span className="font-mono font-bold text-slate-900">{fmtINRFull(item.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

function LeaderTrajectoryTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/95 border border-slate-200 rounded-xl p-3 shadow-xl backdrop-blur-md text-slate-800 text-[11.5px] min-w-[170px]">
        <div className="font-bold text-slate-700 font-display pb-1.5 mb-1.5 border-b border-slate-100 flex items-center justify-between">
          <span>{data.date}</span>
          <span
            className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full border ${
              data.pct >= 80
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : data.pct >= 65
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            {data.pct.toFixed(2)}%
          </span>
        </div>
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between text-slate-500">
            <span>Collected:</span>
            <span className="font-mono font-bold text-[#ff5533]">{fmtINRFull(data.recvd)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Repay Due:</span>
            <span className="font-mono text-slate-700">{fmtINRFull(data.due)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Cases:</span>
            <span className="font-mono font-semibold text-slate-900">{data.cases}</span>
          </div>
          <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-100 text-[10px]">
            <span>Cumulative:</span>
            <span className="font-mono text-slate-700">{fmtINR(data.cumulative)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

