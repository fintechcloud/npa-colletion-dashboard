import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { computeEmployeeRows, fmtINR, fmtINRFull, titleCase, initials, pctBand, META, LEADERS, fmtMonth } from '../utils/data';
import { useLiveCollection } from '../context/LiveCollectionContext';

const bandClass = {
  good: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]',
  mid: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
  low: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
};

export default function EmployeesPage({ onOpenAgent }) {
  const { liveData } = useLiveCollection();
  const [filters, setFilters] = useState({ leader: '', from: '', to: '' });
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('recvd');
  const [statusFilter, setStatusFilter] = useState('');
  const [showExact, setShowExact] = useState(false);

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
      setFilters((f) => ({ ...f, from: '', to: '' }));
    } else if (mode === 'current-month') {
      setFilters((f) => ({ ...f, from: thisMonthFrom, to: thisMonthTo }));
    }
  };

  const rows = useMemo(() => {
    let list = computeEmployeeRows(filters, liveData?.byAgent || {});
    if (filters.leader) {
      list = list.filter((e) => e.leader === filters.leader || (META.agentMultiLeaders[e.name] || []).includes(filters.leader));
    }
    if (search) list = list.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter) list = list.filter((e) => pctBand(e.pct) === statusFilter);
    list.sort((a, b) => b[sortKey] - a[sortKey]);
    return list;
  }, [filters, liveData?.byAgent, search, sortKey, statusFilter]);

  const hasActiveFilters = Boolean(filters.leader || filters.from || filters.to || search || statusFilter);

  return (
    <div className="space-y-5">
      {/* Search and Filters */}
      <div className="bg-[#0f111d]/45 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3 flex-wrap shadow-xl">
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

        <span className="flex items-center gap-2 text-[12.5px] font-semibold text-zinc-300 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] rounded-xl px-3 py-1.5 transition-all">
          <Search size={14} className="text-[#ff5533]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee…"
            className="outline-none bg-transparent w-40 text-zinc-200 placeholder-zinc-500 text-[12px]"
          />
        </span>

        <select
          value={filters.leader}
          onChange={(e) => setFilters((f) => ({ ...f, leader: e.target.value }))}
          className="text-[12.5px] font-semibold bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] text-zinc-200 rounded-xl px-3 py-1.5 outline-none focus:border-[#ff3b30]/60 transition-all cursor-pointer"
        >
          <option value="" className="bg-[#12131a] text-zinc-200">All leaders</option>
          {LEADERS.map((l) => (
            <option key={l} value={l} className="bg-[#12131a] text-zinc-200">
              {titleCase(l)}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            className={`text-[12px] font-semibold bg-white/[0.04] hover:bg-white/[0.07] border rounded-xl px-3 py-1.5 outline-none focus:border-[#ff3b30]/60 transition-all cursor-pointer ${
              activePeriod === 'custom' ? 'border-[#ff3b30]/50 text-white' : 'border-white/[0.08] text-zinc-200'
            }`}
          />
          <span className="text-[12px] text-zinc-500 font-medium">to</span>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            className={`text-[12px] font-semibold bg-white/[0.04] hover:bg-white/[0.07] border rounded-xl px-3 py-1.5 outline-none focus:border-[#ff3b30]/60 transition-all cursor-pointer ${
              activePeriod === 'custom' ? 'border-[#ff3b30]/50 text-white' : 'border-white/[0.08] text-zinc-200'
            }`}
          />
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => { setFilters({ leader: '', from: '', to: '' }); setSearch(''); setStatusFilter(''); }}
            className="ml-auto text-[12px] font-bold text-[#ff5533] hover:text-[#ff3b30] hover:underline px-2 transition-colors cursor-pointer"
          >
            Reset to Overall
          </button>
        )}
      </div>

      {/* Sort & Status Pills */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex bg-black/50 border border-white/[0.06] rounded-xl p-0.5 gap-0.5">
          {[['recvd', 'Sort: Collection'], ['liveRecvd', 'Sort: Live Today'], ['pct', 'Sort: Recovery %'], ['cases', 'Sort: Cases']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setSortKey(val)}
              className={`text-[11.5px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                sortKey === val
                  ? (val === 'liveRecvd' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/[0.12] text-white shadow-sm border border-white/[0.08]')
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {val === 'liveRecvd' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5" />}
              {label}
            </button>
          ))}
        </div>

        <div className="flex bg-black/50 border border-white/[0.06] rounded-xl p-0.5 gap-0.5">
          {[['', 'All'], ['good', 'On track (≥70%)'], ['mid', 'Review (60-70%)'], ['low', 'Below target (<60%)']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setStatusFilter(val)}
              className={`text-[11.5px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === val
                  ? 'bg-gradient-to-r from-[#ff5e3a] to-[#ff3b30] text-white shadow-[0_0_12px_rgba(255,59,48,0.35)]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-display">Format:</span>
          <div className="flex bg-black/40 border border-white/[0.08] rounded-xl p-0.5 gap-0.5 shadow-inner">
            <button
              type="button"
              onClick={() => setShowExact(false)}
              className={`text-[11.5px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                !showExact
                  ? 'bg-white/[0.12] text-white shadow-sm border border-white/[0.08]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Compact (L/Cr)
            </button>
            <button
              type="button"
              onClick={() => setShowExact(true)}
              className={`text-[11.5px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                showExact
                  ? 'bg-gradient-to-r from-[#ff5e3a] to-[#ff3b30] text-white shadow-[0_0_12px_rgba(255,59,48,0.35)]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              ₹ Exact Rupees (Sheet Match)
            </button>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      {rows.length === 0 ? (
        <div className="text-center py-20 text-zinc-500 text-[13px] font-medium bg-[#12131a]/50 rounded-2xl border border-white/[0.05]">
          No collection agents match this filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((e, i) => {
            const band = pctBand(e.pct);
            return (
              <div
                key={e.name}
                onClick={() => onOpenAgent(e.name)}
                className="bg-[#0f111d]/45 backdrop-blur-xl border border-white/10 hover:border-white/[0.15] rounded-2xl p-5 shadow-xl transition-all cursor-pointer group hover:-translate-y-1 hover:shadow-2xl"
              >
                {/* Header: Avatar, Name, Leader, Rank */}
                <div className="flex items-center gap-3 mb-3.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-800 border border-white/10 text-white font-display font-extrabold flex items-center justify-center text-[13px] shadow-sm shrink-0">
                    {initials(e.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-bold text-white group-hover:text-[#ff5533] transition-colors truncate font-display">
                      {e.name}
                    </div>
                    <div className="text-[11px] font-medium text-zinc-400 truncate flex items-center gap-1.5 flex-wrap">
                      <span>{titleCase(e.leader)}</span>
                      <span>·</span>
                      <span className="text-zinc-300 font-mono" title={fmtINRFull(e.due)}>
                        {showExact ? fmtINRFull(e.due) : fmtINR(e.due)} due
                      </span>
                      {e.multiLeader && (
                        <span
                          className="px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-[9.5px] font-semibold text-amber-300"
                          title="This agent is assigned under multiple Team Leaders. Select a specific Team Leader filter above to inspect individual TL cohort matching Google Sheets."
                        >
                          Shared TL
                        </span>
                      )}
                    </div>
                  </div>
                  {i < 3 && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/30 font-mono shadow-[0_0_8px_rgba(245,158,11,0.25)]">
                      #{i + 1}
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden mb-3.5">
                  <div
                    className={`h-full rounded-full transition-all ${
                      band === 'good'
                        ? 'bg-[#10b981] shadow-[0_0_8px_#10b981]'
                        : band === 'mid'
                        ? 'bg-[#f59e0b] shadow-[0_0_8px_#f59e0b]'
                        : 'bg-[#ef4444] shadow-[0_0_8px_#ef4444]'
                    }`}
                    style={{ width: `${Math.min(e.pct, 100)}%` }}
                  />
                </div>

                {/* Bottom stats: Cases, Collected, Live Today, Recovery */}
                <div className="grid grid-cols-4 gap-1.5 border-t border-white/[0.06] pt-3 text-left">
                  <MiniStat label="Cases" value={e.cases} />
                  <MiniStat
                    label="Collected"
                    value={showExact ? fmtINRFull(e.recvd) : fmtINR(e.recvd)}
                    title={fmtINRFull(e.recvd)}
                  />
                  <MiniStat
                    label="Live Today"
                    value={showExact ? fmtINRFull(e.liveRecvd || 0) : fmtINR(e.liveRecvd || 0)}
                    title={fmtINRFull(e.liveRecvd || 0)}
                    live
                  />
                  <div className="text-right">
                    <div className="text-[9.5px] font-bold text-zinc-500 uppercase tracking-wider font-display">Recovery</div>
                    <span className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded-full inline-block mt-1 ${bandClass[band]}`}>
                      {e.pct.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, accent, live, title }) {
  return (
    <div className="min-w-0" title={title}>
      <div className="text-[9.5px] font-bold text-zinc-500 uppercase tracking-wider font-display flex items-center gap-1">
        {live && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />}
        <span className="truncate">{label}</span>
      </div>
      <div className={`text-[12.5px] font-mono font-extrabold mt-0.5 truncate ${
        live ? 'text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.3)]' : accent ? 'text-[#ff5533]' : 'text-white'
      }`}>
        {value}
      </div>
    </div>
  );
}