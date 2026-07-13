import {listFulfillmentsNeedingLabels} from '../../lib/order-sync/airtable.mjs';
import {createLabelForFulfillment} from '../../lib/order-sync/fulfillment-label.mjs';
import {
  confirmCompletedPickups,
  linkFulfillmentToPickup,
  listFulfillmentsNeedingPickup,
  listPickupsNeedingSchedule,
  schedulePickupRecord,
} from '../../lib/order-sync/fulfillment-pickup.mjs';

/**
 * Poll Airtable for fulfillment and pickup status changes that need backend actions.
 */
export function startFulfillmentPolling({intervalMs, onResult, onError}) {
  if (!intervalMs || intervalMs < 60_000) {
    console.log(
      '[fulfillment-poll] Polling disabled (FULFILLMENT_POLL_INTERVAL_MS must be >= 60000)',
    );
    return () => {};
  }

  console.log(
    `[fulfillment-poll] Watching fulfillments + pickups every ${intervalMs / 1000}s`,
  );

  let stopped = false;
  let ticking = false;

  async function tick() {
    if (ticking) return;
    ticking = true;

    try {
      const $ = {};
      const [labelRecords, linkRecords, scheduleRecords] = await Promise.all([
        listFulfillmentsNeedingLabels($),
        listFulfillmentsNeedingPickup($),
        listPickupsNeedingSchedule($),
      ]);

      if (labelRecords.length > 0) {
        console.log(`[fulfillment-poll] ${labelRecords.length} fulfillment(s) need labels`);
      }
      if (linkRecords.length > 0) {
        console.log(`[fulfillment-poll] ${linkRecords.length} fulfillment(s) need pickup links`);
      }
      if (scheduleRecords.length > 0) {
        console.log(`[fulfillment-poll] ${scheduleRecords.length} pickup(s) need carrier scheduling`);
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

      for (const record of linkRecords) {
        const result = await linkFulfillmentToPickup(record.id);
        if (result.action === 'linked') {
          console.log(
            `[fulfillment-poll] linked ${record.id} → pickup ${result.pickupRecordId} (${result.scheduledAt}) status=${result.pickupStatus}`,
          );
        } else if (result.action === 'skipped' && result.reason) {
          console.log(`[fulfillment-poll] skipped ${record.id}: ${result.reason}`);
        }
        onResult?.({fulfillmentRecordId: record.id, result});
      }

      for (const record of scheduleRecords) {
        const result = await schedulePickupRecord(record.id);
        if (result.action === 'scheduled') {
          console.log(
            `[fulfillment-poll] scheduled pickup ${record.id} confirmation=${result.confirmation ?? 'n/a'}`,
          );
        } else if (result.action === 'failed') {
          console.error(`[fulfillment-poll] pickup schedule failed ${record.id}: ${result.error}`);
        } else if (result.action === 'skipped' && result.reason) {
          console.log(`[fulfillment-poll] skipped pickup ${record.id}: ${result.reason}`);
        }
        onResult?.({pickupRecordId: record.id, result});
      }

      const confirmed = await confirmCompletedPickups($);
      for (const result of confirmed) {
        console.log(`[fulfillment-poll] confirmed pickup ${result.pickupRecordId}`);
        onResult?.({pickupRecordId: result.pickupRecordId, result});
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
