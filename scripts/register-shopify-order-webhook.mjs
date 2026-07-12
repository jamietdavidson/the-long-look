#!/usr/bin/env node
/**
 * Register Shopify order webhooks pointing at the Railway order-sync service.
 *
 * Usage:
 *   ORDER_SYNC_URL=https://your-service.up.railway.app \
 *   SHOPIFY_ACCESS_TOKEN=shpat_… \
 *   node scripts/register-shopify-order-webhook.mjs
 */
import {SHOPIFY} from '../lib/order-sync/config.js';

const webhookUrl = process.env.ORDER_SYNC_URL?.trim();
const token =
  process.env.SHOPIFY_ACCESS_TOKEN?.trim() ?? process.env.SHOPIFY_ADMIN_TOKEN?.trim();

if (!webhookUrl || !token) {
  console.error('Set ORDER_SYNC_URL and SHOPIFY_ACCESS_TOKEN');
  process.exit(1);
}

const endpoint = `${webhookUrl.replace(/\/$/, '')}/webhooks/shopify/orders`;
const topics = ['orders/create'];

for (const topic of topics) {
  const response = await fetch(
    `https://${SHOPIFY.shopDomain}/admin/api/${SHOPIFY.apiVersion}/webhooks.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        webhook: {
          topic,
          address: endpoint,
          format: 'json',
        },
      }),
    },
  );

  const body = await response.json();
  if (!response.ok) {
    console.error(`Failed to register ${topic}:`, JSON.stringify(body, null, 2));
    process.exit(1);
  }

  console.log(`Registered ${topic} → ${endpoint}`);
  console.log(JSON.stringify(body.webhook, null, 2));
}

console.log(
  '\nCopy the webhook signing secret from Shopify Admin → Settings → Notifications → Webhooks',
);
console.log('Set it on Railway as SHOPIFY_WEBHOOK_SECRET.');
