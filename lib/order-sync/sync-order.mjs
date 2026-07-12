import {AIRTABLE} from './config.js';
import {
  createOrderRecord,
  findOrderByShopifyId,
  updateOrderRecord,
} from './airtable.mjs';
import {createFedExShipmentForOrder} from './fedex.mjs';
import {mapShopifyOrderToAirtableFields, orderRecordName} from './map-order.mjs';
import {uploadLabelPdfForAirtable} from './upload-label.mjs';

function hasExistingLabel(existing) {
  const fields = existing?.fields ?? {};
  return Boolean(
    fields[AIRTABLE.fields.fedexTracking] ||
      fields[AIRTABLE.fields.labelStatus] === AIRTABLE.labelStatus.created,
  );
}

async function attachShippingLabel($, order, existing) {
  if (hasExistingLabel(existing)) {
    return {};
  }

  try {
    const shipment = await createFedExShipmentForOrder(order);
    if (shipment.skipped) {
      return {
        [AIRTABLE.fields.labelStatus]: AIRTABLE.labelStatus.skipped,
        [AIRTABLE.fields.labelError]: shipment.reason,
      };
    }

    const orderName = orderRecordName(order).replace(/[^a-zA-Z0-9-_]+/g, '-');
    const filename = `fedex-label-${orderName}.pdf`;

    try {
      const labelUrl = await uploadLabelPdfForAirtable($, shipment.labelPdf, filename);
      const fields = {
        [AIRTABLE.fields.fedexTracking]: shipment.trackingNumber,
        [AIRTABLE.fields.fedexService]: shipment.serviceType,
        [AIRTABLE.fields.labelStatus]: AIRTABLE.labelStatus.created,
        [AIRTABLE.fields.labelError]: '',
        [AIRTABLE.fields.shippingLabel]: [{url: labelUrl, filename}],
        [AIRTABLE.fields.shippingLabelUrl]: labelUrl,
        package: shipment.package,
      };
      return fields;
    } catch (uploadError) {
      return {
        [AIRTABLE.fields.fedexTracking]: shipment.trackingNumber,
        [AIRTABLE.fields.fedexService]: shipment.serviceType,
        [AIRTABLE.fields.labelStatus]: AIRTABLE.labelStatus.failed,
        [AIRTABLE.fields.labelError]: `Label created but upload failed: ${uploadError.message}. Set SHOPIFY_ACCESS_TOKEN on order-sync to attach PDFs.`,
      };
    }
  } catch (error) {
    return {
      [AIRTABLE.fields.labelStatus]: AIRTABLE.labelStatus.failed,
      [AIRTABLE.fields.labelError]: error.message,
    };
  }
}

/**
 * Create or update an Airtable Orders row from a Shopify order payload.
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
  const labelResult = await attachShippingLabel($, order, existing);
  const shipmentPackage = labelResult.package ?? null;
  const labelFields = {...labelResult};
  delete labelFields.package;

  if (existing?.id) {
    const updateFields = {...baseFields, ...labelFields};
    delete updateFields[AIRTABLE.fields.status];

    const updated = await updateOrderRecord($, existing.id, updateFields);
    return {
      action: 'updated',
      airtableRecordId: updated?.id ?? existing.id,
      shopifyOrderId,
      orderName: baseFields[AIRTABLE.fields.name],
      labelStatus:
        labelFields[AIRTABLE.fields.labelStatus] ?? labelFields.labelStatus,
      fedexTracking:
        labelFields[AIRTABLE.fields.fedexTracking] ??
        existing.fields?.[AIRTABLE.fields.fedexTracking],
      package: shipmentPackage,
    };
  }

  const created = await createOrderRecord($, {
    ...baseFields,
    ...labelFields,
  });

  return {
    action: 'created',
    airtableRecordId: created?.id ?? null,
    shopifyOrderId,
    orderName: baseFields[AIRTABLE.fields.name],
    labelStatus: labelFields[AIRTABLE.fields.labelStatus],
    fedexTracking: labelFields[AIRTABLE.fields.fedexTracking],
    package: shipmentPackage,
  };
}

export {mapShopifyOrderToAirtableFields as formatOrderNotes} from './map-order.mjs';
export {orderRecordName} from './map-order.mjs';
