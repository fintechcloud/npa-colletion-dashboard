import { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { CASES, DOMAINS, LEADERS, AGENTS, META } from '../utils/data';
import { useLiveCollection } from './LiveCollectionContext';

const DomainContext = createContext(null);

export function DomainProvider({ children }) {
  const { dataRevision } = useLiveCollection();
  const [selectedDomain, setSelectedDomainState] = useState('All Domains');

  // Toggle or set domain: clicking active domain toggles it off back to 'All Domains'
  const setSelectedDomain = useCallback((domain) => {
    setSelectedDomainState((curr) => {
      if (curr === domain && domain !== 'All Domains') {
        return 'All Domains';
      }
      return domain || 'All Domains';
    });
  }, []);

  const clearDomain = useCallback(() => {
    setSelectedDomainState('All Domains');
  }, []);

  // Compute live case counts per domain from current loaded CASES
  const domainListWithCounts = useMemo(() => {
    const counts = {};
    const dNames = (DOMAINS && DOMAINS.length > 0) ? DOMAINS : (META?.domains || []);

    dNames.forEach((d) => { counts[d] = 0; });

    let total = 0;
    for (const r of CASES) {
      total++;
      const dI = r[8];
      if (dI !== undefined && dNames[dI]) {
        counts[dNames[dI]] = (counts[dNames[dI]] || 0) + 1;
      }
    }

    const list = [{ name: 'All Domains', count: total || CASES.length || 0 }];
    dNames.forEach((d) => {
      list.push({ name: d, count: counts[d] ?? (META?.domainCounts?.[d] || 0) });
    });
    return list;
  }, [CASES.length, DOMAINS, dataRevision]);

  // Leaders who actually have assigned cases in the given domain
  const getAvailableLeaders = useCallback((domain) => {
    const activeD = domain || selectedDomain;
    if (!activeD || activeD === 'All Domains') {
      return LEADERS;
    }
    const dI = DOMAINS.indexOf(activeD);
    if (dI < 0) return LEADERS;

    const leaderIndices = new Set();
    for (const r of CASES) {
      if (r[8] === dI) {
        leaderIndices.add(r[1]);
      }
    }
    return LEADERS.filter((_, idx) => leaderIndices.has(idx));
  }, [selectedDomain, DOMAINS, LEADERS, CASES.length, dataRevision]);

  // Agents who actually have assigned cases in the given domain & leader
  const getAvailableAgents = useCallback((domain, leader = '') => {
    const activeD = domain || selectedDomain;
    const dI = activeD && activeD !== 'All Domains' ? DOMAINS.indexOf(activeD) : -1;
    const lI = leader ? LEADERS.indexOf(leader) : -1;

    const agentIndices = new Set();
    for (const r of CASES) {
      if (dI >= 0 && r[8] !== dI) continue;
      if (lI >= 0 && r[1] !== lI) continue;
      agentIndices.add(r[0]);
    }
    return AGENTS.filter((_, idx) => agentIndices.has(idx));
  }, [selectedDomain, DOMAINS, LEADERS, AGENTS, CASES.length, dataRevision]);

  const value = useMemo(() => ({
    selectedDomain,
    setSelectedDomain,
    clearDomain,
    isDomainActive: selectedDomain !== 'All Domains',
    domainListWithCounts,
    getAvailableLeaders,
    getAvailableAgents,
  }), [
    selectedDomain,
    setSelectedDomain,
    clearDomain,
    domainListWithCounts,
    getAvailableLeaders,
    getAvailableAgents,
  ]);

  return (
    <DomainContext.Provider value={value}>
      {children}
    </DomainContext.Provider>
  );
}

export function useDomain() {
  const ctx = useContext(DomainContext);
  if (!ctx) {
    throw new Error('useDomain must be used within a DomainProvider');
  }
  return ctx;
}
