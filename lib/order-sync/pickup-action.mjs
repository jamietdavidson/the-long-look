import {AIRTABLE} from './config.js';
import {getPickupRecord} from './airtable.mjs';
import {
  confirmCompletedPickups,
  schedulePickupRecord,
} from './fulfillment-pickup.mjs';

/**
 * Run the appropriate backend action for a Pickups row's current Status.
 * @param {string} pickupRecordId
 */
export async function processPickupAction(pickupRecordId) {
  const $ = {};
  const pickup = await getPickupRecord($, pickupRecordId);
  if (!pickup) {
    throw new Error(`Pickup record not found: ${pickupRecordId}`);
  }

  const status = pickup.fields?.[AIRTABLE.pickupFields.status];

  if (status === AIRTABLE.pickupStatus.requested) {
    return schedulePickupRecord(pickupRecordId);
  }

  return {
    action: 'skipped',
    pickupRecordId,
    reason: `No automated handler for pickup status "${status ?? 'unknown'}"`,
  };
}

export {confirmCompletedPickups};
