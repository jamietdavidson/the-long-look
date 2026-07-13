/**
 * Push shipping package dimensions + variant weights to Shopify from Airtable.
 *
 * Usage:
 *   AIRTABLE_PAT=pat… SHOPIFY_ACCESS_TOKEN=shpat_… node services/catalog-sync/sync-shipping.mjs
 *   … sync-shipping.mjs --dry-run
 */
import {syncShippingPackagesJob} from './run-sync.mjs';

const dryRun = process.argv.includes('--dry-run');

try {
  const result = await syncShippingPackagesJob({dryRun});
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
