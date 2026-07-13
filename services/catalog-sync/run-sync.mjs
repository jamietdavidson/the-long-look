/**
 * Run catalog sync jobs (Airtable → Shopify).
 */
import {createSyncClients} from '../../lib/catalog-sync/clients.mjs';
import {runPrintRecordSync} from '../../lib/catalog-sync/run-print-sync.mjs';
import {runVariantCatalogSync} from '../../lib/catalog-sync/run-variant-sync.mjs';
import {
  assignProductVariantShippingPackages,
  ensureShippingPackages,
  readShippingPackageRegistry,
} from '../../lib/catalog-sync/shipping-packages.mjs';
import {getSyncConcurrency, mapWithConcurrency} from '../../lib/catalog-sync/concurrency.mjs';
import {
  fetchCommittedVariantCatalog,
  listFineArtPrintProducts,
  listQueuedArtists,
  listQueuedCollections,
  listQueuedPrints,
  listQueuedVariants,
  syncCatalogDeletions,
  syncQueuedArtistsAndCollections,
} from '../../lib/catalog-sync/utils.js';

/**
 * @param {{ dryRun?: boolean }} [options]
 */
export async function syncDeletionsJob({dryRun = false} = {}) {
  const clients = await createSyncClients();
  return syncCatalogDeletions(clients.$, clients.airtable, clients.shopify, dryRun);
}

/**
 * @param {{ dryRun?: boolean }} [options]
 */
export async function syncQueuedArtistsAndCollectionsJob({dryRun = false} = {}) {
  const clients = await createSyncClients();
  return syncQueuedArtistsAndCollections(
    clients.$,
    clients.airtable,
    clients.shopify,
    dryRun,
  );
}

/**
 * @param {{ dryRun?: boolean }} [options]
 */
export async function syncShippingPackagesJob({dryRun = false} = {}) {
  const clients = await createSyncClients();
  const {$, shopify} = clients;
  const catalog = await fetchCommittedVariantCatalog($, clients.airtable);
  if (!catalog.length) {
    throw new Error('No committed variant rows found in Airtable.');
  }

  const shippingPackages = await ensureShippingPackages($, shopify, catalog, {dryRun});
  const products = await listFineArtPrintProducts($, shopify);
  const registry = shippingPackages.registry ?? (await readShippingPackageRegistry($, shopify));

  let assignments = [];
  if (!dryRun) {
    assignments = await mapWithConcurrency(products, getSyncConcurrency(), (product) =>
      assignProductVariantShippingPackages($, shopify, {
        productId: product.id,
        catalog,
        registry,
      }),
    );
  }

  return {
    catalogSize: catalog.length,
    productCount: products.length,
    shippingPackages,
    assignments,
    dryRun,
  };
}

/**
 * @param {{ dryRun?: boolean }} [options]
 */
export async function syncQueuedVariantsJob({dryRun = false} = {}) {
  const clients = await createSyncClients();
  return runVariantCatalogSync(clients, {dryRun});
}

/**
 * @param {string} printRecordId Airtable print record id (rec…)
 * @param {{ dryRun?: boolean }} [options]
 */
export async function syncPrint(
  printRecordId,
  {dryRun = false, forceImageResync = false, ignoreStatus = false} = {},
) {
  const clients = await createSyncClients();
  const summary = await runPrintRecordSync(clients, printRecordId, {
    dryRun,
    forceImageResync,
    ignoreStatus,
  });
  return {summary, exports: {}};
}

/**
 * List queued entity ids for polling.
 */
export async function listQueuedEntityIds() {
  const clients = await createSyncClients();
  const {$, airtable} = clients;
  const [prints, artists, collections, variants] = await Promise.all([
    listQueuedPrints($, airtable),
    listQueuedArtists($, airtable),
    listQueuedCollections($, airtable),
    listQueuedVariants($, airtable),
  ]);
  return {
    printIds: prints.map((record) => record.id),
    artistIds: artists.map((record) => record.id),
    collectionIds: collections.map((record) => record.id),
    variantIds: variants.map((record) => record.id),
  };
}
