import { useMemo, useState, useRef } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Search, X } from 'lucide-react';
import { useDomain } from '../context/DomainContext';
import { useLiveCollection } from '../context/LiveCollectionContext';
import { CASES, DOMAINS, META, TODAY_STR, YESTERDAY_STR, fmtINR, fmtINRFull, fmtDateShort, round1, dateToOffset } from '../utils/data';

// Refined, tasteful status dot colors
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

// Minimalist, understated status styling
const bandStyles = {
  good: {
    badge: 'bg-emerald-50/90 text-emerald-700 border border-emerald-200/70',
    label: 'On track',
  },
  mid: {
    badge: 'bg-amber-50/90 text-amber-700 border border-amber-200/70',
    label: 'Needs review',
  },
  low: {
    badge: 'bg-slate-100 text-slate-600 border border-slate-200/70',
    label: 'Below target',
  },
};

export default function DomainPortfolioTable({ compact = false }) {
  const { selectedDomains, toggleDomain, clearDomain, isDomainActive } = useDomain();
  const { totalLiveToday, totalYesterday, todayDate, yesterdayDate } = useLiveCollection();

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('due');
  const [sortDir, setSortDir] = useState(-1);
  const [showExact, setShowExact] = useState(false);

  const tableContainerRef = useRef(null);

  const targetTodayStr = todayDate || META.today || TODAY_STR;
  const targetYdayStr = yesterdayDate || YESTERDAY_STR;
  const todayLabel = targetTodayStr ? fmtDateShort(targetTodayStr) : 'Today';
  const ydayLabel = targetYdayStr ? fmtDateShort(targetYdayStr) : 'Yesterday';

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => -d);
    } else {
      setSortKey(key);
      setSortDir(-1);
    }
  };

  // Compute live breakdown for every domain
  const { allDomainsRow, rows } = useMemo(() => {
    const dNames = DOMAINS && DOMAINS.length > 0 ? DOMAINS : (META.domains || []);
    const todayOff = targetTodayStr ? dateToOffset(targetTodayStr) : -9999;
    const ydayOff = targetYdayStr ? dateToOffset(targetYdayStr) : -9999;

    let allDue = 0;
    let allRecvd = 0;
    let allPrincipal = 0;
    let allSep = 0;
    let allToday = 0;
    let allYesterday = 0;
    const allAgents = new Set();
    const allLeaders = new Set();

    const domainList = dNames.map((d, dI) => {
      let due = 0;
      let recvd = 0;
      let principal = 0;
      let sep2026Recvd = 0;
      let todayLive = 0;
      let yesterday = 0;
      const agentSet = new Set();
      const leaderSet = new Set();

      for (const r of CASES) {
        if (r[8] === dI) {
          due += (r[5] || 0);
          recvd += (r[6] || 0);
          principal += (r[9] || 0);
          agentSet.add(r[0]);
          leaderSet.add(r[1]);
          const recMonth = r[12];
          if (recMonth && String(recMonth).toLowerCase().includes('sep') && String(recMonth).includes('2026')) {
            sep2026Recvd += (r[6] || 0);
          }
          if (r[13] === todayOff) {
            todayLive += (r[6] || 0);
          }
          if (r[13] === ydayOff) {
            yesterday += (r[6] || 0);
          }
        }
      }

      allDue += due;
      allRecvd += recvd;
      allPrincipal += principal;
      allSep += sep2026Recvd;
      allToday += todayLive;
      allYesterday += yesterday;
      agentSet.forEach((a) => allAgents.add(a));
      leaderSet.forEach((l) => allLeaders.add(l));

      const pending = due - recvd;
      const pct = due > 0 ? round1((recvd / due) * 100) : 0;
      const caseCount = META.domainCounts?.[d] ?? CASES.filter((c) => c[8] === dI).length;
      const band = pct >= 25 ? 'good' : pct >= 15 ? 'mid' : 'low';

      return {
        id: d,
        name: d,
        cases: caseCount,
        due,
        recvd,
        pending,
        principal,
        sep2026Recvd,
        todayLive,
        yesterday,
        pct,
        band,
        agents: agentSet.size,
        leaders: leaderSet.size,
      };
    });

    const allPending = allDue - allRecvd;
    const allPct = allDue > 0 ? round1((allRecvd / allDue) * 100) : 0;
    const summaryRow = {
      id: 'All Domains',
      name: 'Consolidated (All Domains)',
      cases: CASES.length,
      due: allDue,
      recvd: allRecvd,
      pending: allPending,
      principal: allPrincipal,
      sep2026Recvd: allSep,
      todayLive: Math.max(allToday, totalLiveToday || 0),
      yesterday: Math.max(allYesterday, totalYesterday || 0),
      pct: allPct,
      band: allPct >= 25 ? 'good' : allPct >= 15 ? 'mid' : 'low',
      agents: allAgents.size,
      leaders: allLeaders.size,
      isSummary: true,
    };

    return { allDomainsRow: summaryRow, rows: domainList };
  }, [CASES.length, DOMAINS, targetTodayStr, targetYdayStr, totalLiveToday, totalYesterday]);

  // Filtered & sorted domain rows
  const sortedRows = useMemo(() => {
    let list = [...rows];
    if (search.trim()) {
      list = list.filter((r) => r.name.toLowerCase().includes(search.toLowerCase().trim()));
    }
    list.sort((a, b) => sortDir * (a[sortKey] > b[sortKey] ? 1 : -1));
    return list;
  }, [rows, search, sortKey, sortDir]);

  const cols = compact ? [
    { key: 'name', label: 'Domain', align: 'text-left' },
    { key: 'due', label: 'Due', align: 'text-right' },
    { key: 'todayLive', label: 'Live', align: 'text-right' },
    { key: 'recvd', label: 'Collected', align: 'text-right' },
    { key: 'pct', label: '%', align: 'text-right' },
  ] : [
    { key: 'name', label: 'Domain / Brand', align: 'text-left' },
    { key: 'cases', label: 'Cases', align: 'text-right' },
    { key: 'due', label: 'Total Due', align: 'text-right' },
    { key: 'pending', label: 'Remaining', align: 'text-right' },
    { key: 'todayLive', label: `Today Live (${todayLabel})`, align: 'text-right' },
    { key: 'yesterday', label: `Yesterday (${ydayLabel})`, align: 'text-right' },
    { key: 'sep2026Recvd', label: 'Last Mo (Sep)', align: 'text-right' },
    { key: 'recvd', label: 'Collected', align: 'text-right' },
    { key: 'principal', label: 'Disbursed', align: 'text-right' },
    { key: 'pct', label: 'Recovery %', align: 'text-right' },
  ];

  const formatMoney = (val) => (showExact ? fmtINRFull(val) : fmtINR(val));

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3.5 transition-all">
      {/* Sleek Minimalist Header Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100">
        {/* Title & Active Filter Chip */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-semibold text-slate-900 tracking-tight">
              Portfolio by Brand
            </h3>
            <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/60">
              {rows.length} brands
            </span>
          </div>

          {isDomainActive && (
            <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 pl-2.5 pr-1.5 py-0.5 rounded-full border border-slate-200 transition-colors">
              <span>Filter: <strong className="text-slate-900 font-semibold">{selectedDomains.size > 0 ? Array.from(selectedDomains).join(", ") : "All Domains"}</strong></span>
              <button
                type="button"
                onClick={clearDomain}
                className="p-0.5 hover:bg-slate-300/60 rounded-full transition-colors cursor-pointer text-slate-500 hover:text-slate-800"
                aria-label="Remove filter"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Minimal Controls */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Format Switcher (iOS/Linear Segmented Style) */}
          <div className="flex bg-slate-100/90 p-0.5 rounded-lg border border-slate-200/60 text-[11px]">
            <button
              type="button"
              onClick={() => setShowExact(false)}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                !showExact
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Compact
            </button>
            <button
              type="button"
              onClick={() => setShowExact(true)}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                showExact
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Full ₹
            </button>
          </div>

          {/* Minimal Search Input */}
          <div className="relative flex items-center">
            <Search size={12} className="absolute left-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-7 pr-6 py-1 text-[11.5px] text-slate-800 placeholder-slate-400 bg-slate-50/80 hover:bg-slate-100/70 focus:bg-white border border-slate-200/80 focus:border-slate-400 rounded-lg outline-none w-32 sm:w-40 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={11} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Clean Minimalist Table Container */}
      <div
        ref={tableContainerRef}
        className="max-h-[340px] overflow-y-auto overscroll-contain overflow-x-auto pr-1 select-none rounded-xl border border-slate-100/90"
      >
        <table className="w-full text-[12px] border-collapse">
          {/* Sticky Sleek Table Header */}
          <thead className="sticky top-0 bg-white/95 backdrop-blur-md z-10 border-b border-slate-200/80">
            <tr>
              {cols.map((c) => {
                const isSorted = sortKey === c.key;
                return (
                  <th
                    key={c.key}
                    onClick={() => toggleSort(c.key)}
                    className={`${c.align} text-[10.5px] font-semibold text-slate-400 hover:text-slate-700 uppercase tracking-wider py-2.5 px-3 cursor-pointer select-none transition-colors whitespace-nowrap`}
                  >
                    <div className={`inline-flex items-center gap-1 ${c.align === 'text-right' ? 'justify-end' : ''}`}>
                      <span className={isSorted ? 'text-slate-800 font-bold' : ''}>{c.label}</span>
                      {isSorted ? (
                        sortDir === 1 ? (
                          <ArrowUp size={11} className="text-slate-800 shrink-0" />
                        ) : (
                          <ArrowDown size={11} className="text-slate-800 shrink-0" />
                        )
                      ) : (
                        <ArrowUpDown size={10} className="opacity-25 hover:opacity-60 shrink-0" />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100/80">
            {/* Master Consolidated Summary Row */}
            <tr
              onClick={() => clearDomain()}
              className={`cursor-pointer transition-colors ${
                selectedDomains.size === 0
                  ? 'bg-slate-100/70 border-l-2 border-l-slate-900 font-medium'
                  : 'bg-slate-50/60 hover:bg-slate-100/50'
              }`}
            >
              {/* Domain Name */}
              <td className="py-2.5 px-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-900 text-[12.5px]">
                    All Domains (Consolidated)
                  </span>
                  {selectedDomains.size === 0 && (
                    <span className="text-[9.5px] font-medium px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                      All
                    </span>
                  )}
                </div>
              </td>

              {/* Cases */}
              {!compact && (
              <td className="py-2.5 px-3 text-right font-mono text-slate-600 tabular-nums">
                {allDomainsRow.cases.toLocaleString('en-IN')}
              </td>
              )}

              {/* Total Due */}
              <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                {formatMoney(allDomainsRow.due)}
              </td>

              {/* Remaining */}
              {!compact && (
              <td className="py-2.5 px-3 text-right font-mono text-slate-500 tabular-nums">
                {formatMoney(allDomainsRow.pending)}
              </td>
              )}

              {/* Today Live */}
              <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 tabular-nums">
                {allDomainsRow.todayLive > 0 ? (
                  <span className="inline-flex items-center gap-1 justify-end">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {formatMoney(allDomainsRow.todayLive)}
                  </span>
                ) : '₹0'}
              </td>

              {/* Yesterday */}
              {!compact && (
              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 tabular-nums">
                {formatMoney(allDomainsRow.yesterday)}
              </td>
              )}

              {/* Last Mo (Sep 2026) */}
              {!compact && (
              <td className="py-2.5 px-3 text-right font-mono text-slate-700 font-medium tabular-nums">
                {formatMoney(allDomainsRow.sep2026Recvd)}
              </td>
              )}

              {/* Collected */}
              <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-800 tabular-nums">
                {formatMoney(allDomainsRow.recvd)}
              </td>

              {/* Disbursed */}
              {!compact && (
              <td className="py-2.5 px-3 text-right font-mono text-slate-500 tabular-nums">
                {formatMoney(allDomainsRow.principal)}
              </td>
              )}

              {/* Recovery % */}
              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                <div className="inline-flex items-center gap-1.5 justify-end">
                  <span className="font-mono font-semibold text-slate-800 tabular-nums">
                    {allDomainsRow.pct.toFixed(2)}%
                  </span>
                  <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-600">
                    Total
                  </span>
                </div>
              </td>
            </tr>

            {/* Individual Domain Rows */}
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={compact ? 5 : 10} className="text-center py-8 text-slate-400 text-xs">
                  No domains found matching "{search}"
                </td>
              </tr>
            ) : (
              sortedRows.map((d) => {
                const isSelected = selectedDomains.has(d.name);
                const dotColor = DOMAIN_DOT_COLORS[d.name] || 'bg-slate-400';
                const style = bandStyles[d.band] || bandStyles.low;

                return (
                  <tr
                    key={d.name}
                    onClick={() => toggleDomain(d.name)}
                    className={`cursor-pointer transition-colors group ${
                      isSelected
                        ? 'bg-slate-100/70 border-l-2 border-l-slate-900'
                        : 'hover:bg-slate-50/70'
                    }`}
                  >
                    {/* Domain / Brand name with colored dot indicator */}
                    <td className="py-2.5 px-3 font-medium text-slate-800 group-hover:text-slate-900 transition-colors whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                        <span className="text-[12.5px] font-medium">{d.name}</span>
                        {isSelected && (
                          <span className="text-[9.5px] font-medium px-1.5 py-0.2 rounded bg-slate-900 text-white">
                            Active
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Cases */}
                    {!compact && (
                    <td className="py-2.5 px-3 text-right font-mono text-slate-500 tabular-nums">
                      {d.cases.toLocaleString('en-IN')}
                    </td>
                    )}

                    {/* Money to Collect (Total Due Scope) */}
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {formatMoney(d.due)}
                    </td>

                    {/* Remaining Pending */}
                    <td className="py-2.5 px-3 text-right font-mono text-slate-500 tabular-nums">
                      {formatMoney(d.pending)}
                    </td>

                    {/* Today Live */}
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {d.todayLive > 0 ? (
                        <span className="text-emerald-700 font-bold inline-flex items-center gap-1 justify-end">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {formatMoney(d.todayLive)}
                        </span>
                      ) : (
                        <span className="text-slate-300 font-normal">—</span>
                      )}
                    </td>

                    {/* Yesterday */}
                    {!compact && (
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {d.yesterday > 0 ? (
                        <span className="text-slate-800 font-semibold">{formatMoney(d.yesterday)}</span>
                      ) : (
                        <span className="text-slate-300 font-normal">—</span>
                      )}
                    </td>
                    )}

                    {/* Last Month (Sep 2026) Collection */}
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {d.sep2026Recvd > 0 ? (
                        <span className="text-slate-700 font-medium">{formatMoney(d.sep2026Recvd)}</span>
                      ) : (
                        <span className="text-slate-300 font-normal">—</span>
                      )}
                    </td>

                    {/* Total Received / Recovered */}
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-800 tabular-nums">
                      {formatMoney(d.recvd)}
                    </td>

                    {/* Disbursed Principal */}
                    <td className="py-2.5 px-3 text-right font-mono text-slate-400 tabular-nums">
                      {formatMoney(d.principal)}
                    </td>

                    {/* Recovery % + Minimalist badge */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <span className="font-mono font-medium text-slate-800 tabular-nums">
                          {d.pct.toFixed(2)}%
                        </span>
                        <span className={`text-[9.5px] font-medium px-1.5 py-0.2 rounded ${style.badge}`}>
                          {style.label}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
