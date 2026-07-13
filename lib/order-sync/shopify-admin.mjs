import {SHOPIFY} from './config.js';
import {getShopifyAccessToken, hasShopifyAccessConfigured} from '../shopify-access-token.mjs';

export function shopifyAdminConfig() {
  const shop =
    process.env.SHOPIFY_SHOP_ID?.trim() ??
    SHOPIFY.shopId ??
    SHOPIFY.shopDomain.replace('.myshopify.com', '');
  const apiVersion =
    process.env.SHOPIFY_GRAPHQL_VERSION?.trim() ?? SHOPIFY.graphqlVersion;

  return {
    shop,
    apiVersion,
    token: null,
  };
}

async function resolveToken() {
  return getShopifyAccessToken();
}

export function shopifyGraphqlUrl(config = shopifyAdminConfig()) {
  return `https://${config.shop}.myshopify.com/admin/api/${config.apiVersion}/graphql.json`;
}

export async function shopifyAdminGraphql($, query, variables = {}) {
  const config = shopifyAdminConfig();
  const token = await resolveToken();
  if (!token) {
    throw new Error('SHOPIFY_ACCESS_TOKEN is required for Shopify Shipping labels');
  }

  const response = await fetch(shopifyGraphqlUrl(config), {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({query, variables}),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`Shopify GraphQL HTTP ${response.status}: ${JSON.stringify(payload)}`);
  }
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join('; '));
  }
  return payload.data;
}

export function orderGid(order) {
  const id = order?.id ?? order?.admin_graphql_api_id;
  if (!id) return null;
  const value = String(id);
  return value.startsWith('gid://') ? value : `gid://shopify/Order/${value}`;
}

/**
 * Fetch a Shopify order in REST webhook shape for label + package resolution.
 * @param {Record<string, unknown>} $
 * @param {string | number} shopifyOrderId
 */
export async function fetchShopifyOrder($, shopifyOrderId) {
  const config = shopifyAdminConfig();
  const token = await resolveToken();
  if (!token) {
    throw new Error('SHOPIFY_ACCESS_TOKEN is required to fetch Shopify orders');
  }

  const response = await fetch(
    `https://${config.shop}.myshopify.com/admin/api/${SHOPIFY.apiVersion}/orders/${shopifyOrderId}.json`,
    {
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json',
      },
    },
  );

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(
      `Shopify order fetch failed (${response.status}): ${JSON.stringify(payload)}`,
    );
  }

  return payload.order ?? null;
}
