/**
 * Pipedream: Airtable → Shopify catalog sync (triggered per print)
 *
 * Trigger: Prints → Committed view (new or modified record)
 * 1. Sync linked artist + collections to Shopify (idempotent)
 * 2. Sync the print → Shopify product (image, variants, metafields)
 * 3. Mark artist + collections Status → Committed in Airtable
 *
 * https://pipedream.com/@thelonglook/projects/proj_Vbs7LgY/airtable-shopify-sync-catalog-p_n1CGZzK/build
 */
import {AIRTABLE} from './config.js';
import {
  fetchVariantCatalog,
  getPublicationIds,
  getShopifyConnection,
  getTableRecord,
  resolvePrintRecord,
  linkedRecordIds,
  markRecordCommitted,
  pruneOrphanedPrints,
  syncArtist,
  syncCollection,
  syncPrint,
  textValue,
} from './utils.js';

export default defineComponent({
  props: {
    airtable_oauth: {type: 'app', app: 'airtable_oauth'},
    shopify_developer_app: {type: 'app', app: 'shopify_developer_app'},
    printRecordId: {
      type: 'string',
      label: 'Print record ID',
      description:
        'Optional override for manual tests. In a workflow, leave blank — the print ID is read from the Airtable trigger.',
      optional: true,
    },
    dryRun: {
      type: 'boolean',
      label: 'Dry run',
      optional: true,
      default: false,
    },
  },
  async run({steps, $}) {
    const airtable = this.airtable_oauth;
    const shopify = getShopifyConnection(this);
    const dryRun = this.dryRun ?? false;
    const committedStatus = AIRTABLE.committedStatus;
    const linkedCommittedStatus = AIRTABLE.linkedCommittedStatus;

    const printRecord = await resolvePrintRecord($, airtable, steps, this.printRecordId);
    const printFields = printRecord.fields ?? {};
    const printStatus = textValue(printFields[AIRTABLE.prints.status]);

    if (printStatus !== committedStatus) {
      const prune = await pruneOrphanedPrints($, airtable, shopify, dryRun);
      const summary = {
        printId: printRecord.id,
        prune,
        dryRun,
        skippedSync: true,
        reason: `Print status is "${printStatus || '(empty)'}" — not ${committedStatus}`,
      };
      $.export('summary', summary);
      return summary;
    }

    const catalog = await fetchVariantCatalog($, airtable);
    if (!catalog.length) {
      throw new Error('No variants found in Airtable Variants table.');
    }

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

    const collectionHandles = collectionRecordIds
      .map((id) => collectionHandleMap.get(id))
      .filter(Boolean);

    const printResult = await syncPrint($, {
      shopify,
      record: printRecord,
      catalog,
      artistNameByRecordId,
      collectionHandles,
      publicationIds,
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

    const summary = {
      printId: printRecord.id,
      print: printResult,
      artist: artistResult,
      artistStatus,
      collections: {synced: collectionsSynced, skipped: collectionsSkipped},
      collectionStatuses,
      prune,
      dryRun,
    };

    $.export('summary', summary);
    return summary;
  },
});
