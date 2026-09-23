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
  {
    title: 'INCENTIVES & PAYOUTS',
    items: [
      { key: 'agent-incentives', label: 'Agent Incentives', icon: Award },
      { key: 'leader-incentives', label: 'Leader Incentives', icon: TrendingUp },
    ],
  },
];

export default function Sidebar({ page, setPage }) {
  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 bg-[#0b0c14]/40 backdrop-blur-2xl border-r border-white/10 flex flex-col py-5 px-3.5 select-none z-30">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-2 pb-6 pt-1">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-[#ff5e3a] to-[#ff3b30] flex items-center justify-center text-white shadow-[0_0_18px_rgba(255,59,48,0.45)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
              <circle cx="12" cy="12" r="3" fill="currentColor" />
              <path d="M12 2v3m0 14v3M2 12h3m14 0h3m-3.5-6.5l-2.1 2.1m-8.8 8.8l-2.1 2.1m0-13l2.1 2.1m8.8 8.8l2.1 2.1" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-[18px] tracking-tight text-white leading-none">Fast Paisa</span>
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-white/[0.08] text-[#ff6b57] border border-white/[0.06] tracking-wider">PRO</span>
            </div>
            <span className="text-[11px] font-medium text-zinc-500 tracking-wide mt-0.5 block">Collections & Recovery</span>
          </div>
        </div>
      </div>

      {/* Nav groups */}
      <div className="flex-1 flex flex-col gap-5 overflow-y-auto pr-1">
        {SECTIONS.map((sec) => (
          <div key={sec.title}>
            <div className="text-[10px] font-bold tracking-wider uppercase text-zinc-500 px-3 pb-2 font-display">
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
                        className="absolute inset-0 bg-white/[0.08] border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] rounded-xl -z-10"
                        transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                      />
                    )}
                    <Icon
                      size={18}
                      strokeWidth={2.2}
                      className={`transition-colors ${
                        active
                          ? 'text-[#ff5533] drop-shadow-[0_0_8px_rgba(255,85,51,0.5)]'
                          : 'text-zinc-400 group-hover:text-zinc-200'
                      }`}
                    />
                    <span className={`transition-colors ${active ? 'text-white font-bold' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                      {item.label}
                    </span>
                    {active && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#ff3b30] shadow-[0_0_8px_#ff3b30]" />
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
        <div className="relative rounded-2xl p-3.5 bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.08] overflow-hidden">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#ff3b30]/15 border border-[#ff3b30]/30 flex items-center justify-center text-[#ff5533] shrink-0">
              <Sparkles size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-bold text-white font-display flex items-center gap-1.5">
                Collections Core
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="text-[10.5px] text-zinc-400 mt-0.5 leading-snug">
                Data as of <span className="text-zinc-300 font-semibold">{fmtDateShort(META.dateMax)}</span>
              </div>
            </div>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-zinc-500">
            <span>Ledgered by due date</span>
            <span className="font-mono text-zinc-400">v2.4</span>
          </div>
        </div>
      </div>
    </aside>
  );
}