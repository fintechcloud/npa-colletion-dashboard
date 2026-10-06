export let CASES = [];
export let META = {
  agents: [],
  leaders: [],
  statuses: ['CLOSED', 'PRE-CLOSED', 'SETTLED', 'PART-PAYMENT', 'DISBURSED'],
  types: ['NEW', 'REPEAT'],
  agentPrimaryLeader: {},
  agentMultiLeaders: {},
  dateMin: '2026-01-01',
  dateMax: '2026-01-01',
  today: '2026-01-01',
};

export let DOMAINS = META.domains || [];
export let MODES = META.modes || ['PART-PAYMENT', 'SETTLED', 'CLOSED', 'SETTLED ON DISBURSAL', 'OTHER'];

export const MODE_COLORS = {
  'PART-PAYMENT': '#ff5533',
  SETTLED: '#818cf8',
  CLOSED: '#10b981',
  'SETTLED ON DISBURSAL': '#06b6d4',
  OTHER: '#94a3b8',
};

export let AGENTS = META.agents;
export let LEADERS = META.leaders;
export let STATUSES = META.statuses;
export let TYPES = META.types;
export let STATES = META.states || [];

export let DATE_MIN = new Date(META.dateMin + 'T00:00:00Z');
export let DATE_MAX = new Date(META.dateMax + 'T00:00:00Z');
export let LAST_DATE_STR = META.dateMax;
export let TODAY_STR = META.today;
export let YESTERDAY_STR = subtractOneDayUTC(META.today);

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8005';

export async function fetchDashboardData() {
  const res = await fetch(`${API_BASE}/api/dashboard-data`);
  if (!res.ok) throw new Error(`Backend returned ${res.status}`);
  const payload = await res.json();

  CASES = payload.cases;
  META = payload.meta;
  DOMAINS = META.domains || [];
  MODES = META.modes || ['PART-PAYMENT', 'SETTLED', 'CLOSED', 'SETTLED ON DISBURSAL', 'OTHER'];
  AGENTS = META.agents;
  LEADERS = META.leaders;
  STATUSES = META.statuses;
  TYPES = META.types;
  STATES = META.states || [];
  DATE_MIN = new Date(META.dateMin + 'T00:00:00Z');
  DATE_MAX = new Date(META.dateMax + 'T00:00:00Z');
  LAST_DATE_STR = META.dateMax;
  TODAY_STR = META.today;
  YESTERDAY_STR = subtractOneDayUTC(META.today);

  return payload;
}

