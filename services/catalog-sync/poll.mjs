/**
 * Poll Airtable for Queued Prints, Artists, Collections, and Variants.
 */
import {SYNC} from '../../lib/catalog-sync/config.js';
import {getSyncConcurrency, mapWithConcurrency, sleep} from '../../lib/catalog-sync/concurrency.mjs';
import {
  listQueuedEntityIds,
  syncDeletionsJob,
  syncPrint,
  syncQueuedArtistsAndCollectionsJob,
  syncQueuedVariantsJob,
} from './run-sync.mjs';

export function startPolling({intervalMs, onResult, onError}) {
  if (!intervalMs || intervalMs < 60_000) {
    console.log('[poll] Polling disabled (POLL_INTERVAL_MS must be >= 60000)');
    return () => {};
  }

  const deletionIntervalMs = SYNC.deletionPollIntervalMs;
  console.log(
    `[poll] Watching Queued records every ${intervalMs / 1000}s ` +
      `(deletions every ${deletionIntervalMs / 1000}s, concurrency ${getSyncConcurrency()})`,
  );

  let stopped = false;
  let lastDeletionAt = 0;

  async function tick() {
    const {printIds, artistIds, collectionIds, variantIds} = await listQueuedEntityIds();
    const queuedTotal =
      printIds.length + artistIds.length + collectionIds.length + variantIds.length;
    if (queuedTotal > 0) {
      console.log(
        `[poll] queued: ${printIds.length} print(s), ${variantIds.length} variant(s), ` +
          `${artistIds.length} artist(s), ${collectionIds.length} collection(s)`,
      );
    }

    const now = Date.now();
    if (now - lastDeletionAt >= deletionIntervalMs) {
      lastDeletionAt = now;
      const deletions = await syncDeletionsJob();
      if (deletions.count > 0) {
        const variantRemoved = deletions.variantPrune?.count ?? 0;
        console.log(
          `[poll] deletions: ${deletions.removed.prints.length} print(s), ` +
            `${deletions.removed.artists.length} artist(s), ` +
            `${deletions.removed.collections.length} collection(s), ` +
            `${variantRemoved} variant(s)`,
        );
        onResult?.({deletions});
      }
    }

    const variants = await syncQueuedVariantsJob();
    if (!variants.skipped) {
      console.log(
        `[poll] variants: ${variants.queuedCount} row(s) → ${variants.catalogSize} catalog entries, ` +
          `${variants.products?.productCount ?? 0} product(s) updated`,
      );
      onResult?.({variants});
    }

    const linked = await syncQueuedArtistsAndCollectionsJob();
    if (linked.artistCount > 0 || linked.collectionCount > 0) {
      console.log(
        `[poll] synced queued entities: ${linked.artistCount} artist(s), ${linked.collectionCount} collection(s)`,
      );
      onResult?.({linked});
    }

    if (printIds.length) {
      const concurrency = getSyncConcurrency();
      await mapWithConcurrency(printIds, concurrency, async (printId) => {
        const result = await syncPrint(printId);
        onResult?.({printId, result});
      });
    }
  }

  async function loop() {
    while (!stopped) {
      const started = Date.now();
      try {
        await tick();
      } catch (error) {
        onError?.(error);
        console.error('[poll] Error:', error.message);
      }
      if (stopped) break;
      const elapsed = Date.now() - started;
      await sleep(Math.max(0, intervalMs - elapsed));
    }
  }

  loop();
  return () => {
    stopped = true;
  };
}
