import {listFulfillmentsNeedingLabels} from '../../lib/order-sync/airtable.mjs';
import {createLabelForFulfillment} from '../../lib/order-sync/fulfillment-label.mjs';
import {linkFulfillmentToPickup, listFulfillmentsNeedingPickup} from '../../lib/order-sync/fulfillment-pickup.mjs';

/**
 * Poll Airtable for fulfillment status changes that need backend actions.
 */
export function startFulfillmentPolling({intervalMs, onResult, onError}) {
  if (!intervalMs || intervalMs < 60_000) {
    console.log(
      '[fulfillment-poll] Polling disabled (FULFILLMENT_POLL_INTERVAL_MS must be >= 60000)',
    );
    return () => {};
  }

  console.log(
    `[fulfillment-poll] Watching In Progress + Pickup Requested fulfillments every ${intervalMs / 1000}s`,
  );

  let stopped = false;
  let ticking = false;

  async function tick() {
    if (ticking) return;
    ticking = true;

    try {
      const $ = {};
      const [labelRecords, pickupRecords] = await Promise.all([
        listFulfillmentsNeedingLabels($),
        listFulfillmentsNeedingPickup($),
      ]);

      if (labelRecords.length > 0) {
        console.log(`[fulfillment-poll] ${labelRecords.length} fulfillment(s) need labels`);
      }
      if (pickupRecords.length > 0) {
        console.log(`[fulfillment-poll] ${pickupRecords.length} fulfillment(s) need pickup links`);
      }

      for (const record of labelRecords) {
        const result = await createLabelForFulfillment(record.id);
        if (result.action === 'labeled') {
          console.log(
            `[fulfillment-poll] labeled ${record.id} tracking=${result.trackingNumber}`,
          );
        } else if (result.action === 'failed') {
          console.error(`[fulfillment-poll] failed ${record.id}: ${result.error}`);
        } else if (result.action === 'skipped' && result.reason) {
          console.log(`[fulfillment-poll] skipped ${record.id}: ${result.reason}`);
        }
        onResult?.({fulfillmentRecordId: record.id, result});
      }

      for (const record of pickupRecords) {
        const result = await linkFulfillmentToPickup(record.id);
        if (result.action === 'linked') {
          console.log(
            `[fulfillment-poll] linked ${record.id} → pickup ${result.pickupRecordId} (${result.scheduledAt})`,
          );
        } else if (result.action === 'skipped' && result.reason) {
          console.log(`[fulfillment-poll] skipped ${record.id}: ${result.reason}`);
        }
        onResult?.({fulfillmentRecordId: record.id, result});
      }
    } catch (error) {
      console.error('[fulfillment-poll] tick failed:', error.message);
      onError?.(error);
    } finally {
      ticking = false;
      if (!stopped) {
        setTimeout(tick, intervalMs);
      }
    }
  }

  tick();

  return () => {
    stopped = true;
  };
}
