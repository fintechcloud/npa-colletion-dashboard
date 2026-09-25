import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths relative to react.office2 root
const ROOT_DIR = path.resolve(__dirname, '../../../');
const CONFIG_PATH = path.resolve(__dirname, '../../../backend/data/google_sheet_config.json');
const SERVICE_ACCOUNT_PATH = path.resolve(__dirname, '../../../backend/service_account.json');

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
];

export function maskSheetUrl(url) {
  if (!url) return '';
  const sheetId = extractSheetId(url);
  if (!sheetId || sheetId.length < 10) return url;
  return `https://docs.google.com/spreadsheets/d/${sheetId.slice(0, 6)}...${sheetId.slice(-4)} (Secured via .env)`;
}

export function loadConfig() {
  let fileCfg = {};
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      fileCfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    }
  } catch (err) {
    console.error('[GoogleSheetsService] Error loading config:', err.message);
  }
  return {
    sheet_url: process.env.GOOGLE_SHEET_URL || fileCfg.sheet_url || '',
    worksheet_title: process.env.WORKSHEET_TITLE || fileCfg.worksheet_title || 'master_data',
    sheet_title: fileCfg.sheet_title || "FAST PAISE MASTER PRE Sep'26",
    last_synced: fileCfg.last_synced || null,
  };
}

export function saveConfig(cfg) {
  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const toSave = {
      sheet_url: process.env.GOOGLE_SHEET_URL ? '' : (cfg.sheet_url || ''),
      worksheet_title: cfg.worksheet_title || 'master_data',
      sheet_title: cfg.sheet_title || '',
      last_synced: cfg.last_synced || new Date().toISOString(),
    };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(toSave, null, 2), 'utf-8');
  } catch (err) {
    console.error('[GoogleSheetsService] Error saving config:', err.message);
  }
}

export function getCredentialsInfo() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      const saInfo = typeof process.env.GOOGLE_SERVICE_ACCOUNT_JSON === 'string'
        ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
        : process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: saInfo.client_email,
          private_key: saInfo.private_key ? saInfo.private_key.replace(/\\n/g, '\n') : undefined,
          ...saInfo,
        },
        scopes: SCOPES,
      });
      return {
        auth,
        authType: 'service_account',
        email: saInfo.client_email || '',
      };
    } catch (err) {
      console.error('[GoogleSheetsService] Env service account parse error:', err.message);
    }
  }

  if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    try {
      const saInfo = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));
      const auth = new google.auth.GoogleAuth({
        keyFile: SERVICE_ACCOUNT_PATH,
        scopes: SCOPES,
      });
      return {
        auth,
        authType: 'service_account',
        email: saInfo.client_email || '',
      };
    } catch (err) {
      console.error('[GoogleSheetsService] Service account read error:', err.message);
    }
  }
  return { auth: null, authType: 'none', email: '' };
}

export function extractSheetId(urlOrId) {
  if (!urlOrId) return '';
  const clean = urlOrId.trim();
  const match = clean.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : clean;
}

export async function fetchRawSheetRows(worksheetTitleOverride = null) {
  const cfg = loadConfig();
  const sheetId = extractSheetId(cfg.sheet_url);
  if (!sheetId) return null;

  const { auth } = getCredentialsInfo();
  if (!auth) return null;

  const sheets = google.sheets({ version: 'v4', auth });
  const tabName = worksheetTitleOverride || cfg.worksheet_title || 'master_data';

  // Read all rows from tab
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `'${tabName}'`,
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING',
  });

  const rows = res.data.values;
  if (!rows || rows.length < 2) return null;

  const headers = rows[0].map((h) => String(h || '').trim());
  const records = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rec = {};
    for (let j = 0; j < headers.length; j++) {
      rec[headers[j]] = row[j] !== undefined ? row[j] : '';
    }
    records.push(rec);
  }

  return records;
}

