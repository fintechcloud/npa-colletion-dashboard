import { useRef, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Layers, TrendingUp,
  Wallet, Users, CheckCircle2, ArrowRight, X, Clock, Building2,
} from 'lucide-react';
import { useDomain } from '../context/DomainContext';
import { CASES, DOMAINS, META, fmtINR, round1 } from '../utils/data';

const DOMAIN_THEMES = {
  'All Domains': {
    badge: 'bg-gradient-to-r from-[#ff5e3a] to-[#ff3b30] text-white',
    pill: 'bg-orange-50 text-[#ff4d30] border-orange-200',
    bar: 'bg-gradient-to-r from-[#ff5e3a] to-[#ff3b30]',
  },
  'Salary4Sure': {
    badge: 'bg-orange-500 text-white',
    pill: 'bg-orange-50 text-orange-700 border-orange-200',
    bar: 'bg-orange-500',
  },
  'SALARY ADDA': {
    badge: 'bg-indigo-600 text-white',
    pill: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    bar: 'bg-indigo-600',
  },
  'Snap Paisa': {
    badge: 'bg-emerald-600 text-white',
    pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    bar: 'bg-emerald-600',
  },
  'Minutes Loan': {
    badge: 'bg-amber-500 text-white',
    pill: 'bg-amber-50 text-amber-700 border-amber-200',
    bar: 'bg-amber-500',
  },
  'Fast salary': {
    badge: 'bg-purple-600 text-white',
    pill: 'bg-purple-50 text-purple-700 border-purple-200',
    bar: 'bg-purple-600',
  },
  'DHANVARSHAA': {
    badge: 'bg-rose-500 text-white',
    pill: 'bg-rose-50 text-rose-700 border-rose-200',
    bar: 'bg-rose-500',
  },
  'Salary Setu': {
    badge: 'bg-cyan-600 text-white',
    pill: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    bar: 'bg-cyan-600',
  },
  'Jhatpat Cash': {
    badge: 'bg-teal-600 text-white',
    pill: 'bg-teal-50 text-teal-700 border-teal-200',
    bar: 'bg-teal-600',
  },
  'F1SPEEDLOAN': {
    badge: 'bg-blue-600 text-white',
    pill: 'bg-blue-50 text-blue-700 border-blue-200',
    bar: 'bg-blue-600',
  },
};

