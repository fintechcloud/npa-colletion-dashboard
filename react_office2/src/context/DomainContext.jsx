import { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { CASES, DOMAINS, LEADERS, AGENTS, META } from '../utils/data';
import { useLiveCollection } from './LiveCollectionContext';

const DomainContext = createContext(null);

export function DomainProvider({ children }) {
  const { dataRevision } = useLiveCollection();
  const [selectedDomains, setSelectedDomainsState] = useState(new Set());

  // Toggle domain
  const toggleDomain = useCallback((domain) => {
    if (domain === 'All Domains') {
      setSelectedDomainsState(new Set());
      return;
    }
    setSelectedDomainsState((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) {
        next.delete(domain);
      } else {
        next.add(domain);
      }
      return next;
    });
  }, []);
  
  // Kept for compatibility if some component calls it directly
  const setSelectedDomain = toggleDomain;

  const clearDomain = useCallback(() => {
    setSelectedDomainsState(new Set());
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

  // Leaders who actually have assigned cases in the selected domains
  const getAvailableLeaders = useCallback(() => {
    if (selectedDomains.size === 0) {
      return LEADERS;
    }
    const dIndices = new Set(
      Array.from(selectedDomains)
        .map(d => DOMAINS.indexOf(d))
        .filter(idx => idx >= 0)
    );
    if (dIndices.size === 0) return LEADERS;

    const leaderIndices = new Set();
    for (const r of CASES) {
      if (r[8] !== undefined && dIndices.has(r[8])) {
        leaderIndices.add(r[1]);
      }
    }
    return LEADERS.filter((_, idx) => leaderIndices.has(idx));
  }, [selectedDomains, DOMAINS, LEADERS, CASES.length, dataRevision]);

  // Agents who actually have assigned cases in the given domains & leader
  const getAvailableAgents = useCallback((leader = '') => {
    const lI = leader ? LEADERS.indexOf(leader) : -1;
    const dIndices = new Set(
      Array.from(selectedDomains)
        .map(d => DOMAINS.indexOf(d))
        .filter(idx => idx >= 0)
    );

    const agentIndices = new Set();
    for (const r of CASES) {
      if (selectedDomains.size > 0 && r[8] !== undefined && !dIndices.has(r[8])) continue;
      if (lI >= 0 && r[1] !== lI) continue;
      agentIndices.add(r[0]);
    }
    return AGENTS.filter((_, idx) => agentIndices.has(idx));
  }, [selectedDomains, DOMAINS, LEADERS, AGENTS, CASES.length, dataRevision]);

  const value = useMemo(() => ({
    selectedDomains,
    toggleDomain,
    setSelectedDomain,
    clearDomain,
    isDomainActive: selectedDomains.size > 0,
    domainListWithCounts,
    getAvailableLeaders,
    getAvailableAgents,
  }), [
    selectedDomains,
    toggleDomain,
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
