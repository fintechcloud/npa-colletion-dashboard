import { useState } from 'react';
import {
  X, FileSpreadsheet, RefreshCw, CheckCircle2, AlertCircle,
  Clock, ShieldCheck, Database, Copy, Check, Sparkles
} from 'lucide-react';
import { useLiveCollection } from '../context/LiveCollectionContext';
import { fmtINR } from '../utils/data';

export default function GoogleSheetSyncModal({ isOpen, onClose }) {
  const {
    liveData,
    isLoading,
    syncLive,
    connectSheet,
    totalLiveToday,
    totalLiveCases,
    recentTransactions,
    isConnected,
    sheetTitle,
    lastSynced,
    authType,
    serviceAccountEmail,
    refreshAllData,
  } = useLiveCollection();

  const [sheetInput, setSheetInput] = useState(liveData?.sheetUrl || '');
  const [worksheetInput, setWorksheetInput] = useState(liveData?.worksheet || '');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackType, setFeedbackType] = useState('info'); // 'success' | 'error' | 'info'
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = () => {
    if (serviceAccountEmail) {
      navigator.clipboard.writeText(serviceAccountEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  if (!isOpen) return null;

  const handleConnect = async (e) => {
    e.preventDefault();
    const cleanInput = sheetInput.trim();
    if (!cleanInput) {
      setFeedbackMsg('Please paste a valid Google Sheet URL or Spreadsheet ID.');
      setFeedbackType('error');
      return;
    }
    if (cleanInput.includes('@') || cleanInput.includes('gserviceaccount')) {
      setFeedbackMsg('You pasted the Service Account email here. Please paste your Google Sheet URL (from your browser address bar) instead!');
      setFeedbackType('error');
      return;
    }
    setFeedbackMsg('Connecting to Google Cloud & fetching spreadsheet…');
    setFeedbackType('info');

    const res = await connectSheet(cleanInput, worksheetInput.trim() || null);
    if (res.success) {
      setFeedbackMsg(`Successfully connected to "${res.data.sheetTitle}"! Live collections are syncing.`);
      setFeedbackType('success');
    } else {
      setFeedbackMsg(`Connection error: ${res.error}`);
      setFeedbackType('error');
    }
  };

  const handleSyncNow = async () => {
    setFeedbackMsg('Syncing entire dashboard from Google Sheet…');
    setFeedbackType('info');
    if (refreshAllData) {
      await refreshAllData(true);
    } else {
      await syncLive();
    }
    setFeedbackMsg('Entire dashboard updated with the latest Google Sheet data!');
    setFeedbackType('success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-xl rounded-3xl bg-[#11121d]/98 border border-white/15 p-6 shadow-2xl relative text-zinc-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1 cursor-pointer transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-white font-display">Google Sheet Live Connection</h3>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                isConnected
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                <span>{isConnected ? 'Google Cloud Linked' : 'Live Stream Active'}</span>
              </span>
            </div>
            <p className="text-[11.5px] text-zinc-400">Real-time daily collection feed updated by collection employees</p>
          </div>
        </div>

        {/* Live Metrics Summary Pill */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-white/[0.03] border border-white/10 mb-4 text-[11px]">
          <div>
            <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Today's Live Total</div>
            <div className="text-[15px] font-mono font-extrabold text-emerald-400 mt-0.5">
              {fmtINR(totalLiveToday)}
            </div>
          </div>
          <div>
            <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Today's Live Cases</div>
            <div className="text-[15px] font-mono font-extrabold text-white mt-0.5">
              {totalLiveCases} cases
            </div>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Active Stream</div>
            <div className="text-[12px] font-semibold text-zinc-300 truncate mt-0.5" title={sheetTitle}>
              {sheetTitle}
            </div>
          </div>
        </div>

        {/* Enterprise Service Account Card */}
        {authType === 'service_account' && serviceAccountEmail ? (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/25 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>Enterprise Service Account Active</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                24/7 Silent Sync
              </span>
            </div>
            <p className="text-[11.5px] text-zinc-300 leading-relaxed mb-2.5">
              Share your Google Sheet with this Service Account email as <strong className="text-white">&quot;Viewer&quot;</strong>, then paste the URL below:
            </p>
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-black/40 border border-emerald-500/20 font-mono text-[11px] text-emerald-200 select-all">
              <span className="truncate">{serviceAccountEmail}</span>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-sans font-bold transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check size={12} className="text-emerald-300" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-4 p-3 rounded-2xl bg-indigo-500/[0.06] border border-indigo-500/20 text-[11.5px] text-zinc-300 flex items-start gap-2.5">
            <Sparkles size={16} className="text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-indigo-300">Enterprise Service Account: </span>
              <span>
                To enable permanent 24/7 background sync without human re-login or 7-day token expiry, place your <code className="font-mono text-white bg-white/10 px-1 py-0.5 rounded text-[10.5px]">service_account.json</code> in <code className="font-mono text-white bg-white/10 px-1 py-0.5 rounded text-[10.5px]">backend/</code>.
              </span>
            </div>
          </div>
        )}

        {/* Connect Sheet Form */}
        <form onSubmit={handleConnect} className="space-y-3 mb-4 p-3.5 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="text-[11px] font-bold text-white flex items-center justify-between">
            <span className="uppercase tracking-wider">Connect Custom Google Sheet</span>
            <span className="text-[10.5px] font-normal text-zinc-400">
              {authType === 'service_account' ? 'Google Cloud Service Account' : 'Google Cloud OAuth'}
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-300 mb-1">
              Google Sheet URL / Link
            </label>
            <input
              type="text"
              value={sheetInput}
              onChange={(e) => setSheetInput(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/1xC_gMU1..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-zinc-500 text-xs outline-none focus:border-emerald-400 font-mono transition-colors"
            />
            <p className="text-[10px] text-zinc-400 mt-1">Copy the full link from your browser address bar when viewing your sheet</p>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-300 mb-1">
              Worksheet Tab Name <span className="text-zinc-500 font-normal">(Optional)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={worksheetInput}
                onChange={(e) => setWorksheetInput(e.target.value)}
                placeholder="e.g. master_data (leave blank to use first tab)"
                className="flex-1 px-3.5 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-zinc-500 text-xs outline-none focus:border-emerald-400 font-mono transition-colors"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center gap-1.5 shrink-0"
              >
                {isLoading ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Database size={13} />
                )}
                <span>Connect</span>
              </button>
            </div>
          </div>
        </form>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div className={`mb-4 px-3.5 py-2 rounded-xl text-[11.5px] flex items-center gap-2 border ${
            feedbackType === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : feedbackType === 'error'
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
              : 'bg-blue-500/15 border-blue-500/30 text-blue-300'
          }`}>
            {feedbackType === 'success' ? <CheckCircle2 size={14} className="shrink-0" /> : <AlertCircle size={14} className="shrink-0" />}
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Recent Live Transactions */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Clock size={12} className="text-emerald-400" />
              <span>Today's Live Transactions Feed ({recentTransactions.length})</span>
            </span>
            <button
              type="button"
              onClick={handleSyncNow}
              disabled={isLoading}
              className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
              <span>Sync Now</span>
            </button>
          </div>

          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {recentTransactions.length === 0 ? (
              <div className="text-center py-6 text-zinc-500 text-xs">
                Awaiting new live transactions today…
              </div>
            ) : (
              recentTransactions.slice(0, 10).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] text-xs transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span className="font-mono text-zinc-400 text-[10.5px] shrink-0">{tx.time}</span>
                    <span className="font-bold text-white truncate max-w-[130px]">{tx.agent}</span>
                    <span className="text-[10.5px] text-zinc-400 font-mono hidden sm:inline truncate max-w-[110px]">
                      {tx.loanNo}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-bold text-emerald-400">
                      +{fmtINR(tx.amount)}
                    </span>
                    <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-zinc-300">
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[10.5px] text-zinc-500">
          <span>Last live sync: {lastSynced ? new Date(lastSynced).toLocaleTimeString('en-IN') : 'Just now'}</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck size={12} />
            <span>{authType === 'service_account' ? 'Google Cloud Service Account Linked' : 'Google Cloud OAuth Protected'}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
