import {AIRTABLE, SHIPPING} from './config.js';
import {
  getFulfillmentRecord,
  getOrderRecord,
  listFulfillmentsForOrder,
  updateFulfillmentRecord,
} from './airtable.mjs';
import {createEasypostLabelForPackage} from './easypost-shipping.mjs';
import {createEasypostFreightLabelForPackage} from './easypost-freight.mjs';
import {isEasypostEnterpriseConfigured} from './easypost-enterprise-client.mjs';
import {requiresFreightShipping} from './easypost-parcel.mjs';
import {fulfillmentMatchKey} from './map-fulfillment.mjs';
import {orderRecordName} from './map-order.mjs';
import {resolveShipmentPackagesForOrder} from './package-from-order.mjs';
import {resolveLineItemAirtableLinks} from './resolve-line-item-links.mjs';
import {fetchShopifyOrder} from './shopify-admin.mjs';
import {createShopifyFulfillmentWithTracking} from './shopify-fulfillment.mjs';
import {uploadLabelPdfForAirtable} from './upload-label.mjs';

function firstLinkedId(fields, fieldName) {
  const value = fields?.[fieldName];
  return Array.isArray(value) ? value[0] ?? null : null;
}

function fulfillmentNeedsLabel(record) {
  const ff = AIRTABLE.fulfillmentFields;
  const fields = record?.fields ?? {};
  return (
    fields[ff.status] === AIRTABLE.fulfillmentStatus.inProgress &&
    !fields[ff.shippingLabel]
  );
}

/**
 * Pick the next unlabeled package for this fulfillment's print + variant pair.
 * @param {Array<Record<string, unknown>>} packages
 * @param {Map<string, number>} labeledCounts key → how many packages already labeled
 * @param {string} matchKey print:variant
 */
function takePackageForFulfillment(packages, labeledCounts, matchKey) {
  const labeled = labeledCounts.get(matchKey) ?? 0;
  let seen = 0;

  for (const pkg of packages) {
    const pkgKey = `${pkg.printRecordId ?? 'no-print'}:${pkg.variantRecordId ?? 'no-variant'}`;
    if (pkgKey !== matchKey) continue;

    if (seen < labeled) {
      seen += 1;
      continue;
    }

    labeledCounts.set(matchKey, labeled + 1);
    return {pkg};
  }

  return null;
}

async function enrichPackagesWithAirtableIds(order) {
  const packages = await resolveShipmentPackagesForOrder(order);
  const items = Array.isArray(order.line_items) ? order.line_items : [];
  const $ = {};

  const linksByLineItemId = new Map();
  for (const item of items) {
    const links = await resolveLineItemAirtableLinks($, item);
    linksByLineItemId.set(String(item.id ?? ''), links);
  }

  return packages.map((pkg) => {
    const links = linksByLineItemId.get(String(pkg.lineItemId ?? '')) ?? {};
    return {
      ...pkg,
      printRecordId: links.printRecordId ?? null,
      variantRecordId: links.variantRecordId ?? null,
    };
  });
}

