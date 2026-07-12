import {AIRTABLE} from './config.js';
import {
  fetchVariantCatalog,
  getPublicationIds,
  getTableRecord,
  linkedRecordIds,
  markRecordCommitted,
  pruneOrphanedPrints,
  resolvePrintRecord,
  syncArtist,
  syncCollection,
  syncPrint,
  textValue,
} from './utils.js';
import {ensureShippingPackages} from './shipping-packages.mjs';

/**
 * Sync one Airtable print row to Shopify (full artist/collection/product pipeline).
 * @param {object} clients from createSyncClients()
 * @param {string} printRecordId
 * @param {{ dryRun?: boolean, steps?: object }} [options]
 */
export async function runPrintRecordSync(
  clients,
  printRecordId,
  {dryRun = false, steps = {trigger: {event: {id: printRecordId}}}} = {},
) {
  const {$, airtable, shopify} = clients;
  const committedStatus = AIRTABLE.committedStatus;
  const linkedCommittedStatus = AIRTABLE.linkedCommittedStatus;

  const printRecord = await resolvePrintRecord($, airtable, steps, printRecordId);
  const printFields = printRecord.fields ?? {};
  const printStatus = textValue(printFields[AIRTABLE.prints.status]);

  if (printStatus !== committedStatus) {
    const prune = await pruneOrphanedPrints($, airtable, shopify, dryRun);
    return {
      printId: printRecord.id,
      prune,
      dryRun,
      skippedSync: true,
      reason: `Print status is "${printStatus || '(empty)'}" — not ${committedStatus}`,
    };
  }

  const catalog = await fetchVariantCatalog($, airtable);
  if (!catalog.length) {
    throw new Error('No variants found in Airtable Variants table.');
  }

  const shippingPackages = dryRun
    ? null
    : await ensureShippingPackages($, shopify, catalog, {dryRun});

  const publicationIds = dryRun ? [] : await getPublicationIds($, shopify);

  const artistRecordId = linkedRecordIds(printFields[AIRTABLE.prints.artist])[0];
  if (!artistRecordId) {
    throw new Error(`Print ${printRecord.id} is missing a linked Artist.`);
  }

  const artistRecord = await getTableRecord($, airtable, 'artists', artistRecordId);
  const artistResult = await syncArtist($, shopify, artistRecord, dryRun);
  if (artistResult.status === 'skipped') {
    throw new Error(`Artist ${artistRecordId}: ${artistResult.reason}`);
  }

  const artistNameByRecordId = new Map([
    [artistRecord.id, textValue(artistRecord.fields?.[AIRTABLE.artists.name])],
  ]);

  const collectionRecordIds = linkedRecordIds(printFields[AIRTABLE.prints.collection]);
  const collectionHandleMap = new Map();
  const collectionsSynced = [];
  const collectionsSkipped = [];

  for (const collectionRecordId of collectionRecordIds) {
    const collectionRecord = await getTableRecord(
      $,
      airtable,
      'collections',
      collectionRecordId,
    );
    const result = await syncCollection($, shopify, collectionRecord, dryRun);
    if (result.status === 'skipped') {
      collectionsSkipped.push(result);
      continue;
    }

    collectionsSynced.push(result);
    if (result.handle) collectionHandleMap.set(collectionRecord.id, result.handle);
  }

  const printResult = await syncPrint($, {
    shopify,
    record: printRecord,
    catalog,
    artistNameByRecordId,
    collectionHandleByRecordId: collectionHandleMap,
    publicationIds,
    shippingPackageRegistry: shippingPackages?.registry,
    dryRun,
  });

  if (printResult.status === 'skipped') {
    throw new Error(`Print ${printRecord.id}: ${printResult.reason}`);
  }

  const artistStatus = await markRecordCommitted($, airtable, {
    tableKey: 'artists',
    statusField: AIRTABLE.artists.status,
    recordId: artistRecord.id,
    currentStatus: artistRecord.fields?.[AIRTABLE.artists.status],
    committedStatus: linkedCommittedStatus,
    dryRun,
  });

  const collectionStatuses = [];
  for (const collectionRecordId of collectionRecordIds) {
    const collectionRecord = await getTableRecord(
      $,
      airtable,
      'collections',
      collectionRecordId,
    );
    collectionStatuses.push(
      await markRecordCommitted($, airtable, {
        tableKey: 'collections',
        statusField: AIRTABLE.collections.status,
        recordId: collectionRecord.id,
        currentStatus: collectionRecord.fields?.[AIRTABLE.collections.status],
        committedStatus: linkedCommittedStatus,
        dryRun,
      }),
    );
  }

  const prune = await pruneOrphanedPrints($, airtable, shopify, dryRun);

  return {
    printId: printRecord.id,
    print: printResult,
    artist: artistResult,
    artistStatus,
    collections: {synced: collectionsSynced, skipped: collectionsSkipped},
    collectionStatuses,
    prune,
    shippingPackages,
    dryRun,
  };
}
