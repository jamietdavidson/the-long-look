#!/usr/bin/env node
/**
 * Sync one print by Airtable record id.
 *
 * Usage:
 *   set -a && source services/catalog-sync/.env.railway && set +a
 *   node scripts/run-catalog-sync.mjs recXXXXXXXXXXXXXX
 */
import {syncPrint} from '../services/catalog-sync/run-sync.mjs';

const printId = process.argv[2]?.trim();
if (!printId?.startsWith('rec')) {
  console.error('Usage: node scripts/run-catalog-sync.mjs <airtable-print-record-id>');
  process.exit(1);
}

const dryRun = process.argv.includes('--dry-run');
const {summary} = await syncPrint(printId, {dryRun});
console.log(JSON.stringify(summary, null, 2));
