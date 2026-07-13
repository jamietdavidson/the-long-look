import {SHOPIFY, SHIPPING} from './config.js';
import {getShopifyAccessToken} from '../shopify-access-token.mjs';
import {resolveShipmentPackagesForOrder} from './package-from-order.mjs';
import {
  formatShopifyShippingForAirtable,
  resolveShopifyShippingRateFromOrder,
} from './shipping-from-order.mjs';
import {orderGid, shopifyAdminConfig, shopifyAdminGraphql} from './shopify-admin.mjs';

const PURCHASE_POLL_MS = 1_500;
const PURCHASE_POLL_ATTEMPTS = 20;

function shippingDatetime() {
  const hours = Number(process.env.SHOPIFY_SHIPPING_HOURS_FROM_NOW ?? 24);
  return new Date(Date.now() + hours * 3_600_000).toISOString();
}

function packageTareWeightLb(pkg) {
  return Math.min(
    1,
    Math.max(0.25, Number(pkg.weightLb ?? SHIPPING.packageWeightLb) * 0.1),
  );
}

function buildPurchaseInput({fulfillmentOrderId, pkg, preferredRate, usePreferredRate = true}) {
  const weightLb = pkg.weightLb ?? SHIPPING.packageWeightLb;
  const input = {
    fulfillmentOrderId,
    notifyCustomer: false,
    shippingDatetime: shippingDatetime(),
    totalWeight: {value: weightLb, unit: 'POUNDS'},
    packageInfo: {
      customPackage: {
        type: pkg.packagingType === 'tube' ? 'SOFT_PACKAGE' : 'BOX',
        weight: {value: packageTareWeightLb(pkg), unit: 'POUNDS'},
        dimensions: {
          length: pkg.length ?? SHIPPING.packageLengthIn,
          width: pkg.width ?? SHIPPING.packageWidthIn,
          height: pkg.height ?? SHIPPING.packageHeightIn,
          unit: 'INCHES',
        },
      },
    },
  };

  if (usePreferredRate && preferredRate?.carrierCode && preferredRate?.serviceCode) {
    input.preferredRateSelection = {
      carrierCode: preferredRate.carrierCode,
      serviceCode: preferredRate.serviceCode,
    };
  }

  return input;
}

function isRatesNotFoundError(error) {
  return /rates?_not_found|rate was not found/i.test(String(error?.message ?? ''));
}

