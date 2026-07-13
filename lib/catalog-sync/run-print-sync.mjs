import {AIRTABLE, committedStatusForTable} from './config.js';
import {
  fetchCommittedVariantCatalog,
  getPublicationIds,
  getTableRecord,
  linkedRecordIds,
  markRecordCommitted,
  resolvePrintRecord,
  syncArtist,
  syncCollection,
  syncPrint,
  textValue,
} from './utils.js';
import {readShippingPackageRegistry} from './shipping-packages.mjs';

/**
 * Sync one Airtable print row to Shopify (full artist/collection/product pipeline).
 * Only processes prints with Status = Queued.
 * @param {object} clients from createSyncClients()
 * @param {string} printRecordId
 * @param {{ dryRun?: boolean, steps?: object }} [options]
 */
export async function runPrintRecordSync(
  clients,
  printRecordId,
  {dryRun = false, forceImageResync = false, ignoreStatus = false, steps = {trigger: {event: {id: printRecordId}}}} = {},
) {
  const {$, airtable, shopify} = clients;

  const printRecord = await resolvePrintRecord($, airtable, steps, printRecordId);
  const printFields = printRecord.fields ?? {};
  const printStatus = textValue(printFields[AIRTABLE.prints.status]);

  if (!ignoreStatus && printStatus !== AIRTABLE.queuedStatus) {
    return {
      printId: printRecord.id,
      dryRun,
      skippedSync: true,
      reason: `Print status is "${printStatus || '(empty)'}" — not ${AIRTABLE.queuedStatus}`,
    };
  }

  const catalog = await fetchCommittedVariantCatalog($, airtable);
  if (!catalog.length) {
    throw new Error('No committed variants found in Airtable Variants table.');
  }

  const shippingRegistry = dryRun ? null : await readShippingPackageRegistry($, shopify);

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
    shippingPackageRegistry: shippingRegistry,
    dryRun,
    forceImageResync,
  });

  if (printResult.status === 'skipped') {
    throw new Error(`Print ${printRecord.id}: ${printResult.reason}`);
  }

  const printStatusUpdate = await markRecordCommitted($, airtable, {
    tableKey: 'prints',
    statusField: AIRTABLE.prints.status,
    recordId: printRecord.id,
    currentStatus: printFields[AIRTABLE.prints.status],
    committedStatus: AIRTABLE.committedStatus,
    dryRun,
  });

  const artistStatus = await markRecordCommitted($, airtable, {
    tableKey: 'artists',
    statusField: AIRTABLE.artists.status,
    recordId: artistRecord.id,
    currentStatus: artistRecord.fields?.[AIRTABLE.artists.status],
    committedStatus: committedStatusForTable('artists'),
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
        committedStatus: committedStatusForTable('collections'),
        dryRun,
      }),
    );
  }

  return {
    printId: printRecord.id,
    print: printResult,
    printStatus: printStatusUpdate,
    artist: artistResult,
    artistStatus,
    collections: {synced: collectionsSynced, skipped: collectionsSkipped},
    collectionStatuses,
    dryRun,
  };
}
