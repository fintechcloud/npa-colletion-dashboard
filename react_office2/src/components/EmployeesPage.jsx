import { useMemo, useState, useEffect } from 'react';
import { Search, X, RotateCcw } from 'lucide-react';
import { computeEmployeeRows, fmtINR, fmtINRFull, titleCase, initials, pctBand, META, LEADERS, fmtMonth, DOMAIN_DOT_COLORS } from '../utils/data';
import { useLiveCollection } from '../context/LiveCollectionContext';
import { useDomain } from '../context/DomainContext';
import DomainSwitcher from './DomainSwitcher';

const bandClass = {
  good: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  mid: 'bg-amber-50 text-amber-700 border border-amber-200',
  low: 'bg-rose-50 text-rose-700 border border-rose-200',
};

export default function EmployeesPage({ onOpenAgent }) {
  const { liveData } = useLiveCollection();
  const { selectedDomains, clearDomain, isDomainActive, getAvailableLeaders } = useDomain();
  const [filters, setFilters] = useState({ leader: '', from: '', to: '' });
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('recvd');
  const [statusFilter, setStatusFilter] = useState('');
  const [showExact, setShowExact] = useState(false);

  // Dynamic available leaders for the selected domain
  const availableLeaders = useMemo(() => {
    return getAvailableLeaders();
  }, [getAvailableLeaders, selectedDomain]);

  // Auto-reset leader if not in available leaders for domain
  useEffect(() => {
    if (filters.leader && !availableLeaders.includes(filters.leader)) {
      setFilters((f) => ({ ...f, leader: '' }));
    }
  }, [availableLeaders, filters.leader]);

  // Active filters including domain
  const activeFilters = useMemo(() => ({
    ...filters,
    domains: Array.from(selectedDomains),
  }), [filters, selectedDomains]);

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
    let list = computeEmployeeRows(activeFilters, liveData?.byAgent || {});
    if (filters.leader) {
      list = list.filter((e) => e.leader === filters.leader || (META.agentMultiLeaders[e.name] || []).includes(filters.leader));
    }
    if (search) list = list.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter) list = list.filter((e) => pctBand(e.pct) === statusFilter);
    list.sort((a, b) => b[sortKey] - a[sortKey]);
    return list;
  }, [activeFilters, filters.leader, liveData?.byAgent, search, sortKey, statusFilter]);

  const hasActiveFilters = Boolean(isDomainActive || filters.leader || filters.from || filters.to || search || statusFilter);

  return (
    <div className="space-y-5">
      {/* 1. Multi-Domain Switcher Pill Bar */}
      <DomainSwitcher />

      {/* 2. Search and Filters */}
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
            placeholder="Search employee…"
            className="outline-none bg-transparent w-40 text-slate-800 placeholder-slate-400 text-[12px]"
          />
        </span>

        <select
          value={filters.leader}
          onChange={(e) => setFilters((f) => ({ ...f, leader: e.target.value }))}
          className="text-[12.5px] font-semibold bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-1.5 outline-none focus:border-[#ff3b30]/60 transition-all cursor-pointer shadow-xs"
        >
          <option value="" className="bg-white text-slate-800">
            All leaders {isDomainActive ? `(${availableLeaders.length})` : ''}
          </option>
          {availableLeaders.map((l) => (
            <option key={l} value={l} className="bg-white text-slate-800">
              {titleCase(l)}
            </option>
          ))}
        </select>

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
            <span>Domain: {selectedDomains.size > 0 ? Array.from(selectedDomains).join(", ") : "All Domains"}</span>
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

        {/* Active Leader Chip with remove button */}
        {filters.leader && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11.5px] font-bold shadow-2xs">
            <span>Leader: {titleCase(filters.leader)}</span>
            <button
              type="button"
              onClick={() => setFilters((f) => ({ ...f, leader: '' }))}
              className="p-0.5 hover:bg-indigo-200/70 rounded-full text-indigo-700 cursor-pointer transition-colors"
              title="Remove leader filter"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => { setFilters({ leader: '', from: '', to: '' }); setSearch(''); setStatusFilter(''); clearDomain(); }}
            className="ml-auto flex items-center gap-1 text-[12px] font-bold text-[#ff4d30] hover:text-[#e6352b] hover:underline px-2 transition-colors cursor-pointer"
            title="Reset all filters and return to overall"
          >
            <RotateCcw size={12} />
            <span>Reset to Overall</span>
          </button>
        )}
      </div>

      {/* Sort & Status Pills */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex bg-slate-100 border border-slate-200 rounded-xl p-0.5 gap-0.5">
          {[['recvd', 'Sort: Collection'], ['liveRecvd', 'Sort: Live Today'], ['pct', 'Sort: Recovery %'], ['cases', 'Sort: Cases']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setSortKey(val)}
              className={`text-[11.5px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                sortKey === val
                  ? (val === 'liveRecvd' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-xs' : 'bg-white text-slate-900 shadow-xs border border-slate-200/60')
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {val === 'liveRecvd' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1.5" />}
              {label}
            </button>
          ))}
        </div>

        <div className="flex bg-slate-100 border border-slate-200 rounded-xl p-0.5 gap-0.5">
          {[['', 'All'], ['good', 'On track (≥70%)'], ['mid', 'Review (60-70%)'], ['low', 'Below target (<60%)']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setStatusFilter(val)}
              className={`text-[11.5px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === val
                  ? 'bg-gradient-to-r from-[#ff5e3a] to-[#ff3b30] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
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

      {/* Cards Grid */}
      {rows.length === 0 ? (
        <div className="text-center py-20 text-slate-400 text-[13px] font-medium bg-white rounded-2xl border border-slate-200">
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
                className="bg-white backdrop-blur-xl border border-slate-200/90 hover:border-slate-300 rounded-2xl p-5 shadow-sm transition-all cursor-pointer group hover:-translate-y-1 hover:shadow-md"
              >
                {/* Header: Avatar, Name, Leader, Rank */}
                <div className="flex items-center gap-3 mb-3.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300 text-slate-800 font-display font-extrabold flex items-center justify-center text-[13px] shadow-xs shrink-0">
                    {initials(e.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-bold text-slate-900 group-hover:text-[#ff4d30] transition-colors truncate font-display">
                      {e.name}
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 truncate flex items-center gap-1.5 flex-wrap">
                      <span>{titleCase(e.leader)}</span>
                      <span>·</span>
                      <span className="text-slate-700 font-mono font-semibold" title={fmtINRFull(e.due)}>
                        {showExact ? fmtINRFull(e.due) : fmtINR(e.due)} due
                      </span>
                      {e.multiLeader && (
                        <span
                          className="px-1.5 py-0.2 rounded bg-amber-50 border border-amber-200 text-[9.5px] font-semibold text-amber-700"
                          title="This agent is assigned under multiple Team Leaders. Select a specific Team Leader filter above to inspect individual TL cohort matching Google Sheets."
                        >
                          Shared TL
                        </span>
                      )}
                    </div>
                  </div>
                  {i < 3 && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 border border-amber-200 font-mono shadow-xs">
                      #{i + 1}
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3.5">
                  <div
                    className={`h-full rounded-full transition-all ${
                      band === 'good'
                        ? 'bg-[#10b981]'
                        : band === 'mid'
                        ? 'bg-[#f59e0b]'
                        : 'bg-[#ef4444]'
                    }`}
                    style={{ width: `${Math.min(e.pct, 100)}%` }}
                  />
                </div>

                {/* Bottom stats: Cases, Collected, Live Today, Recovery */}
                <div className="grid grid-cols-4 gap-1.5 border-t border-slate-100 pt-3 text-left">
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
                    <div className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider font-display">Recovery</div>
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
      <div className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider font-display flex items-center gap-1">
        {live && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />}
        <span className="truncate">{label}</span>
      </div>
      <div className={`text-[12.5px] font-mono font-extrabold mt-0.5 truncate ${
        live ? 'text-emerald-700' : accent ? 'text-[#ff4d30]' : 'text-slate-900'
      }`}>
        {value}
      </div>
    </div>
  );
}