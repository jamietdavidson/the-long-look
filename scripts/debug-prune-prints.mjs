#!/usr/bin/env node
/**
 * Debug Shopify print products vs Airtable Prints table.
 *
 * Usage:
 *   set -a && source services/catalog-sync/.env.railway && set +a
 *   node scripts/debug-prune-prints.mjs
 */
import {axios} from '../lib/http.mjs';
import {AIRTABLE, SHOPIFY} from '../lib/catalog-sync/config.js';

const $ = {};
const pat = process.env.AIRTABLE_PAT?.trim();
const token = process.env.SHOPIFY_ACCESS_TOKEN?.trim() ?? process.env.SHOPIFY_ADMIN_TOKEN?.trim();
const shopId = process.env.SHOPIFY_SHOP_ID?.trim() ?? 'thelonglookco';

if (!pat || !token) {
  console.error('Set AIRTABLE_PAT and SHOPIFY_ACCESS_TOKEN');
  process.exit(1);
}

const shopify = {$auth: {shop_id: shopId, access_token: token}};

async function shopifyGql(query, variables = {}) {
  const response = await axios($, {
    method: 'post',
    url: `https://${shopId}.myshopify.com/admin/api/${SHOPIFY.apiVersion}/graphql.json`,
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
    },
    data: {query, variables},
  });
  if (response.errors?.length) throw new Error(JSON.stringify(response.errors));
  return response.data ?? response;
}

async function listAirtablePrintIds() {
  const ids = new Set();
  let offset;
  do {
    const params = new URLSearchParams();
    if (offset) params.set('offset', offset);
    const response = await axios($, {
      method: 'get',
      url: `https://api.airtable.com/v0/${AIRTABLE.baseId}/${AIRTABLE.printsTableId}?${params}`,
      headers: {Authorization: `Bearer ${pat}`},
    });
    for (const record of response.records ?? []) ids.add(record.id);
    offset = response.offset;
  } while (offset);
  return ids;
}

async function listShopifyProductsByType(productType) {
  const products = [];
  let cursor = null;
  do {
    const data = await shopifyGql(
      `query($cursor: String, $query: String!) {
        products(first: 100, after: $cursor, query: $query) {
          nodes {
            id
            handle
            title
            productType
            status
            airtableId: metafield(namespace: "${SHOPIFY.airtableMetafield.namespace}", key: "${SHOPIFY.airtableMetafield.key}") { value }
          }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      {cursor, query: `product_type:'${productType}'`},
    );
    products.push(...(data.products?.nodes ?? []));
    const pageInfo = data.products?.pageInfo;
    cursor = pageInfo?.hasNextPage ? pageInfo.endCursor : null;
  } while (cursor);
  return products;
}

async function listAllProductsSample() {
  const products = [];
  let cursor = null;
  do {
    const data = await shopifyGql(
      `query($cursor: String) {
        products(first: 100, after: $cursor) {
          nodes {
            id
            handle
            title
            productType
            status
            airtableId: metafield(namespace: "${SHOPIFY.airtableMetafield.namespace}", key: "${SHOPIFY.airtableMetafield.key}") { value }
          }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      {cursor},
    );
    products.push(...(data.products?.nodes ?? []));
    const pageInfo = data.products?.pageInfo;
    cursor = pageInfo?.hasNextPage ? pageInfo.endCursor : null;
  } while (cursor);
  return products;
}

const airtableIds = await listAirtablePrintIds();
const fineArt = await listShopifyProductsByType(SHOPIFY.productType);
const allProducts = await listAllProductsSample();

const withMetafield = fineArt.filter((p) => p.airtableId?.value);
const withoutMetafield = fineArt.filter((p) => !p.airtableId?.value);

const slugify = (v) =>
  String(v ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const airtableHandles = new Set();
for (const id of airtableIds) {
  // re-fetch names below
}
let offset;
const airtableHandleList = [];
do {
  const params = new URLSearchParams();
  if (offset) params.set('offset', offset);
  const response = await axios($, {
    method: 'get',
    url: `https://api.airtable.com/v0/${AIRTABLE.baseId}/${AIRTABLE.printsTableId}?${params}`,
    headers: {Authorization: `Bearer ${pat}`},
  });
  for (const record of response.records ?? []) {
    const h = slugify(record.fields?.[AIRTABLE.prints.name]);
    if (h) airtableHandles.add(h);
    airtableHandleList.push({id: record.id, handle: h, name: record.fields?.[AIRTABLE.prints.name]});
  }
  offset = response.offset;
} while (offset);

function isInAirtable(p) {
  const recId = p.airtableId?.value;
  if (recId && airtableIds.has(recId)) return true;
  if (p.handle && airtableHandles.has(p.handle)) return true;
  return false;
}

const orphans = fineArt.filter((p) => !isInAirtable(p));
const orphanWithMetafield = withMetafield.filter((p) => !airtableIds.has(p.airtableId.value));
const legacySkipped = withoutMetafield.filter((p) => !airtableHandles.has(p.handle));
const legacyKept = withoutMetafield.filter((p) => airtableHandles.has(p.handle));

const productTypes = new Map();
for (const p of allProducts) {
  const t = p.productType || '(empty)';
  productTypes.set(t, (productTypes.get(t) ?? 0) + 1);
}

console.log('=== Airtable ===');
console.log('Print records:', airtableIds.size);

console.log('\n=== Shopify product types (all products) ===');
for (const [type, count] of [...productTypes.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${count}x ${type}`);
}

console.log('\n=== Fine Art Print products ===');
console.log('Total:', fineArt.length);
console.log('With airtable.record_id metafield:', withMetafield.length);
console.log('Without metafield:', withoutMetafield.length);
console.log('Legacy kept (handle matches Airtable):', legacyKept.length);
console.log('Would prune (not in Airtable by id or handle):', orphans.length);
console.log('Orphan (has metafield, id not in Airtable):', orphanWithMetafield.length);

if (legacyKept.length) {
  console.log('\n--- Legacy kept by handle match ---');
  for (const p of legacyKept) {
    console.log(`  ${p.handle} | ${p.title}`);
  }
}

if (orphans.length) {
  console.log('\n--- Would prune ---');
  for (const p of orphans) {
    console.log(`  ${p.handle} | ${p.title} | metafield=${p.airtableId?.value ?? 'none'}`);
  }
}

if (withoutMetafield.length && !orphans.length && !legacyKept.length) {
  console.log('\n--- No metafield (legacy?) ---');
  for (const p of withoutMetafield) {
    console.log(`  ${p.handle} | ${p.title} | status=${p.status}`);
  }
}

// Products that look like prints but different product_type
const maybePrints = allProducts.filter(
  (p) =>
    p.productType !== SHOPIFY.productType &&
    (p.handle?.match(/^\d/) || p.title?.match(/^\d/)),
);
if (maybePrints.length) {
  console.log('\n=== Possible prints with wrong product_type ===');
  for (const p of maybePrints.slice(0, 30)) {
    console.log(`  type=${p.productType} | ${p.handle} | ${p.title} | metafield=${p.airtableId?.value ?? 'none'}`);
  }
  if (maybePrints.length > 30) console.log(`  ... and ${maybePrints.length - 30} more`);
}
