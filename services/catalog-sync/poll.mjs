/**
 * Poll Airtable for Queued Prints, Artists, Collections, and Variants.
 */
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

  console.log(`[poll] Watching Queued records every ${intervalMs / 1000}s`);

  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const {printIds, artistIds, collectionIds, variantIds} = await listQueuedEntityIds();
      const queuedTotal =
        printIds.length + artistIds.length + collectionIds.length + variantIds.length;
      if (queuedTotal > 0) {
        console.log(
          `[poll] queued: ${printIds.length} print(s), ${variantIds.length} variant(s), ` +
            `${artistIds.length} artist(s), ${collectionIds.length} collection(s)`,
        );
      }

      const deletions = await syncDeletionsJob();
      if (deletions.count > 0) {
        console.log(
          `[poll] deletions: ${deletions.removed.prints.length} print(s), ` +
            `${deletions.removed.variants.length} product variant group(s), ` +
            `${deletions.removed.artists.length} artist(s), ` +
            `${deletions.removed.collections.length} collection(s)`,
        );
        onResult?.({deletions});
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

      for (const printId of printIds) {
        const result = await syncPrint(printId);
        onResult?.({printId, result});
      }
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
