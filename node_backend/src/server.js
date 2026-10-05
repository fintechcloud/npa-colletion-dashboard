import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getDashboardData, refreshDashboardData } from './services/dataService.js';
import {
  fetchLiveCollection,
  connectGoogleSheet,
  getConnectionStatus,
  fetchRawSheetRows,
} from './services/googleSheetsService.js';

const app = express();
const PORT = process.env.PORT || 8002;

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Fast Paisa NPA Collection Backend API',
    endpoints: {
      health: '/health',
      dashboardData: '/api/dashboard-data',
      liveCollection: '/api/live-collection',
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', runtime: 'node-express', timestamp: new Date().toISOString() });
});

app.get('/api/dashboard-data', async (req, res) => {
  try {
    const data = await getDashboardData();
    res.json(data);
  } catch (err) {
    console.error('[Server] /api/dashboard-data error:', err);
    res.status(500).json({ detail: err.message || 'Internal Server Error' });
  }
});

app.post('/api/dashboard-data/refresh', async (req, res) => {
  try {
    const data = await refreshDashboardData();
    res.json(data);
  } catch (err) {
    console.error('[Server] /api/dashboard-data/refresh error:', err);
    res.status(500).json({ detail: err.message || 'Internal Server Error' });
  }
});

app.get('/api/live-collection', async (req, res) => {
  try {
    const data = await fetchLiveCollection();
    res.json(data);
  } catch (err) {
    console.error('[Server] /api/live-collection error:', err);
    res.status(500).json({ detail: err.message || 'Internal Server Error' });
  }
});

app.post('/api/live-collection/sync', async (req, res) => {
  try {
    const data = await fetchLiveCollection();
    res.json(data);
  } catch (err) {
    console.error('[Server] /api/live-collection/sync error:', err);
    res.status(500).json({ detail: err.message || 'Internal Server Error' });
  }
});

app.get('/api/google-sheets/status', (req, res) => {
  try {
    const status = getConnectionStatus();
    res.json(status);
  } catch (err) {
    console.error('[Server] /api/google-sheets/status error:', err);
    res.status(500).json({ detail: err.message || 'Internal Server Error' });
  }
});

app.post('/api/google-sheets/connect', async (req, res) => {
  try {
    const { sheet_url, worksheet_title } = req.body || {};
    if (!sheet_url) {
      return res.status(400).json({ detail: 'sheet_url is required' });
    }
    const result = await connectGoogleSheet(sheet_url, worksheet_title);
    if (!result.success) {
      return res.status(400).json({ detail: result.error || 'Failed to connect Google Sheet' });
    }
    res.json(result);
  } catch (err) {
    console.error('[Server] /api/google-sheets/connect error:', err);
    res.status(500).json({ detail: err.message || 'Internal Server Error' });
  }
});

