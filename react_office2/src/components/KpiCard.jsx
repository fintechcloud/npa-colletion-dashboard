import { motion } from 'framer-motion';
import AnimatedNumber from './AnimatedNumber';

export default function KpiCard({
  label,
  value,
  raw,
  format,
  sub,
  dateRange,
  icon: Icon,
  tone = 'default',
  index = 0,
  trend,
  onClick,
}) {
  const toneMap = {
    default: {
      icon: 'text-zinc-400 bg-white/[0.03] border-white/[0.06]',
      badge: 'text-zinc-400 bg-white/[0.04] border-white/[0.07]',
      cardBorder: 'hover:border-white/20',
    },
    brand: {
      icon: 'text-[#ff6b4a] bg-[#ff5533]/10 border-[#ff5533]/20',
      badge: 'text-[#ff6b4a] bg-[#ff5533]/10 border-[#ff5533]/20',
      cardBorder: 'hover:border-[#ff5533]/30',
    },
    warn: {
      icon: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      badge: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      cardBorder: 'hover:border-amber-500/30',
    },
    danger: {
      icon: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      badge: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      cardBorder: 'hover:border-rose-500/30',
    },
    live: {
      icon: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      badge: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
      cardBorder: 'border-emerald-500/20 hover:border-emerald-500/40',
    },
  };

  const t = toneMap[tone] || toneMap.default;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={`group relative bg-[#0e1018]/50 hover:bg-[#131622]/75 backdrop-blur-xl border border-white/[0.06] ${t.cardBorder} rounded-2xl p-4 sm:p-4.5 transition-all shadow-lg flex flex-col justify-between ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {/* Top row: Minimalist Icon + Label + Micro Trend */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && (
            <div className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 ${t.icon} transition-colors`}>
              <Icon size={13} strokeWidth={2.2} />
            </div>
          )}
          <span className="text-[12px] font-medium text-zinc-400 tracking-normal truncate" title={label}>
            {label}
          </span>
        </div>

        {tone === 'live' ? (
          <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[10.5px] font-mono font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {trend || 'Live'}
          </span>
        ) : trend ? (
          <span className={`text-[10px] sm:text-[10.5px] font-mono font-medium px-2 py-0.5 rounded-full border shrink-0 ${t.badge}`}>
            {trend}
          </span>
        ) : null}
      </div>

      {/* Main Metric Value */}
      <div className="mt-3">
        <div className="text-[23px] sm:text-[25px] xl:text-[26px] font-bold text-white tracking-tight font-display leading-tight truncate">
          {raw !== undefined ? <AnimatedNumber value={raw} format={format} /> : value}
        </div>

        {/* Dedicated Date Range Pill */}
        {dateRange && (
          <div className={`inline-flex items-center gap-1.5 text-[10.5px] font-mono font-semibold px-2 py-0.5 rounded-md mt-1.5 border ${
            tone === 'live'
              ? 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
              : tone === 'brand'
              ? 'text-[#ff7a5c] bg-[#ff5533]/15 border-[#ff5533]/30 shadow-[0_0_10px_rgba(255,85,51,0.15)]'
              : 'text-zinc-300 bg-white/[0.04] border-white/[0.08]'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shrink-0" />
            <span className="truncate">{dateRange}</span>
          </div>
        )}

        {/* Subtitle / Context */}
        {sub && (
          <div className="text-[11px] font-normal text-zinc-500 mt-1 truncate" title={sub}>
            {sub}
          </div>
        )}
      </div>
    </motion.div>
  );
}







