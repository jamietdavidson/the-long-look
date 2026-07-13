/**
 * Link manually-created Shopify shipping packages to the catalog-sync registry.
 *
 * Shopify Admin does not show package GIDs, and the public Admin API cannot list them.
 * Get IDs from DevTools (see README) or pass a name → gid map.
 *
 * Usage:
 *   node services/catalog-sync/bootstrap-shipping-packages.mjs --ids '{"small":"gid://shopify/ShippingPackage/…"}'
 *   node services/catalog-sync/bootstrap-shipping-packages.mjs --file ./package-ids.json
 *   pbpaste | node services/catalog-sync/bootstrap-shipping-packages.mjs --stdin
 */
import {readFileSync} from 'node:fs';
import {createSyncClients} from '../../lib/catalog-sync/clients.mjs';
import {slugify} from '../../lib/catalog-sync/utils.js';
import {
  ensureShippingPackages,
  readShippingPackageRegistry,
  writeShippingPackageRegistry,
} from '../../lib/catalog-sync/shipping-packages.mjs';
import {fetchCommittedVariantCatalog} from '../../lib/catalog-sync/utils.js';
import {syncShippingPackagesJob} from './run-sync.mjs';

const SIZE_NAMES = [
  'Small',
  'Medium',
  'Large',
  'Gallery',
  'Collector',
  'Exhibition',
  'Museum',
];

function usage() {
  console.error(`Usage:
  --ids '<json>'     Object mapping size slug or name → Shopify package GID
  --file path.json   Same JSON in a file
  --stdin            Read JSON or DevTools GraphQL response from stdin

Example:
  node services/catalog-sync/bootstrap-shipping-packages.mjs --ids '{"small":"gid://shopify/ShippingPackage/123"}'
`);
  process.exit(1);
}

function parseArgs(argv) {
  const idsIndex = argv.indexOf('--ids');
  if (idsIndex !== -1) return JSON.parse(argv[idsIndex + 1]);

  const fileIndex = argv.indexOf('--file');
  if (fileIndex !== -1) return JSON.parse(readFileSync(argv[fileIndex + 1], 'utf8'));

  if (argv.includes('--stdin')) {
    const raw = readFileSync(0, 'utf8');
    return extractPackageMap(raw);
  }

  usage();
}

function packageKeyFromShopifyName(name) {
  const slug = slugify(name);
  const sizeName = SIZE_NAMES.find(
    (tier) => slug === slugify(tier) || slug.startsWith(`${slugify(tier)}-`),
  );
  if (!sizeName) return null;

  if (/tube/i.test(name)) {
    return `${slugify(sizeName)}-tube`;
  }

  if (slug === slugify(sizeName) || /box/i.test(name)) {
    return slugify(sizeName);
  }

  return null;
}

/** Walk arbitrary JSON from DevTools and collect {name, id} shipping packages. */
function extractPackageMap(raw) {
  const parsed = JSON.parse(raw);
  const packages = [];

  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }

    const id = typeof node.id === 'string' ? node.id : null;
    const name = typeof node.name === 'string' ? node.name : null;
    if (id?.includes('ShippingPackage') && name) {
      packages.push({id, name});
    }

    for (const value of Object.values(node)) walk(value);
  }

  walk(parsed);

  if (!packages.length) {
    throw new Error(
      'No ShippingPackage entries found in input. Open DevTools → Network on the Packages page, copy a GraphQL response, and pipe it here.',
    );
  }

  const map = {};
  for (const pkg of packages) {
    const key = packageKeyFromShopifyName(pkg.name);
    if (key) {
      map[key] = pkg.id;
    }
  }

  if (!Object.keys(map).length) {
    throw new Error(
      `Found packages [${packages.map((p) => p.name).join(', ')}] but none matched expected size/box/tube names`,
    );
  }

  return map;
}

function normalizeIdMap(input) {
  const map = {};
  for (const [key, value] of Object.entries(input)) {
    if (!value) continue;
    map[slugify(key)] = value;
  }
  return map;
}

async function main() {
  const idMap = normalizeIdMap(parseArgs(process.argv.slice(2)));
  console.log('Linking packages:', idMap);

  const clients = await createSyncClients();
  const {$, shopify, airtable} = clients;
  const catalog = await fetchCommittedVariantCatalog($, airtable);
  const specs = await ensureShippingPackages($, shopify, catalog, {dryRun: true});
  const registry = specs.registry ?? (await readShippingPackageRegistry($, shopify));

  for (const spec of specs.specs ?? []) {
    const shopifyPackageId = idMap[spec.sizeKey] ?? idMap[slugify(spec.sizeName)] ?? null;
    if (!shopifyPackageId) {
      console.warn(`No ID provided for ${spec.sizeName} (${spec.sizeKey}) — skipping`);
      continue;
    }
    registry.packages[spec.sizeKey] = {
      ...(registry.packages[spec.sizeKey] ?? {}),
      ...spec,
      shopifyPackageId,
      status: 'linked',
    };
  }

  await writeShippingPackageRegistry($, shopify, registry);
  console.log('Registry updated. Running full shipping sync…');

  const result = await syncShippingPackagesJob();
  console.log(
    JSON.stringify(
      {
        linked: Object.fromEntries(
          Object.entries(registry.packages).map(([key, entry]) => [key, entry.shopifyPackageId]),
        ),
        packagesUpdated: result.shippingPackages?.updated?.length ?? 0,
        variantsAssigned: result.assignments?.reduce((n, a) => n + (a.assigned ?? 0), 0) ?? 0,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