app.get('/api/debug-sheet', async (req, res) => {
  try {
    const [collRows, masterRows] = await Promise.all([
      fetchRawSheetRows('COLLECTION').catch((e) => ({ error: e.message })),
      fetchRawSheetRows('master_data').catch((e) => ({ error: e.message })),
    ]);

    const collSample = Array.isArray(collRows) ? collRows.slice(0, 5) : collRows;
    const masterSample = Array.isArray(masterRows) ? masterRows.slice(0, 5) : masterRows;

    const collPrefixes = {};
    if (Array.isArray(collRows)) {
      for (const r of collRows) {
        const val = String(r['LOAN NO.'] || r['Loan No'] || r['LOAN NO'] || '');
        const pfx = val.slice(0, 4).toUpperCase();
        collPrefixes[pfx] = (collPrefixes[pfx] || 0) + 1;
      }
    }

    const masterPrefixes = {};
    if (Array.isArray(masterRows)) {
      for (const r of masterRows) {
        const val = String(r['Loan No'] || r['LOAN NO.'] || r['Loan ID'] || '');
        const pfx = val.slice(0, 4).toUpperCase();
        masterPrefixes[pfx] = (masterPrefixes[pfx] || 0) + 1;
      }
    }

    const sampleByPrefix = {};
    const masterLoanSet = new Set();
    if (Array.isArray(masterRows)) {
      for (const r of masterRows) {
        const val = String(r['Loan No'] || '').trim();
        if (val) masterLoanSet.add(val);
      }
    }

    let fastMatchesMaster = 0;
    let snapMatchesMaster = 0;
    let f1spMatchesMaster = 0;

    if (Array.isArray(collRows)) {
      for (const r of collRows) {
        const val = String(r['LOAN NO.'] || r['Loan No'] || '').trim();
        const pfx = val.slice(0, 4).toUpperCase();
        if (!sampleByPrefix[pfx]) {
          sampleByPrefix[pfx] = r;
        }
        if (pfx === 'FAST' && masterLoanSet.has(val)) fastMatchesMaster++;
        if (pfx === 'SNAP' && masterLoanSet.has(val)) snapMatchesMaster++;
        if (pfx === 'F1SP' && masterLoanSet.has(val)) f1spMatchesMaster++;
      }
    }

    let sumLoanRepay = 0;
    let sumTotalCollection = 0;
    let sumManualColl = 0;
    let sumActRp = 0;
    let closedCount = 0;

    const parseNum = (v) => {
      if (typeof v === 'number') return v;
      if (!v) return 0;
      const clean = String(v).replace(/[^0-9.-]/g, '');
      const n = parseFloat(clean);
      return Number.isNaN(n) ? 0 : n;
    };

    let dueOn23Count = 0;
    let dueOn23DueAmt = 0;
    let dueOn23RecvdAmt = 0;

    if (Array.isArray(masterRows)) {
      for (const r of masterRows) {
        const repayDate = String(r['Repayment Date'] || '').trim();
        const due = parseNum(r['Loan Repay Amount'] || r['Loan Amount']);
        const recvd = parseNum(r['TOTAL COLLECTION'] || r['MANUAL_COLL'] || r['Total Recvd']);
        sumLoanRepay += due;
        sumTotalCollection += parseNum(r['TOTAL COLLECTION']);
        sumManualColl += parseNum(r['MANUAL_COLL']);
        sumActRp += parseNum(r['ACT_RP']);
        const st = String(r['latest Status'] || r['Current Status'] || '').toUpperCase();
        if (st === 'CLOSED' || st === 'PRE-CLOSED') closedCount++;

        if (repayDate.startsWith('23/09/2026') || repayDate.startsWith('23-09-2026') || repayDate.startsWith('2026-09-23')) {
          dueOn23Count++;
          dueOn23DueAmt += due;
          dueOn23RecvdAmt += recvd;
        }
      }
    }

    let coll23Sum = 0;
    let coll23Count = 0;
    let coll24Sum = 0;
    let coll24Count = 0;

    if (Array.isArray(collRows)) {
      for (const r of collRows) {
        const brand = String(r['BRAND'] || '');
        const loanNo = String(r['LOAN NO.'] || '');
        if (brand === 'FastPaise' || loanNo.startsWith('FAST')) {
          const rcvDate = String(r['RCV DATE'] || '');
          const amt = parseNum(r['TOTAL RCV']);
          if (rcvDate.startsWith('23/09/2026') || rcvDate.startsWith('23-09-2026')) {
            coll23Sum += amt;
            coll23Count++;
          }
          if (rcvDate.startsWith('24/09/2026') || rcvDate.startsWith('24-09-2026')) {
            coll24Sum += amt;
            coll24Count++;
          }
        }
      }
    }

    const [perfRows, daywiseRows] = await Promise.all([
      fetchRawSheetRows('PERFORMANCE REPORT').catch((e) => null),
      fetchRawSheetRows('Daywise Due').catch((e) => null),
    ]);

    const find24Sep = (rows) => {
      if (!Array.isArray(rows)) return null;
      return rows.filter((r) => {
        const str = JSON.stringify(r);
        return str.includes('24 Sep') || str.includes('24/09') || str.includes('24-09');
      });
    };

    let totCollSum = 0;
    let manualCollSum = 0;
    let preClosedCollSum = 0;
    let actRpSum = 0;
    let loanRepaySum = 0;

    const loanSet24 = new Set();
    const rows24 = [];

    for (const r of (masterRows || [])) {
      const d = String(r['Repayment Date'] || '');
      if (d.startsWith('24-09-2026') || d.startsWith('24/09/2026') || d.startsWith('2026-09-24')) {
        const ln = String(r['Loan No'] || '').trim();
        loanSet24.add(ln);
        totCollSum += parseNum(r['TOTAL COLLECTION']);
        manualCollSum += parseNum(r['MANUAL_COLL']);
        preClosedCollSum += parseNum(r['Pre Closed Coll']);
        actRpSum += parseNum(r['ACT_RP']);
        loanRepaySum += parseNum(r['Loan Repay Amount'] || r['Loan Amount']);
        rows24.push(r);
      }
    }

    // Now sum transactions from COLLECTION tab for these 59 loans
    let collTabSum = 0;
    let collTabSumOnOrBefore24 = 0;
    for (const r of (collRows || [])) {
      const ln = String(r['LOAN NO.'] || '').trim();
      if (loanSet24.has(ln)) {
        const amt = parseNum(r['TOTAL RCV']);
        collTabSum += amt;
        const rcvDate = String(r['RCV DATE'] || '');
        // Check if received on or before 24 Sep
        if (!rcvDate.includes('25/09') && !rcvDate.includes('25-09')) {
          collTabSumOnOrBefore24 += amt;
        }
      }
    }

    // Compare each date in Daywise Due with master_data ACT_RP sum
    const dateComp = {};
    if (Array.isArray(daywiseRows)) {
      for (const r of daywiseRows) {
        const dt = String(r['DUE DATE'] || '').trim();
        const tot = parseNum(r['TOTAL']);
        if (dt && tot > 0) {
          dateComp[dt] = { daywiseDueTotal: tot, masterActRpSum: 0, masterLoanRepaySum: 0, masterRecvdSum: 0, count: 0 };
        }
      }
    }

    if (Array.isArray(masterRows)) {
      for (const r of masterRows) {
        const rd = String(r['Repayment Date'] || '').trim();
        const act = parseNum(r['ACT_RP']);
        const lr = parseNum(r['Loan Repay Amount'] || r['Loan Amount']);
        const rec = parseNum(r['TOTAL COLLECTION'] || r['MANUAL_COLL'] || r['Total Recvd']);
        // Match dates
        for (const [dt, obj] of Object.entries(dateComp)) {
          if (rd.includes(dt) || rd.startsWith(dt)) {
            obj.masterActRpSum += act;
            obj.masterLoanRepaySum += lr;
            obj.masterRecvdSum += rec;
            obj.count++;
          }
        }
      }
    }

    res.json({
      daywiseRowsSample: Array.isArray(daywiseRows) ? daywiseRows.slice(0, 15) : [],
      dateComp,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[NPA-Dashboard-Node] Express server listening on http://127.0.0.1:${PORT}`);
});
