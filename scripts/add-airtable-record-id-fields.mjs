#!/usr/bin/env node
/**
 * Add airtable_record_id to artist/collection/picture metaobject definitions
 * and register the airtable.record_id product metafield definition.
 *
 * Usage:
 *   SHOPIFY_ACCESS_TOKEN=shpat_… node scripts/add-airtable-record-id-fields.mjs
 *
 * Requires Shopify Admin API scopes: read_metaobject_definitions, write_metaobject_definitions
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

async function ensureMetafieldDefinitions(ownerType, definitions) {
  for (const definition of definitions) {
    const data = await graphql(`mutation($definition: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition { id namespace key access { storefront } }
        userErrors { field message code }
      }
    }`, {definition: {...definition, ownerType}});

    const errors = data.metafieldDefinitionCreate?.userErrors ?? [];
    const alreadyExists = errors.some((error) =>
      /already|taken|in use/i.test(`${error.message} ${error.code ?? ''}`),
    );
    if (alreadyExists) {
      const updated = await graphql(`mutation {
        metafieldDefinitionUpdate(definition: {
          namespace: "${definition.namespace}"
          key: "${definition.key}"
          ownerType: ${ownerType}
          access: { storefront: PUBLIC_READ }
        }) {
          updatedDefinition { access { storefront } }
          userErrors { message }
        }
      }`);
      const updateErrors = updated.metafieldDefinitionUpdate?.userErrors ?? [];
      if (updateErrors.length) {
        console.warn(`${ownerType} ${definition.namespace}.${definition.key}: ${JSON.stringify(updateErrors)}`);
      } else {
        console.log(`${ownerType} ${definition.namespace}.${definition.key} storefront access ensured`);
      }
      continue;
    }
    if (errors.length) {
      throw new Error(`${ownerType} ${definition.namespace}.${definition.key}: ${JSON.stringify(errors)}`);
    }
    console.log(`${ownerType} metafield ${definition.namespace}.${definition.key} created`);
  }
}

async function ensureProductMetafieldDefinitions() {
  await ensureMetafieldDefinitions('PRODUCT', [
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
    {
      name: 'Artist Record ID',
      namespace: 'print',
      key: 'artist_record_id',
      type: 'single_line_text_field',
      access: {storefront: 'PUBLIC_READ'},
    },
    {
      name: 'Collection Record IDs',
      namespace: 'print',
      key: 'collection_record_ids',
      type: 'json',
      access: {storefront: 'PUBLIC_READ'},
    },
  ]);
}

async function ensureVariantMetafieldDefinitions() {
  const storefrontAccess = {storefront: 'PUBLIC_READ'};
  await ensureMetafieldDefinitions('PRODUCTVARIANT', [
    {name: 'Short Inches', namespace: 'print', key: 'short_inches', type: 'number_decimal', access: storefrontAccess},
    {name: 'Long Inches', namespace: 'print', key: 'long_inches', type: 'number_decimal', access: storefrontAccess},
    {name: 'Padding Inches', namespace: 'print', key: 'padding_inches', type: 'number_decimal', access: storefrontAccess},
    {name: 'Frame Width Inches', namespace: 'print', key: 'frame_width_inches', type: 'number_decimal', access: storefrontAccess},
    {name: 'Size Rank', namespace: 'print', key: 'rank', type: 'number_integer', access: storefrontAccess},
  ]);
}

for (const type of ['artist', 'collection', 'picture']) {
  try {
    await addMetaobjectField(type);
  } catch (error) {
    console.warn(`${type}: skipped metaobject field (${error.message})`);
  }
}
await ensureProductMetafieldDefinitions();
await ensureVariantMetafieldDefinitions();
console.log('Done.');
