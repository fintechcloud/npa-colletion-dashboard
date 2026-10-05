import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { fetchRawSheetRows, loadConfig } from './googleSheetsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NPA_BACKUP_PATH = path.resolve(__dirname, '../../data/npa_master_cache.json');
const SEPTEMBER_BACKUP_PATH = path.resolve(__dirname, '../../data/september_master_cache.json');

export const STATUS_LIST = ['CLOSED', 'PRE-CLOSED', 'SETTLED', 'PART-PAYMENT', 'DISBURSED', 'OTHER'];
export const TYPE_LIST = ['NEW', 'REPEAT', 'OTHER'];
export const MODE_LIST = ['PART-PAYMENT', 'SETTLED', 'CLOSED', 'SETTLED ON DISBURSAL', 'OTHER'];

export const KNOWN_DOMAINS = [
  'Salary4Sure',
  'SALARY ADDA',
  'Snap Paisa',
  'Minutes Loan',
  'Fast salary',
  'DHANVARSHAA',
  'Salary Setu',
  'Jhatpat Cash',
  'F1SPEEDLOAN',
];

const CANONICAL_DOMAINS = {
  'salary4sure': 'Salary4Sure',
  'salary adda': 'SALARY ADDA',
  'snap paisa': 'Snap Paisa',
  'minutes loan': 'Minutes Loan',
  'fast salary': 'Fast salary',
  'dhanvarshaa': 'DHANVARSHAA',
  'salary setu': 'Salary Setu',
  'jhatpat cash': 'Jhatpat Cash',
  'f1speedloan': 'F1SPEEDLOAN',
};

export function normalizeDomain(rawDomain) {
  const clean = String(rawDomain || '').trim();
  const lower = clean.toLowerCase();
  return CANONICAL_DOMAINS[lower] || clean;
}

export function normalizeMode(rawMode) {
  const s = String(rawMode || '').trim().toUpperCase();
  if (s.includes('DIS')) return 'SETTLED ON DISBURSAL';
  if (s.includes('SETTLE')) return 'SETTLED';
  if (s.includes('CLOSE')) return 'CLOSED';
  if (s.includes('PART')) return 'PART-PAYMENT';
  return 'PART-PAYMENT';
}

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
  if (dateStr === null || dateStr === undefined || dateStr === '') return null;

  // Handle Excel / Google Sheets serial date number
  if (typeof dateStr === 'number') {
    if (dateStr > 20000 && dateStr < 80000) {
      const d = new Date(Math.round((dateStr - 25569) * 86400 * 1000));
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    }
  }

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

  // Fallback: parse via new Date(s)
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

