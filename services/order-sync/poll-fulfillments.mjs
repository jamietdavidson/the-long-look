import {ORDER_SYNC_POLL, SHIPPING_AUTOMATION} from '../../lib/order-sync/config.js';
import {listShopifyOrdersUpdatedSince} from '../../lib/order-sync/shopify-admin.mjs';
import {syncShopifyOrderToAirtable} from '../../lib/order-sync/sync-order.mjs';
import {listFulfillmentsNeedingLabels} from '../../lib/order-sync/airtable.mjs';
import {createLabelForFulfillment} from '../../lib/order-sync/fulfillment-label.mjs';
import {
  confirmCompletedPickups,
  linkFulfillmentToPickup,
  listFulfillmentsNeedingPickup,
  listPickupsNeedingSchedule,
  schedulePickupRecord,
} from '../../lib/order-sync/fulfillment-pickup.mjs';

function lookbackIso(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

async function syncRecentShopifyOrders($) {
  const updatedSince = lookbackIso(ORDER_SYNC_POLL.lookbackHours);
  const orders = await listShopifyOrdersUpdatedSince(updatedSince);
  const results = [];

  for (const order of orders) {
    try {
      const result = await syncShopifyOrderToAirtable(order);
      results.push(result);
      if (result.action === 'created') {
        console.log(
          `[order-sync] created ${result.orderName} (${result.shopifyOrderId}) → ${result.airtableRecordId}`,
        );
      }
    } catch (error) {
      console.error(
        `[order-sync] order sync failed for ${order.id ?? 'unknown'}: ${error.message}`,
      );
      results.push({action: 'failed', shopifyOrderId: order.id, error: error.message});
    }
  }

  return results;
}

/**
 * Outbound polling only — Shopify orders, Airtable fulfillments, and pickups.
 */
export function startOrderSyncPolling({intervalMs = ORDER_SYNC_POLL.intervalMs, onResult, onError} = {}) {
  if (!intervalMs || intervalMs < 60_000) {
    console.log(
      '[order-sync] Polling disabled (ORDER_SYNC_POLL_INTERVAL_MS must be >= 60000)',
    );
    return () => {};
  }

  console.log(
    `[order-sync] Polling Shopify orders + Airtable every ${intervalMs / 1000}s (lookback ${ORDER_SYNC_POLL.lookbackHours}h)`,
  );
  if (!SHIPPING_AUTOMATION.isEnabled()) {
    console.log(`[order-sync] ${SHIPPING_AUTOMATION.disabledReason}`);
  }

  let stopped = false;
  let ticking = false;

  async function tick() {
    if (ticking) return;
    ticking = true;

    try {
      const $ = {};
      const orderResults = await syncRecentShopifyOrders($);
      if (orderResults.some((result) => result.action === 'created')) {
        console.log(`[order-sync] synced ${orderResults.length} Shopify order(s)`);
      }

      if (SHIPPING_AUTOMATION.isEnabled()) {
        const [labelRecords, linkRecords, scheduleRecords] = await Promise.all([
          listFulfillmentsNeedingLabels($),
          listFulfillmentsNeedingPickup($),
          listPickupsNeedingSchedule($),
        ]);

        if (labelRecords.length > 0) {
          console.log(`[order-sync] ${labelRecords.length} fulfillment(s) need labels`);
        }
        if (linkRecords.length > 0) {
          console.log(`[order-sync] ${linkRecords.length} fulfillment(s) need pickup links`);
        }
        if (scheduleRecords.length > 0) {
          console.log(`[order-sync] ${scheduleRecords.length} pickup(s) need carrier scheduling`);
        }

        for (const record of labelRecords) {
          const result = await createLabelForFulfillment(record.id);
          if (result.action === 'labeled') {
            console.log(`[order-sync] labeled ${record.id} tracking=${result.trackingNumber}`);
          } else if (result.action === 'failed') {
            console.error(`[order-sync] failed ${record.id}: ${result.error}`);
          } else if (result.action === 'skipped' && result.reason) {
            console.log(`[order-sync] skipped ${record.id}: ${result.reason}`);
          }
          onResult?.({fulfillmentRecordId: record.id, result});
        }

        for (const record of linkRecords) {
          const result = await linkFulfillmentToPickup(record.id);
          if (result.action === 'linked') {
            console.log(
              `[order-sync] linked ${record.id} → pickup ${result.pickupRecordId} (${result.scheduledAt}) status=${result.pickupStatus}`,
            );
          } else if (result.action === 'skipped' && result.reason) {
            console.log(`[order-sync] skipped ${record.id}: ${result.reason}`);
          }
          onResult?.({fulfillmentRecordId: record.id, result});
        }

        for (const record of scheduleRecords) {
          const result = await schedulePickupRecord(record.id);
          if (result.action === 'scheduled') {
            console.log(
              `[order-sync] scheduled pickup ${record.id} confirmation=${result.confirmation ?? 'n/a'}`,
            );
          } else if (result.action === 'failed') {
            console.error(`[order-sync] pickup schedule failed ${record.id}: ${result.error}`);
          } else if (result.action === 'skipped' && result.reason) {
            console.log(`[order-sync] skipped pickup ${record.id}: ${result.reason}`);
          }
          onResult?.({pickupRecordId: record.id, result});
        }

        const confirmed = await confirmCompletedPickups($);
        for (const result of confirmed) {
          console.log(`[order-sync] confirmed pickup ${result.pickupRecordId}`);
          onResult?.({pickupRecordId: result.pickupRecordId, result});
        }
      }
    } catch (error) {
      console.error('[order-sync] poll tick failed:', error.message);
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

/** @deprecated Use startOrderSyncPolling */
export const startFulfillmentPolling = startOrderSyncPolling;
