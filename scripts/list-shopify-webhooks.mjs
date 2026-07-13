import {getShopifyAccessToken} from '../lib/shopify-access-token.mjs';

const token = await getShopifyAccessToken();
const shop = process.env.SHOPIFY_SHOP_ID?.trim() ?? 'thelonglookco';
const version = process.env.SHOPIFY_GRAPHQL_VERSION?.trim() ?? '2026-07';

const response = await fetch(
  `https://${shop}.myshopify.com/admin/api/${version}/graphql.json`,
  {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `query {
        webhookSubscriptions(first: 25) {
          edges {
            node {
              id
              topic
              endpoint {
                __typename
                ... on WebhookHttpEndpoint { callbackUrl }
              }
            }
          }
        }
      }`,
    }),
  },
);

const payload = await response.json();
console.log(JSON.stringify(payload, null, 2));
