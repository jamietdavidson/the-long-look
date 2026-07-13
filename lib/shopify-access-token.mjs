import {SHOPIFY} from './order-sync/config.js';

let cachedToken = null;
let cachedExpiresAt = 0;

function shopDomain() {
  return (
    process.env.SHOPIFY_SHOP_ID?.trim() ??
    SHOPIFY.shopId ??
    SHOPIFY.shopDomain.replace('.myshopify.com', '')
  );
}

function staticToken() {
  return (
    process.env.SHOPIFY_ACCESS_TOKEN?.trim() ??
    process.env.SHOPIFY_ADMIN_TOKEN?.trim() ??
    ''
  );
}

function clientCredentials() {
  const clientId =
    process.env.SHOPIFY_CLIENT_ID?.trim() ??
    process.env.SHOPIFY_API_KEY?.trim() ??
    '';
  const clientSecret =
    process.env.SHOPIFY_CLIENT_SECRET?.trim() ??
    process.env.SHOPIFY_API_SECRET?.trim() ??
    '';
  if (!clientId || !clientSecret) return null;
  return {clientId, clientSecret};
}

async function fetchClientCredentialsToken() {
  const credentials = clientCredentials();
  if (!credentials) return null;

  const response = await fetch(
    `https://${shopDomain()}.myshopify.com/admin/oauth/access_token`,
    {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
      }),
    },
  );

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(
      `Shopify token request failed (${response.status}): ${JSON.stringify(payload)}`,
    );
  }

  if (!payload.access_token) {
    throw new Error('Shopify token request returned no access_token');
  }

  const expiresIn = Number(payload.expires_in ?? 86_399);
  cachedToken = payload.access_token;
  cachedExpiresAt = Date.now() + expiresIn * 1000;
  return cachedToken;
}

/**
 * Resolve a Shopify Admin API access token.
 * Prefers client-credentials refresh when SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET are set.
 */
export async function getShopifyAccessToken() {
  const credentials = clientCredentials();
  if (credentials) {
    if (cachedToken && Date.now() < cachedExpiresAt - 60_000) {
      return cachedToken;
    }
    return fetchClientCredentialsToken();
  }

  const token = staticToken();
  if (!token) {
    throw new Error(
      'Missing Shopify credentials: set SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET, or SHOPIFY_ACCESS_TOKEN',
    );
  }
  return token;
}

export function hasShopifyAccessConfigured() {
  return Boolean(clientCredentials() || staticToken());
}
