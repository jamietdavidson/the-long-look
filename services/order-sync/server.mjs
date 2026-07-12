import {createHmac, timingSafeEqual} from 'node:crypto';
import {createServer} from 'node:http';
import {syncShopifyOrderToAirtable} from '../../lib/order-sync/sync-order.mjs';

const PORT = Number(process.env.PORT ?? 3000);
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES ?? 1_048_576);
const WEBHOOK_SECRET =
  process.env.SHOPIFY_WEBHOOK_SECRET?.trim() ??
  process.env.SHOPIFY_API_SECRET?.trim() ??
  process.env.SHOPIFY_CLIENT_SECRET?.trim();

function json(res, status, body) {
  res.writeHead(status, {'Content-Type': 'application/json'});
  res.end(JSON.stringify(body));
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
      console.log(
        `[order-sync] ${result.action} ${result.orderName} (${result.shopifyOrderId}) → ${result.airtableRecordId}` +
          (result.labelStatus ? ` label=${result.labelStatus}` : '') +
          (result.fedexTracking ? ` tracking=${result.fedexTracking}` : ''),
      );
      return json(res, 200, {ok: true, ...result});
    } catch (error) {
      console.error('[order-sync] failed:', error.message);
      return json(res, 500, {ok: false, error: 'Order sync failed'});
    }
  }

  return json(res, 404, {error: 'Not found'});
});

server.listen(PORT, () => {
  console.log(`[order-sync] listening on :${PORT}`);
  if (!process.env.AIRTABLE_PAT) {
    console.warn('[order-sync] WARNING: AIRTABLE_PAT not set');
  }
  if (!WEBHOOK_SECRET) {
    console.warn('[order-sync] WARNING: SHOPIFY_WEBHOOK_SECRET not set');
  }
});
