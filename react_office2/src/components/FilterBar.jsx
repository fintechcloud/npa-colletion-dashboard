import { useMemo } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { LEADERS, AGENTS, META, titleCase, fmtMonth } from '../utils/data';

export default function FilterBar({ filters, setFilters, showAgent = true, showType = true }) {
  const update = (patch) => setFilters((f) => ({ ...f, ...patch }));

  // Month date range boundaries from dataset
  const latestMonthStr = useMemo(() => (META.dateMax ? META.dateMax.slice(0, 7) : '2026-07'), []);
  const thisMonthFrom = useMemo(() => `${latestMonthStr}-01`, [latestMonthStr]);
  const thisMonthTo = useMemo(() => META.dateMax || `${latestMonthStr}-31`, [latestMonthStr]);
  const monthName = useMemo(() => {
    const full = fmtMonth(latestMonthStr);
    return full.split(' ')[0];
  }, [latestMonthStr]);

  // Active period preset: 'overall' | 'current-month' | 'custom'
  const activePeriod = useMemo(() => {
    if (!filters.from && !filters.to) return 'overall';
    if (filters.from === thisMonthFrom && filters.to === thisMonthTo) return 'current-month';
    return 'custom';
  }, [filters.from, filters.to, thisMonthFrom, thisMonthTo]);

  const selectPeriod = (mode) => {
    if (mode === 'overall') {
      update({ from: '', to: '' });
    } else if (mode === 'current-month') {
      update({ from: thisMonthFrom, to: thisMonthTo });
    }
  };

  const clear = () => setFilters({ leader: '', agent: '', type: '', from: '', to: '' });

  const hasActiveFilters = Boolean(
    filters.leader || filters.agent || filters.type || filters.from || filters.to
  );

  return (
    <div className="bg-[#0f111d]/45 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 mb-6 flex items-center gap-3 flex-wrap shadow-xl">
      <span className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-display">
        <SlidersHorizontal size={14} className="text-[#ff5533]" />
        <span>Filters</span>
      </span>

      {/* Period Segmented Control: Overall vs Current Month */}
      <div className="flex bg-black/40 border border-white/[0.08] rounded-xl p-0.5 gap-0.5 shadow-inner">
        <button
          type="button"
          onClick={() => selectPeriod('overall')}
          className={`flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
            activePeriod === 'overall'
              ? 'bg-gradient-to-r from-[#ff5e3a] to-[#ff3b30] text-white shadow-[0_0_12px_rgba(255,59,48,0.35)]'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span>Overall</span>
        </button>

        <button
          type="button"
          onClick={() => selectPeriod('current-month')}
          className={`flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
            activePeriod === 'current-month'
              ? 'bg-gradient-to-r from-[#ff5e3a] to-[#ff3b30] text-white shadow-[0_0_12px_rgba(255,59,48,0.35)]'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span>Current Month</span>
          <span
            className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
              activePeriod === 'current-month' ? 'bg-black/30 text-white' : 'bg-white/[0.08] text-zinc-400'
            }`}
          >
            {monthName}
          </span>
        </button>
      </div>

      <div className="h-5 w-[1px] bg-white/[0.08] hidden sm:block" />

      {/* Leader select */}
      <select
        value={filters.leader}
        onChange={(e) => update({ leader: e.target.value })}
        className="text-[12.5px] font-semibold bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] text-zinc-200 rounded-xl px-3 py-1.5 outline-none focus:border-[#ff3b30]/60 transition-all cursor-pointer"
      >
        <option value="" className="bg-[#12131a] text-zinc-200">All leaders</option>
        {LEADERS.map((l) => (
          <option key={l} value={l} className="bg-[#12131a] text-zinc-200">
            {titleCase(l)}
          </option>
        ))}
      </select>

      {/* Agent select */}
      {showAgent && (
        <select
          value={filters.agent}
          onChange={(e) => update({ agent: e.target.value })}
          className="text-[12.5px] font-semibold bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] text-zinc-200 rounded-xl px-3 py-1.5 outline-none focus:border-[#ff3b30]/60 transition-all cursor-pointer max-w-[200px]"
        >
          <option value="" className="bg-[#12131a] text-zinc-200">All employees</option>
          {AGENTS.map((a) => (
            <option key={a} value={a} className="bg-[#12131a] text-zinc-200">
              {a}
            </option>
          ))}
        </select>
      )}

      {/* Segmented Type filter */}
      {showType && (
        <div className="flex bg-black/40 border border-white/[0.06] rounded-xl p-0.5 gap-0.5">
          {[['', 'All'], ['NEW', 'New'], ['REPEAT', 'Repeat']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => update({ type: val })}
              className={`text-[12px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filters.type === val
                  ? 'bg-white/[0.12] text-white shadow-sm border border-white/[0.08]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="h-5 w-[1px] bg-white/[0.08] hidden sm:block" />

      {/* Date range inputs */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={filters.from}
          onChange={(e) => update({ from: e.target.value })}
          className={`text-[12px] font-semibold bg-white/[0.04] hover:bg-white/[0.07] border rounded-xl px-3 py-1.5 outline-none focus:border-[#ff3b30]/60 transition-all cursor-pointer ${
            activePeriod === 'custom' ? 'border-[#ff3b30]/50 text-white' : 'border-white/[0.08] text-zinc-200'
          }`}
        />
        <span className="text-[12px] text-zinc-500 font-medium">to</span>
        <input
          type="date"
          value={filters.to}
          onChange={(e) => update({ to: e.target.value })}
          className={`text-[12px] font-semibold bg-white/[0.04] hover:bg-white/[0.07] border rounded-xl px-3 py-1.5 outline-none focus:border-[#ff3b30]/60 transition-all cursor-pointer ${
            activePeriod === 'custom' ? 'border-[#ff3b30]/50 text-white' : 'border-white/[0.08] text-zinc-200'
          }`}
        />
      </div>

      {/* Clear action */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={clear}
          className="ml-auto text-[12px] font-bold text-[#ff5533] hover:text-[#ff3b30] hover:underline px-2 transition-colors cursor-pointer"
        >
          Reset to Overall
        </button>
      )}
    </div>
  );
}