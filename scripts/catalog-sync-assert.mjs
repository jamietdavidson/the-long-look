#!/usr/bin/env node
/**
 * Local assertion harness for catalog sync idempotency.
 *
 * Usage:
 *   set -a && source services/catalog-sync/.env.railway && set +a
 *   node scripts/catalog-sync-assert.mjs
 */
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {AIRTABLE} from '../lib/catalog-sync/config.js';
import {
  fetchVariantCatalog,
  getProductIdByAirtableId,
  selectedOptionsKey,
  variantSelectionKey,
} from '../lib/catalog-sync/utils.js';
import {syncPrint} from '../services/catalog-sync/run-sync.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

const AIRTABLE_PAT = process.env.AIRTABLE_PAT?.trim();
const SHOPIFY_TOKEN =
  process.env.SHOPIFY_ACCESS_TOKEN?.trim() ?? process.env.SHOPIFY_ADMIN_TOKEN?.trim();
const SHOP_ID = process.env.SHOPIFY_SHOP_ID?.trim() ?? 'thelonglookco';

if (!AIRTABLE_PAT || !SHOPIFY_TOKEN) {
  console.error('Set AIRTABLE_PAT and SHOPIFY_ACCESS_TOKEN.');
  process.exit(1);
}

async function listCommittedPrintIds() {
  const ids = [];
  let offset;

  do {
    const params = new URLSearchParams();
    params.set('view', AIRTABLE.printsViewId);
    if (offset) params.set('offset', offset);

    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE.baseId}/${AIRTABLE.printsTableId}?${params}`,
      {headers: {Authorization: `Bearer ${AIRTABLE_PAT}`}},
    );
    if (!response.ok) {
      throw new Error(`Airtable list failed (${response.status}): ${await response.text()}`);
    }

    const payload = await response.json();
    for (const record of payload.records ?? []) {
      if (record.id) ids.push(record.id);
    }
    offset = payload.offset;
  } while (offset);

  return ids;
}

async function listShopifyPrintProducts() {
  const query = `{
    products(first: 50, query: "product_type:'Fine Art Print'") {
      nodes {
        id
        handle
        title
        airtable: metafield(namespace: "airtable", key: "record_id") { value }
      }
    }
  }`;

  const response = await fetch(
    `https://${SHOP_ID}.myshopify.com/admin/api/2025-01/graphql.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({query}),
    },
  );
  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(JSON.stringify(payload.errors));
  }
  return payload.data.products.nodes;
}

