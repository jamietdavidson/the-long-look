#!/usr/bin/env node
/**
 * Re-optimize and re-upload every Committed print image to Shopify (WebP).
 *
 * Usage:
 *   set -a && source services/catalog-sync/.env.railway && set +a
 *   cd services/catalog-sync && node ../../scripts/resync-print-images.mjs
 *   cd services/catalog-sync && node ../../scripts/resync-print-images.mjs --dry-run
 */
import {AIRTABLE} from '../lib/catalog-sync/config.js';
import {syncPrint} from '../services/catalog-sync/run-sync.mjs';

const BASE = 'https://api.airtable.com/v0';
const dryRun = process.argv.includes('--dry-run');

async function listCommittedPrintIds() {
  const pat = process.env.AIRTABLE_PAT?.trim();
  if (!pat) throw new Error('Set AIRTABLE_PAT');

  const ids = [];
  let offset;

  do {
    const params = new URLSearchParams();
    params.set('view', AIRTABLE.printsViewId);
    if (offset) params.set('offset', offset);

    const response = await fetch(
      `${BASE}/${AIRTABLE.baseId}/${AIRTABLE.printsTableId}?${params}`,
      {headers: {Authorization: `Bearer ${pat}`}},
    );
    if (!response.ok) {
      throw new Error(`Airtable list failed (${response.status}): ${await response.text()}`);
    }

    const payload = await response.json();
    for (const record of payload.records ?? []) {
      if (record.id) ids.push(record.id);
    }
    offset = payload.offset;
  } while (offset);

  return ids;
}

const ids = await listCommittedPrintIds();
console.log(`Resyncing images for ${ids.length} print(s)${dryRun ? ' (dry run)' : ''}…`);

let ok = 0;
let failed = 0;

for (const printId of ids) {
  try {
    const {summary} = await syncPrint(printId, {dryRun, forceImageResync: true});
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
