import {AIRTABLE} from './config.js';
import {
  createOrderRecord,
  findOrderByShopifyId,
  updateOrderRecord,
} from './airtable.mjs';
import {createShopifyShippingLabelsForOrder} from './shopify-shipping.mjs';
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
    const shipment = await createShopifyShippingLabelsForOrder(order);
    if (shipment.skipped) {
      return {
        [AIRTABLE.fields.labelStatus]: AIRTABLE.labelStatus.skipped,
        [AIRTABLE.fields.labelError]: shipment.reason,
      };
    }

    const orderName = orderRecordName(order).replace(/[^a-zA-Z0-9-_]+/g, '-');
    const labelAttachments = [];
    const labelUrls = [];

    for (const [index, label] of shipment.labels.entries()) {
      const pieceSuffix =
        shipment.labels.length > 1 ? `-piece-${index + 1}` : '';
      const filename = `shopify-dhl-label-${orderName}${pieceSuffix}.pdf`;

      try {
        const labelUrl = await uploadLabelPdfForAirtable($, label.labelPdf, filename);
        labelAttachments.push({url: labelUrl, filename});
        labelUrls.push(labelUrl);
      } catch (uploadError) {
        return {
          [AIRTABLE.fields.fedexTracking]: shipment.trackingNumbers.join(', '),
          [AIRTABLE.fields.fedexService]: shipment.serviceLabel ?? shipment.serviceCode,
          [AIRTABLE.fields.labelStatus]: AIRTABLE.labelStatus.failed,
          [AIRTABLE.fields.labelError]: `Label purchased but upload failed on piece ${index + 1}: ${uploadError.message}. Set SHOPIFY_ACCESS_TOKEN on order-sync to attach PDFs.`,
          packages: shipment.packages,
        };
      }
    }

    return {
      [AIRTABLE.fields.fedexTracking]: shipment.trackingNumbers.join(', '),
      [AIRTABLE.fields.fedexService]: shipment.serviceLabel ?? shipment.serviceCode,
      [AIRTABLE.fields.labelStatus]: AIRTABLE.labelStatus.created,
      [AIRTABLE.fields.labelError]: '',
      [AIRTABLE.fields.shippingLabel]: labelAttachments,
      [AIRTABLE.fields.shippingLabelUrl]: labelUrls[0] ?? '',
      packages: shipment.packages,
      masterTrackingNumber: shipment.masterTrackingNumber,
    };
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
  const shipmentPackages = labelResult.packages ?? null;
  const labelFields = {...labelResult};
  delete labelFields.packages;
  delete labelFields.masterTrackingNumber;

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
      carrierTracking:
        labelFields[AIRTABLE.fields.fedexTracking] ??
        existing.fields?.[AIRTABLE.fields.fedexTracking],
      packages: shipmentPackages,
      masterTrackingNumber: labelResult.masterTrackingNumber ?? null,
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
    carrierTracking: labelFields[AIRTABLE.fields.fedexTracking],
    packages: shipmentPackages,
    masterTrackingNumber: labelResult.masterTrackingNumber ?? null,
  };
}

export {mapShopifyOrderToAirtableFields as formatOrderNotes} from './map-order.mjs';
export {orderRecordName} from './map-order.mjs';
