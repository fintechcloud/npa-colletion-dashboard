import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import OverviewPage from './components/OverviewPage';
import StatePortfolioPage from './components/StatePortfolioPage';
import TeamLeadersPage from './components/TeamLeadersPage';
import EmployeesPage from './components/EmployeesPage';
// import AgentIncentivesPage from './components/AgentIncentivesPage';
// import LeaderIncentivesPage from './components/LeaderIncentivesPage';
import AgentDrawer from './components/AgentDrawer';
import LeaderDrawer from './components/LeaderDrawer';
// import LoginPage from './components/LoginPage';
import { AuthProvider } from './context/AuthContext';
import { LiveCollectionProvider, useLiveCollection } from './context/LiveCollectionContext';
import { DomainProvider } from './context/DomainContext';
import { useAuth } from './utils/auth';
import { fetchDashboardData } from './utils/data';

// Browser History & URL State Synchronization helpers
function parseLocationParams() {
  if (typeof window === 'undefined') return { page: 'overview', agent: null, leader: null };
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab') || 'overview';
  const validTabs = ['overview', 'states', 'leaders', 'employees'];
  return {
    page: validTabs.includes(tab) ? tab : 'overview',
    agent: params.get('agent') || null,
    leader: params.get('leader') || null,
  };
}

function buildUrl(targetPage, targetAgent, targetLeader) {
  if (typeof window === 'undefined') return '/';
  const params = new URLSearchParams();
  if (targetPage && targetPage !== 'overview') {
    params.set('tab', targetPage);
  }
  if (targetAgent) {
    params.set('agent', targetAgent);
  }
  if (targetLeader) {
    params.set('leader', targetLeader);
  }
  const qs = params.toString();
  return `${window.location.pathname}${qs ? '?' + qs : ''}`;
}

function Dashboard() {
  const { user } = useAuth();
  const { dataRevision } = useLiveCollection();
  const [page, setPageState] = useState(() => parseLocationParams().page);
  const [openAgent, setOpenAgentState] = useState(() => parseLocationParams().agent);
  const [openLeader, setOpenLeaderState] = useState(() => parseLocationParams().leader);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  // Synchronize browser history and back/forward navigation (popstate)
  useEffect(() => {
    // Ensure initial entry has state
    const initialUrl = buildUrl(page, openAgent, openLeader);
    window.history.replaceState({ page, agent: openAgent, leader: openLeader }, '', initialUrl);

    const onPopState = (e) => {
      const state = e.state || parseLocationParams();
      setPageState(state.page || 'overview');
      setOpenAgentState(state.agent || null);
      setOpenLeaderState(state.leader || null);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Navigate to a new tab/page with browser history tracking
  const setPage = (newPage) => {
    if (newPage === page && !openAgent && !openLeader) return;
    const newUrl = buildUrl(newPage, null, null);
    window.history.pushState({ page: newPage, agent: null, leader: null }, '', newUrl);
    setPageState(newPage);
    setOpenAgentState(null);
    setOpenLeaderState(null);
  };

  // Open Agent Drawer with browser history tracking
  const handleOpenAgent = (name) => {
    const newUrl = buildUrl(page, name, null);
    window.history.pushState({ page, agent: name, leader: null }, '', newUrl);
    setOpenLeaderState(null);
    setOpenAgentState(name);
  };

  // Open Leader Drawer with browser history tracking
  const handleOpenLeader = (name) => {
    const newUrl = buildUrl(page, null, name);
    window.history.pushState({ page, agent: null, leader: name }, '', newUrl);
    setOpenAgentState(null);
    setOpenLeaderState(name);
  };

  // Close Agent Drawer with history preservation
  const handleCloseAgent = () => {
    if (window.history.state?.agent) {
      window.history.back();
    } else {
      const newUrl = buildUrl(page, null, openLeader);
      window.history.replaceState({ page, agent: null, leader: openLeader }, '', newUrl);
      setOpenAgentState(null);
    }
  };

  // Close Leader Drawer with history preservation
  const handleCloseLeader = () => {
    if (window.history.state?.leader) {
      window.history.back();
    } else {
      const newUrl = buildUrl(page, openAgent, null);
      window.history.replaceState({ page, agent: openAgent, leader: null }, '', newUrl);
      setOpenLeaderState(null);
    }
  };

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
    // if (!user) return;
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
  // if (!user) {
  //   return <LoginPage />;
  // }

  const [isSlowLoad, setIsSlowLoad] = useState(false);

  useEffect(() => {
    if (status !== 'loading') return;
    const timer = setTimeout(() => {
      setIsSlowLoad(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [status]);



  if (status === 'loading') {
    return (
      <div className="relative min-h-screen bg-[#f8fafc] flex items-center justify-center overflow-hidden px-4">
        <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(255,94,58,0.08),transparent_70%)]" />
        <div className="relative z-10 text-center bg-white px-8 py-7 rounded-3xl border border-slate-200/90 shadow-xl max-w-sm">
          <div className="w-10 h-10 border-[3px] border-[#ff4d30] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-[13px] font-semibold text-slate-800 tracking-wide">
            {isSlowLoad ? 'Waking up cloud backend…' : 'Loading collections intelligence…'}
          </div>
          {isSlowLoad && (
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              Cloud backend sleeps after inactivity on free tier. Initial boot takes ~45–60s. Subsequent requests load instantly.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="relative min-h-screen bg-[#f8fafc] flex items-center justify-center px-6 overflow-hidden">
        <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(255,94,58,0.08),transparent_70%)]" />
        <div className="relative z-10 text-center max-w-sm bg-white p-7 rounded-3xl border border-slate-200 shadow-xl">
          <div className="text-[16px] font-display font-bold text-slate-900 mb-2">Couldn't reach the backend</div>
          <div className="text-[12.5px] text-slate-500 mb-5 leading-relaxed">
            {errorMsg}. Make sure the Node backend server is running on port 8005
            (<code className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">node src/server.js</code>).
          </div>
          <button onClick={retryLoad} className="text-[12.5px] font-semibold text-white bg-[#ff4d30] hover:bg-[#e6352b] px-5 py-2.5 rounded-full transition-all shadow-md shadow-orange-500/25 cursor-pointer">
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <DomainProvider>
      <div className="relative min-h-screen bg-[#f8fafc] text-slate-800 selection:bg-[#ff5e3a]/20 selection:text-[#ff3b30] animate-fade-in">
        {/* Subtle executive ambient gradients */}
        <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_70%_50%_at_20%_-15%,rgba(255,94,58,0.07),transparent_70%),radial-gradient(ellipse_60%_50%_at_80%_-15%,rgba(99,102,241,0.04),transparent_70%)]" />

        {/* Dashboard Core Layout */}
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
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {openAgent && <AgentDrawer name={openAgent} onClose={handleCloseAgent} />}
        {openLeader && <LeaderDrawer name={openLeader} onClose={handleCloseLeader} onOpenAgent={handleOpenAgent} />}
      </div>
    </DomainProvider>
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