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

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8002';

export async function fetchDashboardData() {
  const res = await fetch(`${API_BASE}/api/dashboard-data`);
  if (!res.ok) throw new Error(`Backend returned ${res.status}`);
  const payload = await res.json();

  CASES = payload.cases;
  META = payload.meta;
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
  return Math.round(n * 10) / 10;
}
export function fmtINR(n) {
  const sign = n < 0 ? '-' : '';
  n = Math.abs(Math.round(n));
  if (n >= 10000000) return sign + '₹' + (n / 10000000).toFixed(2) + 'Cr';
  if (n >= 100000) return sign + '₹' + (n / 100000).toFixed(2) + 'L';
  return sign + '₹' + n.toLocaleString('en-IN');
}
export function fmtINRFull(n) {
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

export function filterRows({ leader = '', agent = '', type = '', from = '', to = '', state = '' } = {}) {
  const leaderI = leader ? LEADERS.indexOf(leader) : -1;
  const agentI = agent ? AGENTS.indexOf(agent) : -1;
  const typeI = type ? TYPES.indexOf(type) : -1;
  const stateI = state ? (STATES.findIndex((s) => s.id === state || s.name.toLowerCase() === state.toLowerCase())) : -1;
  const fromOff = from ? dateToOffset(from) : -Infinity;
  const toOff = to ? dateToOffset(to) : Infinity;
  return CASES.filter((r) => {
    if (leaderI >= 0 && r[1] !== leaderI) return false;
    if (agentI >= 0 && r[0] !== agentI) return false;
    if (typeI >= 0 && r[2] !== typeI) return false;
    if (stateI >= 0 && r[7] !== undefined && r[7] !== stateI) return false;
    if (r[4] < fromOff || r[4] > toOff) return false;
    return true;
  });
}

export function aggregate(rows) {
  let due = 0, recvd = 0;
  const cases = rows.length;
  const statusCount = {};
  STATUSES.forEach((s) => (statusCount[s] = 0));
  const typeAgg = {};
  TYPES.forEach((t) => (typeAgg[t] = { due: 0, recvd: 0, cases: 0 }));
  const monthMap = {};
  const dayMap = {};
  const agentSet = new Set();
  const leaderSet = new Set();

  for (const r of rows) {
    const [a, l, t, s, off, d, rv] = r;
    due += d;
    recvd += rv;
    statusCount[STATUSES[s]]++;
    typeAgg[TYPES[t]].due += d;
    typeAgg[TYPES[t]].recvd += rv;
    typeAgg[TYPES[t]].cases++;
    const dstr = offsetToStr(off);
    const mstr = dstr.slice(0, 7);
    if (!monthMap[mstr]) monthMap[mstr] = { due: 0, recvd: 0, cases: 0 };
    monthMap[mstr].due += d;
    monthMap[mstr].recvd += rv;
    monthMap[mstr].cases++;
    if (!dayMap[dstr]) dayMap[dstr] = { due: 0, recvd: 0, cases: 0 };
    dayMap[dstr].due += d;
    dayMap[dstr].recvd += rv;
    dayMap[dstr].cases++;
    agentSet.add(a);
    leaderSet.add(l);
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
    due, recvd, cases,
    pct: due ? round1((recvd / due) * 100) : 0,
    statusCount, typeAgg, monthly, daily,
    agentCount: agentSet.size, leaderCount: leaderSet.size,
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
    if (offsetToStr(r[4]) === YESTERDAY_STR) byLeader[l].yday += r[6];
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

export function computeEmployeeRows(filters, liveAgentMap = {}) {
  const rows = filterRows(filters);
  const byAgent = {};
  rows.forEach((r) => {
    const a = AGENTS[r[0]];
    const l = LEADERS[r[1]];
    if (!byAgent[a]) byAgent[a] = { due: 0, recvd: 0, cases: 0, leaders: new Set(), statusCount: {} };
    byAgent[a].due += r[5];
    byAgent[a].recvd += r[6];
    byAgent[a].cases++;
    byAgent[a].leaders.add(l);
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