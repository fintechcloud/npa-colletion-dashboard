import { useMemo, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Wallet, AlertTriangle, TrendingUp, Clock, Users, Layers,
  AlertCircle, FileSpreadsheet, CheckCircle2, Building2, Radio, Calendar,
} from 'lucide-react';
import FilterBar from './FilterBar';
import KpiCard from './KpiCard';
import DomainSwitcher from './DomainSwitcher';
import DomainPortfolioTable from './DomainPortfolioTable';
import CollectionTrendChart from './CollectionTrendChart';
import { useLiveCollection } from '../context/LiveCollectionContext';
import { useDomain } from '../context/DomainContext';
import {
  filterRows, aggregate, STATUSES, STATUS_COLORS, DOMAINS, MODES, MODE_COLORS,
  TODAY_STR, YESTERDAY_STR, AGENTS, CASES, META,
  fmtINR, fmtINRFull, fmtDateShort, fmtMonth, titleCase, DOMAIN_DOT_COLORS, dateToOffset,
} from '../utils/data';

export default function OverviewPage({ onOpenAgent }) {
  const {
    totalLiveToday,
    totalLiveCases,
    totalYesterday,
    totalYesterdayCases,
    todayDate,
    yesterdayDate,
  } = useLiveCollection();
  const { selectedDomains } = useDomain();
  const [filters, setFilters] = useState({ leader: '', agent: '', type: '', from: '', to: '' });

  // Combined filters including active domain from DomainContext
  const activeFilters = useMemo(() => ({
    ...filters,
    domains: Array.from(selectedDomains),
  }), [filters, selectedDomains]);

  const rows = useMemo(() => filterRows(activeFilters), [activeFilters]);
  const agg = useMemo(() => aggregate(rows), [rows]);

  // Dynamic Month-to-Date (1st of month to Yesterday) range
  const monthStartStr = useMemo(() => {
    return TODAY_STR ? TODAY_STR.slice(0, 7) + '-01' : '';
  }, []);

  const mtdRangeLabel = useMemo(() => {
    const startLbl = monthStartStr ? fmtDateShort(monthStartStr) : '01 Sep';
    const endLbl = YESTERDAY_STR ? fmtDateShort(YESTERDAY_STR) : 'Yesterday';
    return `${startLbl} – ${endLbl}`;
  }, [monthStartStr]);

  const mtdRows = useMemo(() => {
    if (!monthStartStr || !YESTERDAY_STR) return [];
    return filterRows({
      ...activeFilters,
      from: monthStartStr,
      to: YESTERDAY_STR,
    });
  }, [activeFilters, monthStartStr]);

  const mtdAgg = useMemo(() => aggregate(mtdRows), [mtdRows]);

  const targetTodayStr = todayDate || TODAY_STR;
  const targetYdayStr = yesterdayDate || YESTERDAY_STR;

  const todayDateLabel = useMemo(() => {
    return targetTodayStr ? fmtDateShort(targetTodayStr) : 'Today';
  }, [targetTodayStr]);

  const ydayDateLabel = useMemo(() => {
    return targetYdayStr ? fmtDateShort(targetYdayStr) : 'Yesterday';
  }, [targetYdayStr]);

  // Compute Today Live & Yesterday Collections working directly on RCV DATE (r[13] = recDayOffset)
  const { todayLiveAmount, todayLiveCasesCount, yesterdayAmount, yesterdayCasesCount } = useMemo(() => {
    const todayOff = targetTodayStr ? dateToOffset(targetTodayStr) : -9999;
    const ydayOff = targetYdayStr ? dateToOffset(targetYdayStr) : -9999;

    let tAmt = 0;
    let tCases = 0;
    let yAmt = 0;
    let yCases = 0;

    rows.forEach((r) => {
      const recOff = r[13]; // recDayOffset
      const rv = r[6] || 0;
      if (recOff === todayOff && rv > 0) {
        tAmt += rv;
        tCases++;
      }
      if (recOff === ydayOff && rv > 0) {
        yAmt += rv;
        yCases++;
      }
    });

    const isFiltered = Boolean(selectedDomains.size > 0);
    const actualToday = META.actualCollectionByDate ? META.actualCollectionByDate[targetTodayStr] : null;
    const actualYday = META.actualCollectionByDate ? META.actualCollectionByDate[targetYdayStr] : null;

    const finalTodayAmt = isFiltered ? tAmt : Math.max(tAmt, totalLiveToday || 0, actualToday?.amount || 0);
    const finalTodayCases = isFiltered ? tCases : Math.max(tCases, totalLiveCases || 0, actualToday?.cases || 0);
    const finalYdayAmt = isFiltered ? yAmt : Math.max(yAmt, totalYesterday || 0, actualYday?.amount || 0);
    const finalYdayCases = isFiltered ? yCases : Math.max(yCases, totalYesterdayCases || 0, actualYday?.cases || 0);

    return {
      todayLiveAmount: finalTodayAmt,
      todayLiveCasesCount: finalTodayCases,
      yesterdayAmount: finalYdayAmt,
      yesterdayCasesCount: finalYdayCases,
    };
  }, [rows, selectedDomains, targetTodayStr, targetYdayStr, totalLiveToday, totalLiveCases, totalYesterday, totalYesterdayCases]);

  const remaining = agg.due - agg.recvd;

  const monthlyChartData = useMemo(() => agg.monthly.map((m) => ({ ...m, label: fmtMonth(m.month) })), [agg.monthly]);

  // Mode / Status breakdown donut
  const donutData = useMemo(() => {
    return MODES.map((m) => ({ name: m, value: agg.modeCount?.[m] || 0 }));
  }, [agg.modeCount]);

  const newRepeatData = useMemo(() => [
    { name: 'New', due: agg.typeAgg?.NEW?.due || 0, recvd: agg.typeAgg?.NEW?.recvd || 0 },
    { name: 'Repeat', due: agg.typeAgg?.REPEAT?.due || 0, recvd: agg.typeAgg?.REPEAT?.recvd || 0 },
  ], [agg.typeAgg]);

  // Aggregation of agents strictly for the active domain / rows
  const empAgg = useMemo(() => {
    const m = {};
    rows.forEach((r) => {
      const a = r[0];
      if (!m[a]) m[a] = { due: 0, recvd: 0, cases: 0, domains: new Set() };
      m[a].due += (r[5] || 0);
      m[a].recvd += (r[6] || 0);
      m[a].cases++;
      if (r[8] !== undefined && DOMAINS[r[8]]) m[a].domains.add(DOMAINS[r[8]]);
    });
    return m;
  }, [rows]);

  const topPerformers = useMemo(() => Object.entries(empAgg)
    .map(([idx, v]) => ({ name: AGENTS[idx] || `Agent ${idx}`, ...v, domains: [...v.domains], pct: v.due ? Math.round((v.recvd / v.due) * 1000) / 10 : 0 }))
    .sort((a, b) => b.recvd - a.recvd)
    .slice(0, 6), [empAgg]);

  const needsAttention = useMemo(() => Object.entries(empAgg)
    .map(([idx, v]) => ({ name: AGENTS[idx] || `Agent ${idx}`, ...v, domains: [...v.domains], pct: v.due ? Math.round((v.recvd / v.due) * 1000) / 10 : 0 }))
    .filter((e) => e.pct < 60)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 5), [empAgg]);

  return (
    <div className="space-y-5">
      {/* 1. Sleek Prominent Multi-Domain Switcher Pill Bar (Row 1) */}
      <DomainSwitcher />

      {/* 2. Top Filter Bar (Row 2) */}
      <FilterBar filters={filters} setFilters={setFilters} />

      {/* 3. Primary "Hero" KPI Cards (3 Cards) matching Reference Image */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5">
        {/* Hero Card 1: Total Repayment Due */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg border bg-amber-50 border-amber-200 text-amber-600 flex items-center justify-center">
              <AlertCircle size={15} strokeWidth={2.2} />
            </div>
            <span className="text-[12.5px] font-semibold text-slate-500 uppercase tracking-wide">
              Total Repayment Due
            </span>
          </div>
          <div className="my-3">
            <div className="font-bold text-slate-900 tracking-tight font-display text-[30px] sm:text-[34px] xl:text-[36px] leading-tight">
              {fmtINR(agg.due)}
            </div>
            <div className="text-[12px] font-medium text-slate-400 mt-1">
              Remaining: <span className="font-mono text-slate-600 font-semibold">{fmtINR(remaining)}</span>
            </div>
          </div>
        </div>

        {/* Hero Card 2: Total NPA Recovered */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg border bg-orange-50 border-orange-200 text-[#ff4d30] flex items-center justify-center">
              <Wallet size={15} strokeWidth={2.2} />
            </div>
            <span className="text-[12.5px] font-semibold text-slate-500 uppercase tracking-wide">
              Total NPA Recovered
            </span>
          </div>
          <div className="my-3">
            <div className="font-bold text-slate-900 tracking-tight font-display text-[30px] sm:text-[34px] xl:text-[36px] leading-tight">
              {fmtINR(agg.recvd)}
            </div>
            <div className="text-[12px] font-medium text-slate-400 mt-1">
              All-time portfolio recovery
            </div>
          </div>
        </div>

        {/* Hero Card 3: Recovery Rate with Circular Donut Progress Ring */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg border bg-rose-50 border-rose-200 text-[#ff4d30] flex items-center justify-center">
                <TrendingUp size={15} strokeWidth={2.2} />
              </div>
              <span className="text-[12.5px] font-semibold text-slate-500 uppercase tracking-wide">
                Recovery Rate
              </span>
            </div>
            <div className="font-bold text-slate-900 tracking-tight font-display text-[30px] sm:text-[34px] xl:text-[36px] leading-tight my-2">
              {agg.pct.toFixed(2)}%
            </div>
            <div className="text-[12px] font-medium text-slate-400">
              Overall portfolio recovery
            </div>
          </div>

          {/* Elegant Circular Donut Gauge matching reference image */}
          <div className="relative w-18 h-18 sm:w-20 sm:h-20 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100"
                strokeWidth="4"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-[#ff5533]"
                strokeDasharray={`${Math.min(Math.max(agg.pct, 0), 100)}, 100`}
                strokeWidth="4.2"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* 4. Secondary Operational KPI Cards (2 Rows of 4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KpiCard
          index={0}
          label="Today's Live Collection"
          raw={todayLiveAmount}
          format={fmtINR}
          sub={`${todayLiveCasesCount} cases collected`}
          dateRange={`RCV: ${todayDateLabel}`}
          icon={Radio}
          tone="live"
        />
        <KpiCard
          index={1}
          label="Yesterday's Total Collection"
          raw={yesterdayAmount}
          format={fmtINR}
          sub={`${yesterdayCasesCount} cases collected`}
          dateRange={`RCV: ${ydayDateLabel}`}
          icon={Calendar}
          tone="brand"
        />
        <KpiCard
          index={2}
          label="Settled vs Part-Payment"
          raw={agg.modeCount?.['PART-PAYMENT'] || 0}
          format={() => `${(agg.modeCount?.['PART-PAYMENT'] || 0).toLocaleString('en-IN')} Part · ${(agg.modeCount?.['SETTLED'] || 0).toLocaleString('en-IN')} Settled`}
          sub={`${(agg.modeCount?.['CLOSED'] || 0).toLocaleString('en-IN')} Closed · ${(agg.modeCount?.['SETTLED ON DISBURSAL'] || 0).toLocaleString('en-IN')} Disbursal`}
          icon={CheckCircle2}
          tone="live"
          valueClassName="text-[17px] sm:text-[18px] xl:text-[19px]"
        />
        <KpiCard
          index={3}
          label="Latest Month Recovery (Sep 2026)"
          raw={agg.sep2026Recvd}
          format={fmtINR}
          sub="September 2026 reconciled collections"
          icon={TrendingUp}
          tone="brand"
        />
        <KpiCard
          index={4}
          label="Total Disbursed Principal"
          raw={agg.principal}
          format={fmtINR}
          sub="Original disbursed loan capital"
          icon={Layers}
          tone="neutral"
        />
        <KpiCard
          index={5}
          label="Active NPA Cases"
          raw={agg.cases}
          format={(v) => Math.round(v).toLocaleString('en-IN')}
          sub={`${agg.agentCount} Agents · ${agg.leaderCount} Leaders`}
          icon={Users}
          tone="neutral"
        />
        <KpiCard
          index={6}
          label="Resolved & Closed Accounts"
          raw={(agg.modeCount?.['CLOSED'] || 0) + (agg.modeCount?.['SETTLED'] || 0)}
          format={(v) => `${v.toLocaleString('en-IN')} Accounts`}
          sub="Cases fully resolved / closed"
          icon={CheckCircle2}
          tone="live"
        />
        <KpiCard
          index={7}
          label="Active Recovery Focus"
          raw={agg.cases ? Math.round((agg.recvd / agg.cases)) : 0}
          format={(v) => `${fmtINR(v)} / case`}
          sub="Average recovery per case"
          icon={Clock}
          tone="neutral"
        />
      </div>

      {/* 5. Centerpiece Split-Screen Section: Daily Trajectory (Left) & Portfolio by Brand (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
        <CollectionTrendChart agg={agg} selectedDomains={selectedDomains} />
        <DomainPortfolioTable />
      </div>

      {/* 6. Two Column Grid: Month-wise & Closure Mode Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
        <Panel title="Month-wise Collection" sub="Total due vs. recovered amount per repayment month">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyChartData} barGap={6} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="recoveredBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff5533" />
                  <stop offset="100%" stopColor="#ff3b30" />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
              <YAxis tickFormatter={(v) => fmtINR(v)} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600, paddingTop: 10 }} />
              <Bar dataKey="due" name="Due" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
              <Bar dataKey="recvd" name="Recovered" fill="url(#recoveredBarGrad)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Closure Mode Breakdown" sub="Distribution of recovery closure modes">
          <div className="flex items-center gap-5">
            <div className="relative w-[140px] h-[140px] shrink-0">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    innerRadius={46}
                    outerRadius={68}
                    paddingAngle={3}
                  >
                    {donutData.map((e) => (
                      <Cell key={e.name} fill={MODE_COLORS[e.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[17px] font-bold text-slate-900 font-display">
                  {agg.cases.toLocaleString('en-IN')}
                </span>
                <span className="text-[9.5px] uppercase tracking-wider text-slate-400 font-medium">
                  Cases
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-1.5 min-w-0">
              {donutData.map((d) => {
                const count = d.value;
                const pct = agg.cases ? ((count / agg.cases) * 100).toFixed(1) : '0.0';
                return (
                  <div key={d.name} className="flex items-center justify-between text-[11.5px]">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: MODE_COLORS[d.name] || '#94a3b8' }} />
                      <span className="text-slate-600 truncate">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono">
                      <span className="font-semibold text-slate-800">{count.toLocaleString('en-IN')}</span>
                      <span className="text-slate-400 text-[10px] w-10 text-right">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>
      </div>

      {/* 7. Two Column Grid: Top Performers & Needs Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
        <Panel title={`Top Performers (${selectedDomains.size > 0 ? Array.from(selectedDomains).join(", ") : "All Domains"})`} sub="Highest individual collection totals (₹) in chosen domain">
          {topPerformers.length === 0 ? (
            <div className="text-[12.5px] text-slate-400 py-8 text-center font-medium">No agents found for this selection.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {topPerformers.map((a, idx) => (
                <div
                  key={a.name}
                  onClick={() => onOpenAgent && onOpenAgent(a.name)}
                  className="py-2.5 flex items-center justify-between hover:bg-slate-50/70 -mx-3 px-3 rounded-xl transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-slate-100 group-hover:bg-[#ff4d30] group-hover:text-white text-slate-600 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 transition-colors">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-semibold text-slate-800 group-hover:text-[#ff4d30] truncate transition-colors">
                        {a.name}
                      </div>
                      <div className="text-[10.5px] text-slate-400 font-mono truncate">
                        {a.cases} cases · {a.domains.join(', ') || 'No domain'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-slate-900 text-[12.5px]">{fmtINR(a.recvd)}</div>
                    <div className="text-[10px] font-mono text-emerald-600 font-semibold">{a.pct}% recovered</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title={`Needs Attention (${selectedDomains.size > 0 ? Array.from(selectedDomains).join(", ") : "All Domains"})`} sub="Agents recovering under 60% of assigned due">
          {needsAttention.length === 0 ? (
            <div className="text-[12.5px] text-slate-400 py-8 text-center font-medium">All active agents in this domain are above target threshold (≥60%).</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {needsAttention.map((a) => (
                <div
                  key={a.name}
                  onClick={() => onOpenAgent && onOpenAgent(a.name)}
                  className="py-2.5 flex items-center justify-between hover:bg-slate-50/70 -mx-3 px-3 rounded-xl transition-colors cursor-pointer group"
                >
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-semibold text-slate-800 group-hover:text-rose-600 truncate transition-colors">
                      {a.name}
                    </div>
                    <div className="text-[10.5px] text-slate-400 font-mono truncate">
                      {a.cases} cases · Due: {fmtINR(a.due)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-semibold text-slate-700 text-[12px]">{fmtINR(a.recvd)}</div>
                    <div className="text-[10.5px] font-mono text-rose-600 font-bold">{a.pct}% recovered</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
