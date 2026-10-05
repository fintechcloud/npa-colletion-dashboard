import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { fetchDashboardData } from '../utils/data';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8005';
const LiveCollectionContext = createContext(null);

export function LiveCollectionProvider({ children }) {
  const [liveData, setLiveData] = useState({
    status: 'idle',
    connected: false,
    sheetUrl: '',
    sheetTitle: 'Google Sheet Live Feed',
    lastSynced: null,
    todayDate: new Date().toISOString().slice(0, 10),
    totalLiveToday: 0,
    totalLiveCases: 0,
    byAgent: {},
    byLeader: {},
    recentTransactions: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataRevision, setDataRevision] = useState(0);
  const [lastAutoSync, setLastAutoSync] = useState(new Date());

  const fetchLive = useCallback(async (isManual = false) => {
    if (isManual) setIsLoading(true);
    try {
      const endpoint = isManual ? `${API_BASE}/api/live-collection/sync` : `${API_BASE}/api/live-collection`;
      const res = await fetch(endpoint, {
        method: isManual ? 'POST' : 'GET',
      });
      if (res.ok) {
        const data = await res.json();
        setLiveData(data);
        setError(null);
      }
    } catch (err) {
      console.warn('[Live Collection] Fetch failed, keeping cached live stream:', err);
    } finally {
      if (isManual) setIsLoading(false);
    }
  }, []);

  // Connect Google Sheet URL or ID
  const connectSheet = useCallback(async (sheetUrl, worksheetTitle) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/google-sheets/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheet_url: sheetUrl, worksheet_title: worksheetTitle }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to connect Google Sheet');
      }
      await fetch(`${API_BASE}/api/dashboard-data/refresh`, { method: 'POST' }).catch(() => {});
      await fetchLive(true);
      setTimeout(() => {
        window.location.reload();
      }, 500);
      return { success: true, data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [fetchLive]);

  const refreshAllData = useCallback(async (isManual = false) => {
    if (isManual) setIsLoading(true);
    try {
      await fetch(`${API_BASE}/api/dashboard-data/refresh`, { method: 'POST' }).catch(() => {});
      await fetchDashboardData();
      setDataRevision((r) => r + 1);
      await fetchLive(isManual);
      setLastAutoSync(new Date());
    } catch (err) {
      console.warn('[AutoSync] 3-minute update error:', err);
    } finally {
      if (isManual) setIsLoading(false);
    }
  }, [fetchLive]);

  // Initial fetch and auto-polling live feed every 30s
  useEffect(() => {
    let isMounted = true;
    const poll = () => {
      fetch(`${API_BASE}/api/live-collection`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && isMounted) {
            setLiveData(data);
            setError(null);
          }
        })
        .catch((err) => console.warn('[Live Collection] Fetch failed:', err));
    };
    poll();
    const timer = setInterval(poll, 30000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  // Automatic full synchronization every 3 minutes (180,000 ms)
  useEffect(() => {
    let isMounted = true;
    const interval = setInterval(() => {
      if (isMounted) {
        console.log('[AutoSync] Running 3-minute Google Sheet sync...');
        refreshAllData(false);
      }
    }, 180000); // 3 minutes

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [refreshAllData]);

  // Helper getters
  const getAgentLive = useCallback((name) => {
    if (!name) return { liveRecvd: 0, liveCases: 0, lastUpdate: null };
    const record = liveData?.byAgent?.[name];
    if (record) {
      return {
        liveRecvd: record.liveRecvd || 0,
        liveCases: record.liveCases || 0,
        lastUpdate: record.lastUpdate || null,
      };
    }
    // Check case-insensitive
    const lower = name.toLowerCase();
    const found = Object.entries(liveData?.byAgent || {}).find(([k]) => k.toLowerCase() === lower);
    if (found) {
      return {
        liveRecvd: found[1].liveRecvd || 0,
        liveCases: found[1].liveCases || 0,
        lastUpdate: found[1].lastUpdate || null,
      };
    }
    return { liveRecvd: 0, liveCases: 0, lastUpdate: null };
  }, [liveData]);

  const getLeaderLive = useCallback((name) => {
    if (!name) return { liveRecvd: 0, liveCases: 0, agentCount: 0 };
    const upper = name.toUpperCase();
    const record = liveData?.byLeader?.[upper] || liveData?.byLeader?.[name];
    if (record) {
      return {
        liveRecvd: record.liveRecvd || 0,
        liveCases: record.liveCases || 0,
        agentCount: record.agentCount || 0,
      };
    }
    return { liveRecvd: 0, liveCases: 0, agentCount: 0 };
  }, [liveData]);

  const value = useMemo(() => ({
    liveData,
    isLoading,
    error,
    syncLive: () => fetchLive(true),
    connectSheet,
    getAgentLive,
    getLeaderLive,
    totalLiveToday: liveData?.totalLiveToday || 0,
    totalLiveCases: liveData?.totalLiveCases || 0,
    recentTransactions: liveData?.recentTransactions || [],
    authType: liveData?.authType || 'none',
    serviceAccountEmail: liveData?.serviceAccountEmail || '',
    isConnected: !!liveData?.connected,
    sheetTitle: liveData?.sheetTitle || 'Google Sheet Live Feed',
    lastSynced: liveData?.lastSynced,
    dataRevision,
    lastAutoSync,
    refreshAllData,
  }), [liveData, isLoading, error, fetchLive, connectSheet, getAgentLive, getLeaderLive, dataRevision, lastAutoSync, refreshAllData]);

  return (
    <LiveCollectionContext.Provider value={value}>
      {children}
    </LiveCollectionContext.Provider>
  );
}

/* eslint-disable-next-line react-refresh/only-export-components */
export function useLiveCollection() {
  const ctx = useContext(LiveCollectionContext);
  if (!ctx) {
    return {
      dataRevision: 0,
      totalLiveToday: 0,
      totalLiveCases: 0,
      recentTransactions: [],
      authType: 'none',
      isConnected: false,
      getAgentLive: () => ({ liveRecvd: 0, liveCases: 0 }),
      getLeaderLive: () => ({ liveRecvd: 0, liveCases: 0 }),
    };
  }
  return ctx;
}
