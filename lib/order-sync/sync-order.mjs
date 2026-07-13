import {AIRTABLE} from './config.js';
import {
  createOrderRecord,
  findOrderByShopifyId,
  updateOrderRecord,
} from './airtable.mjs';
import {mapShopifyOrderToAirtableFields} from './map-order.mjs';
import {syncFulfillmentsForOrder} from './sync-fulfillments.mjs';

/**
 * Create or update an Airtable Orders row from a Shopify order payload.
 * Creates one Fullfillments row per physical unit (Status = Ordered).
 * Shipping labels are purchased later when each fulfillment moves to In Progress.
 * @param {Record<string, unknown>} order
 */
export async function syncShopifyOrderToAirtable(order) {
  const shopifyOrderId = String(order.id ?? '');
  if (!shopifyOrderId) {
    throw new Error('Shopify order payload is missing id');
  }

  const $ = {};
  const baseFields = mapShopifyOrderToAirtableFields(order);
  const existing = await findOrderByShopifyId($, shopifyOrderId);

  if (existing?.id) {
    const updateFields = {...baseFields};

    const updated = await updateOrderRecord($, existing.id, updateFields);
    const fulfillments = await syncFulfillmentsForOrder(order, existing.id);

    return {
      action: 'updated',
      airtableRecordId: updated?.id ?? existing.id,
      shopifyOrderId,
      orderName: baseFields[AIRTABLE.fields.name],
      fulfillments,
    };
  }

  const created = await createOrderRecord($, baseFields);
  const orderRecordId = created?.id;
  if (!orderRecordId) {
    throw new Error('Airtable order create returned no record id');
  }

  const fulfillments = await syncFulfillmentsForOrder(order, orderRecordId);

  return {
    action: 'created',
    airtableRecordId: orderRecordId,
    shopifyOrderId,
    orderName: baseFields[AIRTABLE.fields.name],
    fulfillments,
  };
}

export {mapShopifyOrderToAirtableFields as formatOrderNotes} from './map-order.mjs';
export {orderRecordName} from './map-order.mjs';
export {createLabelForFulfillment, createLabelsForOrderFulfillments} from './fulfillment-label.mjs';
