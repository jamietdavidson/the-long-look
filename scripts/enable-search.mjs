#!/usr/bin/env node
/**
 * Verify (and optionally publish) picture-linked products for Storefront API search.
 *
 * Usage:
 *   node scripts/enable-search.mjs           # verify search indexing
 *   node scripts/enable-search.mjs --publish # publish to storefront channels
 *
 * Publishing requires CLI auth with write_publications:
 *   shopify store auth --store <store> --scopes write_publications,write_products
 */
import {execFileSync} from 'node:child_process';
import {config as loadEnv} from 'dotenv';

loadEnv();
loadEnv({path: '.env.local', override: true});

const STORE = process.env.SHOPIFY_STORE ?? 'qdgy1c-iu.myshopify.com';
const STORE_DOMAIN = process.env.PUBLIC_STORE_DOMAIN;
const STOREFRONT_TOKEN = process.env.PUBLIC_STOREFRONT_API_TOKEN;
const CLI_PREFIX = {SHOPIFY_CLI_AGENT_INFO: 'n:composer|v:1.0|p:cursor'};
const HYDROGEN_PUBLICATION = 'gid://shopify/Publication/191112446178';
const ONLINE_STORE_PUBLICATION = 'gid://shopify/Publication/187030733026';
const shouldPublish = process.argv.includes('--publish');

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
          product: field(key: "product") {
            reference {
              ... on Product {
                id
                handle
                title
              }
            }
          }
        }
      }
    }`,
  );

  const byProductId = new Map();
  for (const picture of data.metaobjects.nodes) {
    const product = picture.product?.reference;
    if (!product?.id || byProductId.has(product.id)) continue;
    byProductId.set(product.id, {
      productId: product.id,
      productHandle: product.handle,
      productTitle: product.title ?? picture.title?.value ?? picture.handle,
      pictureHandle: picture.handle,
    });
  }
  return [...byProductId.values()];
}

function publishProduct(productId) {
  const data = shopifyExecute(
    `mutation($id: ID!, $input: [PublicationInput!]!) {
      publishablePublish(id: $id, input: $input) {
        publishable { ... on Product { id handle } }
        userErrors { field message }
      }
    }`,
    {
      id: productId,
      input: [
        {publicationId: HYDROGEN_PUBLICATION},
        {publicationId: ONLINE_STORE_PUBLICATION},
      ],
    },
    {mutate: true},
  );

  const errors = data.publishablePublish?.userErrors ?? [];
  if (errors.length) {
    throw new Error(`publishablePublish: ${JSON.stringify(errors)}`);
  }

  return data.publishablePublish.publishable;
}

async function storefrontSearch(term) {
  if (!STORE_DOMAIN || !STOREFRONT_TOKEN) {
    throw new Error('Missing PUBLIC_STORE_DOMAIN or PUBLIC_STOREFRONT_API_TOKEN');
  }

  const response = await fetch(`https://${STORE_DOMAIN}/api/2025-01/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
    },
    body: JSON.stringify({
      query: `query($term: String!) {
        search(query: $term, types: PRODUCT, first: 5) {
          nodes { ... on Product { handle title } }
        }
      }`,
      variables: {term},
    }),
  });

  const json = await response.json();
  if (json.errors?.length) {
    throw new Error(json.errors.map((error) => error.message).join(', '));
  }

  return json.data?.search?.nodes ?? [];
}

async function main() {
  const products = listLinkedProducts();
  console.log(`Found ${products.length} linked print products on ${STORE}`);

  if (shouldPublish) {
    let published = 0;
    for (const product of products) {
      console.log(`\n→ ${product.productTitle}`);
      publishProduct(product.productId);
      published += 1;
      console.log(
        `  ✓ published ${product.productHandle} (picture: ${product.pictureHandle})`,
      );
    }
    console.log(`\nPublished ${published} products.`);
  }

  const sample = products[0];
  if (!sample) {
    console.log('\nNo linked products to verify.');
    return;
  }

  const searchTerm = sample.productTitle.split(',')[0].split(' ')[0];
  const results = await storefrontSearch(searchTerm);
  const matched = results.some((result) => result.handle === sample.productHandle);

  console.log(`\nStorefront search test: "${searchTerm}"`);
  if (matched) {
    console.log(`  ✓ "${sample.productTitle}" is searchable via Storefront API`);
  } else if (results.length > 0) {
    console.log(`  · search returned ${results.length} product(s), but not the sample print`);
    for (const result of results) {
      console.log(`    - ${result.title} (${result.handle})`);
    }
  } else {
    console.log('  ✗ no products returned — run with --publish after re-authenticating CLI');
    console.log(
      '    shopify store auth --store <store> --scopes write_publications,write_products',
    );
  }

  console.log('\nSearch page: /search?q=<term>');
}

main().catch((err) => {
  if (shouldPublish && String(err).includes('write_publications')) {
    console.error(
      '\nPublishing requires broader CLI scopes. Re-authenticate, then retry:\n' +
        `  shopify store auth --store ${STORE} --scopes write_publications,write_products\n`,
    );
  }
  console.error(err.message ?? err);
  process.exit(1);
});
