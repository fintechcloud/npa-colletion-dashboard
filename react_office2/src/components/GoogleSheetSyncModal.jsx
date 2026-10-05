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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl relative text-slate-800">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1 cursor-pointer transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-slate-900 font-display">Google Sheet Live Connection</h3>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                <span>{isConnected ? 'Google Cloud Linked' : 'Live Stream Active'}</span>
              </span>
            </div>
            <p className="text-[11.5px] text-slate-500">Real-time daily collection feed updated by collection employees</p>
          </div>
        </div>

        {/* Live Metrics Summary Pill */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 mb-4 text-[11px]">
          <div>
            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Today's Live Total</div>
            <div className="text-[15px] font-mono font-extrabold text-emerald-600 mt-0.5">
              {fmtINR(totalLiveToday)}
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Today's Live Cases</div>
            <div className="text-[15px] font-mono font-extrabold text-slate-800 mt-0.5">
              {totalLiveCases} cases
            </div>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Active Stream</div>
            <div className="text-[12px] font-semibold text-slate-700 truncate mt-0.5" title={sheetTitle}>
              {sheetTitle}
            </div>
          </div>
        </div>

        {/* Enterprise Service Account Card */}
        {authType === 'service_account' && serviceAccountEmail ? (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                <ShieldCheck size={14} className="text-emerald-600" />
                <span>Enterprise Service Account Active</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                24/7 Silent Sync
              </span>
            </div>
            <p className="text-[11.5px] text-slate-600 leading-relaxed mb-2.5">
              Share your Google Sheet with this Service Account email as <strong className="text-slate-900">&quot;Viewer&quot;</strong>, then paste the URL below:
            </p>
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-emerald-200 font-mono text-[11px] text-emerald-800 select-all shadow-xs">
              <span className="truncate">{serviceAccountEmail}</span>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200/80 text-emerald-800 text-[11px] font-sans font-bold transition-colors cursor-pointer border border-emerald-200"
              >
                {copied ? (
                  <>
                    <Check size={12} className="text-emerald-700" />
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
          <div className="mb-4 p-3 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-[11.5px] text-slate-600 flex items-start gap-2.5">
            <Sparkles size={16} className="text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-indigo-800">Enterprise Service Account: </span>
              <span>
                To enable permanent 24/7 background sync without human re-login or 7-day token expiry, place your <code className="font-mono text-slate-800 bg-slate-200 px-1 py-0.5 rounded text-[10.5px]">service_account.json</code> in <code className="font-mono text-slate-800 bg-slate-200 px-1 py-0.5 rounded text-[10.5px]">backend/</code>.
              </span>
            </div>
          </div>
        )}

        {/* Connect Sheet Form */}
        <form onSubmit={handleConnect} className="space-y-3 mb-4 p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200">
          <div className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
            <span className="uppercase tracking-wider">Connect Custom Google Sheet</span>
            <span className="text-[10.5px] font-normal text-slate-500">
              {authType === 'service_account' ? 'Google Cloud Service Account' : 'Google Cloud OAuth'}
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Google Sheet URL / Link
            </label>
            <input
              type="text"
              value={sheetInput}
              onChange={(e) => setSheetInput(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/1xC_gMU1..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono transition-all"
            />
            <p className="text-[10px] text-slate-500 mt-1">Copy the full link from your browser address bar when viewing your sheet</p>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Worksheet Tab Name <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={worksheetInput}
                onChange={(e) => setWorksheetInput(e.target.value)}
                placeholder="e.g. master_data (leave blank to use first tab)"
                className="flex-1 px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono transition-all"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm flex items-center gap-1.5 shrink-0"
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
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : feedbackType === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}>
            {feedbackType === 'success' ? <CheckCircle2 size={14} className="shrink-0" /> : <AlertCircle size={14} className="shrink-0" />}
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Recent Live Transactions */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Clock size={12} className="text-emerald-600" />
              <span>Today's Live Transactions Feed ({recentTransactions.length})</span>
            </span>
            <button
              type="button"
              onClick={handleSyncNow}
              disabled={isLoading}
              className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
              <span>Sync Now</span>
            </button>
          </div>

          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {recentTransactions.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                Awaiting new live transactions today…
              </div>
            ) : (
              recentTransactions.slice(0, 10).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs transition-colors shadow-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="font-mono text-slate-500 text-[10.5px] shrink-0">{tx.time}</span>
                    <span className="font-bold text-slate-900 truncate max-w-[130px]">{tx.agent}</span>
                    <span className="text-[10.5px] text-slate-400 font-mono hidden sm:inline truncate max-w-[110px]">
                      {tx.loanNo}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-bold text-emerald-600">
                      +{fmtINR(tx.amount)}
                    </span>
                    <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 text-slate-600">
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[10.5px] text-slate-500">
          <span>Last live sync: {lastSynced ? new Date(lastSynced).toLocaleTimeString('en-IN') : 'Just now'}</span>
          <span className="flex items-center gap-1 text-emerald-600 font-medium">
            <ShieldCheck size={12} />
            <span>{authType === 'service_account' ? 'Google Cloud Service Account Linked' : 'Google Cloud OAuth Protected'}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
