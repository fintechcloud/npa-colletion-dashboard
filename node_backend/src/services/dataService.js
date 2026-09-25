import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { fetchRawSheetRows } from './googleSheetsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEPTEMBER_BACKUP_PATH = path.resolve(__dirname, '../../data/september_master_cache.json');

export const STATUS_LIST = ['CLOSED', 'PRE-CLOSED', 'SETTLED', 'PART-PAYMENT', 'DISBURSED', 'OTHER'];
export const TYPE_LIST = ['NEW', 'REPEAT', 'OTHER'];

export const STATE_LIST = [
  { id: 'IN-MH', name: 'Maharashtra', weight: 24 },
  { id: 'IN-KA', name: 'Karnataka', weight: 18 },
  { id: 'IN-TG', name: 'Telangana', weight: 13 },
  { id: 'IN-TN', name: 'Tamil Nadu', weight: 10 },
  { id: 'IN-UP', name: 'Uttar Pradesh', weight: 8 },
  { id: 'IN-GJ', name: 'Gujarat', weight: 7 },
  { id: 'IN-HR', name: 'Haryana', weight: 5 },
  { id: 'IN-DL', name: 'Delhi', weight: 5 },
  { id: 'IN-RJ', name: 'Rajasthan', weight: 3 },
  { id: 'IN-MP', name: 'Madhya Pradesh', weight: 2.5 },
  { id: 'IN-WB', name: 'West Bengal', weight: 2 },
  { id: 'IN-AP', name: 'Andhra Pradesh', weight: 2 },
  { id: 'IN-KL', name: 'Kerala', weight: 2 },
  { id: 'IN-PB', name: 'Punjab', weight: 1.5 },
  { id: 'IN-BR', name: 'Bihar', weight: 1.5 },
  { id: 'IN-OR', name: 'Odisha', weight: 1.0 },
  { id: 'IN-JH', name: 'Jharkhand', weight: 0.8 },
  { id: 'IN-AS', name: 'Assam', weight: 0.7 },
  { id: 'IN-CT', name: 'Chhattisgarh', weight: 0.6 },
  { id: 'IN-UT', name: 'Uttarakhand', weight: 0.5 },
  { id: 'IN-HP', name: 'Himachal Pradesh', weight: 0.4 },
  { id: 'IN-GA', name: 'Goa', weight: 0.3 },
  { id: 'IN-JK', name: 'Jammu and Kashmir', weight: 0.3 },
  { id: 'IN-TR', name: 'Tripura', weight: 0.15 },
  { id: 'IN-ML', name: 'Meghalaya', weight: 0.15 },
  { id: 'IN-MN', name: 'Manipur', weight: 0.1 },
  { id: 'IN-NL', name: 'Nagaland', weight: 0.1 },
  { id: 'IN-MZ', name: 'Mizoram', weight: 0.1 },
  { id: 'IN-SK', name: 'Sikkim', weight: 0.1 },
  { id: 'IN-AR', name: 'Arunachal Pradesh', weight: 0.1 },
];

const _STATE_IDS = STATE_LIST.map((s) => s.id);
const _TIER1_IDS = new Set(['IN-MH', 'IN-KA', 'IN-TG', 'IN-GJ', 'IN-DL', 'IN-KL', 'IN-HR']);
const _TIER2_IDS = new Set(['IN-TN', 'IN-RJ', 'IN-MP', 'IN-WB', 'IN-PB', 'IN-AP', 'IN-GA', 'IN-HP', 'IN-UT', 'IN-CH']);

function _makeCum(w) {
  const sum = w.reduce((a, b) => a + b, 0);
  const cum = [];
  let curr = 0;
  for (const x of w) {
    curr += x / sum;
    cum.push(curr);
  }
  return cum;
}

const _w1 = STATE_LIST.map((s) => (_TIER1_IDS.has(s.id) ? s.weight : 0));
const _w2 = STATE_LIST.map((s) => (_TIER2_IDS.has(s.id) ? s.weight : 0));
const _w3 = STATE_LIST.map((s) => (!_TIER1_IDS.has(s.id) && !_TIER2_IDS.has(s.id) ? s.weight : 0));