export function offsetToDate(off) {
  const d = new Date(DATE_MIN.getTime());
  d.setUTCDate(d.getUTCDate() + off);
  return d;
}
export function offsetToStr(off) {
  return offsetToDate(off).toISOString().slice(0, 10);
}
export function dateToOffset(dstr) {
  return Math.round((new Date(dstr + 'T00:00:00Z') - DATE_MIN) / 86400000);
}
export function subtractOneDayUTC(dstr) {
  const d = new Date(dstr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export const STATUS_COLORS = {
  CLOSED: '#10b981',
  'PRE-CLOSED': '#06b6d4',
  SETTLED: '#818cf8',
  'PART-PAYMENT': '#ff5533',
  DISBURSED: '#475569',
  OTHER: '#94a3b8',
};

export function round1(n) {
  return Math.round(n * 100) / 100;
}
export function round2(n) {
  return Math.round(n * 100) / 100;
}
export function fmtINR(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '₹0';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(Math.round(n));
  if (abs >= 10000000) return sign + '₹' + (abs / 10000000).toFixed(2) + 'Cr';
  if (abs >= 100000) return sign + '₹' + (abs / 100000).toFixed(2) + 'L';
  return sign + '₹' + abs.toLocaleString('en-IN');
}
export function fmtINRFull(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '₹0';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}
export function fmtDateShort(dstr) {
  const d = new Date(dstr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}
export function fmtMonth(mstr) {
  const d = new Date(mstr + '-01T00:00:00');
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}
export function titleCase(s) {
  return s.split(' ').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}
export function initials(s) {
  return s.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}
export function pctBand(p) {
  return p >= 80 ? 'good' : p >= 65 ? 'mid' : 'low';
}

export function filterRows({ domain = '', domains = [], leader = '', agent = '', type = '', from = '', to = '', state = '' } = {}) {
  const domainI = domain && domain !== 'All Domains' ? DOMAINS.indexOf(domain) : -1;
  const domainIndices = Array.isArray(domains) && domains.length > 0
    ? new Set(domains.map((d) => DOMAINS.indexOf(d)).filter((idx) => idx >= 0))
    : null;
  const leaderI = leader ? LEADERS.indexOf(leader) : -1;
  const agentI = agent ? AGENTS.indexOf(agent) : -1;
  const typeI = type ? TYPES.indexOf(type) : -1;
  const stateI = state ? (STATES.findIndex((s) => s.id === state || s.name.toLowerCase() === state.toLowerCase())) : -1;
  const fromOff = from ? dateToOffset(from) : -Infinity;
  const toOff = to ? dateToOffset(to) : Infinity;
  return CASES.filter((r) => {
    if (domainIndices && domainIndices.size > 0 && r[8] !== undefined && !domainIndices.has(r[8])) return false;
    if (domainI >= 0 && r[8] !== undefined && r[8] !== domainI) return false;
    if (leaderI >= 0 && r[1] !== leaderI) return false;
    if (agentI >= 0 && r[0] !== agentI) return false;
    if (typeI >= 0 && r[2] !== typeI) return false;
    if (stateI >= 0 && r[7] !== undefined && r[7] !== stateI) return false;
    // Core domain rule: Recovery analytics works on Received Date (r[13] = recDayOffset).
    // Fallback to r[4] only if received date is missing.
    const recOff = (r[13] !== undefined && r[13] >= 0) ? r[13] : r[4];
    if (recOff < fromOff || recOff > toOff) return false;
    return true;
  });
}

export function aggregate(rows) {
  let due = 0, recvd = 0, principal = 0, sep2026Recvd = 0;
  const cases = rows.length;
  const statusCount = {};
  STATUSES.forEach((s) => (statusCount[s] = 0));
  const modeCount = {};
  MODES.forEach((m) => (modeCount[m] = 0));
  const typeAgg = {};
  TYPES.forEach((t) => (typeAgg[t] = { due: 0, recvd: 0, cases: 0 }));
  const monthMap = {};
  const dayMap = {};
  const agentSet = new Set();
  const leaderSet = new Set();
  const domainSet = new Set();

  for (const r of rows) {
    const [a, l, t, s, off, d, rv, st, dI, loanAmt, mI, dpd, recMonth, recDayOffset] = r;
    due += (d || 0);
    recvd += (rv || 0);
    principal += (loanAmt || 0);

    const isSep2026 = (recMonth && String(recMonth).toLowerCase().includes('sep') && String(recMonth).includes('2026'));
    if (isSep2026) {
      sep2026Recvd += (rv || 0);
    }

    if (s !== undefined && STATUSES[s]) {
      statusCount[STATUSES[s]] = (statusCount[STATUSES[s]] || 0) + 1;
    }
    if (mI !== undefined && MODES[mI]) {
      modeCount[MODES[mI]] = (modeCount[MODES[mI]] || 0) + 1;
    }
    if (t !== undefined && TYPES[t]) {
      typeAgg[TYPES[t]].due += (d || 0);
      typeAgg[TYPES[t]].recvd += (rv || 0);
      typeAgg[TYPES[t]].cases++;
    }
    // Group monthly/daily trends by Received Date (recDayOffset), fallback to off (repayDate)
    const eventOff = (recDayOffset !== undefined && recDayOffset >= 0) ? recDayOffset : off;
    const dstr = offsetToStr(eventOff);
    const mstr = dstr.slice(0, 7);
    if (!monthMap[mstr]) monthMap[mstr] = { due: 0, recvd: 0, cases: 0 };
    monthMap[mstr].due += (d || 0);
    monthMap[mstr].recvd += (rv || 0);
    monthMap[mstr].cases++;

    if (!dayMap[dstr]) dayMap[dstr] = { due: 0, recvd: 0, cases: 0 };
    dayMap[dstr].due += (d || 0);
    dayMap[dstr].recvd += (rv || 0);
    dayMap[dstr].cases++;

    agentSet.add(a);
    leaderSet.add(l);
    if (dI !== undefined) domainSet.add(dI);
  }

  const monthly = Object.keys(monthMap).sort().map((m) => ({
    month: m, ...monthMap[m],
    pct: monthMap[m].due ? round1((monthMap[m].recvd / monthMap[m].due) * 100) : 0,
  }));
  const daily = Object.keys(dayMap).sort().map((d) => ({
    date: d, ...dayMap[d],
    pct: dayMap[d].due ? round1((dayMap[d].recvd / dayMap[d].due) * 100) : 0,
  }));

  return {
    due, recvd, principal, sep2026Recvd, cases,
    pct: due ? round1((recvd / due) * 100) : 0,
    statusCount, modeCount, typeAgg, monthly, daily,
    agentCount: agentSet.size, leaderCount: leaderSet.size, domainCount: domainSet.size,
  };
}

export function computeLeaderRows(filters, liveLeaderMap = {}) {
  const rows = filterRows(filters);
  const byLeader = {};
  LEADERS.forEach((l) => (byLeader[l] = { due: 0, recvd: 0, cases: 0, agents: new Set(), yday: 0 }));
  rows.forEach((r) => {
    const l = LEADERS[r[1]];
    byLeader[l].due += r[5];
    byLeader[l].recvd += r[6];
    byLeader[l].cases++;
    byLeader[l].agents.add(r[0]);
    const recOff = (r[13] !== undefined && r[13] >= 0) ? r[13] : r[4];
    if (offsetToStr(recOff) === YESTERDAY_STR) byLeader[l].yday += r[6];
  });
  return LEADERS.map((l) => {
    const leaderLive = liveLeaderMap?.[l.toUpperCase()] || liveLeaderMap?.[l] || {};
    return {
      name: l,
      due: byLeader[l].due,
      recvd: byLeader[l].recvd,
      cases: byLeader[l].cases,
      agentCount: byLeader[l].agents.size,
      yday: byLeader[l].yday,
      liveRecvd: leaderLive.liveRecvd || 0,
      liveCases: leaderLive.liveCases || 0,
      pct: byLeader[l].due ? round1((byLeader[l].recvd / byLeader[l].due) * 100) : 0,
    };
  }).filter((l) => l.cases > 0);
}

export const DOMAIN_DOT_COLORS = {
  'Salary4Sure': 'bg-[#f97316]',
  'SALARY ADDA': 'bg-[#6366f1]',
  'Snap Paisa': 'bg-[#10b981]',
  'Minutes Loan': 'bg-[#f59e0b]',
  'Fast salary': 'bg-[#8b5cf6]',
  'DHANVARSHAA': 'bg-[#ec4899]',
  'Salary Setu': 'bg-[#06b6d4]',
  'Jhatpat Cash': 'bg-[#14b8a6]',
  'F1SPEEDLOAN': 'bg-[#3b82f6]',
  'All Domains': 'bg-slate-400',
};

export function getAgentDomains(agentName) {
  const agentI = AGENTS.indexOf(agentName);
  if (agentI < 0) return [];
  const domainSet = new Set();
  for (const r of CASES) {
    if (r[0] === agentI && r[8] !== undefined && DOMAINS[r[8]]) {
      domainSet.add(DOMAINS[r[8]]);
    }
  }
  return Array.from(domainSet);
}

export function getAgentDomainsDetailed(agentName) {
  const agentI = AGENTS.indexOf(agentName);
  if (agentI < 0) return [];
  const map = {};
  for (const r of CASES) {
    if (r[0] === agentI && r[8] !== undefined && DOMAINS[r[8]]) {
      const dName = DOMAINS[r[8]];
      if (!map[dName]) map[dName] = { name: dName, cases: 0, due: 0, recvd: 0 };
      map[dName].cases++;
      map[dName].due += (r[5] || 0);
      map[dName].recvd += (r[6] || 0);
    }
  }
  return Object.values(map).sort((a, b) => b.cases - a.cases);
}

export function getLeaderDomainsDetailed(leaderName) {
  const leaderI = LEADERS.indexOf(leaderName);
  if (leaderI < 0) return [];
  const map = {};
  for (const r of CASES) {
    if (r[1] === leaderI && r[8] !== undefined && DOMAINS[r[8]]) {
      const dName = DOMAINS[r[8]];
      if (!map[dName]) map[dName] = { name: dName, cases: 0, due: 0, recvd: 0 };
      map[dName].cases++;
      map[dName].due += (r[5] || 0);
      map[dName].recvd += (r[6] || 0);
    }
  }
  return Object.values(map).sort((a, b) => b.cases - a.cases);
}

export function computeEmployeeRows(filters, liveAgentMap = {}) {
  const rows = filterRows(filters);
  const byAgent = {};
  rows.forEach((r) => {
    const a = AGENTS[r[0]];
    const l = LEADERS[r[1]];
    if (!byAgent[a]) byAgent[a] = { due: 0, recvd: 0, cases: 0, leaders: new Set(), domains: new Set(), statusCount: {} };
    byAgent[a].due += r[5];
    byAgent[a].recvd += r[6];
    byAgent[a].cases++;
    byAgent[a].leaders.add(l);
    if (r[8] !== undefined && DOMAINS[r[8]]) {
      byAgent[a].domains.add(DOMAINS[r[8]]);
    }
    const st = STATUSES[r[3]];
    byAgent[a].statusCount[st] = (byAgent[a].statusCount[st] || 0) + 1;
  });
  return Object.entries(byAgent).map(([name, v]) => {
    const agentLive = liveAgentMap?.[name] || {};
    return {
      name,
      due: v.due,
      recvd: v.recvd,
      cases: v.cases,
      leader: META.agentPrimaryLeader[name] || [...v.leaders][0],
      multiLeader: v.leaders.size > 1,
      domains: [...v.domains],
      liveRecvd: agentLive.liveRecvd || 0,
      liveCases: agentLive.liveCases || 0,
      pct: v.due ? round1((v.recvd / v.due) * 100) : 0,
      statusCount: v.statusCount,
    };
  });
}

export function computeStateRows(filters = {}) {
  const rows = filterRows(filters);
  const map = {};
  (STATES || []).forEach((st, idx) => {
    map[idx] = {
      id: st.id,
      name: st.name,
      cases: 0,
      due: 0,
      recvd: 0,
    };
  });

  for (const r of rows) {
    const stIdx = r[7];
    if (stIdx !== undefined && map[stIdx]) {
      map[stIdx].cases++;
      map[stIdx].due += r[5];
      map[stIdx].recvd += r[6];
    }
  }

  return Object.values(map)
    .map((s) => {
      const pct = s.due ? round1((s.recvd / s.due) * 100) : 0;
      return {
        ...s,
        pct,
        band: pctBand(pct),
      };
    })
    .filter((s) => s.cases > 0);
}