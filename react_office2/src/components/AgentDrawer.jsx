import { useState, useMemo } from 'react';
import {
  X, Calendar, ChevronDown, ChevronUp, TrendingUp, CalendarDays, BarChart2,
  Maximize2, Minimize2, Check, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, Area, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  filterRows, aggregate, STATUSES, STATUS_COLORS, YESTERDAY_STR, META, TODAY_STR, DOMAINS,
  fmtINR, fmtINRFull, fmtDateShort, fmtMonth, titleCase, round1, dateToOffset,
  getAgentDomainsDetailed, DOMAIN_DOT_COLORS, offsetToStr,
} from '../utils/data';
import { useLiveCollection } from '../context/LiveCollectionContext';

export default function AgentDrawer({ name, onClose }) {
  const { getAgentLive } = useLiveCollection();
  const agentLive = useMemo(() => getAgentLive(name), [getAgentLive, name]);
  const agentDomains = useMemo(() => getAgentDomainsDetailed(name), [name]);
  const totalAgentCases = useMemo(() => agentDomains.reduce((sum, d) => sum + d.cases, 0), [agentDomains]);
  const [isMaximized, setIsMaximized] = useState(true);

  // Multi-domain selection filter (empty Set = All Domains)
  const [selectedDomains, setSelectedDomains] = useState(new Set());

  const toggleDomain = (domainName) => {
    setSelectedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domainName)) {
        next.delete(domainName);
      } else {
        next.add(domainName);
      }
      return next;
    });
  };

  const clearDomainFilter = () => {
    setSelectedDomains(new Set());
  };

  const activeDomainsList = useMemo(
    () => (selectedDomains.size > 0 ? Array.from(selectedDomains) : undefined),
    [selectedDomains]
  );

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

  // Filtered rows & aggregated metrics for this agent (domain-filtered)
  const rows = useMemo(
    () => filterRows({ agent: name, domains: activeDomainsList, from: activeFrom, to: activeTo }),
    [name, activeDomainsList, activeFrom, activeTo]
  );
  const agg = useMemo(() => aggregate(rows), [rows]);

  // Agent metadata
  const leader = META.agentPrimaryLeader[name];
  const multi = META.agentMultiLeaders[name];

  // 1. Dedicated Yesterday Due Date Cases (strictly cases where Due Date = Yesterday)
  const ydayDueAgg = useMemo(() => {
    if (!YESTERDAY_STR) return { due: 0, recvd: 0, cases: 0, pct: 0 };
    const yRows = filterRows({ agent: name, domains: activeDomainsList, from: YESTERDAY_STR, to: YESTERDAY_STR });
    return aggregate(yRows);
  }, [name, activeDomainsList]);
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
      const dRows = filterRows({ agent: name, domains: activeDomainsList, from: singleDate, to: singleDate });
      const a = aggregate(dRows);
      return { amt: a.recvd, cases: a.cases };
    }
    if (isCustomRange) {
      return { amt: agg.recvd, cases: agg.cases };
    }
    return { amt: ydayDueAmt, cases: ydayDueCases };
  }, [singleDate, isCustomRange, name, activeDomainsList, agg.recvd, agg.cases, ydayDueAmt, ydayDueCases]);

  const dynamicCashData = useMemo(() => {
    // When domain filter is active, calculate bank cash directly from filtered rows
    if (selectedDomains.size > 0) {
      let totalAmt = 0;
      let totalCases = 0;
      for (const r of rows) {
        if (r[6] > 0 && r[13] !== undefined && r[13] >= 0) {
          const rcvDateStr = offsetToStr(r[13]);
          if (singleDate) {
            if (rcvDateStr === singleDate) {
              totalAmt += r[6];
              totalCases++;
            }
          } else if (isCustomRange) {
            if (rcvDateStr >= customFrom && rcvDateStr <= customTo) {
              totalAmt += r[6];
              totalCases++;
            }
          } else {
            if (rcvDateStr === YESTERDAY_STR) {
              totalAmt += r[6];
              totalCases++;
            }
          }
        }
      }
      return { amt: totalAmt, cases: totalCases };
    }

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
  }, [selectedDomains, rows, singleDate, isCustomRange, customFrom, customTo, name, ydayCashAmt, ydayCashCases]);

  const ydayRow = agg.daily.find((d) => d.date === YESTERDAY_STR);

  const lastMonth = agg.monthly.length ? agg.monthly[agg.monthly.length - 1] : null;

  // Month-wise performance bar chart data
  const monthlyData = useMemo(
    () => agg.monthly.map((m) => ({ ...m, label: fmtMonth(m.month) })),
    [agg.monthly]
  );

  // All distinct months available for this agent across filtered domains (for trajectory switcher tabs)
  const availableMonths = useMemo(() => {
    const allAgentRows = filterRows({ agent: name, domains: activeDomainsList });
    const allAgg = aggregate(allAgentRows);
    return allAgg.monthly.map((m) => m.month);
  }, [name, activeDomainsList]);


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

  const agentDomainBreakdown = useMemo(() => {
    const map = {};
    let allCases = 0, allDue = 0, allRecvd = 0, allPrincipal = 0;
    
    const targetTodayStr = META.today || TODAY_STR;
    const targetYdayStr = YESTERDAY_STR;
    const todayOff = targetTodayStr ? dateToOffset(targetTodayStr) : -9999;
    const ydayOff = targetYdayStr ? dateToOffset(targetYdayStr) : -9999;

    let allToday = 0, allYday = 0, allSep = 0;

    for (const r of rows) {
      const dName = r[8] !== undefined && DOMAINS[r[8]] ? DOMAINS[r[8]] : 'Unknown';
      if (!map[dName]) {
        map[dName] = { name: dName, cases: 0, due: 0, recvd: 0, principal: 0, todayLive: 0, yesterday: 0, sep2026Recvd: 0 };
      }
      map[dName].cases++;
      map[dName].due += (r[5] || 0);
      map[dName].recvd += (r[6] || 0);
      map[dName].principal += (r[9] || 0);
      
      const recOff = (r[13] !== undefined && r[13] >= 0) ? r[13] : r[4];
      if (recOff === todayOff) map[dName].todayLive += (r[6] || 0);
      if (recOff === ydayOff) map[dName].yesterday += (r[6] || 0);
      
      const recMonth = r[12];
      if (recMonth && String(recMonth).toLowerCase().includes('sep') && String(recMonth).includes('2026')) {
        map[dName].sep2026Recvd += (r[6] || 0);
      }
      
      allCases++;
      allDue += (r[5] || 0);
      allRecvd += (r[6] || 0);
      allPrincipal += (r[9] || 0);
      if (recOff === todayOff) allToday += (r[6] || 0);
      if (recOff === ydayOff) allYday += (r[6] || 0);
      if (recMonth && String(recMonth).toLowerCase().includes('sep') && String(recMonth).includes('2026')) {
        allSep += (r[6] || 0);
      }
    }
    
    const domainArray = Object.values(map).map(d => ({
       ...d,
       pending: d.due - d.recvd,
       pct: d.due ? (d.recvd / d.due) * 100 : 0
    })).sort((a, b) => b.due - a.due);
    
    const all = {
       cases: allCases,
       due: allDue,
       recvd: allRecvd,
       principal: allPrincipal,
       pending: allDue - allRecvd,
       todayLive: allToday,
       yesterday: allYday,
       sep2026Recvd: allSep,
       pct: allDue ? (allRecvd / allDue) * 100 : 0
    };
    
    return { domainArray, all };
  }, [rows, META.today]);

  return (
    <Drawer onClose={onClose} isMaximized={isMaximized}>
      {/* Drawer Header */}
      <div className="flex items-start justify-between mb-5 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-[24px] font-black text-slate-900 font-display tracking-tight">{name}</h2>
            <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Collection Agent Dossier
            </span>
          </div>

          <div className="text-[12.5px] font-medium text-slate-500 mt-1">
            Leader: <span className="text-slate-800 font-semibold">{titleCase(leader)}</span>
            {multi ? ` · also under: ${multi.map(titleCase).join(', ')}` : ''}
          </div>

          {/* Interactive Multi-Select Domains Assigned to this Agent */}
          {agentDomains.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap mt-3 pt-2.5 border-t border-slate-100">
              <div className="flex items-center gap-1.5 shrink-0">
                <Filter size={12} className="text-slate-400" />
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Domains ({agentDomains.length}):
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* All Domains Reset Chip */}
                <button
                  type="button"
                  onClick={clearDomainFilter}
                  title="Show all domains combined"
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-bold transition-all cursor-pointer ${
                    selectedDomains.size === 0
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200/70 border border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>All</span>
                  <span className={`text-[10px] font-mono px-1 py-0.2 rounded ${
                    selectedDomains.size === 0 ? 'bg-white/20 text-white font-bold' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {totalAgentCases}
                  </span>
                </button>

                {/* Individual Domain Chips (Multi-Selectable) */}
                {agentDomains.map((dom) => {
                  const isSelected = selectedDomains.has(dom.name);
                  return (
                    <button
                      type="button"
                      key={dom.name}
                      onClick={() => toggleDomain(dom.name)}
                      title={`Filter by ${dom.name} (${dom.cases} cases). Tap to toggle.`}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'bg-gradient-to-r from-[#ff5e3a] to-[#ff3b30] text-white font-bold shadow-xs border border-transparent'
                          : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:border-slate-300 font-medium'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        isSelected ? 'bg-white ring-2 ring-white/30' : DOMAIN_DOT_COLORS[dom.name] || 'bg-slate-400'
                      }`} />
                      <span className="truncate max-w-[130px]">{dom.name}</span>
                      <span className={`text-[10px] font-mono px-1 py-0.2 rounded ${
                        isSelected ? 'bg-white/20 text-white font-bold' : 'text-slate-400 bg-slate-100'
                      }`}>
                        {dom.cases}
                      </span>
                      {isSelected && <Check size={11} className="stroke-[2.5]" />}
                    </button>
                  );
                })}

                {/* Clear Active Filters Button */}
                {selectedDomains.size > 0 && (
                  <button
                    type="button"
                    onClick={clearDomainFilter}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer ml-1"
                  >
                    <X size={11} />
                    <span>Clear Filter ({selectedDomains.size})</span>
                  </button>
                )}
              </div>
            </div>
          )}
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

          {/* Close Button */}
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
      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 mb-6 space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <CalendarDays size={14} className="text-[#ff4d30]" />
            <span className="text-[12px] font-bold text-slate-700 font-display">Date Filter:</span>
          </div>

          <div className="flex bg-slate-100 border border-slate-200 rounded-xl p-0.5 gap-0.5">
            <button
              onClick={() => {
                setFilterMode('month');
                setSelectedTrajMonth(latestMonthStr);
              }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
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
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filterMode === 'overall'
                  ? 'bg-gradient-to-r from-[#ff5e3a] to-[#ff3b30] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Overall
            </button>
            <button
              onClick={() => setFilterMode('custom')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filterMode === 'custom'
                  ? 'bg-gradient-to-r from-[#ff5e3a] to-[#ff3b30] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Custom Range
            </button>
          </div>
        </div>

        {/* Date scope label */}
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

        {/* Custom Range Date Pickers */}
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
            <div className="flex flex-col gap-2.5 bg-slate-50 border border-slate-200/90 rounded-2xl p-4 shadow-xs">
              {STATUSES.map((s) => {
                const c = agg.statusCount[s] || 0;
                const pct = agg.cases ? Math.round((c / agg.cases) * 1000) / 10 : 0;
                return (
                  <div key={s} className="flex items-center gap-2.5 text-[12px]">
                    <span
                      className="w-2 h-2 rounded-full shrink-0 shadow-xs"
                      style={{ background: STATUS_COLORS[s] || '#94a3b8', color: STATUS_COLORS[s] || '#94a3b8' }}
                    />
                    <span className="flex-1 font-medium text-slate-700">{titleCase(s)}</span>
                    <span className="font-mono font-semibold text-slate-900">{c.toLocaleString('en-IN')}</span>
                    <span className="font-mono text-slate-400 w-12 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Month-wise Performance */}
          {monthlyData.length > 0 && (
            <div>
              <SectionLabel>Month-wise Performance</SectionLabel>
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 shadow-xs">
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                    <YAxis tickFormatter={(v) => fmtINR(v)} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                    <Tooltip content={<DrawerTooltip />} />
                    <Bar dataKey="due" name="Due" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="recvd" name="Recovered" fill="#ff4d30" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (7 cols): Big Day-wise Collection Trajectory + Total Collection Card + Day Ledger */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-[#ff4d30]" />
              <SectionLabel noMargin>Daily Collection Trajectory</SectionLabel>
            </div>

            {/* Trajectory Month Selector Pills */}
            <div className="flex bg-slate-100 border border-slate-200 rounded-xl p-0.5 gap-0.5 flex-wrap">
              <button
                onClick={() => setSelectedTrajMonth('all')}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                  selectedTrajMonth === 'all'
                    ? 'bg-gradient-to-r from-[#ff5e3a] to-[#ff3b30] text-white shadow-xs'
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
                      ? 'bg-gradient-to-r from-[#ff5e3a] to-[#ff3b30] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {fmtMonth(m)}
                </button>
              ))}
            </div>
          </div>

          {/* Big Day-wise Collection Chart (Height 290px) */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-3 px-1">
              <span className="font-display font-semibold text-slate-800">
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
                      <stop offset="5%" stopColor="#ff3b30" stopOpacity={0.2} />
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
                  <Tooltip content={<TrajectoryTooltip />} />
                  <Bar
                    dataKey="recvd"
                    name="Daily Collected"
                    fill="#ff4d30"
                    fillOpacity={0.25}
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

          {/* Trajectory Summary Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-tr from-orange-50/50 to-white border border-orange-200 shadow-sm">
            <div className="flex items-center justify-between gap-4 flex-wrap pb-3 border-b border-orange-200/60">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-display flex items-center gap-1.5">
                  <TrendingUp size={12} className="text-[#ff4d30]" />
                  <span>Total Collection · {activeMonthLabel}</span>
                </div>
                <div className="text-[26px] font-black font-display text-slate-900 tracking-tight mt-0.5 flex items-baseline gap-2 flex-wrap">
                  <span>
                    {fmtINRFull(trajSummary.totalRecvd)}
                  </span>
                  <span className="text-[14px] font-bold text-[#ff4d30] font-mono">
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
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {trajSummary.recoveryPct >= 80 ? 'On track' : trajSummary.recoveryPct >= 65 ? 'Needs review' : 'Below target'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-[11.5px]">
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-bold">Total Due</div>
                <div className="font-mono font-bold text-slate-700 text-[13px] mt-0.5">
                  {fmtINR(trajSummary.totalDue)}
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-bold">Peak Day</div>
                <div className="font-mono font-bold text-slate-900 text-[13px] mt-0.5">
                  {trajSummary.peakDay ? `${fmtDateShort(trajSummary.peakDay.date)} (${fmtINR(trajSummary.peakDay.recvd)})` : '—'}
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-bold">Daily Average</div>
                <div className="font-mono font-bold text-[#ff4d30] text-[13px] mt-0.5">
                  {fmtINR(trajSummary.avgDaily)}/day
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-bold">Active Days</div>
                <div className="font-mono font-bold text-slate-700 text-[13px] mt-0.5">
                  {trajSummary.activeDays} days
                </div>
              </div>
            </div>
          </div>

          {/* Expandable Day-by-Day Ledger Table */}
          <div>
            <button
              onClick={() => setShowDayLedger((v) => !v)}
              className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-between text-[11.5px] font-bold text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <BarChart2 size={13} className="text-[#ff4d30]" />
                <span>{showDayLedger ? 'Hide' : 'View'} Day-by-Day Breakdown Table ({trajectoryData.length} days)</span>
              </span>
              {showDayLedger ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showDayLedger && (
              <div className="mt-2.5 max-h-[260px] overflow-y-auto scroll-theme border border-slate-200 rounded-xl bg-white p-2 text-[11px] animate-fade-in-up shadow-xs">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-slate-50 text-slate-400 text-[9.5px] uppercase font-bold border-b border-slate-100">
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
                      <tr key={d.date} className={`hover:bg-slate-50 ${d.isLive ? 'bg-emerald-50/60 font-semibold' : ''}`}>
                        <td className="py-2 px-2 font-mono text-slate-700 font-semibold flex items-center gap-1.5">
                          {d.isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />}
                          <span>{d.date}</span>
                          {d.isLive && <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold">LIVE TODAY</span>}
                        </td>
                        <td className="py-2 px-2 font-mono text-slate-500">{d.cases}</td>
                        <td className="py-2 px-2 font-mono text-slate-500">{fmtINR(d.due)}</td>
                        <td className={`py-2 px-2 font-mono font-bold ${d.isLive ? 'text-emerald-700' : 'text-slate-900'}`}>{fmtINR(d.recvd)}</td>
                        <td className="py-2 px-2">
                          <span
                            className={`font-mono font-bold ${
                              d.pct >= 80 ? 'text-emerald-700' : d.pct >= 65 ? 'text-amber-700' : 'text-rose-700'
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
      
      {/* Portfolio by Brand Full-Width Table */}
      <AgentPortfolioTable data={agentDomainBreakdown} />
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
        className={`fixed inset-0 bg-slate-900/35 backdrop-blur-sm z-50 flex ${
          isMaximized ? 'justify-center items-stretch' : 'justify-end'
        }`}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ x: isMaximized ? 0 : 60, y: isMaximized ? 15 : 0, opacity: 0 }}
          animate={{ x: 0, y: 0, opacity: 1 }}
          exit={{ x: isMaximized ? 0 : 60, y: isMaximized ? 15 : 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 32 }}
          className={`h-full bg-white overflow-y-auto scroll-theme shadow-2xl text-slate-800 transition-all duration-200 ${
            isMaximized
              ? 'w-full h-full max-w-full p-6 sm:p-8 lg:p-10 border-0'
              : 'w-[940px] xl:w-[1100px] 2xl:w-[1260px] max-w-[96vw] border-l border-slate-200 p-6 sm:p-8 backdrop-blur-2xl'
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
    <div className={`bg-slate-50 border rounded-xl p-3 shadow-xs transition-colors flex flex-col justify-between ${
      live ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200'
    }`}>
      <div className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider font-display flex items-center justify-between gap-1">
        <span className="flex items-center gap-1 truncate">
          {live && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />}
          <span>{label}</span>
        </span>
        {badge && (
          <span className="text-[8px] px-1 py-0.2 rounded font-mono font-bold bg-white text-slate-600 border border-slate-200 shrink-0">
            {badge}
          </span>
        )}
      </div>
      <div className={`text-[15px] font-mono font-bold mt-1 ${
        live ? 'text-emerald-700' : accent ? 'text-[#ff4d30]' : 'text-slate-900'
      }`}>{value}</div>
      {sub && <div className="text-[9px] text-slate-500 mt-0.5 font-medium truncate">{sub}</div>}
    </div>
  );
}

export function SectionLabel({ children, noMargin }) {
  return (
    <div className={`text-[10.5px] font-bold uppercase tracking-wider text-slate-400 font-display ${noMargin ? '' : 'mb-2.5'}`}>
      {children}
    </div>
  );
}

function DrawerTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-xl backdrop-blur-md text-slate-800 text-[11px]">
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

function TrajectoryTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xl backdrop-blur-md text-slate-800 text-[11.5px] min-w-[170px]">
        <div className="font-bold text-slate-700 font-display pb-1.5 mb-1.5 border-b border-slate-100 flex items-center justify-between">
          <span>{data.date}</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
            data.pct >= 80 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : data.pct >= 65 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}>
            {data.pct.toFixed(2)}%
          </span>
        </div>
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between text-slate-500">
            <span>Collected:</span>
            <span className="font-mono font-bold text-[#ff4d30]">{fmtINRFull(data.recvd)}</span>
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
            <span className="font-mono text-slate-600">{fmtINR(data.cumulative)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

const bandStyles = {
  high: { badge: 'bg-emerald-100 text-emerald-800', label: 'High' },
  medium: { badge: 'bg-amber-100 text-amber-800', label: 'Med' },
  low: { badge: 'bg-rose-100 text-rose-800', label: 'Low' },
};

function getBand(pct) {
  if (pct >= 80) return 'high';
  if (pct >= 65) return 'medium';
  return 'low';
}

export function AgentPortfolioTable({ data }) {
  const { domainArray, all } = data;
  
  return (
    <div className="bg-white border border-slate-200/90 shadow-sm rounded-2xl overflow-hidden flex flex-col mb-6 mt-2">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <h3 className="text-[15px] font-bold text-slate-900 font-display tracking-tight">Portfolio by Brand</h3>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-600">
            {domainArray.length} brands
          </span>
        </div>
      </div>
      
      <div className="overflow-x-auto scroll-theme">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 font-display">
                Domain / Brand
              </th>
              <th className="py-2.5 px-3 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 font-display text-right">
                Cases
              </th>
              <th className="py-2.5 px-3 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 font-display text-right">
                Total Due
              </th>
              <th className="py-2.5 px-3 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 font-display text-right">
                Remaining
              </th>
              <th className="py-2.5 px-3 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 font-display text-right">
                Today Live
              </th>
              <th className="py-2.5 px-3 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 font-display text-right">
                Yesterday
              </th>
              <th className="py-2.5 px-3 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 font-display text-right">
                Last Mo (Sep)
              </th>
              <th className="py-2.5 px-3 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 font-display text-right">
                Collected
              </th>
              <th className="py-2.5 px-3 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 font-display text-right">
                Disbursed
              </th>
              <th className="py-2.5 px-3 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 font-display text-right pr-4">
                Recovery %
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[12px]">
            {/* All Domains Aggregated Row */}
            <tr className="bg-slate-50/80 hover:bg-slate-100/50 transition-colors border-b-2 border-b-slate-200">
              <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                  <span className="text-[12.5px] font-bold">All Domains</span>
                  <span className="text-[9.5px] font-medium px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">All</span>
                </div>
              </td>
              <td className="py-2.5 px-3 text-right font-mono text-slate-600 tabular-nums">
                {all.cases.toLocaleString('en-IN')}
              </td>
              <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                {fmtINR(all.due)}
              </td>
              <td className="py-2.5 px-3 text-right font-mono text-slate-500 tabular-nums">
                {fmtINR(all.pending)}
              </td>
              <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 tabular-nums">
                {all.todayLive > 0 ? (
                  <span className="inline-flex items-center gap-1 justify-end">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {fmtINR(all.todayLive)}
                  </span>
                ) : '₹0'}
              </td>
              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 tabular-nums">
                {fmtINR(all.yesterday)}
              </td>
              <td className="py-2.5 px-3 text-right font-mono text-slate-700 font-medium tabular-nums">
                {fmtINR(all.sep2026Recvd)}
              </td>
              <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-800 tabular-nums">
                {fmtINR(all.recvd)}
              </td>
              <td className="py-2.5 px-3 text-right font-mono text-slate-500 tabular-nums">
                {fmtINR(all.principal)}
              </td>
              <td className="py-2.5 px-3 text-right whitespace-nowrap pr-4">
                <div className="inline-flex items-center gap-1.5 justify-end">
                  <span className="font-mono font-semibold text-slate-800 tabular-nums">
                    {all.pct.toFixed(2)}%
                  </span>
                  <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-600">
                    Total
                  </span>
                </div>
              </td>
            </tr>

            {/* Individual Domain Rows */}
            {domainArray.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-8 text-slate-400 text-xs">
                  No domains found
                </td>
              </tr>
            ) : (
              domainArray.map((d) => {
                const dotColor = DOMAIN_DOT_COLORS[d.name] || 'bg-slate-400';
                const style = bandStyles[getBand(d.pct)] || bandStyles.low;

                return (
                  <tr key={d.name} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="py-2.5 px-3 font-medium text-slate-800 group-hover:text-slate-900 transition-colors whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor.replace('bg-', 'bg-')}`} />
                        <span className="text-[12.5px] font-medium">{d.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-500 tabular-nums">
                      {d.cases.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {fmtINR(d.due)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-500 tabular-nums">
                      {fmtINR(d.pending)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {d.todayLive > 0 ? (
                        <span className="text-emerald-700 font-bold inline-flex items-center gap-1 justify-end">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {fmtINR(d.todayLive)}
                        </span>
                      ) : (
                        <span className="text-slate-300 font-normal">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {d.yesterday > 0 ? (
                        <span className="text-slate-800 font-semibold">{fmtINR(d.yesterday)}</span>
                      ) : (
                        <span className="text-slate-300 font-normal">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {d.sep2026Recvd > 0 ? (
                        <span className="text-slate-700 font-medium">{fmtINR(d.sep2026Recvd)}</span>
                      ) : (
                        <span className="text-slate-300 font-normal">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-800 tabular-nums">
                      {fmtINR(d.recvd)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-400 tabular-nums">
                      {fmtINR(d.principal)}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap pr-4">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <span className="font-mono font-medium text-slate-800 tabular-nums">
                          {d.pct.toFixed(2)}%
                        </span>
                        <span className={`text-[9.5px] font-medium px-1.5 py-0.2 rounded ${style.badge}`}>
                          {style.label}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