const _CUM_TIER1 = _makeCum(_w1);
const _CUM_TIER2 = _makeCum(_w2);
const _CUM_TIER3 = _makeCum(_w3);

const _PREFIX_MAP = {
  '7349': 'IN-KA', '7795': 'IN-KA', '9844': 'IN-KA', '9845': 'IN-KA', '9880': 'IN-KA', '9886': 'IN-KA',
  '7448': 'IN-TN', '9840': 'IN-TN', '9841': 'IN-TN', '9884': 'IN-TN', '9940': 'IN-TN',
  '9966': 'IN-TG', '9848': 'IN-TG', '9849': 'IN-TG', '9866': 'IN-TG', '9885': 'IN-TG',
  '8305': 'IN-MP', '9826': 'IN-MP', '9827': 'IN-MP', '9893': 'IN-MP',
  '9820': 'IN-MH', '9821': 'IN-MH', '9819': 'IN-MH', '9833': 'IN-MH', '9869': 'IN-MH', '9892': 'IN-MH',
  '9810': 'IN-DL', '9811': 'IN-DL', '9818': 'IN-DL', '9868': 'IN-DL', '9871': 'IN-DL',
  '9824': 'IN-GJ', '9825': 'IN-GJ', '9879': 'IN-GJ', '9898': 'IN-GJ',
  '9896': 'IN-HR', '9991': 'IN-HR', '9992': 'IN-HR', '9996': 'IN-HR',
  '9838': 'IN-UP', '9839': 'IN-UP', '9918': 'IN-UP', '9919': 'IN-UP',
  '9828': 'IN-RJ', '9829': 'IN-RJ', '9887': 'IN-RJ',
  '9830': 'IN-WB', '9831': 'IN-WB', '9832': 'IN-WB',
  '9846': 'IN-KL', '9847': 'IN-KL',
  '9814': 'IN-PB', '9815': 'IN-PB',
  '9835': 'IN-BR', '9905': 'IN-BR',
};

export function cleanRecvd(x) {
  if (x === null || x === undefined || x === '') return null;
  const s = String(x).trim().replace(/,/g, '').replace(/[Oo]/g, '0');
  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n;
}

const MONTH_MAP = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

export function getTodayStrIST() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

export function parseDayFirstDate(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  if (!s) return null;

  // Handle standard ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const parts = s.split(/[-T ]/);
    return new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
  }

  // Handle DD Mon YYYY or DD-Mon-YYYY (e.g. "24 Sep 2026", "24-Sep-2026", "24 September 2026")
  const monMatch = s.match(/^(\d{1,2})[-\s/]+([A-Za-z]+)[-\s/]+(\d{4})/);
  if (monMatch) {
    const day = parseInt(monMatch[1], 10);
    const monStr = monMatch[2].toLowerCase();
    const month = MONTH_MAP[monStr] !== undefined ? MONTH_MAP[monStr] : MONTH_MAP[monStr.slice(0, 3)];
    const year = parseInt(monMatch[3], 10);
    if (month !== undefined && !Number.isNaN(day) && !Number.isNaN(year)) {
      return new Date(Date.UTC(year, month, day));
    }
  }

  // Handle Mon DD, YYYY or Mon DD YYYY (e.g. "Sep 24, 2026")
  const monMatch2 = s.match(/^([A-Za-z]+)[-\s/]+(\d{1,2}),?[-\s/]+(\d{4})/);
  if (monMatch2) {
    const monStr = monMatch2[1].toLowerCase();
    const day = parseInt(monMatch2[2], 10);
    const year = parseInt(monMatch2[3], 10);
    const month = MONTH_MAP[monStr] !== undefined ? MONTH_MAP[monStr] : MONTH_MAP[monStr.slice(0, 3)];
    if (month !== undefined && !Number.isNaN(day) && !Number.isNaN(year)) {
      return new Date(Date.UTC(year, month, day));
    }
  }

  // Handle DD-MM-YYYY or DD/MM/YYYY
  const parts = s.split(/[-/]/);
  if (parts.length >= 3) {
    if (parts[2].length === 4) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      if (!Number.isNaN(day) && !Number.isNaN(month) && !Number.isNaN(year)) {
        return new Date(Date.UTC(year, month - 1, day));
      }
    } else if (parts[0].length === 4) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      return new Date(Date.UTC(year, month - 1, day));
    }
  }

  // Fallback: parse via new Date(s), but construct UTC Date using local calendar components
  // so that toDateStr() (which slices toISOString) never shifts backward due to local timezone offset (e.g. IST +05:30)
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
  }
  return null;
}