function countLabeledByKey(fulfillmentRecords) {
  const ff = AIRTABLE.fulfillmentFields;
  const counts = new Map();

  for (const record of fulfillmentRecords) {
    const fields = record.fields ?? {};
    if (!fields[ff.shippingLabel]) continue;
    const key = fulfillmentMatchKey(record);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

/**
 * @param {string} fulfillmentRecordId Airtable Fullfillments record id
 */
export async function createLabelForFulfillment(fulfillmentRecordId) {
  const $ = {};
  const fulfillment = await getFulfillmentRecord($, fulfillmentRecordId);
  if (!fulfillment) {
    throw new Error(`Fulfillment record not found: ${fulfillmentRecordId}`);
  }

  if (!fulfillmentNeedsLabel(fulfillment)) {
    return {
      action: 'skipped',
      fulfillmentRecordId,
      reason: 'Fulfillment is not In Progress or already has a label',
    };
  }

  if (!SHIPPING.isConfigured()) {
    return {
      action: 'skipped',
      fulfillmentRecordId,
      reason: 'EasyPost is not configured (set EASYPOST_API_KEY)',
    };
  }

  const ff = AIRTABLE.fulfillmentFields;
  const orderFields = AIRTABLE.fields;
  const fulfillmentFields = fulfillment.fields ?? {};
  const orderRecordId = firstLinkedId(fulfillmentFields, ff.order);
  if (!orderRecordId) {
    throw new Error(`Fulfillment ${fulfillmentRecordId} is missing a linked Order`);
  }

  const orderRecord = await getOrderRecord($, orderRecordId);
  const shopifyOrderId = orderRecord?.fields?.[orderFields.shopifyOrderId];
  if (!shopifyOrderId) {
    throw new Error(`Order ${orderRecordId} is missing Shopify Order ID`);
  }

  const shopifyOrder = await fetchShopifyOrder($, shopifyOrderId);
  if (!shopifyOrder) {
    throw new Error(`Shopify order ${shopifyOrderId} not found`);
  }

  const matchKey = fulfillmentMatchKey(fulfillment);
  const allFulfillments = await listFulfillmentsForOrder($, orderRecordId);
  const labeledCounts = countLabeledByKey(allFulfillments);
  const packages = await enrichPackagesWithAirtableIds(shopifyOrder);
  const picked = takePackageForFulfillment(packages, labeledCounts, matchKey);

  if (!picked) {
    throw new Error(
      `No shipping package found for fulfillment ${fulfillmentRecordId} (${matchKey})`,
    );
  }

  try {
    const useEnterpriseFreight =
      requiresFreightShipping(picked.pkg) && isEasypostEnterpriseConfigured();
    const label = useEnterpriseFreight
      ? await createEasypostFreightLabelForPackage(shopifyOrder, picked.pkg, {
          fulfillmentRecordId,
        })
      : await createEasypostLabelForPackage(shopifyOrder, picked.pkg, {
          fulfillmentRecordId,
        });

    if (label.skipped) {
      return {
        action: 'skipped',
        fulfillmentRecordId,
        reason: label.reason,
      };
    }

    const orderName = orderRecordName(shopifyOrder).replace(/[^a-zA-Z0-9-_]+/g, '-');
    const filename = `easypost-label-${orderName}-fulfillment-${fulfillmentRecordId}.pdf`;
    const labelUrl = await uploadLabelPdfForAirtable($, label.labelPdf, filename);

    await updateFulfillmentRecord($, fulfillmentRecordId, {
      [ff.shippingLabel]: labelUrl,
      ...(label.labelCost != null ? {[ff.shippingCost]: label.labelCost} : {}),
    });

    const shopifyFulfillment = await createShopifyFulfillmentWithTracking($, {
      shopifyOrderId,
      lineItemId: picked.pkg.lineItemId,
      trackingNumber: label.trackingNumber,
      trackingCompany: label.trackingCompany,
      trackingUrl: label.trackingUrl,
      notifyCustomer: true,
    });

    return {
      action: 'labeled',
      fulfillmentRecordId,
      trackingNumber: label.trackingNumber,
      labelUrl,
      serviceLabel: label.serviceLabel,
      shippingCost: label.labelCost,
      easypostShipmentId: label.easypostShipmentId,
      shopifyFulfillment,
      rateSelectionNote: label.rateSelectionNote ?? null,
    };
  } catch (error) {
    return {
      action: 'failed',
      fulfillmentRecordId,
      error: error.message,
    };
  }
}

/**
 * Process every fulfillment on the order that is In Progress without a label.
 * @param {string} orderRecordId
 */
export async function createLabelsForOrderFulfillments(orderRecordId) {
  const $ = {};
  const records = await listFulfillmentsForOrder($, orderRecordId);
  const pending = records.filter(fulfillmentNeedsLabel);
  const results = [];

  for (const record of pending) {
    results.push(await createLabelForFulfillment(record.id));
  }

  return results;
}
