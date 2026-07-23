import {createServer} from 'node:http';
import {ORDER_SYNC_POLL, SHIPPING_AUTOMATION} from '../../lib/order-sync/config.js';
import {startOrderSyncPolling} from './poll-fulfillments.mjs';

const PORT = Number(process.env.PORT ?? 3000);

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (req.method === 'GET' && path === '/health') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({ok: true, service: 'order-sync', mode: 'poll-only'}));
    return;
  }

  res.writeHead(404, {'Content-Type': 'application/json'});
  res.end(JSON.stringify({error: 'Not found'}));
});

server.listen(PORT, () => {
  console.log(`[order-sync] poll-only service listening on :${PORT} (/health for Railway)`);
  console.log(
    `[order-sync] shipping automation: ${SHIPPING_AUTOMATION.isEnabled() ? 'enabled' : 'disabled'}`,
  );
  startOrderSyncPolling({intervalMs: ORDER_SYNC_POLL.intervalMs});
  if (!process.env.AIRTABLE_PAT) {
    console.warn('[order-sync] WARNING: AIRTABLE_PAT not set');
  }
});
