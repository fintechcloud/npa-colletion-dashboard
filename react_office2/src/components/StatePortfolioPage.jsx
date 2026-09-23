import { useMemo, useState, useRef, useEffect } from 'react';
import { MapPin, Search, ArrowUpDown, X, ChevronDown, ChevronUp } from 'lucide-react';
import { computeStateRows, fmtINR } from '../utils/data';
import IndiaMapHeatmap from './IndiaMapHeatmap';

const bandStyles = {
  good: {
    badge: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]',
    dot: 'bg-emerald-400 shadow-[0_0_6px_#10b981]',
    label: 'On track',
  },
  mid: {
    badge: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
    dot: 'bg-amber-400 shadow-[0_0_6px_#f59e0b]',
    label: 'Needs review',
  },
  low: {
    badge: 'bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-[0_0_8px_rgba(255,59,48,0.2)]',
    dot: 'bg-rose-400 shadow-[0_0_6px_#ff3b30]',
    label: 'Below target',
  },
};

export default function StatePortfolioPage() {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('recvd');
  const [sortDir, setSortDir] = useState(-1);
  const [selectedStateId, setSelectedStateId] = useState(null);
  const [hoveredStateId, setHoveredStateId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [isScrolledDown, setIsScrolledDown] = useState(false);

  const tableContainerRef = useRef(null);
  const rowRefs = useRef({});
  const drilldownRef = useRef(null);

  // Smooth scroll helper override to scroll table down/up
  const scrollOverride = (targetY) => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({
        top: targetY,
        behavior: 'smooth',
      });
    }
  };

  const handleTableScroll = () => {
    if (tableContainerRef.current) {
      const { scrollTop } = tableContainerRef.current;
      setIsScrolledDown(scrollTop > 50);
    }
  };

  const handleScrollToggle = () => {
    const container = tableContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 60;
    if (isNearBottom || isScrolledDown) {
      scrollOverride(0);
    } else {
      scrollOverride(scrollTop + 300);
    }
  };

  const handleSelectFromMap = (stateId) => {
    setSelectedStateId((prev) => (prev === stateId ? null : stateId));
  };

  const handleRowClick = (stateId) => {
    setSelectedStateId((prev) => (prev === stateId ? null : stateId));
  };

  // React effect to smoothly scroll the corresponding row into view when state is selected
  useEffect(() => {
    if (selectedStateId && rowRefs.current[selectedStateId]) {
      rowRefs.current[selectedStateId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedStateId]);

  // All state rows computed from data engine
  const allRows = useMemo(() => computeStateRows(), []);

  // Filtered & sorted state rows
  const filteredRows = useMemo(() => {
    let list = [...allRows];
    if (search) {
      list = list.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));
    }
    if (statusFilter) {
      list = list.filter((s) => s.band === statusFilter);
    }
    list.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      return sortDir * (aVal > bVal ? 1 : -1);
    });
    return list;
  }, [allRows, search, sortKey, sortDir, statusFilter]);

  const selectedState = useMemo(() => {
    if (!selectedStateId) return null;
    return allRows.find((s) => s.id === selectedStateId) || null;
  }, [allRows, selectedStateId]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => -d);
    else {
      setSortKey(key);
      setSortDir(-1);
    }
  };

  const cols = [
    { key: 'name', label: 'STATE / REGION' },
    { key: 'cases', label: 'CASES' },
    { key: 'due', label: 'DISBURSED' },
    { key: 'recvd', label: 'RECEIVED' },
    { key: 'pct', label: 'RECOVERY' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header matching user reference image */}
      <div className="bg-[#0f111d]/45 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-xl flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#ff5e3a] to-[#ff3b30] flex items-center justify-center text-white shadow-[0_0_16px_rgba(255,59,48,0.4)] shrink-0 mt-0.5">
            <MapPin size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-[19px] font-extrabold text-white font-display tracking-tight leading-none">
                State-Wise Portfolio Distribution
              </h1>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/[0.08] text-zinc-300 border border-white/[0.08] font-mono">
                {allRows.length} States
              </span>
            </div>
            <p className="text-[12px] font-medium text-zinc-400 mt-1.5">
              Regional disbursement volume, collection performance, and geographic lending heatmap
            </p>
          </div>
        </div>

        {/* Filter State Search Input matching reference image */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] focus-within:border-[#ff3b30]/60 rounded-xl px-3.5 py-2 transition-all w-52">
            <Search size={14} className="text-zinc-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter state…"
              className="bg-transparent text-[12px] text-zinc-200 placeholder-zinc-500 outline-none w-full"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-zinc-500 hover:text-zinc-300">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Quick status filter pills */}
          <div className="hidden xl:flex bg-black/40 border border-white/[0.06] rounded-xl p-0.5 gap-0.5">
            {[
              ['', 'All'],
              ['good', 'On Track'],
              ['mid', 'Review'],
              ['low', 'Below Target'],
            ].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setStatusFilter(val)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  statusFilter === val
                    ? 'bg-white/[0.12] text-white shadow-sm border border-white/[0.08]'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout matching Reference Image */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6 items-start">
        {/* Left Column: State Rollup Table */}
        <div className="bg-[#0f111d]/45 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <div className="text-[14.5px] font-bold text-white font-display tracking-tight">
                State Performance Breakdown
              </div>
              <span className="text-[10.5px] font-mono font-semibold px-2 py-0.5 rounded-md bg-white/[0.06] text-zinc-400">
                {filteredRows.length} showing
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Scroll Down / Scroll Top helper using scrollOverride */}
              <button
                type="button"
                onClick={handleScrollToggle}
                title={isScrolledDown ? 'Scroll to Top' : 'Scroll Down to view all states'}
                className="text-[11px] font-semibold text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {isScrolledDown ? (
                  <>
                    <ChevronUp size={13} className="text-[#ff5533]" />
                    <span>Scroll Top</span>
                  </>
                ) : (
                  <>
                    <ChevronDown size={13} className="text-[#ff5533]" />
                    <span>Scroll Down</span>
                  </>
                )}
              </button>

              {selectedState && (
                <button
                  onClick={() => setSelectedStateId(null)}
                  className="text-[11.5px] font-bold text-[#ff5533] hover:text-[#ff3b30] flex items-center gap-1 cursor-pointer"
                >
                  <span>Clear selection</span>
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          <div
            ref={tableContainerRef}
            onScroll={handleTableScroll}
            className="max-h-[580px] overflow-y-auto overscroll-contain overflow-x-auto pr-1.5 scroll-theme select-none"
          >
            <table className="w-full text-[12.5px] border-collapse">
              <thead className="sticky top-0 bg-[#0f111d]/90 backdrop-blur-md z-10">
                <tr className="border-b border-white/[0.08]">
                  {cols.map((c) => (
                    <th
                      key={c.key}
                      onClick={() => toggleSort(c.key)}
                      className={`text-left text-[10.5px] font-bold uppercase tracking-wider pb-3 px-3 cursor-pointer select-none font-display transition-colors ${
                        sortKey === c.key ? 'text-[#ff5533]' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{c.label}</span>
                        <ArrowUpDown size={11} className={sortKey === c.key ? 'text-[#ff5533]' : 'opacity-30'} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-zinc-500 text-[13px] font-medium">
                      No states found matching "{search}".
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((s) => {
                    const isSelected = selectedStateId === s.id;
                    const isHovered = hoveredStateId === s.id;
                    const style = bandStyles[s.band] || bandStyles.low;

                    return (
                      <tr
                        key={s.id}
                        ref={(el) => {
                          rowRefs.current[s.id] = el;
                        }}
                        onClick={() => handleRowClick(s.id)}
                        onMouseEnter={() => setHoveredStateId(s.id)}
                        onMouseLeave={() => setHoveredStateId(null)}
                        className={`cursor-pointer border-b border-white/[0.04] transition-all group ${
                          isSelected
                            ? 'bg-[#ff3b30]/15 border-l-2 border-l-[#ff3b30]'
                            : isHovered
                            ? 'bg-white/[0.04]'
                            : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        {/* State name + dot indicator */}
                        <td className="py-3 px-3 font-bold text-white group-hover:text-[#ff5533] transition-colors">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                            <span className="font-display text-[13px]">{s.name}</span>
                          </div>
                        </td>

                        {/* Cases */}
                        <td className="py-3 px-3 font-mono font-semibold text-zinc-300">
                          {s.cases.toLocaleString('en-IN')}
                        </td>

                        {/* Disbursed (Due) */}
                        <td className="py-3 px-3 font-mono text-zinc-400">
                          {fmtINR(s.due)}
                        </td>

                        {/* Received */}
                        <td className="py-3 px-3 font-mono font-bold text-white">
                          {fmtINR(s.recvd)}
                        </td>

                        {/* Recovery % + Status badge matching reference image */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-zinc-200">{s.pct.toFixed(1)}%</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono whitespace-nowrap ${style.badge}`}>
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

        {/* Right Column: Geographic Lending Heatmap matching Reference Image (Sticky) */}
        <div className="lg:sticky lg:top-6 self-start bg-[#0f111d]/45 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-[#ff5533]" />
              <div className="text-[15px] font-bold text-white font-display tracking-tight">
                Geographic Lending Heatmap
              </div>
            </div>
            <span className="text-[11px] text-zinc-400">Interactive SVG</span>
          </div>

          {/* Heatmap Map Component */}
          <IndiaMapHeatmap
            stateRows={allRows}
            selectedState={selectedStateId}
            onSelectState={handleSelectFromMap}
            hoveredState={hoveredStateId}
            onHoverState={setHoveredStateId}
          />

          {/* Bottom Bar matching user reference: Hover or click any state */}
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 flex items-center justify-center gap-2 text-center text-[11.5px] text-zinc-400">
            <MapPin size={13} className="text-[#ff5533] shrink-0" />
            <span>Hover or click any state on the map to view regional metrics</span>
          </div>

          {/* Selected State Drilldown Card */}
          {selectedState && (
            <div
              ref={drilldownRef}
              className="p-4 rounded-xl bg-gradient-to-r from-white/[0.06] to-white/[0.02] border border-[#ff3b30]/30 shadow-lg animate-fade-in-up"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-display font-extrabold text-white text-[15px]">
                  {selectedState.name}
                </div>
                <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${bandStyles[selectedState.band]?.badge}`}>
                  {selectedState.pct}% Recovery
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11.5px] pt-1 border-t border-white/[0.06]">
                <div>
                  <div className="text-zinc-500 font-medium text-[10px] uppercase">Cases</div>
                  <div className="font-mono font-bold text-white text-[13px]">{selectedState.cases}</div>
                </div>
                <div>
                  <div className="text-zinc-500 font-medium text-[10px] uppercase">Disbursed</div>
                  <div className="font-mono text-zinc-300 text-[13px]">{fmtINR(selectedState.due)}</div>
                </div>
                <div>
                  <div className="text-zinc-500 font-medium text-[10px] uppercase">Collected</div>
                  <div className="font-mono font-bold text-[#ff5533] text-[13px]">{fmtINR(selectedState.recvd)}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}