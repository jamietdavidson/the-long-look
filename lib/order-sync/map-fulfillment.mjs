import {AIRTABLE} from './config.js';

/**
 * Build Airtable Fullfillments row fields for one physical unit on an order.
 * @param {object} params
 * @param {string} params.orderRecordId
 * @param {string | null} params.printRecordId
 * @param {string | null} params.variantRecordId
 */
export function mapFulfillmentFields({orderRecordId, printRecordId, variantRecordId}) {
  const ff = AIRTABLE.fulfillmentFields;
  const fields = {
    [ff.status]: AIRTABLE.defaultFulfillmentStatus,
    [ff.order]: [orderRecordId],
  };

  if (printRecordId) {
    fields[ff.print] = [printRecordId];
  }
  if (variantRecordId) {
    fields[ff.variant] = [variantRecordId];
  }

  return fields;
}

/** Stable key for matching fulfillment rows to line-item units. */
export function fulfillmentUnitKey({printRecordId, variantRecordId, lineItemId, unitIndex}) {
  return [
    printRecordId ?? 'no-print',
    variantRecordId ?? 'no-variant',
    lineItemId ?? 'no-line',
    unitIndex,
  ].join(':');
}

export function fulfillmentMatchKey(record) {
  const ff = AIRTABLE.fulfillmentFields;
  const fields = record?.fields ?? {};
  const printId = fields[ff.print]?.[0] ?? 'no-print';
  const variantId = fields[ff.variant]?.[0] ?? 'no-variant';
  return `${printId}:${variantId}`;
}
