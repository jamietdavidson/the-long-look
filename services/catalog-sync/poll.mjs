/**
 * Poll Airtable Prints → Committed view and sync each record.
 */
import {AIRTABLE} from '../../lib/catalog-sync/config.js';
import {
  syncPrint,
  pruneDeletedPrints,
  syncCommittedArtistsAndCollectionsJob,
} from './run-sync.mjs';

const BASE = 'https://api.airtable.com/v0';

async function listCommittedPrintIds() {
  const pat = process.env.AIRTABLE_PAT?.trim();
  if (!pat) throw new Error('AIRTABLE_PAT is required for polling');

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

export function startPolling({intervalMs, onResult, onError}) {
  if (!intervalMs || intervalMs < 60_000) {
    console.log('[poll] Polling disabled (POLL_INTERVAL_MS must be >= 60000)');
    return () => {};
  }

  console.log(`[poll] Watching Committed view every ${intervalMs / 1000}s`);

  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const linked = await syncCommittedArtistsAndCollectionsJob();
      console.log(
        `[poll] linked entities: ${linked.artistCount} artist(s), ${linked.collectionCount} collection(s)`,
      );

      const ids = await listCommittedPrintIds();
      console.log(`[poll] ${ids.length} print(s) in Committed view`);
      if (linked.artistCount > 0 || linked.collectionCount > 0) {
        onResult?.({linked});
      }

      for (const printId of ids) {
        const result = await syncPrint(printId);
        onResult?.({printId, result});
      }

      const prune = await pruneDeletedPrints();
      console.log(
        `[poll] prune: ${prune.count} removed` +
          (prune.shopifyTotal != null ? ` (${prune.shopifyTotal} Fine Art Print products checked)` : ''),
      );
      if (prune.count > 0) onResult?.({prune});
    } catch (error) {
      onError?.(error);
      console.error('[poll] Error:', error.message);
    } finally {
      running = false;
    }
  };

  tick();
  const timer = setInterval(tick, intervalMs);
  return () => clearInterval(timer);
}
