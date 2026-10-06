import { Layers, X, RotateCcw } from 'lucide-react';
import { useDomain } from '../context/DomainContext';

export default function DomainSwitcher({ className = '' }) {
  const {
    selectedDomains,
    setSelectedDomain,
    clearDomain,
    isDomainActive,
    domainListWithCounts,
  } = useDomain();

  return (
    <div className={`bg-white border border-slate-200/70 rounded-2xl p-2 sm:p-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center gap-2 sm:gap-2.5 overflow-x-auto scroll-theme select-none ${className}`}>
      <div className="flex items-center gap-1.5 pl-1.5 text-slate-400 shrink-0 text-[11px] font-semibold uppercase tracking-wider">
        <Layers size={14} className="text-slate-500" />
        <span>Brand:</span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {domainListWithCounts.map((d) => {
          const isSelected = d.name === 'All Domains' ? selectedDomains.size === 0 : selectedDomains.has(d.name);
          return (
            <button
              key={d.name}
              type="button"
              onClick={() => setSelectedDomain(d.name)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap ${
                isSelected
                  ? 'bg-slate-900 text-white font-medium shadow-xs'
                  : 'bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              <span>{d.name}</span>
              <span
                className={`font-mono text-[10.5px] px-1.5 py-0.2 rounded-md tabular-nums ${
                  isSelected
                    ? 'bg-white/20 text-white font-medium'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {d.count.toLocaleString('en-IN')}
              </span>
              {isSelected && d.name !== 'All Domains' && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDomain(d.name);
                  }}
                  className="ml-0.5 p-0.5 hover:bg-white/20 rounded-full transition-colors"
                  aria-label="Remove domain filter"
                >
                  <X size={11} className="text-white" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Subtle, Minimal Clear Filter button */}
      {isDomainActive && (
        <button
          type="button"
          onClick={clearDomain}
          className="shrink-0 ml-auto flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 px-2.5 py-1 rounded-xl transition-all cursor-pointer"
        >
          <RotateCcw size={11} />
          <span>Clear ({selectedDomains.size > 0 ? Array.from(selectedDomains).join(", ") : "All"})</span>
        </button>
      )}
    </div>
  );
}

