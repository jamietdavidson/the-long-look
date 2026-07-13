import {getShopifyAccessToken} from '../lib/shopify-access-token.mjs';

const token = await getShopifyAccessToken();
const shop = process.env.SHOPIFY_SHOP_ID?.trim() ?? 'thelonglookco';
const version = process.env.SHOPIFY_GRAPHQL_VERSION?.trim() ?? '2026-07';

async function graphql(query, variables = {}) {
  const response = await fetch(
    `https://${shop}.myshopify.com/admin/api/${version}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({query, variables}),
    },
  );
  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join('; '));
  }
  return payload.data;
}

const list = await graphql(`query {
  webhookSubscriptions(first: 25) {
    edges {
      node {
        id
        topic
        endpoint { ... on WebhookHttpEndpoint { callbackUrl } }
      }
    }
  }
}`);

const edges = list.webhookSubscriptions?.edges ?? [];
const railwayWebhooks = edges.filter((edge) =>
  String(edge.node?.endpoint?.callbackUrl ?? '').includes('railway.app'),
);

if (!railwayWebhooks.length) {
  console.log('No Railway webhook subscriptions found.');
  process.exit(0);
}

for (const edge of railwayWebhooks) {
  const id = edge.node.id;
  const result = await graphql(
    `mutation($id: ID!) {
      webhookSubscriptionDelete(id: $id) {
        deletedWebhookSubscriptionId
        userErrors { field message }
      }
    }`,
    {id},
  );
  const errors = result.webhookSubscriptionDelete?.userErrors ?? [];
  if (errors.length) {
    throw new Error(errors.map((error) => error.message).join('; '));
  }
  console.log(
    `Deleted ${edge.node.topic} → ${edge.node.endpoint?.callbackUrl} (${result.webhookSubscriptionDelete?.deletedWebhookSubscriptionId})`,
  );
}
