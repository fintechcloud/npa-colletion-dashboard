import { useState, useMemo, useRef } from 'react';
import { INDIA_MAP_PATHS } from '../data/indiaMapPaths';
import { fmtINR } from '../utils/data';

export default function IndiaMapHeatmap({
  stateRows = [],
  selectedState,
  onSelectState,
  hoveredState,
  onHoverState,
}) {
  const [metric, setMetric] = useState('recvd'); // 'recvd' | 'pct' | 'cases'
  const [internalHover, setInternalHover] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // Map state ID to data row
  const dataMap = useMemo(() => {
    const map = {};
    stateRows.forEach((r) => {
      map[r.id] = r;
    });
    return map;
  }, [stateRows]);

  // Compute min/max for choropleth scale
  const { maxVal } = useMemo(() => {
    let max = 0;
    stateRows.forEach((r) => {
      const val = r[metric] || 0;
      if (val > max) max = val;
    });
    return { maxVal: max || 1 };
  }, [stateRows, metric]);

  const activeHoverId = hoveredState || internalHover?.id;

  // Handle mouse move for tooltip positioning
  const handleMouseMove = (e, pathObj) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    const info = dataMap[pathObj.id] || { id: pathObj.id, name: pathObj.title, cases: 0, due: 0, recvd: 0, pct: 0 };
    setInternalHover(info);
    if (onHoverState) onHoverState(pathObj.id);
  };

  const handleMouseLeave = () => {
    setInternalHover(null);
    if (onHoverState) onHoverState(null);
  };

  // Choropleth color computation matching light executive fintech theme
  const getFillColor = (stateId) => {
    const data = dataMap[stateId];
    if (!data || !data.cases) return '#e2e8f0';

    const val = data[metric] || 0;
    const ratio = Math.min(Math.max(val / maxVal, 0), 1);

    if (metric === 'pct') {
      if (data.pct >= 80) return `rgba(16, 185, 129, ${0.45 + Math.min((data.pct - 80) / 20, 1) * 0.45})`;
      if (data.pct >= 65) return `rgba(245, 158, 11, ${0.45 + ((data.pct - 65) / 15) * 0.45})`;
      return `rgba(239, 68, 68, ${0.45 + Math.min(Math.max((65 - data.pct) / 25, 0), 1) * 0.45})`;
    }

    // Collected & Cases: Hot crimson/coral gradient on clean light canvas
    if (ratio > 0.8) return '#ff3b30';
    if (ratio > 0.6) return '#ff5533';
    if (ratio > 0.4) return '#ff7a5c';
    if (ratio > 0.22) return '#ffaa99';
    if (ratio > 0.1) return '#ffd0c7';
    if (ratio > 0.02) return '#fbe6e3';
    return '#f1f5f9';
  };

  return (
    <div className="relative flex flex-col items-center w-full" ref={containerRef}>
      {/* Top Controls: Metric Switcher & Heatmap Legend */}
      <div className="w-full flex items-center justify-between gap-3 mb-3 flex-wrap text-[11.5px]">
        {/* Metric Selector */}
        <div className="flex bg-slate-100 border border-slate-200 rounded-xl p-0.5 gap-0.5">
          {[
            ['recvd', 'Collected'],
            ['pct', 'Recovery %'],
            ['cases', 'Cases'],
          ].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setMetric(val)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                metric === val
                  ? 'bg-gradient-to-r from-[#ff5e3a] to-[#ff3b30] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Intensity Legend matching theme */}
        <div className="flex items-center gap-2 text-slate-500 font-medium">
          <span className="text-[10.5px]">Low</span>
          <div
            className={`w-24 h-2 rounded-full border border-slate-200 transition-all ${
              metric === 'pct'
                ? 'bg-gradient-to-r from-[#ef4444] via-[#f59e0b] to-[#10b981]'
                : 'bg-gradient-to-r from-[#ffd0c7] via-[#ff7a5c] to-[#ff3b30]'
            }`}
          />
          <span className="text-[10.5px]">High</span>
        </div>
      </div>

      {/* SVG Container */}
      <div className="relative w-full max-w-[480px] aspect-[612/696] my-1">
        <svg
          viewBox="0 0 612 696"
          className="w-full h-full filter drop-shadow-[0_4px_16px_rgba(0,0,0,0.06)] select-none"
        >
          <defs>
            <filter id="hover-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ff3b30" floodOpacity="0.5" />
            </filter>
            <filter id="selected-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#ff5533" floodOpacity="0.6" />
            </filter>
          </defs>

          <g id="states">
            {INDIA_MAP_PATHS.map((p) => {
              const isSelected = selectedState === p.id;
              const isHovered = activeHoverId === p.id;
              const fillColor = getFillColor(p.id);

              return (
                <path
                  key={p.id}
                  id={p.id}
                  d={p.d}
                  fill={isSelected ? '#ff3b30' : fillColor}
                  stroke={isSelected ? '#ffffff' : isHovered ? '#ff5533' : '#cbd5e1'}
                  strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 0.8}
                  strokeLinejoin="round"
                  className="transition-all duration-150 cursor-pointer"
                  filter={isSelected ? 'url(#selected-glow)' : isHovered ? 'url(#hover-glow)' : undefined}
                  onMouseMove={(e) => handleMouseMove(e, p)}
                  onMouseLeave={handleMouseLeave}
                  onClick={() => onSelectState && onSelectState(isSelected ? null : p.id)}
                />
              );
            })}
          </g>
        </svg>

        {/* Floating Light Glass Tooltip matching executive aesthetic */}
        {internalHover && (
          <div
            className="absolute pointer-events-none z-30 transition-all duration-75"
            style={{
              left: `${Math.min(Math.max(tooltipPos.x + 12, 10), 320)}px`,
              top: `${Math.max(tooltipPos.y - 80, 10)}px`,
            }}
          >
            <div className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl p-3 shadow-xl min-w-[170px] text-slate-800">
              <div className="text-[13px] font-bold font-display text-slate-900 border-b border-slate-100 pb-1.5 mb-1.5 flex items-center justify-between">
                <span>{internalHover.name}</span>
                {internalHover.pct !== undefined && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold ${
                      internalHover.pct >= 70
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : internalHover.pct >= 60
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {internalHover.pct}%
                  </span>
                )}
              </div>
              <div className="space-y-1 text-[11.5px]">
                <div className="flex justify-between text-slate-400">
                  <span>Cases:</span>
                  <span className="font-mono font-bold text-slate-800">{internalHover.cases || 0}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Disbursed:</span>
                  <span className="font-mono text-slate-600">{fmtINR(internalHover.due || 0)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Collected:</span>
                  <span className="font-mono font-bold text-[#ff4d30]">{fmtINR(internalHover.recvd || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}