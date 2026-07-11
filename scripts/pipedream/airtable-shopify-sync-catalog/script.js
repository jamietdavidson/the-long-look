/**
 * Pipedream: Airtable → Shopify catalog sync (triggered per print)
 *
 * Trigger: Prints → Committed view (new record)
 * 1. Sync linked artist + collections to Shopify (idempotent)
 * 2. Sync the print (picture metaobject + product)
 * 3. Mark artist + collections Status → Committed in Airtable
 *
 * https://pipedream.com/@thelonglook/projects/proj_Vbs7LgY/airtable-shopify-sync-catalog-p_n1CGZzK/build
 */
import {AIRTABLE} from './config.js';
import {
  fetchVariantCatalog,
  getPublicationIds,
  getTableRecord,
  getTriggerPrintRecord,
  linkedRecordIds,
  markRecordCommitted,
  syncArtist,
  syncCollection,
  syncPrint,
  textValue,
} from './utils.js';

export default defineComponent({
  props: {
    airtable_oauth: {type: 'app', app: 'airtable_oauth'},
    shopify_developer_app: {type: 'app', app: 'shopify_developer_app'},
    dryRun: {
      type: 'boolean',
      label: 'Dry run',
      optional: true,
      default: false,
    },
  },
  async run({steps, $}) {
    const airtable = this.airtable_oauth;
    const shopify = this.shopify_developer_app;
    const dryRun = this.dryRun ?? false;
    const committedStatus = AIRTABLE.committedStatus;

    const printRecord = getTriggerPrintRecord(steps);
    const printFields = printRecord.fields ?? {};

    const catalog = await fetchVariantCatalog($, airtable);
    if (!catalog.length) {
      throw new Error('No variants found in Airtable Variants table.');
    }

    const publicationIds = dryRun ? [] : await getPublicationIds($, shopify);

    const artistRecordId = linkedRecordIds(printFields[AIRTABLE.prints.artist])[0];
    if (!artistRecordId) {
      throw new Error(`Print ${printRecord.id} is missing a linked Artist.`);
    }

    const artistRecord = await getTableRecord($, airtable, AIRTABLE.artistsTable, artistRecordId);
    const artistResult = await syncArtist($, shopify, artistRecord, dryRun);
    if (artistResult.status === 'skipped') {
      throw new Error(`Artist ${artistRecordId}: ${artistResult.reason}`);
    }

    const artistMap = new Map();
    if (artistResult.shopifyId) artistMap.set(artistRecord.id, artistResult.shopifyId);
    if (dryRun && artistResult.handle) {
      artistMap.set(artistRecord.id, `dry-run:${artistResult.handle}`);
    }
    const artistNameByRecordId = new Map([
      [artistRecord.id, textValue(artistRecord.fields?.[AIRTABLE.artists.name])],
    ]);

    const collectionRecordIds = linkedRecordIds(printFields[AIRTABLE.prints.collection]);
    const collectionMap = new Map();
    const collectionsSynced = [];
    const collectionsSkipped = [];

    for (const collectionRecordId of collectionRecordIds) {
      const collectionRecord = await getTableRecord(
        $,
        airtable,
        AIRTABLE.collectionsTable,
        collectionRecordId,
      );
      const result = await syncCollection($, shopify, collectionRecord, dryRun);
      if (result.status === 'skipped') {
        collectionsSkipped.push(result);
        continue;
      }

      collectionsSynced.push(result);
      if (result.shopifyId) collectionMap.set(collectionRecord.id, result.shopifyId);
      if (dryRun && result.handle) {
        collectionMap.set(collectionRecord.id, `dry-run:${result.handle}`);
      }
    }

    const printResult = await syncPrint($, {
      shopify,
      record: printRecord,
      catalog,
      artistMap,
      collectionMap,
      artistNameByRecordId,
      publicationIds,
      dryRun,
    });

    if (printResult.status === 'skipped') {
      throw new Error(`Print ${printRecord.id}: ${printResult.reason}`);
    }

    const artistStatus = await markRecordCommitted($, airtable, {
      tableName: AIRTABLE.artistsTable,
      statusField: AIRTABLE.artists.status,
      recordId: artistRecord.id,
      currentStatus: artistRecord.fields?.[AIRTABLE.artists.status],
      committedStatus,
      dryRun,
    });

    const collectionStatuses = [];
    for (const collectionRecordId of collectionRecordIds) {
      const collectionRecord = await getTableRecord(
        $,
        airtable,
        AIRTABLE.collectionsTable,
        collectionRecordId,
      );
      collectionStatuses.push(
        await markRecordCommitted($, airtable, {
          tableName: AIRTABLE.collectionsTable,
          statusField: AIRTABLE.collections.status,
          recordId: collectionRecord.id,
          currentStatus: collectionRecord.fields?.[AIRTABLE.collections.status],
          committedStatus,
          dryRun,
        }),
      );
    }

    const summary = {
      printId: printRecord.id,
      print: printResult,
      artist: artistResult,
      artistStatus,
      collections: {synced: collectionsSynced, skipped: collectionsSkipped},
      collectionStatuses,
      dryRun,
    };

    $.export('summary', summary);
    return summary;
  },
});
