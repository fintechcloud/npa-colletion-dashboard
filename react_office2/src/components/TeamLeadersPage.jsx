import { useMemo, useState } from 'react';
import { Search, ArrowUpDown, X, RotateCcw } from 'lucide-react';
import { computeLeaderRows, fmtINR, fmtINRFull, titleCase, pctBand, META, fmtMonth } from '../utils/data';
import { useLiveCollection } from '../context/LiveCollectionContext';
import { useDomain } from '../context/DomainContext';
import DomainSwitcher from './DomainSwitcher';

const bandClass = {
  good: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  mid: 'bg-amber-50 text-amber-700 border border-amber-200',
  low: 'bg-rose-50 text-rose-700 border border-rose-200',
};

export default function TeamLeadersPage({ onOpenLeader }) {
  const { liveData } = useLiveCollection();
  const { selectedDomain, clearDomain, isDomainActive } = useDomain();
  const [filters, setFilters] = useState({ from: '', to: '' });
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('recvd');
  const [sortDir, setSortDir] = useState(-1);
  const [showExact, setShowExact] = useState(false);

  // Active filters including domain
  const activeFilters = useMemo(() => ({
    ...filters,
    domain: selectedDomain === 'All Domains' ? '' : selectedDomain,
  }), [filters, selectedDomain]);

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
    let r = computeLeaderRows(activeFilters, liveData?.byLeader || {});
    if (search) r = r.filter((l) => l.name.toLowerCase().includes(search.toLowerCase()));
    r = [...r].sort((a, b) => sortDir * (a[sortKey] > b[sortKey] ? 1 : -1));
    return r;
  }, [activeFilters, liveData?.byLeader, search, sortKey, sortDir]);

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

  const hasActiveFilters = Boolean(isDomainActive || filters.from || filters.to || search);

  return (
    <div className="space-y-6">
      {/* 1. Multi-Domain Switcher Pill Bar */}
      <DomainSwitcher />

      {/* 2. Filter bar */}
      <div className="bg-white/85 backdrop-blur-xl border border-slate-200/90 rounded-2xl px-4 py-3 flex items-center gap-3 flex-wrap shadow-sm">
        {/* Period Segmented Control: Overall vs Current Month */}
        <div className="flex bg-slate-100 border border-slate-200 rounded-xl p-0.5 gap-0.5 shadow-inner">
          <button
            type="button"
            onClick={() => selectPeriod('overall')}
            className={`flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activePeriod === 'overall'
                ? 'bg-gradient-to-r from-[#ff5e3a] to-[#ff3b30] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Overall</span>
          </button>

          <button
            type="button"
            onClick={() => selectPeriod('current-month')}
            className={`flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activePeriod === 'current-month'
                ? 'bg-gradient-to-r from-[#ff5e3a] to-[#ff3b30] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Current Month</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                activePeriod === 'current-month' ? 'bg-black/20 text-white' : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              {monthName}
            </span>
          </button>
        </div>

        <div className="h-5 w-[1px] bg-slate-200 hidden sm:block" />

        <span className="flex items-center gap-2 text-[12.5px] font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 transition-all shadow-xs">
          <Search size={14} className="text-[#ff4d30]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leader…"
            className="outline-none bg-transparent w-36 text-slate-800 placeholder-slate-400 text-[12px]"
          />
        </span>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            className={`text-[12px] font-semibold bg-white hover:bg-slate-50 border rounded-xl px-3 py-1.5 outline-none focus:border-[#ff3b30]/60 transition-all cursor-pointer shadow-xs ${
              activePeriod === 'custom' ? 'border-[#ff3b30]/50 text-slate-900' : 'border-slate-200 text-slate-700'
            }`}
          />
          <span className="text-[12px] text-slate-400 font-medium">to</span>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            className={`text-[12px] font-semibold bg-white hover:bg-slate-50 border rounded-xl px-3 py-1.5 outline-none focus:border-[#ff3b30]/60 transition-all cursor-pointer shadow-xs ${
              activePeriod === 'custom' ? 'border-[#ff3b30]/50 text-slate-900' : 'border-slate-200 text-slate-700'
            }`}
          />
        </div>

        {/* Active Domain Chip with remove button */}
        {isDomainActive && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-orange-50 border border-orange-200 text-[#ff4d30] text-[11.5px] font-bold shadow-2xs">
            <span>Domain: {selectedDomain}</span>
            <button
              type="button"
              onClick={clearDomain}
              className="p-0.5 hover:bg-orange-200/70 rounded-full text-[#ff4d30] cursor-pointer transition-colors"
              title="Remove domain filter"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => { setFilters({ from: '', to: '' }); setSearch(''); clearDomain(); }}
            className="ml-auto flex items-center gap-1 text-[12px] font-bold text-[#ff4d30] hover:text-[#e6352b] hover:underline px-2 transition-colors cursor-pointer"
            title="Reset all filters and return to overall"
          >
            <RotateCcw size={12} />
            <span>Reset to Overall</span>
          </button>
        )}
      </div>

      {/* Table Panel */}
      <div className="bg-white backdrop-blur-xl border border-slate-200/90 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <div className="text-[16px] font-bold text-slate-900 font-display tracking-tight flex items-center gap-2">
              <span>Team Leader Rollup</span>
              {isDomainActive && (
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-orange-50 text-[#ff4d30] border border-orange-200">
                  {selectedDomain}
                </span>
              )}
            </div>
            <div className="text-[12px] font-medium text-slate-500 mt-0.5">Click any leader row to inspect individual agent assignments and performance</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-display">Format:</span>
            <div className="flex bg-slate-100 border border-slate-200 rounded-xl p-0.5 gap-0.5 shadow-inner">
              <button
                type="button"
                onClick={() => setShowExact(false)}
                className={`text-[11.5px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  !showExact
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Compact (L/Cr)
              </button>
              <button
                type="button"
                onClick={() => setShowExact(true)}
                className={`text-[11.5px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  showExact
                    ? 'bg-gradient-to-r from-[#ff5e3a] to-[#ff3b30] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ₹ Exact Rupees (Sheet Match)
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left text-[10.5px] font-bold uppercase tracking-wider text-slate-400 pb-3 pl-3 font-display">#</th>
                {cols.map((c) => (
                  <th
                    key={c.key}
                    onClick={() => toggleSort(c.key)}
                    className={`text-left text-[10.5px] font-bold uppercase tracking-wider pb-3 px-3 cursor-pointer select-none font-display transition-colors ${
                      sortKey === c.key
                        ? (c.isLive ? 'text-emerald-700' : 'text-[#ff4d30]')
                        : (c.isLive ? 'text-emerald-600 hover:text-emerald-700' : 'text-slate-400 hover:text-slate-700')
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {c.isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />}
                      <span>{c.label}</span>
                      {sortKey === c.key && <ArrowUpDown size={11} className={c.isLive ? 'text-emerald-600' : 'text-[#ff4d30]'} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400 text-[13px] font-medium">
                    No team leaders match the selected filter.
                  </td>
                </tr>
              ) : (
                rows.map((l, i) => (
                  <tr
                    key={l.name}
                    onClick={() => onOpenLeader(l.name)}
                    className="cursor-pointer border-b border-slate-100 hover:bg-slate-50/80 transition-colors group"
                  >
                    <td className="py-3.5 pl-3 text-slate-400 font-mono text-[12px]">{i + 1}</td>
                    <td className="py-3.5 px-3 font-bold text-slate-900 group-hover:text-[#ff4d30] transition-colors text-[13.5px]">
                      {titleCase(l.name)}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-slate-600">{l.agentCount}</td>
                    <td className="py-3.5 px-3 font-mono text-slate-600">{l.cases.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-3 font-mono text-slate-500" title={fmtINRFull(l.due)}>
                      {showExact ? fmtINRFull(l.due) : fmtINR(l.due)}
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-slate-900" title={fmtINRFull(l.recvd)}>
                      {showExact ? fmtINRFull(l.recvd) : fmtINR(l.recvd)}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-700" title={fmtINRFull(l.liveRecvd || 0)}>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        <span>{showExact ? fmtINRFull(l.liveRecvd || 0) : fmtINR(l.liveRecvd || 0)}</span>
                      </div>
                      {l.liveCases > 0 && (
                        <div className="text-[10px] font-mono text-slate-400 pl-3">
                          {l.liveCases} cases
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-slate-500" title={fmtINRFull(l.yday)}>
                      {showExact ? fmtINRFull(l.yday) : fmtINR(l.yday)}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`font-mono font-bold text-[11.5px] px-2.5 py-1 rounded-full ${bandClass[pctBand(l.pct)]}`}>
                        {l.pct.toFixed(2)}%
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