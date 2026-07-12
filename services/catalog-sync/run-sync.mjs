/**
 * Run one print catalog sync (same logic as Pipedream / local E2E).
 */
import {mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '../..');
const SYNC_DIR = join(REPO_ROOT, 'scripts/pipedream/airtable-shopify-sync-catalog');
const PLATFORM_SHIM = join(REPO_ROOT, 'scripts/pipedream/e2e-pipedream-platform.mjs');

let cachedComponent;
let cachedUtils;

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

async function loadComponent() {
  if (cachedComponent) return cachedComponent;

  globalThis.defineComponent = (component) => component;

  const platformShim = readFileSync(PLATFORM_SHIM, 'utf8').replace(
    /^export\s+async function axios/m,
    'async function axios',
  );

  const parts = [platformShim];
  for (const file of ['config.js', 'utils.js']) {
    let content = readFileSync(join(SYNC_DIR, file), 'utf8');
    content = removeRelativeImports(content);
    content = removePlatformImports(content);
    parts.push(stripExportsForInline(content));
  }

  let script = readFileSync(join(SYNC_DIR, 'script.js'), 'utf8');
  script = removeRelativeImports(script);
  script = removePlatformImports(script);
  parts.push(script);

  const tempDir = mkdtempSync(join(tmpdir(), 'catalog-sync-'));
  const modulePath = join(tempDir, 'bundle.mjs');
  writeFileSync(modulePath, `${parts.join('\n\n')}\n`, 'utf8');

  const mod = await import(modulePath);
  cachedComponent = mod.default;
  return cachedComponent;
}

async function loadUtils() {
  if (cachedUtils) return cachedUtils;

  globalThis.defineComponent = (component) => component;

  const platformShim = readFileSync(PLATFORM_SHIM, 'utf8').replace(
    /^export\s+async function axios/m,
    'async function axios',
  );

  const parts = [platformShim];
  for (const file of ['config.js', 'utils.js']) {
    let content = readFileSync(join(SYNC_DIR, file), 'utf8');
    content = removeRelativeImports(content);
    content = removePlatformImports(content);
    parts.push(stripExportsForInline(content));
  }

  const tempDir = mkdtempSync(join(tmpdir(), 'catalog-sync-utils-'));
  const modulePath = join(tempDir, 'utils-bundle.mjs');
  writeFileSync(
    modulePath,
    `${parts.join('\n\n')}\nexport { pruneOrphanedPrints };\n`,
    'utf8',
  );

  cachedUtils = await import(modulePath);
  return cachedUtils;
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function createClients() {
  const airtablePat = requireEnv('AIRTABLE_PAT');
  const shopifyToken =
    process.env.SHOPIFY_ACCESS_TOKEN?.trim() ?? process.env.SHOPIFY_ADMIN_TOKEN?.trim();
  if (!shopifyToken) {
    throw new Error('Missing SHOPIFY_ACCESS_TOKEN or SHOPIFY_ADMIN_TOKEN');
  }

  const shopId = process.env.SHOPIFY_SHOP_ID?.trim() ?? 'thelonglookco';
  return {
    airtable: {$auth: {oauth_access_token: airtablePat}},
    shopify: {$auth: {shop_id: shopId, access_token: shopifyToken}},
    $: {},
  };
}

/**
 * Remove Shopify prints whose Airtable row no longer exists.
 * @param {{ dryRun?: boolean }} [options]
 */
export async function pruneDeletedPrints({dryRun = false} = {}) {
  const {pruneOrphanedPrints} = await loadUtils();
  const {$, airtable, shopify} = createClients();
  return pruneOrphanedPrints($, airtable, shopify, dryRun);
}

/**
 * @param {string} printRecordId Airtable print record id (rec…)
 * @param {{ dryRun?: boolean }} [options]
 */
export async function syncPrint(printRecordId, {dryRun = false} = {}) {
  const component = await loadComponent();
  const {airtable, shopify} = createClients();

  const steps = {trigger: {event: {id: printRecordId}}};
  const exports = {};
  const $ = {
    export(name, value) {
      exports[name] = value;
    },
  };

  const summary = await component.run.call(
    {
      airtable_oauth: airtable,
      shopify_developer_app: shopify,
      printRecordId,
      dryRun,
    },
    {steps, $},
  );

  return {summary, exports};
}
