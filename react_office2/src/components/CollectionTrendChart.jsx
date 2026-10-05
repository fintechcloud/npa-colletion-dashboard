import { useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Calendar, TrendingUp, BarChart3, Layers } from 'lucide-react';
import { fmtINR, fmtINRFull, fmtDateShort, round1 } from '../utils/data';

const RANGES = [
  { key: 14, label: '14D' },
  { key: 30, label: '30D' },
  { key: 60, label: '60D' },
  { key: 'all', label: 'ALL' },
];

const VIEW_MODES = [
  { key: 'weekly', label: 'Weekly Rollup', icon: BarChart3, hint: 'Smooth 7-day aggregation' },
  { key: 'cumulative', label: 'Cumulative S-Curve', icon: TrendingUp, hint: 'Running portfolio recovery' },
  { key: 'daily', label: 'Daily Spline', icon: Layers, hint: 'Detailed day-by-day view' },
];

export default function CollectionTrendChart({ agg, selectedDomain }) {
  const [viewMode, setViewMode] = useState('weekly');
  const [dailyRange, setDailyRange] = useState(30);

  // 1. Filter out empty trailing zero points and sort daily data
  const validDaily = useMemo(() => {
    if (!agg?.daily) return [];
    return agg.daily.filter((d) => (d.due > 0 || d.recvd > 0));
  }, [agg?.daily]);

  // 2. Compute Weekly Rollup (smooth 7-day chunks)
  const weeklyData = useMemo(() => {
    if (validDaily.length === 0) return [];
    const weeks = [];
    let curWeek = null;
    let dayCount = 0;

    validDaily.forEach((d) => {
      if (!curWeek || dayCount >= 7) {
        curWeek = {
          startDate: d.date,
          endDate: d.date,
          due: 0,
          recvd: 0,
          cases: 0,
        };
        weeks.push(curWeek);
        dayCount = 0;
      }
      curWeek.endDate = d.date;
      curWeek.due += (d.due || 0);
      curWeek.recvd += (d.recvd || 0);
      curWeek.cases += (d.cases || 0);
      dayCount++;
    });

    return weeks.map((w, idx) => ({
      ...w,
      label: `W${idx + 1}: ${fmtDateShort(w.startDate)}`,
      fullLabel: `${fmtDateShort(w.startDate)} – ${fmtDateShort(w.endDate)}`,
      pct: w.due > 0 ? round1((w.recvd / w.due) * 100) : 0,
    }));
  }, [validDaily]);

  // 3. Compute Cumulative Trajectory
  const cumulativeData = useMemo(() => {
    if (validDaily.length === 0) return [];
    let runDue = 0;
    let runRecvd = 0;
    return validDaily.map((d) => {
      runDue += (d.due || 0);
      runRecvd += (d.recvd || 0);
      return {
        date: d.date,
        label: fmtDateShort(d.date),
        due: runDue,
        recvd: runRecvd,
        dailyDue: d.due,
        dailyRecvd: d.recvd,
        cases: d.cases,
        pct: runDue > 0 ? round1((runRecvd / runDue) * 100) : 0,
      };
    });
  }, [validDaily]);

  // 4. Compute Daily View with range slice
  const dailyData = useMemo(() => {
    const list = dailyRange === 'all' ? validDaily : validDaily.slice(-dailyRange);
    return list.map((x) => ({
      ...x,
      label: fmtDateShort(x.date),
      fullDate: x.date,
    }));
  }, [validDaily, dailyRange]);

  // Determine active dataset & metrics based on view mode
  const { chartData, totalDue, totalRecvd, avgMetric, peakItem } = useMemo(() => {
    let data = [];
    if (viewMode === 'weekly') data = weeklyData;
    else if (viewMode === 'cumulative') data = cumulativeData;
    else data = dailyData;

    let dueSum = 0;
    let recvdSum = 0;
    let peak = null;
    let maxVal = -1;

    data.forEach((item) => {
      const d = viewMode === 'cumulative' ? (item.dailyDue ?? 0) : item.due;
      const r = viewMode === 'cumulative' ? (item.dailyRecvd ?? 0) : item.recvd;
      dueSum += d;
      recvdSum += r;
      if (r > maxVal) {
        maxVal = r;
        peak = item;
      }
    });

    const avg = data.length > 0 ? recvdSum / data.length : 0;
    return {
      chartData: data,
      totalDue: dueSum,
      totalRecvd: recvdSum,
      avgMetric: avg,
      peakItem: peak,
    };
  }, [viewMode, weeklyData, cumulativeData, dailyData]);

  const recoveryPct = totalDue > 0 ? round1((totalRecvd / totalDue) * 100) : 0;

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4 transition-all">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-semibold text-slate-900 tracking-tight">
              Collection Trend &amp; Trajectory
            </h3>
            <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/60">
              {selectedDomain}
            </span>
          </div>
          <p className="text-[11.5px] text-slate-500 mt-0.5">
            {viewMode === 'weekly' && 'Weekly aggregated repayment due vs. actual collections (eliminates daily spikes)'}
            {viewMode === 'cumulative' && 'Cumulative portfolio collection S-curve closing the due recovery gap'}
            {viewMode === 'daily' && `Day-by-day collection schedule vs. recovered cash (${dailyRange === 'all' ? 'All Days' : `Last ${dailyRange} Days`})`}
          </p>
        </div>

        {/* View Switchers */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle: Weekly | Cumulative | Daily */}
          <div className="flex bg-slate-100/90 p-0.5 rounded-lg border border-slate-200/60 text-[11px]">
            {VIEW_MODES.map((mode) => {
              const Icon = mode.icon;
              const isActive = viewMode === mode.key;
              return (
                <button
                  key={mode.key}
                  type="button"
                  onClick={() => setViewMode(mode.key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={mode.hint}
                >
                  <Icon size={12} className={isActive ? 'text-[#ff4d30]' : 'text-slate-400'} />
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>

          {/* Daily Range Selector (Visible only when in Daily mode) */}
          {viewMode === 'daily' && (
            <div className="flex bg-slate-100/90 p-0.5 rounded-lg border border-slate-200/60 text-[11px] animate-fade-in">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setDailyRange(r.key)}
                  className={`px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer ${
                    dailyRange === r.key
                      ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mini Metric Strip Above Chart */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-2 px-3 bg-slate-50/70 border border-slate-100 rounded-xl text-[11.5px]">
        <div>
          <span className="text-slate-400 text-[10.5px] uppercase font-semibold">Scheduled Due</span>
          <div className="font-mono font-bold text-slate-800 text-[13px]">{fmtINR(totalDue)}</div>
        </div>
        <div>
          <span className="text-slate-400 text-[10.5px] uppercase font-semibold">Total Recovered</span>
          <div className="font-mono font-bold text-[#ff4d30] text-[13px]">{fmtINR(totalRecvd)}</div>
        </div>
        <div>
          <span className="text-slate-400 text-[10.5px] uppercase font-semibold">Recovery Rate</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="font-mono font-bold text-slate-900 text-[13px]">{recoveryPct.toFixed(2)}%</span>
            <span
              className={`text-[9.5px] font-medium px-1.5 py-0.2 rounded ${
                recoveryPct >= 25 ? 'bg-emerald-100 text-emerald-800' : recoveryPct >= 15 ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {recoveryPct >= 25 ? 'On target' : recoveryPct >= 15 ? 'Moderate' : 'Under target'}
            </span>
          </div>
        </div>
        <div>
          <span className="text-slate-400 text-[10.5px] uppercase font-semibold">Peak Collection</span>
          <div className="font-mono font-medium text-slate-700 text-[12px] truncate">
            {peakItem ? `${fmtINR(viewMode === 'cumulative' ? (peakItem.dailyRecvd ?? 0) : peakItem.recvd)} (${peakItem.label})` : '—'}
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-[255px]">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === 'weekly' ? (
            /* 1. Weekly Rollup: Composed Bar */
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="recvdWeeklyBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff5e3a" />
                  <stop offset="100%" stopColor="#ff3b30" />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
                minTickGap={20}
              />
              <YAxis
                tickFormatter={(v) => fmtINR(v)}
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />
              <Tooltip content={<TrendTooltip viewMode="weekly" />} />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 500, paddingTop: 8 }} />
              <Bar
                dataKey="due"
                name="Scheduled Due"
                fill="#e2e8f0"
                radius={[4, 4, 0, 0]}
                barSize={16}
              />
              <Bar
                dataKey="recvd"
                name="Recovered Cash"
                fill="url(#recvdWeeklyBarGrad)"
                radius={[4, 4, 0, 0]}
                barSize={16}
              />
            </ComposedChart>
          ) : viewMode === 'cumulative' ? (
            /* 2. Cumulative S-Curve: Area Chart */
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="cumulDueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="cumulRecvdGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff3b30" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#ff3b30" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                tickFormatter={(v) => fmtINR(v)}
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />
              <Tooltip content={<TrendTooltip viewMode="cumulative" />} />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 500, paddingTop: 8 }} />
              <Area
                type="monotone"
                dataKey="due"
                name="Cumulative Due Target"
                stroke="#64748b"
                strokeDasharray="4 4"
                strokeWidth={1.8}
                fill="url(#cumulDueGrad)"
              />
              <Area
                type="monotone"
                dataKey="recvd"
                name="Cumulative Recovered"
                stroke="#ff3b30"
                strokeWidth={2.4}
                fill="url(#cumulRecvdGrad)"
              />
            </AreaChart>
          ) : (
            /* 3. Daily Spline: Area with Monotone Curve */
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="dailyRecvdAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff3b30" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ff3b30" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
                minTickGap={28}
              />
              <YAxis
                tickFormatter={(v) => fmtINR(v)}
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />
              <Tooltip content={<TrendTooltip viewMode="daily" />} />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 500, paddingTop: 8 }} />
              <Area
                type="monotone"
                dataKey="due"
                name="Scheduled Due"
                stroke="#94a3b8"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                fill="none"
              />
              <Area
                type="monotone"
                dataKey="recvd"
                name="Recovered Cash"
                stroke="#ff3b30"
                strokeWidth={2.2}
                fill="url(#dailyRecvdAreaGrad)"
                dot={dailyRange <= 30 ? { r: 2.5, fill: '#ff3b30' } : false}
                activeDot={{ r: 5, fill: '#ff3b30', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TrendTooltip({ active, payload, label, viewMode }) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    const dueVal = viewMode === 'cumulative' ? (item.due ?? 0) : item.due;
    const recvdVal = viewMode === 'cumulative' ? (item.recvd ?? 0) : item.recvd;
    const pct = dueVal > 0 ? round1((recvdVal / dueVal) * 100) : 0;

    return (
      <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-xl backdrop-blur-md text-slate-800 text-[11.5px] min-w-[180px]">
        <div className="font-semibold text-slate-800 pb-1.5 mb-1.5 border-b border-slate-100 flex items-center justify-between">
          <span>{item.fullLabel || item.fullDate || label}</span>
          <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
            {pct.toFixed(1)}% Reco
          </span>
        </div>

        <div className="space-y-1 font-mono">
          <div className="flex justify-between items-center text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-slate-300" />
              <span>Due Target:</span>
            </span>
            <span className="font-semibold text-slate-800">{fmtINRFull(dueVal)}</span>
          </div>

          <div className="flex justify-between items-center text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-[#ff3b30]" />
              <span>Recovered:</span>
            </span>
            <span className="font-bold text-[#ff3b30]">{fmtINRFull(recvdVal)}</span>
          </div>

          {viewMode === 'cumulative' && item.dailyRecvd !== undefined && (
            <div className="flex justify-between items-center text-slate-400 text-[10.5px] pt-1 border-t border-slate-100">
              <span>Period Inflow:</span>
              <span>{fmtINR(item.dailyRecvd)}</span>
            </div>
          )}

          {item.cases > 0 && (
            <div className="flex justify-between items-center text-slate-400 text-[10.5px]">
              <span>Active Cases:</span>
              <span>{item.cases.toLocaleString('en-IN')}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
}
