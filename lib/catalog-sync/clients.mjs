import {getShopifyAccessToken, hasShopifyAccessConfigured} from '../shopify-access-token.mjs';

export function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

/** @returns {Promise<{ $: object, airtable: { $auth: { oauth_access_token: string } }, shopify: { $auth: { shop_id: string, access_token: string } } }>} */
export async function createSyncClients() {
  const airtablePat = requireEnv('AIRTABLE_PAT');
  if (!hasShopifyAccessConfigured()) {
    throw new Error(
      'Missing Shopify credentials: set SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET, or SHOPIFY_ACCESS_TOKEN',
    );
  }

  const shopifyToken = await getShopifyAccessToken();
  const shopId = process.env.SHOPIFY_SHOP_ID?.trim() ?? 'thelonglookco';
  return {
    $: {},
    airtable: {$auth: {oauth_access_token: airtablePat}},
    shopify: {$auth: {shop_id: shopId, access_token: shopifyToken}},
  };
}
