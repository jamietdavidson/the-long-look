import {createHmac, timingSafeEqual} from 'node:crypto';
import {createServer} from 'node:http';
import {FULFILLMENT_POLL} from '../../lib/order-sync/config.js';
import {createLabelForFulfillment} from '../../lib/order-sync/fulfillment-label.mjs';
import {syncShopifyOrderToAirtable} from '../../lib/order-sync/sync-order.mjs';
import {startFulfillmentPolling} from './poll-fulfillments.mjs';

const PORT = Number(process.env.PORT ?? 3000);
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES ?? 1_048_576);
const WEBHOOK_SECRET =
  process.env.SHOPIFY_WEBHOOK_SECRET?.trim() ??
  process.env.SHOPIFY_API_SECRET?.trim() ??
  process.env.SHOPIFY_CLIENT_SECRET?.trim();
const AIRTABLE_WEBHOOK_SECRET =
  process.env.AIRTABLE_WEBHOOK_SECRET?.trim() ??
  process.env.SYNC_SECRET?.trim();

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

function authorizedAirtableWebhook(req) {
  if (!AIRTABLE_WEBHOOK_SECRET) return true;
  const header = req.headers.authorization ?? '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
  const provided = bearer || req.headers['x-sync-secret'] || '';
  return secretsMatch(provided, AIRTABLE_WEBHOOK_SECRET);
}

function fulfillmentRecordIdFromPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  if (typeof payload.recordId === 'string') return payload.recordId;
  if (typeof payload.record_id === 'string') return payload.record_id;
  if (typeof payload.id === 'string' && payload.id.startsWith('rec')) return payload.id;
  const record = payload.record;
  if (typeof record === 'string' && record.startsWith('rec')) return record;
  if (record && typeof record.id === 'string') return record.id;
  return null;
}

function verifyShopifyWebhook(rawBody, hmacHeader) {
  if (!WEBHOOK_SECRET) {
    throw new Error('SHOPIFY_WEBHOOK_SECRET is not configured');
  }
  if (!hmacHeader) return false;

  const digest = createHmac('sha256', WEBHOOK_SECRET)
    .update(rawBody, 'utf8')
    .digest('base64');

  const digestBuffer = Buffer.from(digest, 'utf8');
  const headerBuffer = Buffer.from(hmacHeader, 'utf8');
  if (digestBuffer.length !== headerBuffer.length) return false;
  return timingSafeEqual(digestBuffer, headerBuffer);
}

function readRawBody(req, maxBytes = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        req.destroy();
        reject(new Error('Request body too large'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const ACCEPTED_TOPICS = new Set(['orders/create', 'orders/paid']);

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (req.method === 'GET' && path === '/health') {
    return json(res, 200, {ok: true, service: 'order-sync'});
  }

  if (req.method === 'POST' && path === '/webhooks/shopify/orders') {
    const topic = req.headers['x-shopify-topic'];
    const hmac = req.headers['x-shopify-hmac-sha256'];

    let rawBody;
    try {
      rawBody = await readRawBody(req);
    } catch (error) {
      const status = error.message === 'Request body too large' ? 413 : 400;
      return json(res, status, {ok: false, error: 'Invalid request body'});
    }

    try {
      if (!verifyShopifyWebhook(rawBody, String(hmac ?? ''))) {
        return json(res, 401, {ok: false, error: 'Invalid webhook signature'});
      }
    } catch (error) {
      console.error('[order-sync] webhook verification failed:', error.message);
      return json(res, 500, {ok: false, error: 'Webhook verification unavailable'});
    }

    if (!ACCEPTED_TOPICS.has(String(topic ?? ''))) {
      return json(res, 200, {ok: true, ignored: true});
    }

    let order;
    try {
      order = JSON.parse(rawBody);
    } catch {
      return json(res, 400, {ok: false, error: 'Invalid JSON body'});
    }

    try {
      const result = await syncShopifyOrderToAirtable(order);
      const fulfillmentSummary = result.fulfillments
        ? ` fulfillments=${result.fulfillments.created} created, ${result.fulfillments.existing} existing`
        : '';
      console.log(
        `[order-sync] ${result.action} ${result.orderName} (${result.shopifyOrderId}) → ${result.airtableRecordId}${fulfillmentSummary}`,
      );
      return json(res, 200, {ok: true, ...result});
    } catch (error) {
      console.error('[order-sync] failed:', error.message);
      return json(res, 500, {ok: false, error: 'Order sync failed'});
    }
  }

  if (req.method === 'POST' && path === '/webhooks/airtable/fulfillments') {
    if (!authorizedAirtableWebhook(req)) {
      return json(res, 401, {ok: false, error: 'Unauthorized'});
    }

    let rawBody;
    try {
      rawBody = await readRawBody(req);
    } catch (error) {
      const status = error.message === 'Request body too large' ? 413 : 400;
      return json(res, status, {ok: false, error: 'Invalid request body'});
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return json(res, 400, {ok: false, error: 'Invalid JSON body'});
    }

    const fulfillmentRecordId = fulfillmentRecordIdFromPayload(payload);
    if (!fulfillmentRecordId) {
      return json(res, 400, {ok: false, error: 'Missing fulfillment record id'});
    }

    try {
      const result = await createLabelForFulfillment(fulfillmentRecordId);
      console.log(
        `[order-sync] fulfillment ${fulfillmentRecordId} → ${result.action}` +
          (result.trackingNumber ? ` tracking=${result.trackingNumber}` : '') +
          (result.reason ? ` (${result.reason})` : '') +
          (result.error ? ` error=${result.error}` : ''),
      );
      return json(res, 200, {ok: true, ...result});
    } catch (error) {
      console.error('[order-sync] fulfillment label failed:', error.message);
      return json(res, 500, {ok: false, error: 'Fulfillment label failed'});
    }
  }

  return json(res, 404, {error: 'Not found'});
});

server.listen(PORT, () => {
  console.log(`[order-sync] listening on :${PORT}`);
  startFulfillmentPolling({intervalMs: FULFILLMENT_POLL.intervalMs});
  if (!process.env.AIRTABLE_PAT) {
    console.warn('[order-sync] WARNING: AIRTABLE_PAT not set');
  }
  if (!WEBHOOK_SECRET) {
    console.warn('[order-sync] WARNING: SHOPIFY_WEBHOOK_SECRET not set');
  }
});
