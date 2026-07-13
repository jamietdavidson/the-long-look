import {
  createFulfillmentRecords,
  listFulfillmentsForOrder,
} from './airtable.mjs';
import {
  fulfillmentMatchKey,
  mapFulfillmentFields,
} from './map-fulfillment.mjs';
import {resolveLineItemAirtableLinks} from './resolve-line-item-links.mjs';

function countExistingByKey(existingRecords) {
  const counts = new Map();
  for (const record of existingRecords) {
    const key = fulfillmentMatchKey(record);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * Ensure one Fullfillments row per physical unit on the order (default Status = Ordered).
 * @param {Record<string, unknown>} order Shopify order payload
 * @param {string} orderRecordId Airtable Orders record id
 */
export async function syncFulfillmentsForOrder(order, orderRecordId) {
  const $ = {};
  const items = Array.isArray(order.line_items) ? order.line_items : [];
  if (!items.length) {
    return {created: 0, existing: 0, fulfillmentRecordIds: []};
  }

  const existing = await listFulfillmentsForOrder($, orderRecordId);
  const counts = countExistingByKey(existing);
  const toCreate = [];

  for (const item of items) {
    const {printRecordId, variantRecordId} = await resolveLineItemAirtableLinks($, item);
    const key = `${printRecordId ?? 'no-print'}:${variantRecordId ?? 'no-variant'}`;
    const quantity = Math.max(1, Number(item.quantity ?? 1));
    const have = counts.get(key) ?? 0;
    const missing = Math.max(0, quantity - have);

    for (let index = 0; index < missing; index += 1) {
      toCreate.push(
        mapFulfillmentFields({
          orderRecordId,
          printRecordId,
          variantRecordId,
        }),
      );
    }

    counts.set(key, have + missing);
  }

  const createdRecords = await createFulfillmentRecords($, toCreate);

  return {
    created: createdRecords.length,
    existing: existing.length,
    fulfillmentRecordIds: [
      ...existing.map((record) => record.id),
      ...createdRecords.map((record) => record.id),
    ],
  };
}
