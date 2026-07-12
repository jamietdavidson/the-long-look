#!/usr/bin/env node
/**
 * Create/configure the order-sync Railway service and register Shopify webhooks.
 *
 * Usage:
 *   set -a && source services/catalog-sync/.env.railway && set +a
 *   SHOPIFY_WEBHOOK_SECRET=shpss_… node scripts/railway-setup-order-sync.mjs
 */
const API = 'https://backboard.railway.com/graphql/v2';
const PROJECT_ID = 'b3ab32a9-416f-48f6-ad0b-10b92ec53e47';

const AIRTABLE_PAT = process.env.AIRTABLE_PAT?.trim();
const SHOPIFY_WEBHOOK_SECRET =
  process.env.SHOPIFY_WEBHOOK_SECRET?.trim() ??
  process.env.SHOPIFY_API_SECRET?.trim() ??
  process.env.SHOPIFY_CLIENT_SECRET?.trim();
const accountToken = process.env.RAILWAY_API_TOKEN?.trim();
const projectToken = process.env.RAILWAY_TOKEN?.trim();

if (!AIRTABLE_PAT || !SHOPIFY_WEBHOOK_SECRET) {
  console.error('Set AIRTABLE_PAT and SHOPIFY_WEBHOOK_SECRET (or SHOPIFY_CLIENT_SECRET)');
  process.exit(1);
}
if (!accountToken && !projectToken) {
  console.error('Set RAILWAY_API_TOKEN or RAILWAY_TOKEN');
  process.exit(1);
}

async function gql(query, variables = {}) {
  const headers = {'Content-Type': 'application/json'};
  if (projectToken) headers['Project-Access-Token'] = projectToken;
  else headers.Authorization = `Bearer ${accountToken}`;

  const response = await fetch(API, {
    method: 'POST',
    headers,
    body: JSON.stringify({query, variables}),
  });
  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((e) => e.message).join('; '));
  }
  return payload.data;
}

async function getProject() {
  const data = await gql(
    `query($id: String!) {
      project(id: $id) {
        id
        name
        environments { edges { node { id name } } }
        services { edges { node { id name } } }
      }
    }`,
    {id: PROJECT_ID},
  );
  return data.project;
}

async function ensureOrderSyncService(project) {
  const existing = project.services.edges.find(
    (edge) => edge.node.name === 'order-sync',
  )?.node;
  if (existing) return existing;

  const data = await gql(
    `mutation($input: ServiceCreateInput!) {
      serviceCreate(input: $input) {
        id
        name
      }
    }`,
    {
      input: {
        projectId: PROJECT_ID,
        name: 'order-sync',
      },
    },
  );
  return data.serviceCreate;
}

async function setServiceVariables(environmentId, serviceId) {
  await gql(
    `mutation($input: VariableCollectionUpsertInput!) {
      variableCollectionUpsert(input: $input)
    }`,
    {
      input: {
        projectId: PROJECT_ID,
        environmentId,
        serviceId,
        variables: {
          AIRTABLE_PAT,
          SHOPIFY_WEBHOOK_SECRET,
        },
        skipDeploys: false,
      },
    },
  );
}

async function main() {
  const project = await getProject();
  if (!project) throw new Error(`Project ${PROJECT_ID} not found`);

  const environment =
    project.environments.edges.find((e) => e.node.name === 'production')?.node ??
    project.environments.edges[0]?.node;
  if (!environment) throw new Error('No Railway environment found');

  const service = await ensureOrderSyncService(project);
  console.log(`Service: ${service.name} (${service.id})`);

  await setServiceVariables(environment.id, service.id);
  console.log('Variables set on order-sync (AIRTABLE_PAT, SHOPIFY_WEBHOOK_SECRET)');

  console.log('\nNext: deploy order-sync from repo root:');
  console.log(
    '  RAILWAY_DOCKERFILE_PATH=services/order-sync/Dockerfile railway up --service order-sync --detach',
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
