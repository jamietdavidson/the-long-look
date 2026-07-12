#!/usr/bin/env node
/**
 * Enable made-to-order sales on all picture-linked print variants.
 * Sets inventoryPolicy to CONTINUE so zero stock does not show as sold out.
 */
import {execFileSync} from 'node:child_process';

const STORE = process.env.SHOPIFY_STORE ?? 'qdgy1c-iu.myshopify.com';
const CLI_PREFIX = {SHOPIFY_CLI_AGENT_INFO: 'n:composer|v:1.0|p:cursor'};

function shopifyExecute(query, variables, {mutate = false} = {}) {
  const args = ['store', 'execute', '--store', STORE, '--query', query];
  if (mutate) args.push('--allow-mutations');
  if (variables) args.push('--variables', JSON.stringify(variables));

  const stdout = execFileSync('shopify', args, {
    encoding: 'utf8',
    env: {...process.env, ...CLI_PREFIX},
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const jsonStart = stdout.indexOf('{');
  if (jsonStart === -1) throw new Error(`No JSON in shopify output:\n${stdout}`);
  return JSON.parse(stdout.slice(jsonStart));
}

function listLinkedProductIds() {
  const data = shopifyExecute(
    `query {
      metaobjects(type: "picture", first: 100) {
        nodes {
          handle
          title: field(key: "title") { value }
          product: field(key: "product") { value }
        }
      }
    }`,
  );

  const byProductId = new Map();
  for (const picture of data.metaobjects.nodes) {
    const productId = picture.product?.value;
    if (!productId || byProductId.has(productId)) continue;
    byProductId.set(productId, {
      productId,
      title: picture.title?.value ?? picture.handle,
    });
  }
  return [...byProductId.values()];
}

function getProductVariants(productId) {
  const data = shopifyExecute(
    `query($id: ID!) {
      product(id: $id) {
        variants(first: 20) {
          nodes { id title inventoryPolicy availableForSale }
        }
      }
    }`,
    {id: productId},
  );
  return data.product?.variants?.nodes ?? [];
}

function enableVariantSales(productId, variants) {
  const data = shopifyExecute(
    `mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants { id title inventoryPolicy availableForSale }
        userErrors { field message }
      }
    }`,
    {
      productId,
      variants: variants.map((variant) => ({
        id: variant.id,
        inventoryPolicy: 'CONTINUE',
      })),
    },
    {mutate: true},
  );

  const errors = data.productVariantsBulkUpdate?.userErrors ?? [];
  if (errors.length) {
    throw new Error(`productVariantsBulkUpdate: ${JSON.stringify(errors)}`);
  }

  return data.productVariantsBulkUpdate.productVariants;
}

async function main() {
  const products = listLinkedProductIds();
  if (products.length === 0) {
    console.log('No linked products found.');
    return;
  }

  console.log(`Enabling sales on ${products.length} product(s)…\n`);

  for (const {productId, title} of products) {
    const variants = getProductVariants(productId);
    if (variants.length === 0) {
      console.warn(`→ ${title}: no variants`);
      continue;
    }

    const updated = enableVariantSales(productId, variants);
    const unavailable = updated.filter((variant) => !variant.availableForSale);
    console.log(
      `→ ${title}: ${updated.length} variants set to CONTINUE` +
        (unavailable.length
          ? ` (${unavailable.length} still unavailable — check channel publish)`
          : ''),
    );
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