export async function fetchLiveCollection() {
  const cfg = loadConfig();
  const [collRecords, masterRecords] = await Promise.all([
    fetchRawSheetRows('COLLECTION').catch(() => null),
    fetchRawSheetRows('master_data').catch(() => null),
  ]);

  if (!collRecords && !masterRecords) {
    return {
      status: 'idle',
      connected: false,
      sheetUrl: cfg.sheet_url || '',
      sheetTitle: cfg.sheet_title || '',
      lastSynced: cfg.last_synced,
      todayDate: new Date().toISOString().slice(0, 10),
      totalLiveToday: 0,
      totalLiveCases: 0,
      byAgent: {},
      byLeader: {},
      recentTransactions: [],
      source: 'none',
    };
  }

  // Build master_data lookup by Loan No
  const loanMetaMap = new Map();
  if (masterRecords) {
    for (const r of masterRecords) {
      const loanNo = String(r['Loan No'] || r['Loan ID'] || '').trim();
      const agent = String(r['Agent Name'] || r['Agent'] || r['Employee'] || 'Unassigned').trim().replace(/\b\w/g, (c) => c.toUpperCase());
      const leader = String(r['Team Leader Allocation'] || r['Team Leader'] || r['TL'] || 'OPERATIONS').trim().toUpperCase();
      const status = String(r['latest Status'] || r['Current Status'] || 'CLOSED').trim().toUpperCase();
      if (loanNo) {
        loanMetaMap.set(loanNo, { agent, leader, status });
      }
    }
  }

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const pad = (n) => String(n).padStart(2, '0');
  const d = pad(now.getDate());
  const m = pad(now.getMonth() + 1);
  const y = now.getFullYear();

  // Match formats like 23/09/2026, 23-09-2026, 2026-09-23
  const todayPatterns = [`${d}/${m}/${y}`, `${d}-${m}-${y}`, todayStr];

  const byAgent = {};
  const byLeader = {};
  const recentTx = [];
  let totalLiveToday = 0;
  let totalLiveCases = 0;

  // Primary source for live transactions: COLLECTION tab
  const transactions = (collRecords || []).filter(
    (r) => r['BRAND'] === 'FastPaise' || String(r['LOAN NO.'] || '').startsWith('FAST')
  );

  if (transactions.length > 0) {
    for (const r of transactions) {
      const loanNo = String(r['LOAN NO.'] || r['Loan No'] || '').trim();
      const amtRaw = String(r['TOTAL RCV'] || r['Total Recvd'] || 0).replace(/,/g, '').trim();
      const rcvDate = String(r['RCV DATE'] || '').trim();
      const status = String(r['LOAN STATUS'] || 'CLOSED').trim().toUpperCase();
      const amt = parseFloat(amtRaw) || 0;

      const meta = loanMetaMap.get(loanNo) || { agent: 'Unassigned', leader: 'OPERATIONS', status };
      const agent = meta.agent;
      const leader = meta.leader;

      if (amt > 0) {
        const isToday = rcvDate ? todayPatterns.some((pat) => rcvDate.startsWith(pat)) : false;

        if (isToday) {
          totalLiveToday += Math.round(amt);
          totalLiveCases += 1;
        }

        if (!byAgent[agent]) {
          byAgent[agent] = { agent, leader, liveRecvd: 0, liveCases: 0 };
        }
        if (isToday) {
          byAgent[agent].liveRecvd += Math.round(amt);
          byAgent[agent].liveCases += 1;
        }

        if (!byLeader[leader]) {
          byLeader[leader] = { leader, liveRecvd: 0, liveCases: 0, agentCount: 0 };
        }
        if (isToday) {
          byLeader[leader].liveRecvd += Math.round(amt);
          byLeader[leader].liveCases += 1;
        }

        if (recentTx.length < 25 && (isToday || recentTx.length < 15)) {
          recentTx.push({
            id: `tx_${recentTx.length}`,
            time: rcvDate || now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            agent,
            leader,
            loanNo,
            amount: Math.round(amt),
            status,
          });
        }
      }
    }
  } else if (masterRecords) {
    // Fallback if COLLECTION tab is empty
    for (const r of masterRecords) {
      const agent = String(r['Agent Name'] || r['Agent'] || '').trim().replace(/\b\w/g, (c) => c.toUpperCase());
      const leader = String(r['Team Leader Allocation'] || 'OPERATIONS').trim().toUpperCase();
      const amtRaw = String(r['TOTAL COLLECTION'] || r['MANUAL_COLL'] || 0).replace(/,/g, '').trim();
      const status = String(r['latest Status'] || 'CLOSED').trim().toUpperCase();
      const loanNo = String(r['Loan No'] || 'LOAN').trim();
      const lpDate = String(r['LP DATE'] || '').trim();
      const amt = parseFloat(amtRaw) || 0;

      if (agent && amt > 0) {
        const isToday = lpDate ? todayPatterns.some((pat) => lpDate.startsWith(pat)) : false;
        if (isToday) {
          totalLiveToday += Math.round(amt);
          totalLiveCases += 1;
        }
        if (!byAgent[agent]) byAgent[agent] = { agent, leader, liveRecvd: 0, liveCases: 0 };
        if (isToday) {
          byAgent[agent].liveRecvd += Math.round(amt);
          byAgent[agent].liveCases += 1;
        }
        if (!byLeader[leader]) byLeader[leader] = { leader, liveRecvd: 0, liveCases: 0, agentCount: 0 };
        if (isToday) {
          byLeader[leader].liveRecvd += Math.round(amt);
          byLeader[leader].liveCases += 1;
        }
      }
    }
  }

  cfg.last_synced = new Date().toISOString();
  saveConfig(cfg);

  const { auth, authType, email } = getCredentialsInfo();

  return {
    status: 'success',
    connected: true,
    hasCredentials: !!auth,
    authType,
    serviceAccountEmail: email,
    sheetUrl: maskSheetUrl(cfg.sheet_url),
    sheetTitle: cfg.sheet_title || 'FAST PAISE MASTER PRE Sep\'26',
    lastSynced: cfg.last_synced,
    todayDate: todayStr,
    totalLiveToday,
    totalLiveCases,
    byAgent,
    byLeader,
    recentTransactions: recentTx,
    source: 'google_sheets_live',
  };
}

