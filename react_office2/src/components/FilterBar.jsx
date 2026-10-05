import { useMemo, useEffect } from 'react';
import { SlidersHorizontal, X, RotateCcw } from 'lucide-react';
import { META, titleCase, fmtMonth } from '../utils/data';
import { useDomain } from '../context/DomainContext';

export default function FilterBar({ filters, setFilters, showAgent = true, showType = true }) {
  const update = (patch) => setFilters((f) => ({ ...f, ...patch }));

  const {
    selectedDomain,
    clearDomain,
    isDomainActive,
    getAvailableLeaders,
    getAvailableAgents,
  } = useDomain();

  // Dynamic available leaders for the selected domain
  const availableLeaders = useMemo(() => {
    return getAvailableLeaders(selectedDomain);
  }, [getAvailableLeaders, selectedDomain]);

  // Dynamic available agents for the selected domain & leader
  const availableAgents = useMemo(() => {
    return getAvailableAgents(selectedDomain, filters.leader);
  }, [getAvailableAgents, selectedDomain, filters.leader]);

  // Auto-reset leader if not in available leaders for domain
  useEffect(() => {
    if (filters.leader && !availableLeaders.includes(filters.leader)) {
      update({ leader: '', agent: '' });
    }
  }, [availableLeaders, filters.leader]);

  // Auto-reset agent if not in available agents for domain/leader
  useEffect(() => {
    if (filters.agent && !availableAgents.includes(filters.agent)) {
      update({ agent: '' });
    }
  }, [availableAgents, filters.agent]);

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

  const clear = () => {
    setFilters({ leader: '', agent: '', type: '', from: '', to: '' });
    clearDomain();
  };

  const hasActiveFilters = Boolean(
    isDomainActive || filters.leader || filters.agent || filters.type || filters.from || filters.to
  );

  return (
    <div className="bg-white border border-slate-200/70 rounded-2xl px-3.5 py-2.5 mb-5 flex items-center gap-2.5 sm:gap-3 flex-wrap shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
        <SlidersHorizontal size={13} className="text-slate-500" />
        <span>Filters</span>
      </span>

      {/* Period Segmented Control: Overall vs Current Month */}
      <div className="flex bg-slate-100/90 border border-slate-200/60 rounded-xl p-0.5 gap-0.5 text-[11.5px]">
        <button
          type="button"
          onClick={() => selectPeriod('overall')}
          className={`flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
            activePeriod === 'overall'
              ? 'bg-white text-slate-900 shadow-2xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Overall</span>
        </button>

        <button
          type="button"
          onClick={() => selectPeriod('current-month')}
          className={`flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
            activePeriod === 'current-month'
              ? 'bg-white text-slate-900 shadow-2xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Current Month</span>
          <span
            className={`text-[9.5px] font-mono px-1 py-0.2 rounded font-medium ${
              activePeriod === 'current-month' ? 'bg-slate-100 text-slate-700' : 'bg-white/80 text-slate-500 border border-slate-200/60'
            }`}
          >
            {monthName}
          </span>
        </button>
      </div>

      <div className="h-4 w-[1px] bg-slate-200 hidden sm:block" />

      {/* Leader select (dynamically narrowed by selected domain) */}
      <select
        value={filters.leader}
        onChange={(e) => update({ leader: e.target.value, agent: '' })}
        className="text-[12px] font-medium bg-white hover:bg-slate-50/80 border border-slate-200/80 text-slate-700 rounded-xl px-2.5 py-1.5 outline-none focus:border-slate-400 transition-all cursor-pointer"
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

      {/* Agent select (dynamically narrowed by selected domain & leader) */}
      {showAgent && (
        <select
          value={filters.agent}
          onChange={(e) => update({ agent: e.target.value })}
          className="text-[12px] font-medium bg-white hover:bg-slate-50/80 border border-slate-200/80 text-slate-700 rounded-xl px-2.5 py-1.5 outline-none focus:border-slate-400 transition-all cursor-pointer max-w-[200px]"
        >
          <option value="" className="bg-white text-slate-800">
            All employees {isDomainActive || filters.leader ? `(${availableAgents.length})` : ''}
          </option>
          {availableAgents.map((a) => (
            <option key={a} value={a} className="bg-white text-slate-800">
              {a}
            </option>
          ))}
        </select>
      )}

      {/* Segmented Type filter */}
      {showType && (
        <div className="flex bg-slate-100/90 border border-slate-200/60 rounded-xl p-0.5 gap-0.5 text-[11.5px]">
          {[['', 'All'], ['NEW', 'New'], ['REPEAT', 'Repeat']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => update({ type: val })}
              className={`font-medium px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filters.type === val
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="h-4 w-[1px] bg-slate-200 hidden sm:block" />

      {/* Date range inputs */}
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={filters.from}
          onChange={(e) => update({ from: e.target.value })}
          className={`text-[11.5px] font-medium bg-white hover:bg-slate-50/80 border rounded-xl px-2.5 py-1 outline-none focus:border-slate-400 transition-all cursor-pointer ${
            activePeriod === 'custom' ? 'border-slate-400 text-slate-900' : 'border-slate-200/80 text-slate-600'
          }`}
        />
        <span className="text-[11px] text-slate-400 font-normal">to</span>
        <input
          type="date"
          value={filters.to}
          onChange={(e) => update({ to: e.target.value })}
          className={`text-[11.5px] font-medium bg-white hover:bg-slate-50/80 border rounded-xl px-2.5 py-1 outline-none focus:border-slate-400 transition-all cursor-pointer ${
            activePeriod === 'custom' ? 'border-slate-400 text-slate-900' : 'border-slate-200/80 text-slate-600'
          }`}
        />
      </div>

      {/* Active Domain Chip with remove button */}
      {isDomainActive && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200/80 text-slate-700 text-[11px] font-medium">
          <span>Brand: <strong className="text-slate-900 font-semibold">{selectedDomain}</strong></span>
          <button
            type="button"
            onClick={clearDomain}
            className="p-0.5 hover:bg-slate-200 rounded-full text-slate-500 hover:text-slate-800 cursor-pointer transition-colors"
            aria-label="Remove domain filter"
          >
            <X size={11} />
          </button>
        </div>
      )}

      {/* Active Leader Chip with remove button */}
      {filters.leader && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200/80 text-slate-700 text-[11px] font-medium">
          <span>Leader: <strong className="text-slate-900 font-semibold">{titleCase(filters.leader)}</strong></span>
          <button
            type="button"
            onClick={() => update({ leader: '', agent: '' })}
            className="p-0.5 hover:bg-slate-200 rounded-full text-slate-500 hover:text-slate-800 cursor-pointer transition-colors"
            aria-label="Remove leader filter"
          >
            <X size={11} />
          </button>
        </div>
      )}

      {/* Active Agent Chip with remove button */}
      {filters.agent && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200/80 text-slate-700 text-[11px] font-medium">
          <span>Agent: <strong className="text-slate-900 font-semibold">{filters.agent}</strong></span>
          <button
            type="button"
            onClick={() => update({ agent: '' })}
            className="p-0.5 hover:bg-slate-200 rounded-full text-slate-500 hover:text-slate-800 cursor-pointer transition-colors"
            aria-label="Remove agent filter"
          >
            <X size={11} />
          </button>
        </div>
      )}

      {/* Clear all action */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={clear}
          className="ml-auto flex items-center gap-1 text-[11.5px] font-medium text-slate-500 hover:text-slate-900 px-2 transition-colors cursor-pointer"
        >
          <RotateCcw size={11} />
          <span>Reset</span>
        </button>
      )}
    </div>
  );
}