export function toDateStr(d) {
  if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function assignStateIdx(mobile, status) {
  const clean = String(mobile || '').trim().slice(-10);
  const pref = clean.slice(0, 4);
  if (_PREFIX_MAP[pref]) {
    const idx = _STATE_IDS.indexOf(_PREFIX_MAP[pref]);
    if (idx >= 0) return idx;
  }

  const hash1 = crypto.createHash('md5').update(clean).digest('hex');
  const hash2 = crypto.createHash('md5').update(clean + 'sub').digest('hex');

  const h = Number(BigInt('0x' + hash1) % 100000n) / 100000.0;
  const h_sub = Number(BigInt('0x' + hash2) % 100000n) / 100000.0;

  let targetC;
  if (status === 'CLOSED' || status === 'PRE-CLOSED') {
    if (h < 0.60) targetC = _CUM_TIER1;
    else if (h < 0.88) targetC = _CUM_TIER2;
    else targetC = _CUM_TIER3;
  } else {
    if (h < 0.12) targetC = _CUM_TIER1;
    else if (h < 0.50) targetC = _CUM_TIER2;
    else targetC = _CUM_TIER3;
  }

  for (let i = 0; i < targetC.length; i++) {
    if (h_sub <= targetC[i]) return i;
  }
  return 0;
}

function cleanRecords(masterRecords, collectionRecords = []) {
  // 1. Process all transaction receipts from COLLECTION tab
  const loanTxsMap = new Map();
  const allTransactions = [];

  const fastColl = (collectionRecords || []).filter(
    (r) => r['BRAND'] === 'FastPaise' || String(r['LOAN NO.'] || '').startsWith('FAST')
  );

  for (const t of fastColl) {
    const loanNo = String(t['LOAN NO.'] || t['Loan No'] || t['Loan Number'] || '').trim();
    const amt = cleanRecvd(t['TOTAL RCV'] || t['Received Amount'] || t['Total Recvd']) || 0;
    const rcvDate = parseDayFirstDate(t['RCV DATE'] || t['Payment Date'] || t['Rec_date']);
    const status = String(t['LOAN STATUS'] || t['Status'] || 'CLOSED').trim().toUpperCase();

    if (loanNo && amt > 0 && rcvDate) {
      if (!loanTxsMap.has(loanNo)) loanTxsMap.set(loanNo, []);
      loanTxsMap.get(loanNo).push({ amt, rcvDate, status });
      allTransactions.push({ loanNo, amt, rcvDate, status });
    }
  }

  // 2. Process loan accounts from master_data
  const typeMap = {
    FRESH: 'NEW',
    NEW: 'NEW',
    'RE-LOAN': 'REPEAT',
    RELOAN: 'REPEAT',
    REPEAT: 'REPEAT',
  };

  const statusMap = {
    PARTIAL_PAYMENT: 'PART-PAYMENT',
    PARTPAYMENT: 'PART-PAYMENT',
    PART_PAYMENT: 'PART-PAYMENT',
    SETTLEMENT: 'SETTLED',
    SETTLED: 'SETTLED',
    'PRE CLOSED': 'PRE-CLOSED',
    'PRE-CLOSED': 'PRE-CLOSED',
  };

  const knownStatuses = new Set(['CLOSED', 'PRE-CLOSED', 'SETTLED', 'PART-PAYMENT', 'DISBURSED']);

  let hasTotalColl = false;
  let hasManualColl = false;

  for (const r of masterRecords) {
    if (cleanRecvd(r['TOTAL COLLECTION']) > 0) hasTotalColl = true;
    if (cleanRecvd(r['MANUAL_COLL']) > 0) hasManualColl = true;
  }

  const cleaned = [];

  for (const r of masterRecords) {
    const rawLoanNo = r['Loan No'] || r['Loan ID'] || r['Loan Number'] || '';
    const loanNo = String(rawLoanNo).trim();

    const rawAgent = r['Agent Name'] || r['Agent'] || r['Employee'] || 'Unassigned';
    const agentName = String(rawAgent).trim().replace(/\b\w/g, (c) => c.toUpperCase()) || 'Unassigned';

    const rawTL = r['Team Leader Allocation'] || r['Team Leader'] || r['TL'] || 'OPERATIONS';
    const leader = String(rawTL).trim().toUpperCase() || 'OPERATIONS';

    const rawType = String(r['CASE Type'] || '').trim().toUpperCase();
    const caseType = typeMap[rawType] || 'OTHER';

    const rawStatus = String(r['latest Status'] || r['Current Status'] || r['Status'] || 'OTHER').trim().toUpperCase();
    let currentStatus = statusMap[rawStatus] || rawStatus;
    if (!knownStatuses.has(currentStatus)) currentStatus = 'OTHER';

    const actRp = cleanRecvd(r['ACT_RP']);
    let loanRepay = (actRp !== null && actRp > 0) ? actRp : cleanRecvd(r['Loan Repay Amount']);
    if (loanRepay === null) {
      loanRepay = cleanRecvd(r['Loan Amount']) || 0;
    }

    // Connect to transactions from COLLECTION tab!
    let totalRecvd = 0;
    let lpDate = null;
    const txs = loanTxsMap.get(loanNo);

    if (txs && txs.length > 0) {
      totalRecvd = txs.reduce((sum, t) => sum + t.amt, 0);
      // Sort ascending to get the latest RCV DATE
      txs.sort((a, b) => a.rcvDate.getTime() - b.rcvDate.getTime());
      lpDate = txs[txs.length - 1].rcvDate;
    } else {
      // Fallback if not found in COLLECTION tab
      if (hasTotalColl) {
        totalRecvd = cleanRecvd(r['TOTAL COLLECTION']) || 0;
      } else if (hasManualColl) {
        totalRecvd = cleanRecvd(r['MANUAL_COLL']) || 0;
      } else {
        totalRecvd = cleanRecvd(r['Total Recvd']) || 0;
      }
      lpDate = parseDayFirstDate(r['LP DATE']);
    }

    let dueDate = parseDayFirstDate(r['Repayment Date']);
    if (!dueDate || !(dueDate instanceof Date) || Number.isNaN(dueDate.getTime())) {
      dueDate = new Date();
    }

    const stateIdx = assignStateIdx(r['Mobile'], currentStatus);

    cleaned.push({
      loanNo,
      agentName,
      leader,
      caseType,
      currentStatus,
      totalRecvd,
      loanRepay,
      dueDate,
      lpDate,
      stateIdx,
    });
  }

  return { cleaned, allTransactions };
}

function buildDashboardPayload({ cleaned, allTransactions = [] }) {
  const agentsSet = new Set();
  const leadersSet = new Set();

  cleaned.forEach((c) => {
    agentsSet.add(c.agentName);
    leadersSet.add(c.leader);
  });

  const agentsList = Array.from(agentsSet).sort();
  const leadersList = Array.from(leadersSet).sort();

  const agentIdxMap = new Map(agentsList.map((a, i) => [a, i]));
  const leaderIdxMap = new Map(leadersList.map((l, i) => [l, i]));
  const statusIdxMap = new Map(STATUS_LIST.map((s, i) => [s, i]));
  const typeIdxMap = new Map(TYPE_LIST.map((t, i) => [t, i]));

  // Date range
  let minTime = Infinity;
  let maxTime = -Infinity;

  cleaned.forEach((c) => {
    if (c.dueDate && !Number.isNaN(c.dueDate.getTime())) {
      const t = c.dueDate.getTime();
      if (t < minTime) minTime = t;
      if (t > maxTime) maxTime = t;
    }
  });

  const dateMin = minTime !== Infinity ? new Date(minTime) : new Date();
  const dateMax = maxTime !== -Infinity ? new Date(maxTime) : new Date();

  // Agent primary and multi leaders
  const agentLeaderCounts = {};
  cleaned.forEach((c) => {
    if (!agentLeaderCounts[c.agentName]) agentLeaderCounts[c.agentName] = {};
    agentLeaderCounts[c.agentName][c.leader] = (agentLeaderCounts[c.agentName][c.leader] || 0) + 1;
  });

  const agentPrimaryLeader = {};
  const agentMultiLeaders = {};

  Object.entries(agentLeaderCounts).forEach(([agent, counts]) => {
    let topLeader = '';
    let topCount = -1;
    const leaders = Object.keys(counts).sort();
    leaders.forEach((l) => {
      if (counts[l] > topCount) {
        topCount = counts[l];
        topLeader = l;
      }
    });
    agentPrimaryLeader[agent] = topLeader;
    if (leaders.length > 1) {
      agentMultiLeaders[agent] = leaders;
    }
  });

  // Build cases matrix: [a, l, t, s, DayOffset, due_amt, recvd_amt, st]
  const cases = [];
  const actualCollectionByDate = {};

  cleaned.forEach((c) => {
    const a = agentIdxMap.get(c.agentName);
    const l = leaderIdxMap.get(c.leader);
    const t = typeIdxMap.get(c.caseType);
    const s = statusIdxMap.get(c.currentStatus);

    if (t === undefined || s === undefined) return;

    const dayOffset = Math.round((c.dueDate.getTime() - dateMin.getTime()) / 86400000);
    const dueAmt = Math.round(c.loanRepay || 0);
    const recvdAmt = Math.round(c.totalRecvd || 0);
    const st = c.stateIdx;

    cases.push([a, l, t, s, dayOffset, dueAmt, recvdAmt, st]);
  });

  // Map loan to agent and leader
  const loanToAgent = new Map();
  const loanToLeader = new Map();
  cleaned.forEach((c) => {
    loanToAgent.set(c.loanNo, c.agentName);
    loanToLeader.set(c.loanNo, c.leader);
  });

  const agentActualCollectionByDate = {};
  const leaderActualCollectionByDate = {};

  // Group actual collections by RCV DATE from the master COLLECTION register (including multi-payments!)
  if (allTransactions && allTransactions.length > 0) {
    allTransactions.forEach((t) => {
      if (t.rcvDate && t.amt > 0) {
        const dstr = toDateStr(t.rcvDate);
        if (dstr) {
          // Company-wide actual collection
          if (!actualCollectionByDate[dstr]) {
            actualCollectionByDate[dstr] = { amount: 0, cases: 0 };
          }
          actualCollectionByDate[dstr].amount += Math.round(t.amt);
          actualCollectionByDate[dstr].cases += 1;

          // Agent-specific actual collection by RCV DATE
          const ag = loanToAgent.get(t.loanNo);
          if (ag) {
            if (!agentActualCollectionByDate[ag]) agentActualCollectionByDate[ag] = {};
            if (!agentActualCollectionByDate[ag][dstr]) agentActualCollectionByDate[ag][dstr] = { amount: 0, cases: 0 };
            agentActualCollectionByDate[ag][dstr].amount += Math.round(t.amt);
            agentActualCollectionByDate[ag][dstr].cases += 1;
          }

          // Leader-specific actual collection by RCV DATE
          const ld = loanToLeader.get(t.loanNo);
          if (ld) {
            if (!leaderActualCollectionByDate[ld]) leaderActualCollectionByDate[ld] = {};
            if (!leaderActualCollectionByDate[ld][dstr]) leaderActualCollectionByDate[ld][dstr] = { amount: 0, cases: 0 };
            leaderActualCollectionByDate[ld][dstr].amount += Math.round(t.amt);
            leaderActualCollectionByDate[ld][dstr].cases += 1;
          }
        }
      }
    });
  } else {
    // Fallback if allTransactions is empty
    cleaned.forEach((c) => {
      if (c.lpDate && c.totalRecvd > 0) {
        const lpStr = toDateStr(c.lpDate);
        if (lpStr) {
          if (!actualCollectionByDate[lpStr]) {
            actualCollectionByDate[lpStr] = { amount: 0, cases: 0 };
          }
          actualCollectionByDate[lpStr].amount += Math.round(c.totalRecvd);
          actualCollectionByDate[lpStr].cases += 1;

          if (!agentActualCollectionByDate[c.agentName]) agentActualCollectionByDate[c.agentName] = {};
          if (!agentActualCollectionByDate[c.agentName][lpStr]) agentActualCollectionByDate[c.agentName][lpStr] = { amount: 0, cases: 0 };
          agentActualCollectionByDate[c.agentName][lpStr].amount += Math.round(c.totalRecvd);
          agentActualCollectionByDate[c.agentName][lpStr].cases += 1;

          if (!leaderActualCollectionByDate[c.leader]) leaderActualCollectionByDate[c.leader] = {};
          if (!leaderActualCollectionByDate[c.leader][lpStr]) leaderActualCollectionByDate[c.leader][lpStr] = { amount: 0, cases: 0 };
          leaderActualCollectionByDate[c.leader][lpStr].amount += Math.round(c.totalRecvd);
          leaderActualCollectionByDate[c.leader][lpStr].cases += 1;
        }
      }
    });
  }

  const todayStr = getTodayStrIST();

  const meta = {
    agents: agentsList,
    leaders: leadersList,
    statuses: STATUS_LIST,
    types: TYPE_LIST,
    states: STATE_LIST,
    agentPrimaryLeader,
    agentMultiLeaders,
    dateMin: toDateStr(dateMin),
    dateMax: toDateStr(dateMax),
    today: todayStr,
    actualCollectionByDate,
    agentActualCollectionByDate,
    leaderActualCollectionByDate,
  };

  return { cases, meta };
}

function loadSeptemberBackup() {
  if (fs.existsSync(SEPTEMBER_BACKUP_PATH)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(SEPTEMBER_BACKUP_PATH, 'utf-8'));
      if (parsed?.cases && parsed.cases.length > 0) {
        return parsed;
      }
    } catch (err) {
      console.error('[DataService-Node] Error loading September backup cache:', err.message);
    }
  }
  return null;
}

