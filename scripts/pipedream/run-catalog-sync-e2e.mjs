#!/usr/bin/env node
/**
 * Run catalog sync locally for one print (same logic as Pipedream action).
 *
 * Usage:
 *   AIRTABLE_PAT=pat… SHOPIFY_ACCESS_TOKEN=shpat_… \
 *     node scripts/pipedream/run-catalog-sync-e2e.mjs recJjzHivCkA6IgnR
 */
import {readFileSync, writeFileSync, mkdtempSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRINT_ID = process.argv.find((a) => a.startsWith('rec')) ?? 'recJjzHivCkA6IgnR';
const dryRun = process.argv.includes('--dry-run');

const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
const SHOPIFY_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN ?? process.env.SHOPIFY_ADMIN_TOKEN;

if (!AIRTABLE_PAT || !SHOPIFY_TOKEN) {
  console.error('Set AIRTABLE_PAT and SHOPIFY_ACCESS_TOKEN.');
  process.exit(1);
}

globalThis.defineComponent = (component) => component;

function stripExportsForInline(content) {
  return content.replace(
    /^export\s+(const|let|var|function|async function|class)\s/gm,
    '$1 ',
  );
}

function removeRelativeImports(content) {
  return content.replace(
    /import\s+(?:\{[\s\S]*?\}|[^'"\n]+)\s+from\s+['"]\.\/[^'"]+['"];?\s*/g,
    '',
  );
}

function removePlatformImports(content) {
  return content.replace(
    /import\s+\{[^}]*\}\s+from\s+['"]@pipedream\/platform['"];?\s*/g,
    '',
  );
}

const dir = join(__dirname, 'airtable-shopify-sync-catalog');
const platformShim = readFileSync(join(__dirname, 'e2e-pipedream-platform.mjs'), 'utf8')
  .replace(/^export\s+async function axios/m, 'async function axios');
const parts = [platformShim];
for (const file of ['config.js', 'utils.js']) {
  let content = readFileSync(join(dir, file), 'utf8');
  content = removeRelativeImports(content);
  content = removePlatformImports(content);
  parts.push(stripExportsForInline(content));
}
let script = readFileSync(join(dir, 'script.js'), 'utf8');
script = removeRelativeImports(script);
script = removePlatformImports(script);
parts.push(script);

const tempDir = mkdtempSync(join(tmpdir(), 'catalog-sync-e2e-'));
const modulePath = join(tempDir, 'bundle.mjs');
writeFileSync(modulePath, `${parts.join('\n\n')}\n`, 'utf8');

const mod = await import(modulePath);
const component = mod.default;

const airtable = {$auth: {oauth_access_token: AIRTABLE_PAT}};
const shopify = {$auth: {shop_id: 'thelonglookco', access_token: SHOPIFY_TOKEN}};

const steps = {trigger: {event: {id: PRINT_ID}}};
const exports = {};
const $ = {
  export(name, value) {
    exports[name] = value;
  },
};

console.log(`${dryRun ? 'Dry run' : 'Syncing'} print ${PRINT_ID}…`);

const summary = await component.run.call(
  {
    airtable_oauth: airtable,
    shopify_developer_app: shopify,
    printRecordId: PRINT_ID,
    dryRun,
  },
  {steps, $},
);

console.log(JSON.stringify(summary, null, 2));
