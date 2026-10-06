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
  valueClassName = '',
}) {
  const toneMap = {
    default: {
      icon: 'text-slate-600 bg-slate-100 border-slate-200',
      badge: 'text-slate-600 bg-slate-100 border-slate-200',
      cardBorder: 'hover:border-slate-300',
    },
    brand: {
      icon: 'text-[#ff4d30] bg-orange-50 border-orange-200',
      badge: 'text-[#ff4d30] bg-orange-50 border-orange-200',
      cardBorder: 'hover:border-orange-300',
    },
    warn: {
      icon: 'text-amber-600 bg-amber-50 border-amber-200',
      badge: 'text-amber-700 bg-amber-50 border-amber-200',
      cardBorder: 'hover:border-amber-300',
    },
    danger: {
      icon: 'text-rose-600 bg-rose-50 border-rose-200',
      badge: 'text-rose-700 bg-rose-50 border-rose-200',
      cardBorder: 'hover:border-rose-300',
    },
    live: {
      icon: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      badge: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      cardBorder: 'border-emerald-200 hover:border-emerald-300',
    },
    neutral: {
      icon: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      badge: 'text-indigo-700 bg-indigo-50 border-indigo-200',
      cardBorder: 'hover:border-indigo-300',
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
      className={`group relative bg-white hover:bg-slate-50/60 backdrop-blur-xl border border-slate-200/90 ${t.cardBorder} rounded-2xl p-4 sm:p-4.5 transition-all shadow-sm hover:shadow-md flex flex-col justify-between ${
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
          <span className="text-[12px] font-semibold text-slate-500 tracking-normal truncate" title={label}>
            {label}
          </span>
        </div>

        {tone === 'live' ? (
          <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[10.5px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {trend || 'Live'}
          </span>
        ) : trend ? (
          <span className={`text-[10px] sm:text-[10.5px] font-mono font-bold px-2 py-0.5 rounded-full border shrink-0 ${t.badge}`}>
            {trend}
          </span>
        ) : null}
      </div>

      {/* Main Metric Value */}
      <div className="mt-3">
        <div className={`font-bold text-slate-900 tracking-tight font-display leading-tight truncate ${valueClassName || 'text-[23px] sm:text-[25px] xl:text-[26px]'}`}>
          {raw !== undefined ? <AnimatedNumber value={raw} format={format} /> : value}
        </div>

        {/* Dedicated Date Range Pill */}
        {dateRange && (
          <div className={`inline-flex items-center gap-1.5 text-[10.5px] font-mono font-semibold px-2 py-0.5 rounded-md mt-1.5 border ${
            tone === 'live'
              ? 'text-emerald-800 bg-emerald-50 border-emerald-200 shadow-xs'
              : tone === 'brand'
              ? 'text-[#c23b22] bg-orange-50 border-orange-200 shadow-xs'
              : 'text-slate-700 bg-slate-100 border-slate-200'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shrink-0" />
            <span className="truncate">{dateRange}</span>
          </div>
        )}

        {/* Subtitle / Context */}
        {sub && (
          <div className="text-[11px] font-medium text-slate-400 mt-1 truncate" title={sub}>
            {sub}
          </div>
        )}
      </div>
    </motion.div>
  );
}