async function listShopifyProductVariants(productId) {
  const query = `query($id: ID!) {
    product(id: $id) {
      variants(first: 100) {
        nodes {
          id
          price
          selectedOptions { name value }
          short: metafield(namespace: "print", key: "short_inches") { value }
          long: metafield(namespace: "print", key: "long_inches") { value }
          padding: metafield(namespace: "print", key: "padding_inches") { value }
          frame: metafield(namespace: "print", key: "frame_width_inches") { value }
          rank: metafield(namespace: "print", key: "rank") { value }
        }
      }
    }
  }`;

  const response = await fetch(
    `https://${SHOP_ID}.myshopify.com/admin/api/2025-01/graphql.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({query, variables: {id: productId}}),
    },
  );
  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(JSON.stringify(payload.errors));
  }
  return payload.data.product.variants.nodes;
}

function normalizeDecimal(value) {
  return Number.parseFloat(String(value ?? '0'));
}

function normalizePrice(value) {
  return Number.parseFloat(String(value ?? '0')).toFixed(2);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const airtable = {$auth: {oauth_access_token: AIRTABLE_PAT}};
const shopify = {$auth: {shop_id: SHOP_ID, access_token: SHOPIFY_TOKEN}};
const $ = {};

console.log('1) Assert product lookup does not return false positives…');
const loneProduct = (await listShopifyPrintProducts())[0];
if (loneProduct) {
  const fakeId = 'recFAKE_DOES_NOT_EXIST';
  const fakeMatch = await getProductIdByAirtableId($, shopify, fakeId);
  assert(
    fakeMatch == null,
    `Expected null for fake Airtable id, got ${fakeMatch} (same as ${loneProduct.id})`,
  );
  console.log('   ✓ fake Airtable id returns null');
}

console.log('2) Sync all prints in Committed view…');
const printIds = await listCommittedPrintIds();
assert(printIds.length > 0, 'No committed prints found in Airtable');

for (const printId of printIds) {
  const {summary} = await syncPrint(printId);
  console.log(
    `   synced ${printId} → ${summary.print?.title ?? '(no print)'} [${summary.print?.mode ?? (summary.skippedSync ? 'skipped-sync' : 'no-result')}]`,
  );
}

console.log('3) Assert Shopify has one product per committed print…');
const products = await listShopifyPrintProducts();
const byAirtableId = new Map(
  products
    .filter((product) => product.airtable?.value)
    .map((product) => [product.airtable.value, product]),
);

assert(
  products.length === printIds.length,
  `Expected ${printIds.length} Fine Art Print products, found ${products.length}: ${products.map((p) => p.title).join(', ')}`,
);

for (const printId of printIds) {
  const product = byAirtableId.get(printId);
  assert(product, `Missing Shopify product for Airtable print ${printId}`);
  const resolved = await getProductIdByAirtableId($, shopify, printId);
  assert(
    resolved === product.id,
    `Lookup mismatch for ${printId}: resolved ${resolved}, expected ${product.id}`,
  );
}

const duplicateTitles = products.map((p) => p.title);
const uniqueTitles = new Set(duplicateTitles);
assert(
  uniqueTitles.size === duplicateTitles.length,
  `Duplicate product titles after sync: ${duplicateTitles.join(', ')}`,
);

console.log('4) Re-sync first print and assert same Shopify product id…');
const firstPrintId = printIds[0];
const before = byAirtableId.get(firstPrintId);
const {summary: resync} = await syncPrint(firstPrintId);
assert(resync.print?.mode === 'updated', `Expected updated mode on re-sync, got ${resync.print?.mode}`);
assert(
  resync.print?.productId === before.id,
  `Re-sync changed product id: ${before.id} → ${resync.print?.productId}`,
);

const afterProducts = await listShopifyPrintProducts();
assert(
  afterProducts.length === printIds.length,
  `Re-sync changed product count: ${afterProducts.length}`,
);

console.log('5) Assert variant pricing + dimensions match Airtable catalog…');
const catalog = await fetchVariantCatalog($, airtable);
assert(catalog.length > 0, 'Expected Airtable variant catalog rows');
const sampleProduct = products[0];
const shopifyVariants = await listShopifyProductVariants(sampleProduct.id);
const variantsByKey = new Map(
  shopifyVariants.map((variant) => [
    selectedOptionsKey(variant.selectedOptions),
    variant,
  ]),
);

for (const catalogVariant of catalog) {
  const key = variantSelectionKey(catalogVariant);
  const shopifyVariant = variantsByKey.get(key);
  assert(shopifyVariant, `Missing Shopify variant for catalog row ${key}`);
  assert(
    normalizePrice(shopifyVariant.price) === normalizePrice(catalogVariant.price),
    `Price mismatch for ${key}: Shopify ${shopifyVariant.price}, Airtable ${catalogVariant.price}`,
  );
  assert(
    normalizeDecimal(shopifyVariant.padding?.value) === normalizeDecimal(catalogVariant.padding),
    `Padding mismatch for ${key}: Shopify ${shopifyVariant.padding?.value}, Airtable ${catalogVariant.padding}`,
  );
  assert(
    normalizeDecimal(shopifyVariant.frame?.value) === normalizeDecimal(catalogVariant.frameWidth),
    `Frame width mismatch for ${key}: Shopify ${shopifyVariant.frame?.value}, Airtable ${catalogVariant.frameWidth}`,
  );
}
console.log(
  `   ✓ ${catalog.length} variants on ${sampleProduct.title} match Airtable pricing + dimensions`,
);

console.log('\nAll assertions passed.');
console.log(
  JSON.stringify(
    {
      committedPrints: printIds.length,
      shopifyProducts: products.map((p) => ({
        title: p.title,
        handle: p.handle,
        airtableRecordId: p.airtable?.value,
      })),
    },
    null,
    2,
  ),
);
