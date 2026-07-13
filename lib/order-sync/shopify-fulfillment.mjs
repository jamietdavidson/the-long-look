import {orderGid, shopifyAdminGraphql} from './shopify-admin.mjs';

const OPEN_FULFILLMENT_STATUSES = new Set(['OPEN', 'IN_PROGRESS', 'SCHEDULED']);

/**
 * @param {Record<string, unknown>} $
 * @param {string | number} shopifyOrderId
 * @param {string | number} lineItemId
 */
async function findFulfillmentOrderLineItem($, shopifyOrderId, lineItemId) {
  const gid = orderGid({id: shopifyOrderId});
  const targetLineItemId = String(lineItemId);

  const data = await shopifyAdminGraphql(
    $,
    `query($id: ID!) {
      order(id: $id) {
        fulfillmentOrders(first: 20) {
          nodes {
            id
            status
            lineItems(first: 50) {
              nodes {
                id
                remainingQuantity
                lineItem { id }
              }
            }
          }
        }
      }
    }`,
    {id: gid},
  );

  for (const fulfillmentOrder of data.order?.fulfillmentOrders?.nodes ?? []) {
    if (!OPEN_FULFILLMENT_STATUSES.has(String(fulfillmentOrder.status ?? ''))) {
      continue;
    }

    for (const line of fulfillmentOrder.lineItems?.nodes ?? []) {
      const legacyId = String(line.lineItem?.id ?? '').split('/').pop() ?? '';
      const graphId = legacyId;
      const matches =
        legacyId === targetLineItemId ||
        graphId === targetLineItemId ||
        String(line.lineItem?.id ?? '') === targetLineItemId;

      if (matches && Number(line.remainingQuantity ?? 0) > 0) {
        return {
          fulfillmentOrderId: fulfillmentOrder.id,
          fulfillmentOrderLineItemId: line.id,
          quantity: 1,
        };
      }
    }
  }

  return null;
}

/**
 * Create a Shopify fulfillment with tracking for one order line item.
 * @param {Record<string, unknown>} $
 * @param {{
 *   shopifyOrderId: string | number;
 *   lineItemId: string | number;
 *   trackingNumber: string;
 *   trackingCompany?: string | null;
 *   trackingUrl?: string | null;
 *   notifyCustomer?: boolean;
 * }} params
 */
export async function createShopifyFulfillmentWithTracking($, params) {
  const {
    shopifyOrderId,
    lineItemId,
    trackingNumber,
    trackingCompany,
    trackingUrl,
    notifyCustomer = true,
  } = params;

  if (!trackingNumber) {
    return {skipped: true, reason: 'Missing tracking number'};
  }

  const target = await findFulfillmentOrderLineItem($, shopifyOrderId, lineItemId);
  if (!target) {
    return {
      skipped: true,
      reason: 'No open fulfillment order line item found for this product',
    };
  }

  const data = await shopifyAdminGraphql(
    $,
    `mutation($fulfillment: FulfillmentInput!) {
      fulfillmentCreate(fulfillment: $fulfillment) {
        fulfillment {
          id
          status
          trackingInfo {
            company
            number
            url
          }
        }
        userErrors { field message }
      }
    }`,
    {
      fulfillment: {
        notifyCustomer,
        trackingInfo: {
          number: trackingNumber,
          company: trackingCompany || undefined,
          url: trackingUrl || undefined,
        },
        lineItemsByFulfillmentOrder: [
          {
            fulfillmentOrderId: target.fulfillmentOrderId,
            fulfillmentOrderLineItems: [
              {
                id: target.fulfillmentOrderLineItemId,
                quantity: target.quantity,
              },
            ],
          },
        ],
      },
    },
  );

  const userErrors = data.fulfillmentCreate?.userErrors ?? [];
  if (userErrors.length) {
    throw new Error(
      `fulfillmentCreate: ${userErrors.map((error) => error.message).join('; ')}`,
    );
  }

  return {
    action: 'fulfilled',
    fulfillmentId: data.fulfillmentCreate?.fulfillment?.id ?? null,
    trackingInfo: data.fulfillmentCreate?.fulfillment?.trackingInfo ?? null,
  };
}
