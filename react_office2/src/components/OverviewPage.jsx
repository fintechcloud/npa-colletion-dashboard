import { useMemo, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Wallet, AlertTriangle, TrendingUp, Clock, Users, UserCheck, Layers,
  AlertCircle, FileSpreadsheet, Calendar, CalendarRange, CheckCircle2,
} from 'lucide-react';
import FilterBar from './FilterBar';
import KpiCard from './KpiCard';
import GoogleSheetSyncModal from './GoogleSheetSyncModal';
import { useLiveCollection } from '../context/LiveCollectionContext';
import {
  filterRows, aggregate, STATUSES, STATUS_COLORS, TODAY_STR, YESTERDAY_STR, AGENTS, META,
  fmtINR, fmtINRFull, fmtDateShort, fmtMonth, titleCase,
} from '../utils/data';

const RANGES = [
  { key: 14, label: '14D' },
  { key: 30, label: '30D' },
  { key: 60, label: '60D' },
  { key: 'all', label: 'ALL' },
];

export default function OverviewPage({ onOpenAgent }) {
  const { totalLiveToday, totalLiveCases } = useLiveCollection();
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [filters, setFilters] = useState({ leader: '', agent: '', type: '', from: '', to: '' });
  const [dailyRange, setDailyRange] = useState('all');

  const rows = useMemo(() => filterRows(filters), [filters]);
  const agg = useMemo(() => aggregate(rows), [rows]);

  // Dynamic Month-to-Date (1st of month to Yesterday) range: updates automatically every day
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
      leader: filters.leader,
      agent: filters.agent,
      type: filters.type,
      state: filters.state,
      from: monthStartStr,
      to: YESTERDAY_STR,
    });
  }, [filters, monthStartStr]);

  const mtdAgg = useMemo(() => aggregate(mtdRows), [mtdRows]);
  const mtdClosedLike = (mtdAgg.statusCount['CLOSED'] || 0) + (mtdAgg.statusCount['PRE-CLOSED'] || 0);

  // Dynamic Yesterday Due Cases Only: strictly cases where Due Date = Yesterday (updates automatically every day)
  const ydayDateLabel = useMemo(() => {
    return YESTERDAY_STR ? fmtDateShort(YESTERDAY_STR) : 'Yesterday';
  }, []);

  const ydayDueRows = useMemo(() => {
    if (!YESTERDAY_STR) return [];
    return filterRows({
      leader: filters.leader,
      agent: filters.agent,
      type: filters.type,
      state: filters.state,
      from: YESTERDAY_STR,
      to: YESTERDAY_STR,
    });
  }, [filters]);

  const ydayDueAgg = useMemo(() => aggregate(ydayDueRows), [ydayDueRows]);
  const ydayDueTotal = useMemo(() => {
    return (META.daywiseDueByDate && META.daywiseDueByDate[YESTERDAY_STR])
      ? META.daywiseDueByDate[YESTERDAY_STR]
      : ydayDueAgg.due;
  }, [ydayDueAgg.due]);
  const ydayDuePct = useMemo(() => {
    return ydayDueTotal > 0 ? (ydayDueAgg.recvd / ydayDueTotal) * 100 : ydayDueAgg.pct;
  }, [ydayDueTotal, ydayDueAgg.recvd, ydayDueAgg.pct]);

  const remaining = agg.due - agg.recvd;
  const ydayRow = agg.daily.find((d) => d.date === YESTERDAY_STR);
  const actualYday = META.actualCollectionByDate ? META.actualCollectionByDate[YESTERDAY_STR] : null;
  const ydayAmount = typeof actualYday === 'object' && actualYday !== null
    ? (actualYday.amount ?? 0)
    : (typeof actualYday === 'number' ? actualYday : (ydayRow ? ydayRow.recvd : 0));
  const ydayCases = typeof actualYday === 'object' && actualYday !== null
    ? (actualYday.cases ?? (ydayRow ? ydayRow.cases : 0))
    : (ydayRow ? ydayRow.cases : 0);
  const ydayBasis = actualYday ? 'actual payment date' : 'due date, approx';
  const lastMonth = agg.monthly.length ? agg.monthly[agg.monthly.length - 1] : null;
  const closedLike = (agg.statusCount['CLOSED'] || 0) + (agg.statusCount['PRE-CLOSED'] || 0);

  const dailyChartData = useMemo(() => {
    const d = dailyRange === 'all' ? agg.daily : agg.daily.slice(-dailyRange);
    return d.map((x) => ({ ...x, label: fmtDateShort(x.date) }));
  }, [agg.daily, dailyRange]);

  const monthlyChartData = useMemo(() => agg.monthly.map((m) => ({ ...m, label: fmtMonth(m.month) })), [agg.monthly]);

  const donutData = STATUSES.map((s) => ({ name: s, value: agg.statusCount[s] || 0 }));

  const newRepeatData = [
    { name: 'New', due: agg.typeAgg.NEW.due, recvd: agg.typeAgg.NEW.recvd },
    { name: 'Repeat', due: agg.typeAgg.REPEAT.due, recvd: agg.typeAgg.REPEAT.recvd },
  ];

  const empAgg = useMemo(() => {
    const m = {};
    rows.forEach((r) => {
      const a = r[0];
      if (!m[a]) m[a] = { due: 0, recvd: 0, cases: 0 };
      m[a].due += r[5];
      m[a].recvd += r[6];
      m[a].cases++;
    });
    return m;
  }, [rows]);

  const topPerformers = useMemo(() => Object.entries(empAgg)
    .map(([idx, v]) => ({ name: AGENTS[idx], ...v, pct: v.due ? Math.round((v.recvd / v.due) * 1000) / 10 : 0 }))
    .sort((a, b) => b.recvd - a.recvd)
    .slice(0, 6), [empAgg]);

  const needsAttention = useMemo(() => Object.entries(empAgg)
    .map(([idx, v]) => ({ name: AGENTS[idx], ...v, pct: v.due ? Math.round((v.recvd / v.due) * 1000) / 10 : 0 }))
    .filter((e) => e.pct < 60)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 5), [empAgg]);

  return (
    <div className="space-y-6">
      {/* Top filter bar */}
      <FilterBar filters={filters} setFilters={setFilters} />

      {/* Sleek Minimalist Ticker Bar */}
      <div className="relative bg-[#0c0e17]/50 backdrop-blur-xl border border-white/[0.05] rounded-xl py-2 mb-5 text-white overflow-hidden shadow-sm">
        <div className="flex items-center gap-8 whitespace-nowrap animate-marquee w-max">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex items-center gap-5 pl-4">
              <button
                type="button"
                onClick={() => setShowSyncModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 font-mono font-medium text-[11.5px] cursor-pointer transition-all"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Today: {fmtINR(totalLiveToday)}</span>
              </button>
              <span className="text-zinc-700">•</span>
              <div className="flex items-center gap-1.5 text-[11.5px]">
                <span className="text-zinc-500 font-normal">Yday Due ({ydayDateLabel}):</span>
                <span className="text-amber-400 font-mono font-semibold">{ydayDuePct.toFixed(2)}%</span>
                <span className="text-zinc-400 font-mono text-[10.5px]">({fmtINR(ydayDueAgg.recvd)}/{fmtINR(ydayDueTotal)})</span>
              </div>
              <span className="text-zinc-700">•</span>
              <div className="flex items-center gap-1.5 text-[11.5px]">
                <span className="text-zinc-500 font-normal">MTD Recov ({mtdRangeLabel}):</span>
                <span className="text-emerald-400 font-mono font-semibold">{mtdAgg.pct.toFixed(2)}%</span>
              </div>
              <span className="text-zinc-700">•</span>
              <div className="flex items-center gap-1.5 text-[11.5px]">
                <span className="text-zinc-500 font-normal">Full Month:</span>
                <span className="text-orange-400 font-mono font-semibold">{agg.pct.toFixed(2)}%</span>
              </div>
              <span className="text-zinc-700">•</span>
              <Stat label="Total Due" value={fmtINR(agg.due)} />
              <span className="text-zinc-700">•</span>
              <Stat label="Collected" value={fmtINR(agg.recvd)} accent />
              <span className="text-zinc-700">•</span>
              <Stat label="Cases" value={agg.cases.toLocaleString('en-IN')} />
              <span className="text-zinc-700">•</span>
              <Stat label="Active Agents" value={agg.agentCount} />
              <span className="text-zinc-700">•</span>
              <Stat label="Active Leaders" value={agg.leaderCount} />
              <span className="text-zinc-700">•</span>
              <Stat label={`Yday Due Coll (${ydayDateLabel})`} value={fmtINR(ydayDueAgg.recvd)} />
            </div>
          ))}
        </div>
      </div>

      {/* Row 1 KPI Cards: Core Cash & Disbursals (4 clean, spacious columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          index={0}
          label="Total Collected"
          raw={agg.recvd}
          format={fmtINR}
          sub="Portfolio recoveries to date"
          icon={Wallet}
          tone="brand"
          trend="↑ 24%"
        />
        <KpiCard
          index={1}
          label="Live Today"
          raw={totalLiveToday}
          format={fmtINR}
          sub={`${totalLiveCases} cases live in sheet`}
          icon={FileSpreadsheet}
          tone="live"
          onClick={() => setShowSyncModal(true)}
        />
        <KpiCard
          index={2}
          label="Yesterday"
          raw={ydayAmount}
          format={fmtINR}
          sub={`${ydayCases} cases (${ydayBasis})`}
          icon={Clock}
          tone="warn"
          trend={fmtDateShort(YESTERDAY_STR)}
        />
        <KpiCard
          index={3}
          label="Remaining Due"
          raw={remaining}
          format={fmtINR}
          sub={`of ${fmtINR(agg.due)} total portfolio`}
          icon={AlertCircle}
          tone="danger"
          trend={`${((remaining / (agg.due || 1)) * 100).toFixed(0)}% Left`}
        />
      </div>

      {/* Row 2 KPI Cards: Recovery Performance (Yesterday Due, MTD, Full Month) & Portfolio Scope */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          index={4}
          label="Yesterday Due Recovery"
          raw={ydayDuePct}
          format={(v) => `${v.toFixed(2)}%`}
          dateRange={`Due: ${ydayDateLabel}`}
          sub={`${fmtINR(ydayDueAgg.recvd)} of ${fmtINR(ydayDueTotal)} (${ydayDueAgg.cases.toLocaleString('en-IN')} cases)`}
          icon={TrendingUp}
          tone="warn"
        />
        <KpiCard
          index={5}
          label="MTD Recovery"
          raw={mtdAgg.pct}
          format={(v) => `${v.toFixed(2)}%`}
          dateRange={mtdRangeLabel}
          sub={`${fmtINR(mtdAgg.recvd)} of ${fmtINR(mtdAgg.due)} (${mtdAgg.cases.toLocaleString('en-IN')} cases)`}
          icon={TrendingUp}
          tone="live"
        />
        <KpiCard
          index={6}
          label="Full Month Recovery"
          raw={agg.pct}
          format={(v) => `${v.toFixed(2)}%`}
          dateRange="01 Sep – 30 Sep"
          sub={`All ${agg.cases.toLocaleString('en-IN')} cases · Total scope`}
          icon={TrendingUp}
          tone="brand"
        />
        <KpiCard
          index={7}
          label="Total Cases"
          raw={agg.cases}
          format={(v) => Math.round(v).toLocaleString('en-IN')}
          sub={`${closedLike.toLocaleString('en-IN')} settled / closed · ${agg.agentCount} Agents`}
          icon={Layers}
        />
      </div>

      {/* Centerpiece Day-wise Collection Spline Chart matching Vaulto Reference */}
      <Panel
        title="Day-wise Collection Trend"
        sub="Repayment due schedule vs. actual recovered amount"
        right={
          <div className="flex bg-black/50 border border-white/[0.08] rounded-xl p-0.5 gap-0.5">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setDailyRange(r.key)}
                className={`text-[11px] font-bold px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  dailyRange === r.key
                    ? 'bg-gradient-to-r from-[#ff5e3a] to-[#ff3b30] text-white shadow-[0_0_12px_rgba(255,59,48,0.4)]'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      >
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={dailyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <filter id="red-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#ff3b30" floodOpacity="0.45" />
              </filter>
            </defs>
            <CartesianGrid vertical={false} stroke="#1f212e" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#64748b' }}
              axisLine={{ stroke: '#1f212e' }}
              tickLine={false}
              minTickGap={28}
            />
            <YAxis
              tickFormatter={(v) => fmtINR(v)}
              tick={{ fontSize: 10, fill: '#64748b' }}
              axisLine={{ stroke: '#1f212e' }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600, paddingTop: 10 }} />
            <Line
              type="monotone"
              dataKey="due"
              name="Due Target"
              stroke="#475569"
              strokeDasharray="4 4"
              dot={false}
              strokeWidth={1.5}
            />
            <Line
              type="monotone"
              dataKey="recvd"
              name="Recovered"
              stroke="#ff3b30"
              dot={{ r: 2, fill: '#ff3b30' }}
              activeDot={{ r: 6, fill: '#ff3b30', stroke: '#fff', strokeWidth: 2 }}
              strokeWidth={2.5}
              filter="url(#red-glow)"
            />
          </LineChart>
        </ResponsiveContainer>
      </Panel>

      {/* Two Column Grid: Month-wise & Case Status */}
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
              <CartesianGrid vertical={false} stroke="#1f212e" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#1f212e' }} tickLine={false} />
              <YAxis tickFormatter={(v) => fmtINR(v)} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#1f212e' }} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600, paddingTop: 10 }} />
              <Bar dataKey="due" name="Due" fill="#242634" radius={[6, 6, 0, 0]} />
              <Bar dataKey="recvd" name="Recovered" fill="url(#recoveredBarGrad)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Case Status Breakdown" sub="Distribution of current loan statuses">
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
                      <Cell key={d.name} fill={STATUS_COLORS[d.name] || '#94a3b8'} stroke="none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-[20px] font-extrabold text-white font-display leading-none">{agg.cases}</div>
                <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mt-1">Cases</div>
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-2">
              {donutData.map((d) => {
                const pct = agg.cases ? Math.round((d.value / agg.cases) * 1000) / 10 : 0;
                return (
                  <div key={d.name} className="flex items-center gap-2.5 text-[12px]">
                    <span
                      className="w-2 h-2 rounded-full shrink-0 shadow-[0_0_6px_currentColor]"
                      style={{ background: STATUS_COLORS[d.name] || '#94a3b8', color: STATUS_COLORS[d.name] || '#94a3b8' }}
                    />
                    <span className="flex-1 font-medium text-zinc-300 truncate">{titleCase(d.name)}</span>
                    <span className="font-mono font-semibold text-white">{d.value}</span>
                    <span className="font-mono text-zinc-500 w-11 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>
      </div>

      {/* Two Column Grid: Top Performers & Needs Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
        <Panel title="Top Performers" sub="Highest individual collection totals (₹)">
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
              <CartesianGrid vertical={false} stroke="#1f212e" strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#1f212e' }} tickLine={false} />
              <YAxis tickFormatter={(v) => fmtINR(v)} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#1f212e' }} tickLine={false} />
              <Tooltip
                content={<CustomTooltip isCurrency={true} />}
                labelFormatter={(_, p) => p?.[0]?.payload?.full || ''}
              />
              <Bar dataKey="recvd" name="Recovered" fill="url(#topAgentGrad)" radius={[6, 6, 0, 0]} barSize={34} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Needs Attention" sub="Agents recovering under 60% of assigned due">
          {needsAttention.length === 0 ? (
            <div className="text-[12.5px] text-zinc-500 py-8 text-center font-medium">All agents are above target threshold (≥60%).</div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {needsAttention.map((e) => (
                <button
                  key={e.name}
                  onClick={() => onOpenAgent(e.name)}
                  className="flex items-center gap-3 text-left bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] rounded-xl px-3.5 py-2.5 transition-all cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                    <AlertTriangle size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold text-white group-hover:text-[#ff5533] transition-colors truncate">
                      {e.name}
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      {fmtINR(e.recvd)} of {fmtINR(e.due)}
                    </div>
                  </div>
                  <span className="text-[12px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                    {e.pct}%
                  </span>
                </button>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* New vs Repeat Horizontal Bar Chart */}
      <Panel title="New vs. Repeat Customer Recovery" sub="Comparing collection efficiency across borrower profiles">
        <ResponsiveContainer width="100%" height={170}>
          <BarChart data={newRepeatData} layout="vertical" margin={{ left: 10, right: 20, top: 10, bottom: 0 }}>
            <CartesianGrid horizontal={false} stroke="#1f212e" strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={(v) => fmtINR(v)} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#1f212e' }} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#cbd5e1', fontWeight: 700 }} axisLine={{ stroke: '#1f212e' }} tickLine={false} width={64} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600, paddingTop: 6 }} />
            <Bar dataKey="due" name="Due" fill="#242634" radius={[0, 6, 6, 0]} barSize={22} />
            <Bar dataKey="recvd" name="Recovered" fill="#ff5533" radius={[0, 6, 6, 0]} barSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      {/* Google Sheet Live Sync Modal */}
      <GoogleSheetSyncModal isOpen={showSyncModal} onClose={() => setShowSyncModal(false)} />
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="flex items-center gap-1.5 text-[11.5px] whitespace-nowrap">
      <span className="text-zinc-500 font-normal">{label}:</span>
      <span className={`font-mono font-semibold ${accent ? 'text-[#ff6b4a]' : 'text-zinc-200'}`}>{value}</span>
    </div>
  );
}

function Panel({ title, sub, right, className = '', children }) {
  return (
    <div className={`bg-[#0f111d]/45 hover:bg-[#151829]/55 backdrop-blur-xl border border-white/10 hover:border-white/15 rounded-2xl p-6 shadow-xl transition-all ${className}`}>
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <div className="text-[15px] font-bold text-white font-display tracking-tight">{title}</div>
          {sub && <div className="text-[11.5px] font-medium text-zinc-400 mt-0.5">{sub}</div>}
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
      <div className="bg-[#181924]/95 border border-white/10 rounded-xl p-3 shadow-2xl backdrop-blur-md text-white text-[12px]">
        {label && <div className="font-bold text-zinc-400 mb-1.5 font-display">{label}</div>}
        {payload.map((item, index) => (
          <div key={index} className="flex items-center gap-2 py-0.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color || item.fill || '#ff3b30' }} />
            <span className="text-zinc-400 font-medium">{item.name}:</span>
            <span className="font-mono font-bold text-white">
              {isCurrency && typeof item.value === 'number' ? fmtINRFull(item.value) : item.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}