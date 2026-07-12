import {SHOPIFY} from './config.js';

function shopifyToken() {
  return (
    process.env.SHOPIFY_ACCESS_TOKEN?.trim() ??
    process.env.SHOPIFY_ADMIN_TOKEN?.trim() ??
    ''
  );
}

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
    token: shopifyToken(),
  };
}

export function shopifyGraphqlUrl(config = shopifyAdminConfig()) {
  return `https://${config.shop}.myshopify.com/admin/api/${config.apiVersion}/graphql.json`;
}

export async function shopifyAdminGraphql($, query, variables = {}) {
  const config = shopifyAdminConfig();
  if (!config.token) {
    throw new Error('SHOPIFY_ACCESS_TOKEN is required for Shopify Shipping labels');
  }

  const response = await fetch(shopifyGraphqlUrl(config), {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': config.token,
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