function cleanRecords(masterRecords, dailyRecords = []) {
  // 1. Process daily receipts from DAILY RECD tab if present
  const dailyTxsMap = new Map();
  const allTransactions = [];

  for (const t of (dailyRecords || [])) {
    const loanNo = String(t['LOAN NO'] || t['LOAN NO.'] || t['Loan No'] || '').trim();
    const amt = cleanRecvd(t['RECD AMT.'] || t['RECD AMT'] || t['TOTAL RCV'] || t['Total Recvd']) || 0;
    const rcvDate = parseDayFirstDate(t['RECD DATE'] || t['RCV DATE'] || t['Payment Date']);
    const status = String(t['MODE'] || t['STATUS'] || 'RECD').trim().toUpperCase();

    if (loanNo && amt > 0 && rcvDate) {
      if (!dailyTxsMap.has(loanNo)) dailyTxsMap.set(loanNo, []);
      dailyTxsMap.get(loanNo).push({ amt, rcvDate, status });
      allTransactions.push({ loanNo, amt, rcvDate, status });
    }
  }

  // 2. Process NPA master cases
  const cleaned = [];

  for (const r of masterRecords) {
    const rawDomain = r['Domain'] || r['DOMAIN'] || r['Brand'] || 'Other';
    const domain = normalizeDomain(rawDomain);

    const rawLoanNo = r['LOAN NO'] || r['Loan No'] || r['LOAN NO.'] || r['Loan ID'] || '';
    const loanNo = String(rawLoanNo).trim();

    const rawAgent = r['AGENT NAME'] || r['Agent Name'] || r['Agent'] || 'Unassigned';
    const agentName = String(rawAgent).trim().replace(/\b\w/g, (c) => c.toUpperCase()) || 'Unassigned';

    const rawTL = r['TEAM LEADER'] || r['Team Leader'] || r['TL'] || 'OPERATIONS';
    const leader = String(rawTL).trim().toUpperCase() || 'OPERATIONS';

    const customer = String(r['CUSTOMER'] || r['Customer'] || '').trim();
    const mobile = String(r['MOBILE'] || r['Mobile'] || '').trim();

    const loanAmt = cleanRecvd(r['LOAN AMT'] || r['Loan Amt'] || r['Loan Amount']) || 0;
    const dueAmt = cleanRecvd(r['REPAY AMT'] || r['Repay Amt'] || r['Loan Repay Amount'] || r['ACT_RP']) || 0;
    let recvdAmt = cleanRecvd(r['RECD AMT.'] || r['RECD AMT'] || r['Total Recvd'] || r['TOTAL COLLECTION']) || 0;

    let repayDate = parseDayFirstDate(r['REPAY DATE'] || r['Repayment Date']);
    const repayMonth = String(r['REPAY MONTH'] || r['Repay Month'] || '').trim();

    let recDate = parseDayFirstDate(r['RECD DATE'] || r['Rec Date'] || r['LP DATE']);
    const recMonth = String(r['RECD MONTH'] || r['Rec Month'] || '').trim();

    // Check daily txs if present
    const txs = dailyTxsMap.get(loanNo);
    if (txs && txs.length > 0) {
      const dailySum = txs.reduce((sum, t) => sum + t.amt, 0);
      if (dailySum > recvdAmt) recvdAmt = dailySum;
      if (!recDate) {
        txs.sort((a, b) => a.rcvDate.getTime() - b.rcvDate.getTime());
        recDate = txs[txs.length - 1].rcvDate;
      }
    }

    if (recDate && recvdAmt > 0) {
      allTransactions.push({ loanNo, amt: recvdAmt, rcvDate: recDate, status: 'RECD' });
    }

    const rawMode = r['MODE'] || r['Mode'] || '';
    const mode = normalizeMode(rawMode);

    const status = String(r['STATUS'] || r['Status'] || 'RECD').trim().toUpperCase();
    const dpd = parseInt(String(r['dpd'] || r['DPD'] || 0).replace(/[^0-9-]/g, ''), 10) || 0;

    const rawType = String(r['CASE Type'] || r['Type'] || '').trim().toUpperCase();
    const caseType = rawType.includes('REPEAT') || rawType.includes('RE-LOAN') ? 'REPEAT' : 'NEW';

    let currentStatus = 'PART-PAYMENT';
    if (mode === 'SETTLED' || mode === 'SETTLED ON DISBURSAL') currentStatus = 'SETTLED';
    else if (mode === 'CLOSED') currentStatus = 'CLOSED';
    else currentStatus = 'PART-PAYMENT';

    if (!repayDate || !(repayDate instanceof Date) || Number.isNaN(repayDate.getTime())) {
      repayDate = recDate || new Date();
    }

    const stateIdx = assignStateIdx(mobile, currentStatus);

    cleaned.push({
      domain,
      loanNo,
      agentName,
      leader,
      customer,
      mobile,
      loanAmt,
      dueAmt,
      recvdAmt,
      repayDate,
      repayMonth,
      recDate,
      recMonth,
      mode,
      status,
      dpd,
      caseType,
      currentStatus,
      stateIdx,
    });
  }

  return { cleaned, allTransactions };
}

