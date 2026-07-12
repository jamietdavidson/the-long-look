#!/usr/bin/env node
/**
 * Set catalog-sync variables on Railway via GraphQL.
 *
 * Usage:
 *   RAILWAY_API_TOKEN=… node scripts/railway-set-catalog-vars.mjs
 *   # or project token:
 *   RAILWAY_TOKEN=… node scripts/railway-set-catalog-vars.mjs
 */
const API = 'https://backboard.railway.com/graphql/v2';
const PROJECT_ID = 'b3ab32a9-416f-48f6-ad0b-10b92ec53e47';

const AIRTABLE_PAT = process.env.AIRTABLE_PAT?.trim();
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN?.trim();
const POLL_INTERVAL_MS = process.env.POLL_INTERVAL_MS?.trim() ?? '60000';
const SHOPIFY_SHOP_ID = process.env.SHOPIFY_SHOP_ID?.trim() ?? 'thelonglookco';

const accountToken = process.env.RAILWAY_API_TOKEN?.trim();
const projectToken = process.env.RAILWAY_TOKEN?.trim();

if (!AIRTABLE_PAT || !SHOPIFY_ACCESS_TOKEN) {
  console.error('Set AIRTABLE_PAT and SHOPIFY_ACCESS_TOKEN');
  process.exit(1);
}
if (!accountToken && !projectToken) {
  console.error('Set RAILWAY_API_TOKEN (account) or RAILWAY_TOKEN (project)');
  process.exit(1);
}

async function gql(query, variables = {}) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (projectToken) {
    headers['Project-Access-Token'] = projectToken;
  } else {
    headers.Authorization = `Bearer ${accountToken}`;
  }

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

async function main() {
  const projectData = await gql(
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

  const project = projectData.project;
  if (!project) throw new Error(`Project ${PROJECT_ID} not found`);

  const environment =
    project.environments.edges.find((e) => e.node.name === 'production')?.node ??
    project.environments.edges[0]?.node;
  if (!environment) throw new Error('No environment found');

  const service =
    project.services.edges.find((s) => /catalog|long-look|the-long-look/i.test(s.node.name))
      ?.node ?? project.services.edges[0]?.node;
  if (!service) throw new Error('No service found — create a service in Railway first');

  console.log(`Project: ${project.name}`);
  console.log(`Environment: ${environment.name} (${environment.id})`);
  console.log(`Service: ${service.name} (${service.id})`);

  await gql(
    `mutation($input: VariableCollectionUpsertInput!) {
      variableCollectionUpsert(input: $input)
    }`,
    {
      input: {
        projectId: PROJECT_ID,
        environmentId: environment.id,
        serviceId: service.id,
        variables: {
          AIRTABLE_PAT,
          SHOPIFY_ACCESS_TOKEN,
          POLL_INTERVAL_MS,
          SHOPIFY_SHOP_ID,
        },
        skipDeploys: false,
      },
    },
  );

  console.log('Variables set:');
  console.log(`  POLL_INTERVAL_MS=${POLL_INTERVAL_MS}`);
  console.log('  AIRTABLE_PAT=***');
  console.log('  SHOPIFY_ACCESS_TOKEN=***');
  console.log('  SHOPIFY_SHOP_ID=' + SHOPIFY_SHOP_ID);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
