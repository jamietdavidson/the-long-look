import {listFulfillmentsNeedingLabels} from './airtable.mjs';
import {createLabelForFulfillment} from './fulfillment-label.mjs';

/**
 * Poll Airtable for Fullfillments moved to In Progress and purchase labels.
 */
export function startFulfillmentPolling({intervalMs, onResult, onError}) {
  if (!intervalMs || intervalMs < 60_000) {
    console.log(
      '[fulfillment-poll] Polling disabled (FULFILLMENT_POLL_INTERVAL_MS must be >= 60000)',
    );
    return () => {};
  }

  console.log(`[fulfillment-poll] Watching In Progress fulfillments every ${intervalMs / 1000}s`);

  let stopped = false;
  let ticking = false;

  async function tick() {
    if (ticking) return;
    ticking = true;

    try {
      const records = await listFulfillmentsNeedingLabels({});
      if (records.length > 0) {
        console.log(`[fulfillment-poll] ${records.length} fulfillment(s) need labels`);
      }

      for (const record of records) {
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
