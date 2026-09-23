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

  // Choropleth color computation matching dark cyber-fintech theme
  const getFillColor = (stateId) => {
    const data = dataMap[stateId];
    if (!data || !data.cases) return '#141522';

    const val = data[metric] || 0;
    const ratio = Math.min(Math.max(val / maxVal, 0), 1);

    if (metric === 'pct') {
      if (data.pct >= 80) return `rgba(16, 185, 129, ${0.45 + Math.min((data.pct - 80) / 20, 1) * 0.45})`;
      if (data.pct >= 65) return `rgba(245, 158, 11, ${0.45 + ((data.pct - 65) / 15) * 0.45})`;
      return `rgba(255, 59, 48, ${0.45 + Math.min(Math.max((65 - data.pct) / 25, 0), 1) * 0.45})`;
    }

    // Collected & Cases: Hot cyber-crimson theme gradient matching Vaulto UI
    if (ratio > 0.8) return '#ff3b30';
    if (ratio > 0.6) return '#e63228';
    if (ratio > 0.4) return '#b82329';
    if (ratio > 0.22) return '#7d1824';
    if (ratio > 0.1) return '#4a141e';
    if (ratio > 0.02) return '#281219';
    return '#1c1218';
  };

  return (
    <div className="relative flex flex-col items-center w-full" ref={containerRef}>
      {/* Top Controls: Metric Switcher & Heatmap Legend */}
      <div className="w-full flex items-center justify-between gap-3 mb-3 flex-wrap text-[11.5px]">
        {/* Metric Selector */}
        <div className="flex bg-black/40 border border-white/[0.08] rounded-xl p-0.5 gap-0.5">
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
                  ? 'bg-gradient-to-r from-[#ff5e3a] to-[#ff3b30] text-white shadow-[0_0_12px_rgba(255,59,48,0.5)]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Intensity Legend matching theme */}
        <div className="flex items-center gap-2 text-zinc-400 font-medium">
          <span className="text-[10.5px]">Low</span>
          <div
            className={`w-24 h-2 rounded-full border border-white/10 transition-all ${
              metric === 'pct'
                ? 'bg-gradient-to-r from-[#ff3b30] via-[#f59e0b] to-[#10b981]'
                : 'bg-gradient-to-r from-[#281219] via-[#b82329] to-[#ff3b30]'
            }`}
          />
          <span className="text-[10.5px]">High</span>
        </div>
      </div>

      {/* SVG Container */}
      <div className="relative w-full max-w-[480px] aspect-[612/696] my-1">
        <svg
          viewBox="0 0 612 696"
          className="w-full h-full filter drop-shadow-[0_8px_24px_rgba(0,0,0,0.5)] select-none"
        >
          <defs>
            <filter id="hover-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#ff3b30" floodOpacity="0.8" />
            </filter>
            <filter id="selected-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="7" floodColor="#ff5533" floodOpacity="0.9" />
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
                  stroke={isSelected ? '#ffffff' : isHovered ? '#ff5533' : 'rgba(255, 255, 255, 0.12)'}
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

        {/* Floating Dark Glass Tooltip matching Vaulto aesthetic */}
        {internalHover && (
          <div
            className="absolute pointer-events-none z-30 transition-all duration-75"
            style={{
              left: `${Math.min(Math.max(tooltipPos.x + 12, 10), 320)}px`,
              top: `${Math.max(tooltipPos.y - 80, 10)}px`,
            }}
          >
            <div className="bg-[#12131b]/95 backdrop-blur-xl border border-white/15 rounded-xl p-3 shadow-2xl min-w-[170px] text-white">
              <div className="text-[13px] font-bold font-display text-white border-b border-white/10 pb-1.5 mb-1.5 flex items-center justify-between">
                <span>{internalHover.name}</span>
                {internalHover.pct !== undefined && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                      internalHover.pct >= 70
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : internalHover.pct >= 60
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {internalHover.pct}%
                  </span>
                )}
              </div>
              <div className="space-y-1 text-[11.5px]">
                <div className="flex justify-between text-zinc-400">
                  <span>Cases:</span>
                  <span className="font-mono font-bold text-white">{internalHover.cases || 0}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Disbursed:</span>
                  <span className="font-mono text-zinc-300">{fmtINR(internalHover.due || 0)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Collected:</span>
                  <span className="font-mono font-bold text-[#ff5533]">{fmtINR(internalHover.recvd || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}