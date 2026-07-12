#!/usr/bin/env node
/**
 * Add airtable_record_id to artist/collection/picture metaobject definitions
 * and register the airtable.record_id product metafield definition.
 *
 * Usage:
 *   SHOPIFY_ACCESS_TOKEN=shpat_… node scripts/add-airtable-record-id-fields.mjs
 */
const STORE = process.env.SHOPIFY_STORE ?? 'thelonglookco.myshopify.com';
const TOKEN = process.env.SHOPIFY_ACCESS_TOKEN ?? process.env.SHOPIFY_ADMIN_TOKEN;
const API_VERSION = '2025-01';

if (!TOKEN) {
  console.error('Set SHOPIFY_ACCESS_TOKEN or SHOPIFY_ADMIN_TOKEN.');
  process.exit(1);
}

async function graphql(query, variables = {}) {
  const response = await fetch(
    `https://${STORE}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({query, variables}),
    },
  );
  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(JSON.stringify(payload.errors));
  }
  return payload.data;
}

async function getDefinitionId(type) {
  const data = await graphql(`query($type: String!) {
    metaobjectDefinitionByType(type: $type) {
      id
      fieldDefinitions { key }
    }
  }`, {type});
  return data.metaobjectDefinitionByType;
}

async function addMetaobjectField(type) {
  const definition = await getDefinitionId(type);
  if (!definition?.id) {
    console.warn(`No metaobject definition for type "${type}" — skipped`);
    return;
  }

  if (definition.fieldDefinitions?.some((field) => field.key === 'airtable_record_id')) {
    console.log(`${type}: airtable_record_id already exists`);
    return;
  }

  const data = await graphql(`mutation($id: ID!) {
    metaobjectDefinitionUpdate(id: $id, definition: {
      fieldDefinitions: [{
        create: {
          key: "airtable_record_id"
          name: "Airtable Record ID"
          type: "single_line_text_field"
        }
      }]
    }) {
      metaobjectDefinition { id type }
      userErrors { field message }
    }
  }`, {id: definition.id});

  const errors = data.metaobjectDefinitionUpdate?.userErrors ?? [];
  if (errors.length) {
    throw new Error(`${type}: ${JSON.stringify(errors)}`);
  }
  console.log(`${type}: added airtable_record_id`);
}

async function ensureProductMetafieldDefinitions() {
  const definitions = [
    {
      name: 'Airtable Record ID',
      namespace: 'airtable',
      key: 'record_id',
      type: 'single_line_text_field',
    },
    {
      name: 'Collection Handles',
      namespace: 'print',
      key: 'collection_handles',
      type: 'json',
      access: {storefront: 'PUBLIC_READ'},
    },
  ];

  for (const definition of definitions) {
    const data = await graphql(`mutation($definition: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition { id namespace key }
        userErrors { field message code }
      }
    }`, {definition: {...definition, ownerType: 'PRODUCT'}});

    const errors = data.metafieldDefinitionCreate?.userErrors ?? [];
    const alreadyExists = errors.some((error) =>
      /already|taken|in use/i.test(`${error.message} ${error.code ?? ''}`),
    );
    if (alreadyExists) {
      console.log(`product metafield ${definition.namespace}.${definition.key} already exists`);
      continue;
    }
    if (errors.length) {
      throw new Error(`product metafield ${definition.namespace}.${definition.key}: ${JSON.stringify(errors)}`);
    }
    console.log(`product metafield ${definition.namespace}.${definition.key} created`);
  }
}

for (const type of ['artist', 'collection', 'picture']) {
  await addMetaobjectField(type);
}
await ensureProductMetafieldDefinitions();
console.log('Done.');
