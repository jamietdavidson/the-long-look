#!/usr/bin/env node
/**
 * Push a Shopify order JSON payload through the Airtable sync (no webhook HMAC).
 *
 * Usage:
 *   set -a && source services/catalog-sync/.env.railway && set +a
 *   node scripts/sync-order-test.mjs path/to/order.json
 */
import {readFileSync} from 'node:fs';
import {syncShopifyOrderToAirtable} from '../lib/order-sync/sync-order.mjs';

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node scripts/sync-order-test.mjs <order.json>');
  process.exit(1);
}

if (!process.env.AIRTABLE_PAT) {
  console.error('Set AIRTABLE_PAT');
  process.exit(1);
}

const order = JSON.parse(readFileSync(filePath, 'utf8'));
const result = await syncShopifyOrderToAirtable(order);
console.log(JSON.stringify(result, null, 2));
