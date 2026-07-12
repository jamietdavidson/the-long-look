/**
 * Run catalog sync jobs (Airtable → Shopify).
 */
import {createSyncClients} from '../../lib/catalog-sync/clients.mjs';
import {runPrintRecordSync} from '../../lib/catalog-sync/run-print-sync.mjs';
import {
  pruneOrphanedPrints,
  syncCommittedArtistsAndCollections,
} from '../../lib/catalog-sync/utils.js';

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
export async function syncPrint(printRecordId, {dryRun = false} = {}) {
  const clients = createSyncClients();
  const summary = await runPrintRecordSync(clients, printRecordId, {dryRun});
  return {summary, exports: {}};
}
