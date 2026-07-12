#!/usr/bin/env node
/**
 * Open Shopify's permission grant flow for write_shipping (optional scope).
 *
 * Prerequisite: deploy integrations/shopify-app/shopify.app.toml (optional_scopes).
 *
 *   node scripts/request-shopify-shipping-scope.mjs
 *   node scripts/request-shopify-shipping-scope.mjs --open
 */
import {execSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const SHOP = process.env.SHOPIFY_SHOP_ID?.trim() ?? 'thelonglookco';
const shouldOpen = process.argv.includes('--open');

const tomlPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../integrations/shopify-app/shopify.app.toml',
);
const toml = readFileSync(tomlPath, 'utf8');
const clientId = toml.match(/^client_id\s*=\s*"([^"]+)"/m)?.[1];
if (!clientId) {
  console.error('Could not read client_id from integrations/shopify-app/shopify.app.toml');
  process.exit(1);
}

const url =
  `https://admin.shopify.com/store/${SHOP}/oauth/install` +
  `?client_id=${clientId}` +
  `&optional_scopes=write_shipping`;

console.log('Request write_shipping on the store:\n');
console.log(url);
console.log(
  '\nAfter approving, verify:\n' +
    `  curl -sS "https://${SHOP}.myshopify.com/admin/oauth/access_scopes.json" ` +
    '-H "X-Shopify-Access-Token: $SHOPIFY_ACCESS_TOKEN"',
);

if (shouldOpen) {
  try {
    execSync(`open "${url}"`, {stdio: 'inherit'});
  } catch {
    console.log('\n(Open failed — paste the URL into your browser.)');
  }
}
