import {AIRTABLE} from './config.js';
import {getSyncConcurrency, mapWithConcurrency} from './concurrency.mjs';
import {
  fetchCommittedVariantCatalog,
  getPublicationIds,
  getTableRecord,
  linkedRecordIds,
  markRecordCommitted,
  markRecordProcessing,
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

  const [catalog, shippingRegistry, publicationIds] = await Promise.all([
    fetchCommittedVariantCatalog($, airtable),
    dryRun ? Promise.resolve(null) : readShippingPackageRegistry($, shopify),
    dryRun ? Promise.resolve([]) : getPublicationIds($, shopify),
  ]);

  if (!catalog.length) {
    throw new Error('No committed variants found in Airtable Variants table.');
  }

  const artistRecordId = linkedRecordIds(printFields[AIRTABLE.prints.artist])[0];
  if (!artistRecordId) {
    throw new Error(`Print ${printRecord.id} is missing a linked Artist.`);
  }

  const collectionRecordIds = linkedRecordIds(printFields[AIRTABLE.prints.collection]);
  const concurrency = getSyncConcurrency();

  const [artistRecord, collectionRecords] = await Promise.all([
    getTableRecord($, airtable, 'artists', artistRecordId),
    collectionRecordIds.length
      ? Promise.all(
          collectionRecordIds.map((id) => getTableRecord($, airtable, 'collections', id)),
        )
      : Promise.resolve([]),
  ]);

  await markRecordProcessing($, airtable, {
    tableKey: 'artists',
    statusField: AIRTABLE.artists.status,
    recordId: artistRecord.id,
    currentStatus: artistRecord.fields?.[AIRTABLE.artists.status],
    dryRun,
  });

  const artistResult = await syncArtist($, shopify, artistRecord, dryRun);
  if (artistResult.status === 'skipped') {
    throw new Error(`Artist ${artistRecordId}: ${artistResult.reason}`);
  }

  const artistNameByRecordId = new Map([
    [artistRecord.id, textValue(artistRecord.fields?.[AIRTABLE.artists.name])],
  ]);

  const collectionHandleMap = new Map();
  const collectionsSynced = [];
  const collectionsSkipped = [];

  const collectionSyncResults = await mapWithConcurrency(
    collectionRecords,
    concurrency,
    async (collectionRecord) => {
      await markRecordProcessing($, airtable, {
        tableKey: 'collections',
        statusField: AIRTABLE.collections.status,
        recordId: collectionRecord.id,
        currentStatus: collectionRecord.fields?.[AIRTABLE.collections.status],
        dryRun,
      });
      const result = await syncCollection($, shopify, collectionRecord, dryRun);
      return {collectionRecord, result};
    },
  );

  for (const {collectionRecord, result} of collectionSyncResults) {
    if (result.status === 'skipped') {
      collectionsSkipped.push(result);
      continue;
    }
    collectionsSynced.push(result);
    if (result.handle) collectionHandleMap.set(collectionRecord.id, result.handle);
  }

  await markRecordProcessing($, airtable, {
    tableKey: 'prints',
    statusField: AIRTABLE.prints.status,
    recordId: printRecord.id,
    currentStatus: printFields[AIRTABLE.prints.status],
    dryRun,
  });

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

  const [printStatusUpdate, artistStatus, collectionStatuses] = await Promise.all([
    markRecordCommitted($, airtable, {
      tableKey: 'prints',
      statusField: AIRTABLE.prints.status,
      recordId: printRecord.id,
      currentStatus: AIRTABLE.processingStatus,
      committedStatus: AIRTABLE.committedStatus,
      dryRun,
    }),
    markRecordCommitted($, airtable, {
      tableKey: 'artists',
      statusField: AIRTABLE.artists.status,
      recordId: artistRecord.id,
      currentStatus: artistRecord.fields?.[AIRTABLE.artists.status],
      committedStatus: AIRTABLE.committedStatus,
      dryRun,
    }),
    mapWithConcurrency(collectionRecords, concurrency, (collectionRecord) =>
      markRecordCommitted($, airtable, {
        tableKey: 'collections',
        statusField: AIRTABLE.collections.status,
        recordId: collectionRecord.id,
        currentStatus: collectionRecord.fields?.[AIRTABLE.collections.status],
        committedStatus: AIRTABLE.committedStatus,
        dryRun,
      }),
    ),
  ]);

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
