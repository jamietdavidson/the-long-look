/**
 * Airtable → Shopify catalog sync service (Railway).
 *
 * Polls Airtable for Queued records on an interval (default: every 60s).
 *
 * Endpoints:
 *   GET  /health
 *   POST /sync/:recordId  — optional manual sync (requires SYNC_SECRET)
 */
import {timingSafeEqual} from 'node:crypto';
import {createServer} from 'node:http';
import {syncPrint} from './run-sync.mjs';
import {startPolling} from './poll.mjs';

const PORT = Number(process.env.PORT ?? 3000);
const DEFAULT_POLL_MS = 60_000;
const SYNC_SECRET = process.env.SYNC_SECRET?.trim() ?? process.env.WEBHOOK_SECRET?.trim();

function json(res, status, body) {
  res.writeHead(status, {'Content-Type': 'application/json'});
  res.end(JSON.stringify(body));
}

function secretsMatch(provided, expected) {
  const providedBuffer = Buffer.from(provided ?? '', 'utf8');
  const expectedBuffer = Buffer.from(expected ?? '', 'utf8');
  if (providedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(providedBuffer, expectedBuffer);
}

function authorized(req) {
  if (!SYNC_SECRET) return false;
  const header = req.headers.authorization ?? '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
  const provided = bearer || req.headers['x-sync-secret'] || '';
  return secretsMatch(provided, SYNC_SECRET);
}

async function handleSync(res, recordId, dryRun = false) {
  if (!recordId?.startsWith('rec')) {
    return json(res, 400, {error: 'Invalid or missing Airtable record id (rec…)'});
  }

  try {
    const {summary} = await syncPrint(recordId, {dryRun});
    console.log(`[sync] ${recordId} ok`, summary.print?.status ?? summary.reason ?? '');
    return json(res, 200, {ok: true, printId: recordId, summary});
  } catch (error) {
    console.error(`[sync] ${recordId} failed:`, error.message);
    return json(res, 500, {ok: false, printId: recordId, error: 'Sync failed'});
  }
}

const pollMs = Number(process.env.POLL_INTERVAL_MS ?? DEFAULT_POLL_MS);

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (req.method === 'GET' && path === '/health') {
    return json(res, 200, {
      ok: true,
      service: 'catalog-sync',
      pollIntervalMs: pollMs,
    });
  }

  if (req.method === 'POST' && path.startsWith('/sync/')) {
    if (!SYNC_SECRET) {
      return json(res, 503, {error: 'Manual sync is disabled (SYNC_SECRET not configured)'});
    }
    if (!authorized(req)) {
      return json(res, 401, {error: 'Unauthorized'});
    }
    const recordId = decodeURIComponent(path.slice('/sync/'.length).split('/')[0]);
    const dryRun = url.searchParams.get('dryRun') === 'true';
    return handleSync(res, recordId, dryRun);
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
  if (!SYNC_SECRET) {
    console.warn('[catalog-sync] WARNING: SYNC_SECRET not set — POST /sync is disabled');
  }

  startPolling({
    intervalMs: pollMs,
    onResult: ({printId}) => console.log(`[poll] synced ${printId}`),
  });
});
