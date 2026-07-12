/**
 * Run catalog sync jobs (Airtable → Shopify).
 */
import {createSyncClients} from '../../lib/catalog-sync/clients.mjs';
import {runPrintRecordSync} from '../../lib/catalog-sync/run-print-sync.mjs';
import {runVariantCatalogSync} from '../../lib/catalog-sync/run-variant-sync.mjs';
import {
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
  const clients = createSyncClients();
  return syncCatalogDeletions(clients.$, clients.airtable, clients.shopify, dryRun);
}

/**
 * @param {{ dryRun?: boolean }} [options]
 */
export async function syncQueuedArtistsAndCollectionsJob({dryRun = false} = {}) {
  const clients = createSyncClients();
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
export async function syncQueuedVariantsJob({dryRun = false} = {}) {
  const clients = createSyncClients();
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
  const clients = createSyncClients();
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
  const clients = createSyncClients();
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