export default function DomainShowcaseCarousel() {
  const { selectedDomains, setSelectedDomain, clearDomain, isDomainActive } = useDomain();
  const carouselRef = useRef(null);

  const scroll = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = 330;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Compute live breakdown for every domain
  const domainCards = useMemo(() => {
    const dNames = DOMAINS && DOMAINS.length > 0 ? DOMAINS : (META.domains || []);

    let allDue = 0;
    let allRecvd = 0;
    let allPrincipal = 0;
    let allSep = 0;
    const allAgents = new Set();
    const allLeaders = new Set();

    const perDomain = dNames.map((d, dI) => {
      let due = 0;
      let recvd = 0;
      let principal = 0;
      let sep2026Recvd = 0;
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
        }
      }

      allDue += due;
      allRecvd += recvd;
      allPrincipal += principal;
      allSep += sep2026Recvd;
      agentSet.forEach((a) => allAgents.add(a));
      leaderSet.forEach((l) => allLeaders.add(l));

      const pending = due - recvd;
      const pct = due > 0 ? round1((recvd / due) * 100) : 0;
      const caseCount = META.domainCounts?.[d] ?? CASES.filter((c) => c[8] === dI).length;

      return {
        name: d,
        cases: caseCount,
        due,
        recvd,
        pending,
        principal,
        sep2026Recvd,
        pct,
        agents: agentSet.size,
        leaders: leaderSet.size,
        isSummary: false,
      };
    });

    const allPending = allDue - allRecvd;
    const allPct = allDue > 0 ? round1((allRecvd / allDue) * 100) : 0;
    const allItem = {
      name: 'All Domains',
      cases: CASES.length,
      due: allDue,
      recvd: allRecvd,
      pending: allPending,
      principal: allPrincipal,
      sep2026Recvd: allSep,
      pct: allPct,
      agents: allAgents.size,
      leaders: allLeaders.size,
      isSummary: true,
    };

    return [allItem, ...perDomain];
  }, [CASES.length, DOMAINS]);

  return (
    <div className="bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5">
      {/* Header with Title and Scroll Arrows */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#ff4d30] shadow-xs">
            <Building2 size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[14.5px] font-bold text-slate-900 font-display tracking-tight">
                Domain Portfolio Breakdown
              </h3>
              <span className="text-[10.5px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {domainCards.length - 1} Lending Brands
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Scroll horizontally to view total money to collect, last month (Sep) collection &amp; recovery progress
            </p>
          </div>
        </div>

        {/* Carousel controls */}
        <div className="flex items-center gap-2">
          {isDomainActive && (
            <button
              type="button"
              onClick={clearDomain}
              className="text-[11.5px] font-bold text-[#ff4d30] hover:text-[#e6352b] bg-orange-50 hover:bg-orange-100/80 border border-orange-200 px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-2xs mr-1"
            >
              Reset to All Domains
            </button>
          )}
          <button
            type="button"
            onClick={() => scroll('left')}
            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            title="Scroll left"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            title="Scroll right"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Horizontal Scroll Track */}
      <div
        ref={carouselRef}
        className="flex items-stretch gap-3 overflow-x-auto pb-2 scroll-smooth scrollbar-thin scrollbar-thumb-slate-200 select-none"
      >
        {domainCards.map((item) => {
          const isSelected = item.name === 'All Domains' ? selectedDomains.size === 0 : selectedDomains.has(item.name);
          const theme = DOMAIN_THEMES[item.name] || DOMAIN_THEMES['All Domains'];

          return (
            <div
              key={item.name}
              onClick={() => setSelectedDomain(item.name)}
              className={`min-w-[280px] max-w-[280px] sm:min-w-[310px] sm:max-w-[310px] rounded-2xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between relative group ${
                isSelected
                  ? 'bg-gradient-to-b from-orange-50/90 via-white to-amber-50/30 border-2 border-[#ff3b30] shadow-md ring-2 ring-[#ff3b30]/15'
                  : 'bg-white hover:bg-slate-50/70 border border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-sm'
              }`}
            >
              {/* Card Header: Brand name + Case count + Active Tag */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center font-display font-extrabold text-[11px] shrink-0 shadow-2xs ${theme.badge}`}
                    >
                      {item.isSummary ? 'FP' : item.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="font-bold text-[13.5px] text-slate-900 font-display truncate">
                      {item.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10.5px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {item.cases.toLocaleString('en-IN')} cases
                    </span>
                    {isSelected && (
                      <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-md bg-[#ff3b30] text-white flex items-center gap-0.5 animate-fade-in shadow-2xs">
                        <CheckCircle2 size={10} />
                        <span>ACTIVE</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Primary Metric: Total Money To Collect */}
                <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70 mb-3">
                  <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <span>Total Money To Collect</span>
                    <span className="font-mono text-slate-500 font-semibold">Remaining</span>
                  </div>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <div className="text-[19px] font-black font-mono text-slate-900 tracking-tight">
                      {fmtINR(item.due)}
                    </div>
                    <div className="text-[12px] font-bold font-mono text-amber-700">
                      {fmtINR(item.pending)}
                    </div>
                  </div>
                </div>

                {/* Recovery Progress Bar */}
                <div className="mb-3 space-y-1">
                  <div className="flex items-center justify-between text-[10.5px]">
                    <span className="text-slate-500 font-medium">Recovery Rate</span>
                    <span className="font-mono font-bold text-slate-800">
                      {item.pct}% ({fmtINR(item.recvd)})
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.pct >= 30
                          ? 'bg-emerald-500'
                          : item.pct >= 20
                          ? 'bg-amber-500'
                          : 'bg-[#ff4d30]'
                      }`}
                      style={{ width: `${Math.min(item.pct, 100)}%` }}
                    />
                  </div>
                </div>

                {/* 3-Cell Grid: Last Month Collection, Principal Disbursed, Agents */}
                <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100 text-[11px]">
                  <div>
                    <div className="text-[9.5px] uppercase font-bold text-slate-400">Last Mo (Sep)</div>
                    <div className={`font-mono font-bold text-[12px] mt-0.5 ${item.sep2026Recvd > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {item.sep2026Recvd > 0 ? fmtINR(item.sep2026Recvd) : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9.5px] uppercase font-bold text-slate-400">Principal</div>
                    <div className="font-mono font-bold text-slate-700 text-[12px] mt-0.5">
                      {fmtINR(item.principal)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9.5px] uppercase font-bold text-slate-400">Team Size</div>
                    <div className="font-mono font-bold text-slate-700 text-[12px] mt-0.5">
                      {item.agents} Agents
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Card Action Hint */}
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px] font-semibold text-slate-400 group-hover:text-[#ff4d30] transition-colors">
                <span>{isSelected ? 'Click to deselect' : 'Click to filter dashboard'}</span>
                <ArrowRight size={11} className={`transition-transform duration-200 ${isSelected ? 'rotate-90' : 'group-hover:translate-x-1'}`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
