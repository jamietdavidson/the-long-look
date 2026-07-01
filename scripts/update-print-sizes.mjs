#!/usr/bin/env node
/**
 * Update every picture-linked Shopify product to the current PRINT_CATALOG sizes.
 */
import {execFileSync} from 'node:child_process';
import {PRINT_SIZES} from './print-catalog.mjs';

const STORE = process.env.SHOPIFY_STORE ?? 'qdgy1c-iu.myshopify.com';
const CLI_PREFIX = {SHOPIFY_CLI_AGENT_INFO: 'n:composer|v:1.0|p:cursor'};
const VENDOR = 'Thomas Beardmore';
const PRODUCT_TYPE = 'Fine Art Print';

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

function listLinkedProducts() {
  const data = shopifyExecute(
    `query {
      metaobjects(type: "picture", first: 100) {
        nodes {
          handle
          title: field(key: "title") { value }
          description: field(key: "description") { value }
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
      pictureHandle: picture.handle,
      title: picture.title?.value ?? picture.handle,
      description: picture.description?.value ?? '',
    });
  }
  return [...byProductId.values()];
}

function buildSizeUpdateInput({productId, title, description}) {
  return {
    id: productId,
    title,
    descriptionHtml: description ? `<p>${description}</p>` : undefined,
    vendor: VENDOR,
    productType: PRODUCT_TYPE,
    status: 'ACTIVE',
    productOptions: [
      {
        name: 'Size',
        values: PRINT_SIZES.map((size) => ({name: size.name})),
      },
    ],
    variants: PRINT_SIZES.map((size) => ({
      optionValues: [{optionName: 'Size', name: size.name}],
      price: size.price,
      inventoryPolicy: 'CONTINUE',
    })),
  };
}

function updateProductSizes(input) {
  const data = shopifyExecute(
    `mutation($input: ProductSetInput!, $sync: Boolean!) {
      productSet(synchronous: $sync, input: $input) {
        product { id handle variants(first: 10) { nodes { title price } } }
        userErrors { field message }
      }
    }`,
    {sync: true, input},
    {mutate: true},
  );
  const errors = data.productSet?.userErrors ?? [];
  if (errors.length) throw new Error(`productSet: ${JSON.stringify(errors)}`);
  return data.productSet.product;
}

async function main() {
  const linked = listLinkedProducts();
  if (linked.length === 0) {
    console.log('No linked products found.');
    return;
  }

  console.log(`Updating ${linked.length} product(s) to ${PRINT_SIZES.length} sizes:\n`);
  for (const size of PRINT_SIZES) {
    console.log(`  · ${size.name} — $${size.price}`);
  }
  console.log('');

  for (const entry of linked) {
    console.log(`→ ${entry.title} (${entry.pictureHandle})`);
    const updated = updateProductSizes(buildSizeUpdateInput(entry));
    console.log(
      `  ✓ ${updated.variants.nodes.length} variants: ${updated.variants.nodes.map((v) => v.title).join(', ')}`,
    );
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
