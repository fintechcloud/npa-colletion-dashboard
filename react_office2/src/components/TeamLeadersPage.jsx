import { useMemo, useState } from 'react';
import { Search, ArrowUpDown } from 'lucide-react';
import { computeLeaderRows, fmtINR, titleCase, pctBand, META, fmtMonth } from '../utils/data';
import { useLiveCollection } from '../context/LiveCollectionContext';

const bandClass = {
  good: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]',
  mid: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
  low: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
};

export default function TeamLeadersPage({ onOpenLeader }) {
  const { liveData } = useLiveCollection();
  const [filters, setFilters] = useState({ from: '', to: '' });
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('recvd');
  const [sortDir, setSortDir] = useState(-1);

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
    let r = computeLeaderRows(filters, liveData?.byLeader || {});
    if (search) r = r.filter((l) => l.name.toLowerCase().includes(search.toLowerCase()));
    r = [...r].sort((a, b) => sortDir * (a[sortKey] > b[sortKey] ? 1 : -1));
    return r;
  }, [filters, liveData?.byLeader, search, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => -d);
    else { setSortKey(key); setSortDir(-1); }
  };

  const cols = [
    { key: 'name', label: 'Team Leader' },
    { key: 'agentCount', label: 'Agents' },
    { key: 'cases', label: 'Cases' },
    { key: 'due', label: 'Total Due' },
    { key: 'recvd', label: 'Total Collection' },
    { key: 'liveRecvd', label: 'Live Collection', isLive: true },
    { key: 'yday', label: 'Yesterday' },
    { key: 'pct', label: 'Recovery %' },
  ];

  const hasActiveFilters = Boolean(filters.from || filters.to || search);

  return (
    <div className="space-y-6">
      {/* Filter bar */}
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
            placeholder="Search leader…"
            className="outline-none bg-transparent w-36 text-zinc-200 placeholder-zinc-500 text-[12px]"
          />
        </span>

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
            onClick={() => { setFilters({ from: '', to: '' }); setSearch(''); }}
            className="ml-auto text-[12px] font-bold text-[#ff5533] hover:text-[#ff3b30] hover:underline px-2 transition-colors cursor-pointer"
          >
            Reset to Overall
          </button>
        )}
      </div>

      {/* Table Panel */}
      <div className="bg-[#0f111d]/45 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
        <div className="mb-5">
          <div className="text-[16px] font-bold text-white font-display tracking-tight">Team Leader Rollup</div>
          <div className="text-[12px] font-medium text-zinc-400 mt-0.5">Click any leader row to inspect individual agent assignments and performance</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="text-left text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 pb-3 pl-3 font-display">#</th>
                {cols.map((c) => (
                  <th
                    key={c.key}
                    onClick={() => toggleSort(c.key)}
                    className={`text-left text-[10.5px] font-bold uppercase tracking-wider pb-3 px-3 cursor-pointer select-none font-display transition-colors ${
                      sortKey === c.key
                        ? (c.isLive ? 'text-emerald-400' : 'text-[#ff5533]')
                        : (c.isLive ? 'text-emerald-400/80 hover:text-emerald-300' : 'text-zinc-500 hover:text-zinc-300')
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {c.isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />}
                      <span>{c.label}</span>
                      {sortKey === c.key && <ArrowUpDown size={11} className={c.isLive ? 'text-emerald-400' : 'text-[#ff5533]'} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-zinc-500 text-[13px] font-medium">
                    No team leaders match the selected filter.
                  </td>
                </tr>
              ) : (
                rows.map((l, i) => (
                  <tr
                    key={l.name}
                    onClick={() => onOpenLeader(l.name)}
                    className="cursor-pointer border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors group"
                  >
                    <td className="py-3.5 pl-3 text-zinc-500 font-mono text-[12px]">{i + 1}</td>
                    <td className="py-3.5 px-3 font-bold text-white group-hover:text-[#ff5533] transition-colors text-[13.5px]">
                      {titleCase(l.name)}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-zinc-300">{l.agentCount}</td>
                    <td className="py-3.5 px-3 font-mono text-zinc-300">{l.cases.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-3 font-mono text-zinc-400">{fmtINR(l.due)}</td>
                    <td className="py-3.5 px-3 font-mono font-bold text-white">{fmtINR(l.recvd)}</td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        <span>{fmtINR(l.liveRecvd || 0)}</span>
                      </div>
                      {l.liveCases > 0 && (
                        <div className="text-[10px] font-mono text-zinc-500 pl-3">
                          {l.liveCases} cases
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-zinc-400">{fmtINR(l.yday)}</td>
                    <td className="py-3.5 px-3">
                      <span className={`font-mono font-bold text-[11.5px] px-2.5 py-1 rounded-full ${bandClass[pctBand(l.pct)]}`}>
                        {l.pct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}