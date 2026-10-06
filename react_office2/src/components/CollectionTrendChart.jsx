import { useMemo, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { fmtINR, fmtDateShort } from '../utils/data';

const RANGES = [
  { value: 14, label: 'Last 14 Days' },
  { value: 30, label: 'Last 30 Days' },
  { value: 60, label: 'Last 60 Days' },
  { value: 'all', label: 'All Days' },
];

export default function CollectionTrendChart({ agg, selectedDomains }) {
  const [dailyRange, setDailyRange] = useState(30);

  // Filter out days without data
  const validDaily = useMemo(() => {
    if (!agg?.daily) return [];
    return agg.daily.filter((d) => (d.due > 0 || d.recvd > 0));
  }, [agg?.daily]);

  // Sliced data based on range
  const chartData = useMemo(() => {
    const list = dailyRange === 'all' ? validDaily : validDaily.slice(-dailyRange);
    return list.map((x) => ({
      ...x,
      label: fmtDateShort(x.date),
      fullDate: x.date,
    }));
  }, [validDaily, dailyRange]);

  const activeRangeLabel = RANGES.find((r) => r.value === dailyRange)?.label || 'Last 30 Days';

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3.5 transition-all">
      {/* Header Toolbar matching reference */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
        <div>
          <h3 className="text-[14px] font-semibold text-slate-900 tracking-tight">
            Daily Trajectory ({activeRangeLabel})
          </h3>
          {/* Subtle Legend */}
          <div className="flex items-center gap-3 mt-1 text-[11px] font-medium text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ff4d30]" />
              <span>Recovered Cash</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>Scheduled Due</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Cases</span>
            </span>
          </div>
        </div>

        {/* Range Selector Dropdown */}
        <div className="flex items-center gap-2">
          <select
            value={dailyRange}
            onChange={(e) => setDailyRange(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="text-[11.5px] font-medium bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200/80 text-slate-700 rounded-xl px-2.5 py-1 outline-none transition-colors cursor-pointer"
          >
            {RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Smooth Trajectory Area Chart */}
      <div className="w-full h-[270px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 12, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="recvdGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ff4d30" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#ff4d30" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="dueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10.5, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={(v) => fmtINR(v)}
              tick={{ fontSize: 10.5, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-slate-900/95 backdrop-blur-md text-white px-3 py-2 rounded-xl text-[11px] shadow-xl border border-white/10 font-sans space-y-1">
                    <div className="font-semibold text-slate-200 border-b border-white/10 pb-1">{d.fullDate || label}</div>
                    <div className="flex justify-between gap-4 text-emerald-400">
                      <span>Recovered:</span>
                      <span className="font-mono font-bold">{fmtINR(d.recvd)}</span>
                    </div>
                    <div className="flex justify-between gap-4 text-slate-300">
                      <span>Due:</span>
                      <span className="font-mono font-bold">{fmtINR(d.due)}</span>
                    </div>
                    <div className="flex justify-between gap-4 text-amber-300">
                      <span>Cases:</span>
                      <span className="font-mono font-bold">{d.cases}</span>
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="due"
              name="Due"
              stroke="#94a3b8"
              strokeWidth={1.8}
              strokeDasharray="4 4"
              fill="url(#dueGrad)"
            />
            <Area
              type="monotone"
              dataKey="recvd"
              name="Recovered"
              stroke="#ff4d30"
              strokeWidth={2.5}
              fill="url(#recvdGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
