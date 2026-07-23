import {AIRTABLE} from './config.js';
import {getFulfillmentRecord} from './airtable.mjs';
import {createLabelForFulfillment} from './fulfillment-label.mjs';
import {linkFulfillmentToPickup} from './fulfillment-pickup.mjs';
import {shippingAutomationSkipped} from './shipping-automation.mjs';

/**
 * Run the appropriate backend action for a fulfillment's current Status.
 * @param {string} fulfillmentRecordId
 */
export async function processFulfillmentAction(fulfillmentRecordId) {
  const skipped = shippingAutomationSkipped({fulfillmentRecordId});
  if (skipped) return skipped;

  const $ = {};
  const fulfillment = await getFulfillmentRecord($, fulfillmentRecordId);
  if (!fulfillment) {
    throw new Error(`Fulfillment record not found: ${fulfillmentRecordId}`);
  }

  const status = fulfillment.fields?.[AIRTABLE.fulfillmentFields.status];

  if (status === AIRTABLE.fulfillmentStatus.inProgress) {
    return createLabelForFulfillment(fulfillmentRecordId);
  }

  if (status === AIRTABLE.fulfillmentStatus.pickupRequested) {
    return linkFulfillmentToPickup(fulfillmentRecordId);
  }

  return {
    action: 'skipped',
    fulfillmentRecordId,
    reason: `No automated handler for status "${status ?? 'unknown'}"`,
  };
}
