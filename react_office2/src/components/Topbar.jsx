import { Bell, LayoutGrid, HelpCircle } from 'lucide-react';
import { useAuth } from '../utils/auth';
import { useLiveCollection } from '../context/LiveCollectionContext';
import { fmtINR } from '../utils/data';

const TITLES = {
  overview: ['Collections', 'Overview'],
  states: ['Portfolio', 'State Distribution'],
  leaders: ['Teams', 'Team Leaders'],
  employees: ['Employees', 'Collection Agents'],
  'agent-incentives': ['Incentives & Payouts', 'Agent Incentives'],
  'leader-incentives': ['Incentives & Payouts', 'Team Leader Matrix'],
};

export default function Topbar({ page }) {
  const [section, pageTitle] = TITLES[page] || ['Dashboard', 'Overview'];
  const { user } = useAuth();
  const { totalLiveToday, totalLiveCases } = useLiveCollection();

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-2xl border-b border-slate-200/80 px-8 py-3.5 flex items-center justify-between shadow-[0_1px_10px_rgba(0,0,0,0.02)]">
      {/* Breadcrumbs matching reference: Section / Page Title */}
      <div className="flex items-center gap-2 text-[13px]">
        <span className="text-slate-400 font-medium">{section}</span>
        <span className="text-slate-300">/</span>
        <span className="text-slate-900 font-bold tracking-tight font-display text-[14px]">{pageTitle}</span>
      </div>

      {/* Right User Actions */}
      <div className="flex items-center gap-3">
        {/* Google Sheet Live Beacon */}
        <div
          title={`Google Sheet Live Stream: ${totalLiveCases} cases collected today.`}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-left select-none shadow-xs"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[11.5px] font-mono font-bold text-emerald-800 flex items-center gap-1.5">
            <span className="hidden sm:inline">Google Sheet</span>
            <span>Live</span>
            {totalLiveToday > 0 && (
              <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded-full border border-emerald-200">
                {fmtINR(totalLiveToday)}
              </span>
            )}
          </span>
        </div>

        {/* 3-Minute Auto-Sync Indicator */}
        <div 
          title="Auto-Sync Active: The entire dashboard automatically synchronizes with your Google Sheet every 3 minutes."
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-mono select-none"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Auto-sync 3m</span>
        </div>

        <button 
          title="App Switcher" 
          className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200/70 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <LayoutGrid size={15} />
        </button>

        <button 
          title="Notifications" 
          className="relative w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200/70 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <Bell size={15} />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#ff3b30]" />
        </button>

        <button 
          title="Help" 
          className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200/70 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <HelpCircle size={15} />
        </button>

        <div className="h-5 w-[1px] bg-slate-200 mx-1" />

        {/* Profile Avatar / Executive Badge */}
        <div className="flex items-center gap-2.5 pl-1 select-none">
          <div className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-[#ff5e3a] to-[#ff3b30] border border-orange-200 flex items-center justify-center text-white font-bold text-[11.5px] shadow-sm overflow-hidden">
            {user?.picture ? (
              <img src={user.picture} alt={user?.name || 'User'} className="w-full h-full object-cover" />
            ) : (
              <span>{user?.avatar || 'CH'}</span>
            )}
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border-2 border-white" />
          </div>
          <div className="hidden lg:block leading-tight text-left">
            <div className="text-[12px] font-bold text-slate-900 truncate max-w-[140px]">
              {user?.name || 'Central Head'}
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              Operations Desk
            </div>
          </div>
        </div>
      </div>

    </header>
  );
}