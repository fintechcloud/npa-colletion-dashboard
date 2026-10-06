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
    <div className="space-y-6">
      {/* 1. Consolidated Filter Strip */}
      <div className="flex flex-col xl:flex-row xl:items-center gap-4 bg-white/80 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-2 sm:p-3 shadow-xs">
        <DomainSwitcher />
        <div className="hidden xl:block w-[1px] h-8 bg-slate-200" />
        <div className="flex-1 overflow-x-auto">
          <FilterBar filters={filters} setFilters={setFilters} />
        </div>
      </div>

      {/* 2. Hero KPI Cards (Primary Row) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          index={0}
          label="Total Repayment Due"
          raw={agg.due}
          format={fmtINR}
          sub={`Remaining: ${fmtINR(remaining)}`}
          icon={AlertCircle}
          tone="warn"
          className="md:py-7"
          valueClassName="text-[28px] sm:text-[32px] xl:text-[36px]"
        />
        <KpiCard
          index={1}
          label="Total NPA Recovered"
          raw={agg.recvd}
          format={fmtINR}
          sub="All-time portfolio recovery"
          icon={Wallet}
          tone="brand"
          className="md:py-7"
          valueClassName="text-[28px] sm:text-[32px] xl:text-[36px]"
        />
        <KpiCard
          index={2}
          label="Recovery Rate"
          raw={agg.pct}
          format={(v) => `${v.toFixed(2)}%`}
          sub="Overall portfolio recovery percentage"
          icon={TrendingUp}
          tone="live"
          className="md:py-7"
          valueClassName="text-[28px] sm:text-[32px] xl:text-[36px]"
        />
      </div>

      {/* 3. Secondary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <KpiCard
          index={3}
          label="Today's Live Collection"
          raw={todayLiveAmount}
          format={fmtINR}
          sub={`${todayLiveCasesCount} cases collected`}
          dateRange={`RCV: ${todayDateLabel}`}
          icon={Radio}
          tone="live"
        />
        <KpiCard
          index={4}
          label="Yesterday's Total Collection"
          raw={yesterdayAmount}
          format={fmtINR}
          sub={`${yesterdayCasesCount} cases collected`}
          dateRange={`RCV: ${ydayDateLabel}`}
          icon={Calendar}
          tone="brand"
        />
        <KpiCard
          index={5}
          label="Total Disbursed Principal"
          raw={agg.principal}
          format={fmtINR}
          sub="Original disbursed loan capital"
          icon={Layers}
          tone="neutral"
        />
        <KpiCard
          index={6}
          label="Active NPA Cases"
          raw={agg.cases}
          format={(v) => Math.round(v).toLocaleString('en-IN')}
          sub={`${agg.agentCount} Agents · ${agg.leaderCount} Leaders`}
          icon={Users}
          tone="neutral"
        />
      </div>

      {/* 4. Split-Screen: Daily Trajectory & Brand Portfolio */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-6 items-start">
        <CollectionTrendChart agg={agg} selectedDomains={selectedDomains.size > 0 ? Array.from(selectedDomains).join(", ") : "All Domains"} />
        <DomainPortfolioTable compact />
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
                    outerRadius={64}
                    paddingAngle={3}
                    cornerRadius={5}
                  >
                    {donutData.map((d) => (
                      <Cell key={d.name} fill={MODE_COLORS[d.name] || '#94a3b8'} stroke="none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-[20px] font-extrabold text-slate-900 font-display leading-none">{agg.cases.toLocaleString('en-IN')}</div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">Cases</div>
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-2">
              {donutData.map((d) => {
                const pct = agg.cases ? Math.round((d.value / agg.cases) * 1000) / 10 : 0;
                return (
                  <div key={d.name} className="flex items-center gap-2.5 text-[12px]">
                    <span
                      className="w-2 h-2 rounded-full shrink-0 shadow-xs"
                      style={{ background: MODE_COLORS[d.name] || '#94a3b8', color: MODE_COLORS[d.name] || '#94a3b8' }}
                    />
                    <span className="flex-1 font-medium text-slate-600 truncate">{titleCase(d.name)}</span>
                    <span className="font-mono font-semibold text-slate-900">{d.value.toLocaleString('en-IN')}</span>
                    <span className="font-mono text-slate-400 w-11 text-right">{pct}%</span>
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
            <ResponsiveContainer width="100%" height={230}>
              <BarChart
                data={topPerformers.map((p) => ({ name: p.name.split(' ')[0], full: p.name, recvd: p.recvd }))}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="topAgentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                <YAxis tickFormatter={(v) => fmtINR(v)} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                <Tooltip
                  content={<CustomTooltip isCurrency={true} />}
                  labelFormatter={(_, p) => p?.[0]?.payload?.full || ''}
                />
                <Bar dataKey="recvd" name="Recovered" fill="url(#topAgentGrad)" radius={[6, 6, 0, 0]} barSize={34} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title={`Needs Attention (${selectedDomains.size > 0 ? Array.from(selectedDomains).join(", ") : "All Domains"})`} sub="Agents recovering under 60% of assigned due">
          {needsAttention.length === 0 ? (
            <div className="text-[12.5px] text-slate-400 py-8 text-center font-medium">All active agents in this domain are above target threshold (≥60%).</div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {needsAttention.map((e) => (
                <button
                  key={e.name}
                  onClick={() => onOpenAgent(e.name)}
                  className="flex items-center gap-3 text-left bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 hover:border-slate-300 rounded-xl px-3.5 py-2.5 transition-all cursor-pointer group shadow-xs"
                >
                  <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                    <AlertTriangle size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold text-slate-900 group-hover:text-[#ff4d30] transition-colors truncate">
                      {e.name}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {fmtINR(e.recvd)} of {fmtINR(e.due)}
                    </div>
                  </div>
                  <span className="text-[12px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                    {e.pct}%
                  </span>
                </button>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* 8. New vs Repeat Customer Recovery */}
      <Panel title="New vs. Repeat Customer Recovery" sub="Comparing collection efficiency across borrower profiles">
        <ResponsiveContainer width="100%" height={170}>
          <BarChart data={newRepeatData} layout="vertical" margin={{ left: 10, right: 20, top: 10, bottom: 0 }}>
            <CartesianGrid horizontal={false} stroke="#f1f5f9" strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={(v) => fmtINR(v)} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#334155', fontWeight: 700 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} width={64} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600, paddingTop: 6 }} />
            <Bar dataKey="due" name="Due" fill="#cbd5e1" radius={[0, 6, 6, 0]} barSize={22} />
            <Bar dataKey="recvd" name="Recovered" fill="#ff4d30" radius={[0, 6, 6, 0]} barSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="flex items-center gap-1.5 text-[11.5px] whitespace-nowrap">
      <span className="text-slate-400 font-normal">{label}:</span>
      <span className={`font-mono font-semibold ${accent ? 'text-[#ff4d30]' : 'text-slate-700'}`}>{value}</span>
    </div>
  );
}

function Panel({ title, sub, right, className = '', children }) {
  return (
    <div className={`bg-white hover:bg-white/95 backdrop-blur-xl border border-slate-200/90 hover:border-slate-300 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all ${className}`}>
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <div className="text-[15px] font-bold text-slate-900 font-display tracking-tight">{title}</div>
          {sub && <div className="text-[11.5px] font-medium text-slate-500 mt-0.5">{sub}</div>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function CustomTooltip({ active, payload, label, isCurrency = true }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xl backdrop-blur-md text-slate-800 text-[12px]">
        {label && <div className="font-bold text-slate-500 mb-1.5 font-display">{label}</div>}
        {payload.map((item, index) => (
          <div key={index} className="flex items-center gap-2 py-0.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color || item.fill || '#ff3b30' }} />
            <span className="text-slate-500 font-medium">{item.name}:</span>
            <span className="font-mono font-bold text-slate-900">
              {isCurrency && typeof item.value === 'number' ? fmtINRFull(item.value) : item.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}