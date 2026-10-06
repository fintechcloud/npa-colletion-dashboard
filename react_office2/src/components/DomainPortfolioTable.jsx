import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useDomain } from '../context/DomainContext';
import { useLiveCollection } from '../context/LiveCollectionContext';
import { CASES, DOMAINS, fmtINR, fmtINRFull, round1 } from '../utils/data';

const DOMAIN_DOT_COLORS = {
  'Salary4Sure': 'bg-[#f97316]',
  'SALARY ADDA': 'bg-[#6366f1]',
  'Snap Paisa': 'bg-[#10b981]',
  'Minutes Loan': 'bg-[#f59e0b]',
  'Fast salary': 'bg-[#8b5cf6]',
  'DHANVARSHAA': 'bg-[#ec4899]',
  'Salary Setu': 'bg-[#06b6d4]',
  'Jhatpat Cash': 'bg-[#14b8a6]',
  'F1SPEEDLOAN': 'bg-[#3b82f6]',
  'All Domains': 'bg-slate-400',
};

export default function DomainPortfolioTable() {
  const { selectedDomains, toggleDomain, clearDomain, isDomainActive } = useDomain();
  const { dataRevision } = useLiveCollection();

  const [search, setSearch] = useState('');
  const [showExact, setShowExact] = useState(false);

  // Compute live aggregates per domain from CASES
  const rows = useMemo(() => {
    const map = {};
    DOMAINS.forEach((name, idx) => {
      map[idx] = {
        name,
        cases: 0,
        due: 0,
        recvd: 0,
        principal: 0,
      };
    });

    for (const r of CASES) {
      const dI = r[8];
      if (dI !== undefined && map[dI]) {
        map[dI].cases++;
        map[dI].due += (r[5] || 0);
        map[dI].recvd += (r[6] || 0);
        map[dI].principal += (r[9] || 0);
      }
    }

    return Object.values(map).map((d) => {
      const remaining = Math.max(0, d.due - d.recvd);
      const pct = d.due ? round1((d.recvd / d.due) * 100) : 0;
      return {
        ...d,
        remaining,
        pct,
      };
    });
  }, [dataRevision, CASES.length, DOMAINS]);

  // Consolidated All-Domains row
  const allDomainsRow = useMemo(() => {
    let cases = 0;
    let due = 0;
    let recvd = 0;
    let principal = 0;

    rows.forEach((d) => {
      cases += d.cases;
      due += d.due;
      recvd += d.recvd;
      principal += d.principal;
    });

    return {
      name: 'All Domains (Consolidated)',
      cases,
      due,
      remaining: Math.max(0, due - recvd),
      recvd,
      principal,
      pct: due ? round1((recvd / due) * 100) : 0,
    };
  }, [rows]);

  // Filtered rows by search term
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [rows, search]);

  const formatMoney = (val) => (showExact ? fmtINRFull(val) : fmtINR(val));

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3.5 transition-all">
      {/* Header matching reference image */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] font-semibold text-slate-900 tracking-tight">
            Portfolio by Brand
          </h3>
          <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/60">
            {rows.length} brands
          </span>
          {isDomainActive && (
            <button
              type="button"
              onClick={clearDomain}
              className="inline-flex items-center gap-1 text-[10.5px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200/80 px-2 py-0.5 rounded-full border border-slate-200 transition-colors"
            >
              <span>Clear Filter</span>
              <X size={10} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Exact / Rounded Toggle */}
          <div className="flex bg-slate-100/90 p-0.5 rounded-lg border border-slate-200/60 text-[11px]">
            <button
              type="button"
              onClick={() => setShowExact(false)}
              className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                !showExact ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Compact
            </button>
            <button
              type="button"
              onClick={() => setShowExact(true)}
              className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                showExact ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Full ₹
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 pr-2.5 py-1 text-[11.5px] bg-slate-100/90 hover:bg-slate-200/60 focus:bg-white border border-slate-200/60 rounded-xl outline-none focus:border-slate-400 transition-all w-[110px] sm:w-[130px]"
            />
          </div>
        </div>
      </div>

      {/* Clean Table matching reference image */}
      <div className="overflow-x-auto scroll-theme">
        <table className="w-full text-left border-collapse text-[11.5px]">
          <thead>
            <tr className="border-b border-slate-100 text-[10.5px] uppercase tracking-wider font-semibold text-slate-400">
              <th className="py-2 px-2.5">Domain / Brand</th>
              <th className="py-2 px-2.5 text-right">Cases</th>
              <th className="py-2 px-2.5 text-right">Total Due</th>
              <th className="py-2 px-2.5 text-right">Remaining</th>
              <th className="py-2 px-2.5 text-right">Collected</th>
              <th className="py-2 px-2.5 text-right">Disbursed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/80">
            {/* All Domains Consolidated Row */}
            <tr
              onClick={clearDomain}
              className={`cursor-pointer transition-colors ${
                selectedDomains.size === 0 ? 'bg-slate-50/90 font-medium' : 'hover:bg-slate-50/60'
              }`}
            >
              <td className="py-2.5 px-2.5 whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-900 shrink-0" />
                  <span className="font-semibold text-slate-900 text-[12px]">All Domains</span>
                  <span className="text-[9.5px] font-medium px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">All</span>
                </div>
              </td>
              <td className="py-2.5 px-2.5 text-right font-mono text-slate-600 tabular-nums">
                {allDomainsRow.cases.toLocaleString('en-IN')}
              </td>
              <td className="py-2.5 px-2.5 text-right font-mono font-semibold text-slate-900 tabular-nums">
                {formatMoney(allDomainsRow.due)}
              </td>
              <td className="py-2.5 px-2.5 text-right font-mono text-slate-500 tabular-nums">
                {formatMoney(allDomainsRow.remaining)}
              </td>
              <td className="py-2.5 px-2.5 text-right font-mono font-bold text-[#ff4d30] tabular-nums">
                {formatMoney(allDomainsRow.recvd)}
              </td>
              <td className="py-2.5 px-2.5 text-right font-mono text-slate-500 tabular-nums">
                {formatMoney(allDomainsRow.principal)}
              </td>
            </tr>

            {/* Individual Brand Rows */}
            {filteredRows.map((d) => {
              const isSelected = selectedDomains.has(d.name);
              const dotColor = DOMAIN_DOT_COLORS[d.name] || 'bg-slate-400';

              return (
                <tr
                  key={d.name}
                  onClick={() => toggleDomain(d.name)}
                  className={`cursor-pointer transition-colors group ${
                    isSelected ? 'bg-orange-50/70 border-l-2 border-l-[#ff4d30]' : 'hover:bg-slate-50/70'
                  }`}
                >
                  <td className="py-2.5 px-2.5 font-medium text-slate-800 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                      <span className="text-[12px]">{d.name}</span>
                      {isSelected && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#ff4d30] text-white">
                          Selected
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono text-slate-500 tabular-nums">
                    {d.cases.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono font-medium text-slate-900 tabular-nums">
                    {formatMoney(d.due)}
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono text-slate-500 tabular-nums">
                    {formatMoney(d.remaining)}
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono font-bold text-[#ff4d30] tabular-nums">
                    {formatMoney(d.recvd)}
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono text-slate-500 tabular-nums">
                    {formatMoney(d.principal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