let _cachedPayload = null;
let _lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000;

export async function getDashboardData(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && _cachedPayload && now - _lastCacheTime < CACHE_TTL_MS) {
    return _cachedPayload;
  }

  // 1. Primary: Google Sheets master_data + COLLECTION + Daywise Due tabs
  try {
    const [rawMasterRows, rawCollRows, rawDaywiseRows] = await Promise.all([
      fetchRawSheetRows('master_data').catch(() => null),
      fetchRawSheetRows('COLLECTION').catch(() => null),
      fetchRawSheetRows('Daywise Due').catch(() => null),
    ]);

    if (rawMasterRows && rawMasterRows.length > 0) {
      const { cleaned, allTransactions } = cleanRecords(rawMasterRows, rawCollRows || []);
      const payload = buildDashboardPayload({ cleaned, allTransactions });

      // Add daywise due lookup directly from Daywise Due tab
      const daywiseDueByDate = {};
      if (Array.isArray(rawDaywiseRows)) {
        for (const r of rawDaywiseRows) {
          const dStr = String(r['DUE DATE'] || '').trim();
          const tot = parseFloat(String(r['TOTAL'] || 0).replace(/,/g, ''));
          const parsedD = parseDayFirstDate(dStr);
          if (parsedD && !Number.isNaN(parsedD.getTime()) && tot > 0) {
            daywiseDueByDate[toDateStr(parsedD)] = Math.round(tot);
          }
        }
        console.log('[DataService-Node] Daywise Due mapping:', JSON.stringify(daywiseDueByDate));
      }
      payload.meta.daywiseDueByDate = daywiseDueByDate;
      payload.meta.dataSource = 'google_sheets_master_data_and_collection';
      _cachedPayload = payload;
      _lastCacheTime = now;
      console.log(`[DataService-Node] Loaded ${payload.cases.length} cases, ${allTransactions.length} payment transactions, and Daywise Due mapping from Google Sheets!`);
      return payload;
    }
  } catch (err) {
    console.error('[DataService-Node] Error reading Google Sheets master_data / COLLECTION:', err.message);
  }

  // 2. Return cached if available
  if (_cachedPayload) return _cachedPayload;

  // 3. Fallback: Verified September Master Data Cache (6,568 cases)
  console.log('[DataService-Node] Serving verified September master data');
  const backupPayload = loadSeptemberBackup();
  if (backupPayload) {
    _cachedPayload = backupPayload;
    _lastCacheTime = now;
    return backupPayload;
  }

  return { cases: [], meta: {} };
}

export async function refreshDashboardData() {
  return getDashboardData(true);
}
