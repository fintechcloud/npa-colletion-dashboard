import { motion } from 'framer-motion';
import { LayoutGrid, Users, UserCircle2, Sparkles, MapPin, Award, TrendingUp } from 'lucide-react';
import { META, fmtDateShort } from '../utils/data';

const SECTIONS = [
  {
    title: 'GENERAL',
    items: [
      { key: 'overview', label: 'Overview', icon: LayoutGrid },
      { key: 'states', label: 'State Portfolio', icon: MapPin },
    ],
  },
  {
    title: 'TEAMS & RECOVERY',
    items: [
      { key: 'leaders', label: 'Team Leaders', icon: Users },
      { key: 'employees', label: 'Collection Agents', icon: UserCircle2 },
    ],
  },
  // INCENTIVES & PAYOUTS (Commented out for NPA dashboard - preserve for future NPA-specific slabs)
  // {
  //   title: 'INCENTIVES & PAYOUTS',
  //   items: [
  //     { key: 'agent-incentives', label: 'Agent Incentives', icon: Award },
  //     { key: 'leader-incentives', label: 'Leader Incentives', icon: TrendingUp },
  //   ],
  // },
];

export default function Sidebar({ page, setPage }) {
  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 bg-white/85 backdrop-blur-2xl border-r border-slate-200/80 flex flex-col py-5 px-3.5 select-none z-30 shadow-[1px_0_10px_rgba(0,0,0,0.02)]">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-2 pb-6 pt-1">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-[#ff5e3a] to-[#ff3b30] flex items-center justify-center text-white shadow-md shadow-orange-500/25">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
              <circle cx="12" cy="12" r="3" fill="currentColor" />
              <path d="M12 2v3m0 14v3M2 12h3m14 0h3m-3.5-6.5l-2.1 2.1m-8.8 8.8l-2.1 2.1m0-13l2.1 2.1m8.8 8.8l2.1 2.1" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-[18px] tracking-tight text-slate-900 leading-none">NPA Recovery</span>
              <span className="text-[9.5px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-orange-50 text-[#ff4d30] border border-orange-200/60 tracking-wider">NPA-2</span>
            </div>
            <span className="text-[11px] font-medium text-slate-500 tracking-wide mt-0.5 block">Multi-Domain Intelligence</span>
          </div>
        </div>
      </div>

      {/* Nav groups */}
      <div className="flex-1 flex flex-col gap-5 overflow-y-auto pr-1">
        {SECTIONS.map((sec) => (
          <div key={sec.title}>
            <div className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-3 pb-2 font-display">
              {sec.title}
            </div>
            <div className="flex flex-col gap-1">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const active = page === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setPage(item.key)}
                    className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-left transition-all z-10 outline-none group cursor-pointer"
                  >
                    {active && (
                      <motion.div
                        layoutId="sidebar-active-pill"
                        className="absolute inset-0 bg-orange-50/90 border border-orange-200/70 shadow-xs rounded-xl -z-10"
                        transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                      />
                    )}
                    <Icon
                      size={18}
                      strokeWidth={2.2}
                      className={`transition-colors ${
                        active
                          ? 'text-[#ff4d30]'
                          : 'text-slate-400 group-hover:text-slate-700'
                      }`}
                    />
                    <span className={`transition-colors ${active ? 'text-slate-900 font-bold' : 'text-slate-600 group-hover:text-slate-900'}`}>
                      {item.label}
                    </span>
                    {active && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#ff3b30]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Vaulto-style Pro/Status Card */}
      <div className="mt-auto pt-4">
        <div className="relative rounded-2xl p-3.5 bg-gradient-to-b from-slate-50 to-white border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200/60 flex items-center justify-center text-[#ff4d30] shrink-0">
              <Sparkles size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-bold text-slate-900 font-display flex items-center gap-1.5">
                Collections Core
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">
                Data as of <span className="text-slate-700 font-semibold">{fmtDateShort(META.dateMax)}</span>
              </div>
            </div>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400">
            <span>Ledgered by due date</span>
            <span className="font-mono text-slate-500 font-medium">v2.4</span>
          </div>
        </div>
      </div>
    </aside>
  );
}