export function getConnectionStatus() {
  const cfg = loadConfig();
  const { auth } = getCredentialsInfo();
  return {
    hasCredentials: !!auth,
    connected: Boolean(cfg.sheet_url),
    sheetUrl: maskSheetUrl(cfg.sheet_url),
    sheetTitle: cfg.sheet_title || '',
    worksheet: cfg.worksheet_title || '',
    lastSynced: cfg.last_synced || null,
  };
}

export async function connectGoogleSheet(sheetUrlOrId, worksheetTitle = null) {
  const { auth } = getCredentialsInfo();
  if (!auth) {
    return { success: false, error: 'Google Service Account credentials not found in backend/service_account.json' };
  }

  try {
    const sheetId = extractSheetId(sheetUrlOrId);
    const sheets = google.sheets({ version: 'v4', auth });
    const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });

    const title = meta.data.properties.title;
    const worksheets = (meta.data.sheets || []).map((s) => s.properties.title);
    const chosenWs = worksheetTitle || worksheets[0] || 'master_data';

    const cfg = loadConfig();
    cfg.sheet_url = sheetUrlOrId.trim();
    cfg.worksheet_title = chosenWs;
    cfg.sheet_title = title;
    cfg.last_synced = new Date().toISOString();
    saveConfig(cfg);

    return {
      success: true,
      sheetTitle: title,
      sheetUrl: sheetUrlOrId.trim(),
      worksheet: chosenWs,
      allWorksheets: worksheets,
      lastSynced: cfg.last_synced,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