async function purchaseLabelForPackage($, {fulfillmentOrderId, pkg, preferredRate}) {
  const attempts = [
    {usePreferredRate: true, note: 'preferred checkout rate'},
    {usePreferredRate: false, note: 'shopify cheapest available rate'},
  ];

  let lastError;
  for (const [index, attempt] of attempts.entries()) {
    try {
      const input = buildPurchaseInput({
        fulfillmentOrderId,
        pkg,
        preferredRate,
        usePreferredRate: attempt.usePreferredRate,
      });
      const started = await purchaseLabel($, input);
      if (!started?.id) {
        throw new Error('shippingLabelPurchase returned no purchase result id');
      }

      const result = started.done ? started : await pollPurchaseResult($, started.id);
      return {
        result,
        rateSelection: attempt.usePreferredRate ? 'preferred' : 'cheapest_available',
        rateSelectionNote:
          index > 0 && attempt.note === 'shopify cheapest available rate'
            ? 'Preferred DHL rate was unavailable for this fulfillment order; Shopify selected the cheapest eligible carrier rate instead.'
            : null,
      };
    } catch (error) {
      lastError = error;
      if (index === 0 && isRatesNotFoundError(error)) {
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new Error('shippingLabelPurchase failed');
}

async function fetchFulfillmentOrderIds($, order) {
  const gid = orderGid(order);
  if (!gid) throw new Error('Order payload is missing id');

  const data = await shopifyAdminGraphql(
    $,
    `query($id: ID!) {
      order(id: $id) {
        fulfillmentOrders(first: 20) {
          nodes {
            id
            status
            supportedActions { action }
          }
        }
      }
    }`,
    {id: gid},
  );

  const nodes = data.order?.fulfillmentOrders?.nodes ?? [];
  const open = nodes.filter((node) =>
    ['OPEN', 'IN_PROGRESS', 'SCHEDULED'].includes(String(node.status ?? '')),
  );

  return (open.length ? open : nodes).map((node) => node.id).filter(Boolean);
}

async function purchaseLabel($, input) {
  const data = await shopifyAdminGraphql(
    $,
    `mutation($input: ShippingLabelPurchaseInput!) {
      shippingLabelPurchase(shippingLabelPurchase: $input) {
        shippingLabelPurchaseResult {
          id
          done
          status
          errors { message code }
          shippingLabels {
            id
            trackingInfo { number company }
            shippingDocuments {
              documentType
              format
              url
            }
          }
        }
        userErrors { field message code }
      }
    }`,
    {input},
  );

  const payload = data.shippingLabelPurchase;
  const userErrors = payload?.userErrors ?? [];
  if (userErrors.length) {
    throw new Error(
      `shippingLabelPurchase: ${userErrors.map((error) => error.message).join('; ')}`,
    );
  }

  return payload?.shippingLabelPurchaseResult ?? null;
}

async function pollPurchaseResult($, resultId) {
  for (let attempt = 0; attempt < PURCHASE_POLL_ATTEMPTS; attempt += 1) {
    const data = await shopifyAdminGraphql(
      $,
      `query($id: ID!) {
        node(id: $id) {
          ... on ShippingLabelPurchaseResult {
            id
            done
            status
            errors { message code }
            shippingLabels {
              id
              trackingInfo { number company }
              shippingDocuments {
                documentType
                format
                url
              }
            }
          }
        }
      }`,
      {id: resultId},
    );

    const result = data.node;
    if (!result) {
      throw new Error('Shipping label purchase result not found');
    }

    if (result.done) {
      if (result.status === 'PURCHASE_FAILED') {
        const detail = (result.errors ?? [])
          .map((error) => error.message)
          .join('; ');
        throw new Error(detail || 'Shopify shipping label purchase failed');
      }
      return result;
    }

    await new Promise((resolve) => setTimeout(resolve, PURCHASE_POLL_MS));
  }

  throw new Error('Timed out waiting for Shopify shipping label purchase');
}

async function downloadLabelPdf(url) {
  const token = await getShopifyAccessToken();
  const response = await fetch(url, {
    headers: token ? {'X-Shopify-Access-Token': token} : {},
  });
  if (!response.ok) {
    throw new Error(`Failed to download shipping label (${response.status})`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) {
    throw new Error('Downloaded shipping label PDF was empty');
  }
  return buffer;
}

function labelsFromPurchaseResult(result, pkg, index) {
  const shippingLabels = result.shippingLabels ?? [];
  return shippingLabels.map((label, labelIndex) => {
    const document =
      (label.shippingDocuments ?? []).find((doc) => doc.url) ??
      label.shippingDocuments?.[0] ??
      null;
    if (!document?.url) {
      throw new Error('Shopify shipping label purchase returned no label document URL');
    }

    return {
      trackingNumber: String(label.trackingInfo?.number ?? ''),
      labelUrl: document.url,
      package: {
        length: pkg.length ?? SHIPPING.packageLengthIn,
        width: pkg.width ?? SHIPPING.packageWidthIn,
        height: pkg.height ?? SHIPPING.packageHeightIn,
        weightLb: pkg.weightLb ?? SHIPPING.packageWeightLb,
        sizeName: pkg.sizeName ?? null,
        sizeKey: pkg.sizeKey ?? null,
        shopifyPackageId: pkg.shopifyPackageId ?? null,
        source: pkg.source ?? 'resolved',
        lineItemId: pkg.lineItemId ?? null,
        lineItemTitle: pkg.lineItemTitle ?? null,
        variantTitle: pkg.variantTitle ?? null,
        unitIndex: pkg.unitIndex ?? index + 1,
        unitOf: pkg.unitOf ?? 1,
        pieceIndex: labelIndex + 1,
      },
    };
  });
}

/**
 * Purchase one DHL Express label through Shopify Shipping.
 * @param {Record<string, unknown>} order
 * @param {Record<string, unknown>} pkg
 */
export async function createShopifyShippingLabelForPackage(order, pkg) {
  const shipment = await createShopifyShippingLabelsForOrder(order, [pkg]);
  if (shipment.skipped) {
    return {skipped: true, reason: shipment.reason};
  }

  const label = shipment.labels?.[0];
  if (!label) {
    throw new Error('Shopify Shipping returned no label for package');
  }

  return {
    trackingNumber: label.trackingNumber,
    serviceLabel: shipment.serviceLabel ?? shipment.serviceCode,
    serviceCode: shipment.serviceCode,
    labelPdf: label.labelPdf,
    package: label.package ?? pkg,
    rateSelection: label.rateSelection ?? shipment.rateSelection ?? null,
    rateSelectionNote: label.rateSelectionNote ?? shipment.rateSelectionNote ?? null,
  };
}

/**
 * Purchase DHL Express labels through Shopify Shipping for each package on the order.
 * Pickup is scheduled by Shopify when the label is purchased.
 * @param {Record<string, unknown>} order
 * @param {Array<Record<string, unknown>> | null} [packagesOverride]
 */
export async function createShopifyShippingLabelsForOrder(order, packagesOverride = null) {
  if (!SHIPPING.isConfigured()) {
    return {
      skipped: true,
      reason: 'Shopify Shipping is not configured (set SHOPIFY_ACCESS_TOKEN with write_orders and fulfillment scopes, then re-authorize the app)',
    };
  }

  const preferredRate = resolveShopifyShippingRateFromOrder(order);
  if (preferredRate.skipped) {
    return {
      skipped: true,
      reason: preferredRate.reason,
      shopifyShipping: preferredRate.shopifyShipping,
    };
  }

  const $ = {};
  const packages = packagesOverride ?? (await resolveShipmentPackagesForOrder(order));
  const fulfillmentOrderIds = await fetchFulfillmentOrderIds($, order);
  if (!fulfillmentOrderIds.length) {
    return {
      skipped: true,
      reason: 'No open fulfillment orders found for this Shopify order',
    };
  }

  const fulfillmentOrderId = fulfillmentOrderIds[0];
  const labels = [];

  for (const [index, pkg] of packages.entries()) {
    const {result, rateSelection, rateSelectionNote} = await purchaseLabelForPackage($, {
      fulfillmentOrderId,
      pkg,
      preferredRate,
    });
    const purchased = labelsFromPurchaseResult(result, pkg, index);

    for (const label of purchased) {
      labels.push({
        ...label,
        rateSelection,
        rateSelectionNote,
        labelPdf: await downloadLabelPdf(label.labelUrl),
      });
    }
  }

  if (!labels.length) {
    throw new Error('Shopify Shipping returned no labels');
  }

  return {
    trackingNumbers: labels.map((label) => label.trackingNumber).filter(Boolean),
    masterTrackingNumber: labels[0]?.trackingNumber ?? null,
    serviceLabel: formatShopifyShippingForAirtable(preferredRate),
    carrierCode: preferredRate.carrierCode,
    serviceCode: preferredRate.serviceCode,
    shopifyShipping: preferredRate.shopifyShipping,
    serviceResolutionSource: preferredRate.resolutionSource,
    serviceResolutionNote: preferredRate.resolutionNote ?? null,
    rateSelection: labels[0]?.rateSelection ?? null,
    rateSelectionNote: labels[0]?.rateSelectionNote ?? null,
    labels,
    packages,
  };
}
