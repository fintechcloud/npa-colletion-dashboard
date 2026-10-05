import { useState, useRef, useEffect } from 'react';
import { Bell, Search, LayoutGrid, HelpCircle, LogOut, Shield, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../utils/auth';
import { useLiveCollection } from '../context/LiveCollectionContext';
import { fmtINR } from '../utils/data';
import GoogleSheetSyncModal from './GoogleSheetSyncModal';

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
  const { user, logout } = useAuth();
  const { totalLiveToday, totalLiveCases } = useLiveCollection();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-2xl border-b border-slate-200/80 px-8 py-3.5 flex items-center justify-between shadow-[0_1px_10px_rgba(0,0,0,0.02)]">
      {/* Breadcrumbs matching reference: Section / Page Title */}
      <div className="flex items-center gap-2 text-[13px]">
        <span className="text-slate-400 font-medium">{section}</span>
        <span className="text-slate-300">/</span>
        <span className="text-slate-900 font-bold tracking-tight font-display text-[14px]">{pageTitle}</span>
      </div>

      {/* Floating Pill Search Bar matching executive styling */}
      <div className="hidden md:flex items-center gap-2.5 bg-slate-100 hover:bg-slate-200/60 border border-slate-200 focus-within:border-[#ff3b30]/50 rounded-full px-4 py-1.5 w-80 transition-all shadow-inner">
        <Search size={14} className="text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Search or type command"
          className="bg-transparent text-[12.5px] text-slate-800 placeholder-slate-400 outline-none w-full"
        />
        <div className="flex items-center gap-1 shrink-0">
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-500 bg-white border border-slate-200 rounded shadow-xs">⌘</kbd>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-500 bg-white border border-slate-200 rounded shadow-xs">K</kbd>
        </div>
      </div>

      {/* Right User Actions */}
      <div className="flex items-center gap-3">
        {/* Google Sheet Live Beacon & Sync Trigger */}
        <button
          type="button"
          onClick={() => setShowSyncModal(true)}
          title={`Google Sheet Live Stream: ${totalLiveCases} cases collected today. Click to manage Google Sheets connection.`}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 transition-all text-left cursor-pointer group shadow-xs"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[11.5px] font-mono font-bold text-emerald-800 group-hover:text-emerald-900 flex items-center gap-1.5">
            <span className="hidden sm:inline">Google Sheet</span>
            <span>Live</span>
            {totalLiveToday > 0 && (
              <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded-full border border-emerald-200">
                {fmtINR(totalLiveToday)}
              </span>
            )}
          </span>
        </button>

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

        {/* Profile Avatar & Interactive Dropdown Menu */}
        <div className="relative" ref={dropdownRef}>
          <div
            onClick={() => setShowDropdown((v) => !v)}
            className="flex items-center gap-2.5 pl-1 cursor-pointer group select-none"
          >
            <div className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-[#ff5e3a] to-[#ff3b30] border border-orange-200 flex items-center justify-center text-white font-bold text-[11.5px] shadow-sm overflow-hidden">
              {user?.picture ? (
                <img src={user.picture} alt={user?.name || 'User'} className="w-full h-full object-cover" />
              ) : (
                <span>{user?.avatar || 'CH'}</span>
              )}
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border-2 border-white" />
            </div>
            <div className="hidden lg:block leading-tight text-left">
              <div className="text-[12px] font-bold text-slate-900 group-hover:text-[#ff4d30] transition-colors flex items-center gap-1">
                <span className="truncate max-w-[140px]">{user?.name || 'Central Head'}</span>
                <ChevronDown size={11} className={`text-slate-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </div>
              <div className="text-[10px] font-mono text-slate-400">
                {user?.authProvider === 'google' ? 'Google SSO Account' : 'Fast Paisa Desk'}
              </div>
            </div>
          </div>

          {/* Clean Executive Dropdown */}
          {showDropdown && (
            <div className="absolute right-0 mt-3 w-64 rounded-2xl bg-white border border-slate-200 shadow-2xl p-3 text-slate-700 z-50 animate-fade-in-up">
              {/* User Header */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 mb-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-slate-900 font-display truncate max-w-[150px]">
                    {user?.name || 'Central Head'}
                  </span>
                  <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-bold">
                    {user?.authProvider === 'google' ? 'Google User' : 'Super Admin'}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-500 truncate">
                  {user?.email || 'admin@fastpaisa.com'}
                </div>
                <div className="text-[10px] text-slate-500 font-medium pt-1 border-t border-slate-200/60 flex items-center gap-1">
                  <Shield size={11} className="text-emerald-600" />
                  <span>Central Operations Desk</span>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="px-2.5 py-1.5 text-[10.5px] font-mono text-emerald-700 flex items-center gap-1.5 border-b border-slate-100 mb-2">
                <CheckCircle2 size={12} />
                <span>Active Executive Session</span>
              </div>

              {/* Sign Out Action */}
              <button
                type="button"
                onClick={() => {
                  setShowDropdown(false);
                  logout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-all cursor-pointer"
              >
                <LogOut size={14} className="text-rose-500" />
                <span>Sign Out from Terminal</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <GoogleSheetSyncModal isOpen={showSyncModal} onClose={() => setShowSyncModal(false)} />
    </header>
  );
}