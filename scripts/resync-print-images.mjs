#!/usr/bin/env node
/**
 * Re-optimize and re-upload every Committed print image to Shopify (WebP).
 *
 * Usage:
 *   set -a && source services/catalog-sync/.env.railway && set +a
 *   cd services/catalog-sync && node ../../scripts/resync-print-images.mjs
 *   cd services/catalog-sync && node ../../scripts/resync-print-images.mjs --dry-run
 */
import {createSyncClients} from '../lib/catalog-sync/clients.mjs';
import {listCommittedPrints} from '../lib/catalog-sync/utils.js';
import {syncPrint} from '../services/catalog-sync/run-sync.mjs';

const dryRun = process.argv.includes('--dry-run');

const clients = await createSyncClients();
const records = await listCommittedPrints(clients.$, clients.airtable);
const ids = records.map((record) => record.id);

console.log(`Resyncing images for ${ids.length} print(s)${dryRun ? ' (dry run)' : ''}…`);

let ok = 0;
let failed = 0;

for (const printId of ids) {
  try {
    const {summary} = await syncPrint(printId, {
      dryRun,
      forceImageResync: true,
      ignoreStatus: true,
    });
    const print = summary.print;
    const bytes = print?.imageBytes;
    const sizeLabel = bytes != null ? `${Math.round(bytes / 1024)} KB` : 'n/a';
    console.log(
      `✓ ${printId} ${print?.handle ?? ''} image=${print?.imageOptimized ? `webp ${sizeLabel}` : 'skipped'}`,
    );
    ok += 1;
  } catch (error) {
    console.error(`✗ ${printId} ${error.message}`);
    failed += 1;
  }
}

console.log(`Done: ${ok} ok, ${failed} failed`);
if (failed > 0) process.exit(1);
