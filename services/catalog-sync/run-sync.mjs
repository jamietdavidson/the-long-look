/**
 * Run catalog sync jobs (Airtable → Shopify).
 */
import {createSyncClients} from '../../lib/catalog-sync/clients.mjs';
import {runPrintRecordSync} from '../../lib/catalog-sync/run-print-sync.mjs';
import {
  pruneOrphanedPrints,
  syncCommittedArtistsAndCollections,
} from '../../lib/catalog-sync/utils.js';
import {ensureShippingPackages} from '../../lib/catalog-sync/shipping-packages.mjs';
import {fetchVariantCatalog} from '../../lib/catalog-sync/utils.js';

/**
 * @param {{ dryRun?: boolean }} [options]
 */
export async function pruneDeletedPrints({dryRun = false} = {}) {
  const clients = createSyncClients();
  return pruneOrphanedPrints(
    clients.$,
    clients.airtable,
    clients.shopify,
    dryRun,
  );
}

/**
 * @param {{ dryRun?: boolean }} [options]
 */
export async function syncCommittedArtistsAndCollectionsJob({dryRun = false} = {}) {
  const clients = createSyncClients();
  return syncCommittedArtistsAndCollections(
    clients.$,
    clients.airtable,
    clients.shopify,
    dryRun,
  );
}

/**
 * @param {string} printRecordId Airtable print record id (rec…)
 * @param {{ dryRun?: boolean }} [options]
 */
export async function syncPrint(printRecordId, {dryRun = false, forceImageResync = false} = {}) {
  const clients = createSyncClients();
  const summary = await runPrintRecordSync(clients, printRecordId, {dryRun, forceImageResync});
  return {summary, exports: {}};
}

/**
 * Ensure Shopify shipping packages match Airtable variant dimensions.
 * @param {{ dryRun?: boolean }} [options]
 */
export async function syncShippingPackagesJob({dryRun = false} = {}) {
  const clients = createSyncClients();
  const catalog = await fetchVariantCatalog(clients.$, clients.airtable);
  return ensureShippingPackages(clients.$, clients.shopify, catalog, {dryRun});
}
