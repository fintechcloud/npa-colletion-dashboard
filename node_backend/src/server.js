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

    res.json({
      collTotal: Array.isArray(collRows) ? collRows.length : 0,
      masterTotal: Array.isArray(masterRows) ? masterRows.length : 0,
      collPrefixes,
      masterPrefixes,
      sampleByPrefix,
      matchingCounts: {
        fastMatchesMaster,
        snapMatchesMaster,
        f1spMatchesMaster,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[FastPaisa-Node] Express server listening on http://127.0.0.1:${PORT}`);
});
