/**
 * Pipedream: Airtable → Shopify catalog sync (one-way, idempotent)
 *
 * https://pipedream.com/@thelonglook/projects/proj_Vbs7LgY/airtable-shopify-sync-catalog-p_n1CGZzK/build
 */
import {AIRTABLE} from './config.js';
import {
  fetchVariantCatalog,
  getPublicationIds,
  listTableRecords,
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

    const catalog = await fetchVariantCatalog($, airtable);
    if (!catalog.length) {
      throw new Error('No variants found in Airtable Variants table.');
    }

    const publicationIds = dryRun ? [] : await getPublicationIds($, shopify);

    const artistRecords = await listTableRecords($, airtable, AIRTABLE.artistsTable);
    const artistMap = new Map();
    const artistsSynced = [];
    const artistsSkipped = [];

    for (const record of artistRecords) {
      const result = await syncArtist($, shopify, record, dryRun);
      if (result.status === 'skipped') artistsSkipped.push(result);
      else {
        artistsSynced.push(result);
        if (result.shopifyId) artistMap.set(record.id, result.shopifyId);
        if (dryRun && result.handle) artistMap.set(record.id, `dry-run:${result.handle}`);
      }
    }

    const artistNameByRecordId = new Map();
    for (const record of artistRecords) {
      const name = textValue(record.fields?.[AIRTABLE.artists.name]);
      if (name) artistNameByRecordId.set(record.id, name);
    }

    const collectionRecords = await listTableRecords($, airtable, AIRTABLE.collectionsTable);
    const collectionMap = new Map();
    const collectionsSynced = [];
    const collectionsSkipped = [];

    for (const record of collectionRecords) {
      const result = await syncCollection($, shopify, record, dryRun);
      if (result.status === 'skipped') collectionsSkipped.push(result);
      else {
        collectionsSynced.push(result);
        if (result.shopifyId) collectionMap.set(record.id, result.shopifyId);
        if (dryRun && result.handle) collectionMap.set(record.id, `dry-run:${result.handle}`);
      }
    }

    const printRecords = await listTableRecords($, airtable, AIRTABLE.printsTable);
    const printsSynced = [];
    const printsSkipped = [];
    const printErrors = [];

    for (const record of printRecords) {
      try {
        const result = await syncPrint($, {
          shopify,
          record,
          catalog,
          artistMap,
          collectionMap,
          artistNameByRecordId,
          publicationIds,
          dryRun,
        });
        if (result.status === 'skipped') printsSkipped.push(result);
        else printsSynced.push(result);
      } catch (err) {
        printErrors.push({recordId: record.id, error: err?.message ?? String(err)});
      }
    }

    const summary = {
      variantCatalogSize: catalog.length,
      artists: {total: artistRecords.length, synced: artistsSynced.length, skipped: artistsSkipped.length},
      collections: {total: collectionRecords.length, synced: collectionsSynced.length, skipped: collectionsSkipped.length},
      prints: {total: printRecords.length, synced: printsSynced.length, skipped: printsSkipped.length, errors: printErrors.length},
      dryRun,
    };

    $.export('summary', summary);
    return {
      summary,
      catalog,
      artists: {synced: artistsSynced, skipped: artistsSkipped},
      collections: {synced: collectionsSynced, skipped: collectionsSkipped},
      prints: {synced: printsSynced, skipped: printsSkipped, errors: printErrors},
    };
  },
});
