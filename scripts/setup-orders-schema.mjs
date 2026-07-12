#!/usr/bin/env node
/**
 * Add structured columns to the Airtable Orders table (idempotent).
 *
 * Usage:
 *   set -a && source services/catalog-sync/.env.railway && set +a
 *   node scripts/setup-orders-schema.mjs
 */
import {AIRTABLE} from '../lib/order-sync/config.js';

const PAT = process.env.AIRTABLE_PAT?.trim();
if (!PAT) {
  console.error('Set AIRTABLE_PAT');
  process.exit(1);
}

const FIELDS_TO_ADD = [
  {name: 'Shopify Order ID', type: 'singleLineText'},
  {name: 'Customer Email', type: 'email'},
  {name: 'Customer Name', type: 'singleLineText'},
  {name: 'Line Items', type: 'multilineText'},
  {
    name: 'Order Total',
    type: 'currency',
    options: {precision: 2, symbol: '$'},
  },
  {
    name: 'Subtotal',
    type: 'currency',
    options: {precision: 2, symbol: '$'},
  },
  {
    name: 'Tax',
    type: 'currency',
    options: {precision: 2, symbol: '$'},
  },
  {
    name: 'Shipping Paid',
    type: 'currency',
    options: {precision: 2, symbol: '$'},
  },
  {name: 'Financial Status', type: 'singleLineText'},
  {name: 'Fulfillment Status', type: 'singleLineText'},
  {name: 'Ship Name', type: 'singleLineText'},
  {name: 'Ship Company', type: 'singleLineText'},
  {name: 'Ship Address 1', type: 'singleLineText'},
  {name: 'Ship Address 2', type: 'singleLineText'},
  {name: 'Ship City', type: 'singleLineText'},
  {name: 'Ship State', type: 'singleLineText'},
  {name: 'Ship ZIP', type: 'singleLineText'},
  {name: 'Ship Country', type: 'singleLineText'},
  {name: 'Customer Note', type: 'multilineText'},
  {name: 'FedEx Tracking', type: 'singleLineText'},
  {name: 'FedEx Service', type: 'singleLineText'},
  {name: 'Shipping Label', type: 'multipleAttachments'},
  {name: 'Shipping Label URL', type: 'url'},
  {
    name: 'Label Status',
    type: 'singleSelect',
    options: {
      choices: [
        {name: 'Pending'},
        {name: 'Created'},
        {name: 'Failed'},
        {name: 'Skipped'},
      ],
    },
  },
  {name: 'Label Error', type: 'multilineText'},
];

async function api(path, {method = 'GET', body} = {}) {
  const response = await fetch(`https://api.airtable.com/v0${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${PAT}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`${method} ${path} (${response.status}): ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function main() {
  const schema = await api(`/meta/bases/${AIRTABLE.baseId}/tables`);
  const table = schema.tables?.find((entry) => entry.id === AIRTABLE.ordersTableId);
  if (!table) throw new Error(`Orders table ${AIRTABLE.ordersTableId} not found`);

  const existing = new Set(table.fields.map((field) => field.name));
  let created = 0;

  for (const field of FIELDS_TO_ADD) {
    if (existing.has(field.name)) {
      console.log(`skip  ${field.name}`);
      continue;
    }

    const payload = {name: field.name, type: field.type};
    if (field.options) payload.options = field.options;

    await api(
      `/meta/bases/${AIRTABLE.baseId}/tables/${AIRTABLE.ordersTableId}/fields`,
      {method: 'POST', body: payload},
    );
    console.log(`added ${field.name}`);
    created += 1;
  }

  console.log(`\nDone. ${created} field(s) created, ${FIELDS_TO_ADD.length - created} already existed.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