function buildDashboardPayload({ cleaned, allTransactions = [] }) {
  const agentsSet = new Set();
  const leadersSet = new Set();
  const domainCounts = {};

  KNOWN_DOMAINS.forEach((d) => (domainCounts[d] = 0));

  cleaned.forEach((c) => {
    agentsSet.add(c.agentName);
    leadersSet.add(c.leader);
    domainCounts[c.domain] = (domainCounts[c.domain] || 0) + 1;
  });

  // Keep known domain ordering first, then any other found domains
  const extraDomains = Object.keys(domainCounts).filter((d) => !KNOWN_DOMAINS.includes(d));
  const domainsList = [...KNOWN_DOMAINS, ...extraDomains].filter((d) => domainCounts[d] > 0);

  const agentsList = Array.from(agentsSet).sort();
  const leadersList = Array.from(leadersSet).sort();

  const domainIdxMap = new Map(domainsList.map((d, i) => [d, i]));
  const agentIdxMap = new Map(agentsList.map((a, i) => [a, i]));
  const leaderIdxMap = new Map(leadersList.map((l, i) => [l, i]));
  const statusIdxMap = new Map(STATUS_LIST.map((s, i) => [s, i]));
  const typeIdxMap = new Map(TYPE_LIST.map((t, i) => [t, i]));
  const modeIdxMap = new Map(MODE_LIST.map((m, i) => [m, i]));

  // Date range
  let minTime = Infinity;
  let maxTime = -Infinity;

  cleaned.forEach((c) => {
    if (c.repayDate && !Number.isNaN(c.repayDate.getTime())) {
      const t = c.repayDate.getTime();
      if (t < minTime) minTime = t;
      if (t > maxTime) maxTime = t;
    }
    if (c.recDate && !Number.isNaN(c.recDate.getTime())) {
      const t = c.recDate.getTime();
      if (t < minTime) minTime = t;
      if (t > maxTime) maxTime = t;
    }
  });

  const dateMin = minTime !== Infinity ? new Date(minTime) : new Date('2024-01-01');
  const dateMax = maxTime !== -Infinity ? new Date(maxTime) : new Date('2026-09-30');

  // Agent primary and multi leaders & domain mappings
  const agentLeaderCounts = {};
  const agentDomains = {};
  const leaderDomains = {};

  cleaned.forEach((c) => {
    if (!agentLeaderCounts[c.agentName]) agentLeaderCounts[c.agentName] = {};
    agentLeaderCounts[c.agentName][c.leader] = (agentLeaderCounts[c.agentName][c.leader] || 0) + 1;

    if (!agentDomains[c.agentName]) agentDomains[c.agentName] = new Set();
    agentDomains[c.agentName].add(c.domain);

    if (!leaderDomains[c.leader]) leaderDomains[c.leader] = new Set();
    leaderDomains[c.leader].add(c.domain);
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

  // Convert domain sets to arrays for serialization
  const serializedAgentDomains = {};
  Object.entries(agentDomains).forEach(([ag, dSet]) => {
    serializedAgentDomains[ag] = Array.from(dSet).sort();
  });
  const serializedLeaderDomains = {};
  Object.entries(leaderDomains).forEach(([ld, dSet]) => {
    serializedLeaderDomains[ld] = Array.from(dSet).sort();
  });

  // Build cases matrix:
  // [a, l, t, s, DayOffset, due_amt, recvd_amt, st, dI, loanAmt, mI, dpd, recMonth, recDayOffset]
  const cases = [];
  const actualCollectionByDate = {};
  const agentActualCollectionByDate = {};
  const leaderActualCollectionByDate = {};

  let totalDisbursedPrincipal = 0;
  let totalRepaymentDue = 0;
  let totalRecoveredCash = 0;
  let sep2026Recvd = 0;

  cleaned.forEach((c) => {
    const a = agentIdxMap.get(c.agentName) ?? 0;
    const l = leaderIdxMap.get(c.leader) ?? 0;
    const t = typeIdxMap.get(c.caseType) ?? 0;
    const s = statusIdxMap.get(c.currentStatus) ?? 0;

    const dayOffset = Math.round((c.repayDate.getTime() - dateMin.getTime()) / 86400000);
    const dueAmt = Math.round(c.dueAmt || 0);
    const recvdAmt = Math.round(c.recvdAmt || 0);
    const st = c.stateIdx;

    const dI = domainIdxMap.get(c.domain) ?? 0;
    const loanAmt = Math.round(c.loanAmt || 0);
    const mI = modeIdxMap.get(c.mode) ?? 0;
    const dpd = c.dpd;
    const recMonth = c.recMonth || '';
    const recDayOffset = c.recDate ? Math.round((c.recDate.getTime() - dateMin.getTime()) / 86400000) : -1;

    cases.push([a, l, t, s, dayOffset, dueAmt, recvdAmt, st, dI, loanAmt, mI, dpd, recMonth, recDayOffset]);

    totalDisbursedPrincipal += loanAmt;
    totalRepaymentDue += dueAmt;
    totalRecoveredCash += recvdAmt;

    const isSep2026 = (recMonth && recMonth.toLowerCase().includes('sep') && recMonth.includes('2026')) ||
      (c.recDate && toDateStr(c.recDate).startsWith('2026-09'));
    if (isSep2026) {
      sep2026Recvd += recvdAmt;
    }

    if (c.recDate && recvdAmt > 0) {
      const dstr = toDateStr(c.recDate);
      if (dstr) {
        if (!actualCollectionByDate[dstr]) {
          actualCollectionByDate[dstr] = { amount: 0, cases: 0 };
        }
        actualCollectionByDate[dstr].amount += recvdAmt;
        actualCollectionByDate[dstr].cases += 1;

        if (!agentActualCollectionByDate[c.agentName]) agentActualCollectionByDate[c.agentName] = {};
        if (!agentActualCollectionByDate[c.agentName][dstr]) agentActualCollectionByDate[c.agentName][dstr] = { amount: 0, cases: 0 };
        agentActualCollectionByDate[c.agentName][dstr].amount += recvdAmt;
        agentActualCollectionByDate[c.agentName][dstr].cases += 1;

        if (!leaderActualCollectionByDate[c.leader]) leaderActualCollectionByDate[c.leader] = {};
        if (!leaderActualCollectionByDate[c.leader][dstr]) leaderActualCollectionByDate[c.leader][dstr] = { amount: 0, cases: 0 };
        leaderActualCollectionByDate[c.leader][dstr].amount += recvdAmt;
        leaderActualCollectionByDate[c.leader][dstr].cases += 1;
      }
    }
  });

  const todayStr = getTodayStrIST();

  const meta = {
    agents: agentsList,
    leaders: leadersList,
    domains: domainsList,
    domainCounts,
    modes: MODE_LIST,
    statuses: STATUS_LIST,
    types: TYPE_LIST,
    states: STATE_LIST,
    agentPrimaryLeader,
    agentMultiLeaders,
    agentDomains: serializedAgentDomains,
    leaderDomains: serializedLeaderDomains,
    dateMin: toDateStr(dateMin),
    dateMax: toDateStr(dateMax),
    today: todayStr,
    totalDisbursedPrincipal: Math.round(totalDisbursedPrincipal),
    totalRepaymentDue: Math.round(totalRepaymentDue),
    totalRecoveredCash: Math.round(totalRecoveredCash),
    sep2026Recvd: Math.round(sep2026Recvd),
    actualCollectionByDate,
    agentActualCollectionByDate,
    leaderActualCollectionByDate,
  };

  return { cases, meta };
}

function loadNpaBackup() {
  if (fs.existsSync(NPA_BACKUP_PATH)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(NPA_BACKUP_PATH, 'utf-8'));
      if (parsed?.cases && parsed.cases.length > 0) {
        return parsed;
      }
    } catch (err) {
      console.error('[DataService-Node] Error loading NPA backup cache:', err.message);
    }
  }
  return null;
}

