export function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

/** @returns {{ $: object, airtable: { $auth: { oauth_access_token: string } }, shopify: { $auth: { shop_id: string, access_token: string } } }} */
export function createSyncClients() {
  const airtablePat = requireEnv('AIRTABLE_PAT');
  const shopifyToken =
    process.env.SHOPIFY_ACCESS_TOKEN?.trim() ?? process.env.SHOPIFY_ADMIN_TOKEN?.trim();
  if (!shopifyToken) {
    throw new Error('Missing SHOPIFY_ACCESS_TOKEN or SHOPIFY_ADMIN_TOKEN');
  }

  const shopId = process.env.SHOPIFY_SHOP_ID?.trim() ?? 'thelonglookco';
  return {
    $: {},
    airtable: {$auth: {oauth_access_token: airtablePat}},
    shopify: {$auth: {shop_id: shopId, access_token: shopifyToken}},
  };
}
