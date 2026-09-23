import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import OverviewPage from './components/OverviewPage';
import StatePortfolioPage from './components/StatePortfolioPage';
import TeamLeadersPage from './components/TeamLeadersPage';
import EmployeesPage from './components/EmployeesPage';
import AgentIncentivesPage from './components/AgentIncentivesPage';
import LeaderIncentivesPage from './components/LeaderIncentivesPage';
import AgentDrawer from './components/AgentDrawer';
import LeaderDrawer from './components/LeaderDrawer';
import LoginPage from './components/LoginPage';
import { AuthProvider } from './context/AuthContext';
import { LiveCollectionProvider, useLiveCollection } from './context/LiveCollectionContext';
import { useAuth } from './utils/auth';
import { fetchDashboardData } from './utils/data';

function Dashboard() {
  const { user } = useAuth();
  const { dataRevision } = useLiveCollection();
  const [page, setPage] = useState('overview');
  const [openAgent, setOpenAgent] = useState(null);
  const [openLeader, setOpenLeader] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  const retryLoad = () => {
    setStatus('loading');
    fetchDashboardData()
      .then(() => setStatus('ready'))
      .catch((err) => {
        setErrorMsg(err.message);
        setStatus('error');
      });
  };

  useEffect(() => {
    if (!user) return;
    let ignore = false;
    fetchDashboardData()
      .then(() => {
        if (!ignore) setStatus('ready');
      })
      .catch((err) => {
        if (!ignore) {
          setErrorMsg(err.message);
          setStatus('error');
        }
      });
    return () => { ignore = true; };
  }, [user]);

  // Auth Guard: If not logged in, render enterprise Login page
  if (!user) {
    return <LoginPage />;
  }

  const handleOpenAgent = (name) => { setOpenLeader(null); setOpenAgent(name); };
  const handleOpenLeader = (name) => { setOpenAgent(null); setOpenLeader(name); };

  if (status === 'loading') {
    return (
      <div className="relative min-h-screen bg-stone-950 flex items-center justify-center overflow-hidden">
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
          style={{ backgroundImage: "url('/login-bg.jpg')" }}
        />
        <div className="fixed inset-0 bg-gradient-to-b from-[#181116]/85 via-[#0c0d15]/90 to-[#07080d]/95 pointer-events-none" />
        <div className="relative z-10 text-center glass-panel px-8 py-6 rounded-3xl border border-white/10 shadow-2xl">
          <div className="w-10 h-10 border-[3px] border-[#f96332] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-[13px] font-semibold text-zinc-300 tracking-wide">Loading collections intelligence…</div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="relative min-h-screen bg-stone-950 flex items-center justify-center px-6 overflow-hidden">
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
          style={{ backgroundImage: "url('/login-bg.jpg')" }}
        />
        <div className="fixed inset-0 bg-gradient-to-b from-[#181116]/85 via-[#0c0d15]/90 to-[#07080d]/95 pointer-events-none" />
        <div className="relative z-10 text-center max-w-sm glass-panel p-6 rounded-3xl border border-white/10 shadow-2xl">
          <div className="text-[16px] font-display font-bold text-white mb-2">Couldn't reach the backend</div>
          <div className="text-[12.5px] text-zinc-400 mb-5 leading-relaxed">
            {errorMsg}. Make sure the FastAPI server is running on port 8002
            (<code className="text-zinc-300 bg-white/5 px-1.5 py-0.5 rounded text-[11px]">uvicorn main:app --reload --port 8002</code>).
          </div>
          <button onClick={retryLoad} className="text-[12.5px] font-semibold text-white bg-[#f96332] hover:bg-[#ff5722] px-5 py-2.5 rounded-full transition-all shadow-lg shadow-orange-500/30">
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen text-zinc-100 selection:bg-[#f96332]/30 selection:text-white animate-fade-in">
      {/* 1. Atmospheric Photographic Background matching Login Page */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0 scale-100"
        style={{ backgroundImage: "url('/login-bg.jpg')" }}
      />
      {/* 2. Soft translucent dusk overlay so scenic photography is clearly visible */}
      <div className="fixed inset-0 bg-gradient-to-b from-black/25 via-black/40 to-black/60 pointer-events-none z-0" />

      {/* 3. Dashboard Core Layout */}
      <div className="relative z-10 flex min-h-screen w-full">
        <Sidebar page={page} setPage={setPage} />
        <div className="flex-1 min-w-0 flex flex-col">
          <Topbar page={page} />
          <div className="px-8 py-7 flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${page}-${dataRevision}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              >
                {page === 'overview' && <OverviewPage onOpenAgent={handleOpenAgent} />}
                {page === 'states' && <StatePortfolioPage />}
                {page === 'leaders' && <TeamLeadersPage onOpenLeader={handleOpenLeader} />}
                {page === 'employees' && <EmployeesPage onOpenAgent={handleOpenAgent} />}
                {page === 'agent-incentives' && (
                  <AgentIncentivesPage onOpenAgent={handleOpenAgent} onNavigatePage={setPage} />
                )}
                {page === 'leader-incentives' && (
                  <LeaderIncentivesPage onOpenLeader={handleOpenLeader} onNavigatePage={setPage} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {openAgent && <AgentDrawer name={openAgent} onClose={() => setOpenAgent(null)} />}
      {openLeader && <LeaderDrawer name={openLeader} onClose={() => setOpenLeader(null)} onOpenAgent={handleOpenAgent} />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LiveCollectionProvider>
        <Dashboard />
      </LiveCollectionProvider>
    </AuthProvider>
  );
}