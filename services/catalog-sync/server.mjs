/**
 * Airtable → Shopify catalog sync service (Railway).
 *
 * Endpoints:
 *   GET  /health
 *   POST /sync/:recordId     — sync one print (auth required)
 *   POST /webhook/airtable   — Airtable automation webhook (auth required)
 */
import {createServer} from 'node:http';
import {syncPrint} from './run-sync.mjs';
import {startPolling} from './poll.mjs';

const PORT = Number(process.env.PORT ?? 3000);
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET?.trim();

function json(res, status, body) {
  res.writeHead(status, {'Content-Type': 'application/json'});
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function authorized(req) {
  if (!WEBHOOK_SECRET) return true;
  const header = req.headers.authorization ?? '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
  const custom = req.headers['x-webhook-secret'] ?? '';
  return bearer === WEBHOOK_SECRET || custom === WEBHOOK_SECRET;
}

function extractRecordId(payload, params) {
  if (params?.recordId?.startsWith('rec')) return params.recordId;
  if (!payload || typeof payload !== 'object') return null;

  const candidates = [
    payload.recordId,
    payload.record_id,
    payload.id,
    payload.printId,
    payload.print_id,
    payload?.record?.id,
    payload?.fields?.id,
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.startsWith('rec')) return value;
  }

  // Airtable automation: { recordId: "{{record.id}}" } or nested
  if (Array.isArray(payload.recordIds)) {
    const first = payload.recordIds.find((id) => typeof id === 'string' && id.startsWith('rec'));
    if (first) return first;
  }

  return null;
}

async function handleSync(req, res, recordId, dryRun = false) {
  if (!recordId?.startsWith('rec')) {
    return json(res, 400, {error: 'Invalid or missing Airtable record id (rec…)'});
  }

  try {
    const {summary} = await syncPrint(recordId, {dryRun});
    console.log(`[sync] ${recordId} ok`, summary.print?.status ?? summary.reason ?? '');
    return json(res, 200, {ok: true, printId: recordId, summary});
  } catch (error) {
    console.error(`[sync] ${recordId} failed:`, error.message);
    return json(res, 500, {ok: false, printId: recordId, error: error.message});
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (req.method === 'GET' && path === '/health') {
    return json(res, 200, {
      ok: true,
      service: 'catalog-sync',
      polling: Boolean(Number(process.env.POLL_INTERVAL_MS) >= 60_000),
    });
  }

  const needsAuth = path.startsWith('/sync') || path === '/webhook/airtable';
  if (needsAuth && !authorized(req)) {
    return json(res, 401, {error: 'Unauthorized'});
  }

  if (req.method === 'POST' && path.startsWith('/sync/')) {
    const recordId = decodeURIComponent(path.slice('/sync/'.length).split('/')[0]);
    const dryRun = url.searchParams.get('dryRun') === 'true';
    return handleSync(req, res, recordId, dryRun);
  }

  if (req.method === 'POST' && path === '/webhook/airtable') {
    const body = await readBody(req);
    const recordId = extractRecordId(body, null);
    if (!recordId) {
      return json(res, 400, {
        error: 'Could not find record id in webhook body. Send { "recordId": "rec…" }.',
        received: body,
      });
    }
    const dryRun = body?.dryRun === true;
    return handleSync(req, res, recordId, dryRun);
  }

  return json(res, 404, {error: 'Not found'});
});

server.listen(PORT, () => {
  console.log(`[catalog-sync] listening on :${PORT}`);
  if (!process.env.AIRTABLE_PAT) {
    console.warn('[catalog-sync] WARNING: AIRTABLE_PAT not set');
  }
  if (!process.env.SHOPIFY_ACCESS_TOKEN && !process.env.SHOPIFY_ADMIN_TOKEN) {
    console.warn('[catalog-sync] WARNING: SHOPIFY_ACCESS_TOKEN not set');
  }
  if (!WEBHOOK_SECRET) {
    console.warn('[catalog-sync] WARNING: WEBHOOK_SECRET not set — endpoints are open');
  }

  const pollMs = Number(process.env.POLL_INTERVAL_MS ?? 0);
  startPolling({
    intervalMs: pollMs,
    onResult: ({printId}) => console.log(`[poll] synced ${printId}`),
  });
});