function saveNpaBackup(payload) {
  try {
    fs.writeFileSync(NPA_BACKUP_PATH, JSON.stringify(payload), 'utf-8');
    console.log('[DataService-Node] Saved NPA backup cache successfully');
  } catch (err) {
    console.error('[DataService-Node] Failed to save NPA backup cache:', err.message);
  }
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

  // 1. Primary: Google Sheets MASTER tab (+ DAILY RECD if present)
  try {
    const cfg = loadConfig();
    const masterTab = cfg.worksheet_title || process.env.WORKSHEET_TITLE || 'MASTER';
    const dailyTab = cfg.daily_worksheet_title || process.env.DAILY_WORKSHEET_TITLE || 'DAILY RECD';

    console.log(`[DataService-Node] Fetching Google Sheets: tab '${masterTab}' and '${dailyTab}'...`);
    const [rawMasterRows, rawDailyRows] = await Promise.all([
      fetchRawSheetRows(masterTab).catch((err) => {
        console.error(`[DataService-Node] Error fetching tab '${masterTab}':`, err.message);
        return null;
      }),
      fetchRawSheetRows(dailyTab).catch((err) => {
        console.error(`[DataService-Node] Error fetching tab '${dailyTab}':`, err.message);
        return null;
      }),
    ]);

    if (rawMasterRows && rawMasterRows.length > 0) {
      const { cleaned, allTransactions } = cleanRecords(rawMasterRows, rawDailyRows || []);
      const payload = buildDashboardPayload({ cleaned, allTransactions });

      payload.meta.dataSource = 'google_sheets_npa_master';
      _cachedPayload = payload;
      _lastCacheTime = now;
      saveNpaBackup(payload);

      console.log(`[DataService-Node] Loaded ${payload.cases.length} NPA cases across ${payload.meta.domains.length} domains from Google Sheets!`);
      return payload;
    }
  } catch (err) {
    console.error('[DataService-Node] Error reading Google Sheets NPA MASTER / DAILY RECD:', err.message);
  }

  // 2. Return cached if available
  if (_cachedPayload) return _cachedPayload;

  // 3. Fallback: Saved NPA Backup Cache
  const npaBackup = loadNpaBackup();
  if (npaBackup) {
    console.log(`[DataService-Node] Serving cached NPA data (${npaBackup.cases.length} cases)`);
    _cachedPayload = npaBackup;
    _lastCacheTime = now;
    return npaBackup;
  }

  // 4. Fallback: September backup if available
  const sepBackup = loadSeptemberBackup();
  if (sepBackup) {
    _cachedPayload = sepBackup;
    _lastCacheTime = now;
    return sepBackup;
  }

  return { cases: [], meta: {} };
}

export async function refreshDashboardData() {
  return getDashboardData(true);
}
