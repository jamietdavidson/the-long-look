import {axios} from '@pipedream/platform';
import {AIRTABLE, SHOPIFY} from './config.js';

// ─── Text helpers ─────────────────────────────────────────────────────────────

export function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function attachmentUrl(field) {
  return field?.[0]?.url ?? null;
}

export function textValue(field) {
  if (field == null) return '';
  if (typeof field === 'string') return field.trim();
  if (Array.isArray(field)) return String(field[0] ?? '').trim();
  return String(field).trim();
}

export function plainText(value) {
  return textValue(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function linkedRecordIds(field) {
  if (!Array.isArray(field)) return [];
  return field.filter((id) => typeof id === 'string');
}

export function normalizeVariant(fields) {
  const v = AIRTABLE.variants;
  const padding = Number(fields[v.padding] ?? 0);
  const frameWidth = Number(fields[v.frameWidth] ?? 0);
  const frameRaw = textValue(fields[v.frame]);
  const frame = frameRaw && frameRaw !== 'No Frame' ? frameRaw : 'No Frame';

  return {
    sizeName: textValue(fields[v.sizeName]),
    frame,
    mount: padding === 0 ? 'Full Bleed' : 'Border',
    shortSide: Number(fields[v.shortSide]),
    longSide: Number(fields[v.longSide]),
    padding,
    frameWidth,
    price: String(fields[v.salePrice] ?? ''),
    rank: Number(fields[v.rank] ?? 999),
  };
}

// ─── Airtable API ─────────────────────────────────────────────────────────────

export async function airtableRequest($, airtable, {method = 'get', path, data}) {
  return axios($, {
    method,
    url: `https://api.airtable.com/v0${path}`,
    headers: {
      Authorization: `Bearer ${airtable.$auth.oauth_access_token}`,
      'Content-Type': 'application/json',
    },
    data,
  });
}

export async function listTableRecords($, airtable, tableName, {sortField} = {}) {
  const records = [];
  let offset;

  do {
    const params = new URLSearchParams();
    if (sortField) {
      params.set('sort[0][field]', sortField);
      params.set('sort[0][direction]', 'asc');
    }
    if (offset) params.set('offset', offset);

    const query = params.toString() ? `?${params}` : '';
    const response = await airtableRequest($, airtable, {
      path: `/${AIRTABLE.baseId}/${encodeURIComponent(tableName)}${query}`,
    });

    records.push(...(response.records ?? []));
    offset = response.offset;
  } while (offset);

  return records;
}

export async function getTableRecord($, airtable, tableName, recordId) {
  return airtableRequest($, airtable, {
    path: `/${AIRTABLE.baseId}/${encodeURIComponent(tableName)}/${recordId}`,
  });
}

export async function updateTableRecord($, airtable, tableName, recordId, fields) {
  return airtableRequest($, airtable, {
    method: 'patch',
    path: `/${AIRTABLE.baseId}/${encodeURIComponent(tableName)}/${recordId}`,
    data: {fields},
  });
}

export function getTriggerPrintRecord(steps) {
  const event = steps?.trigger?.event ?? steps?.trigger;
  if (event?.id && event?.fields) return event;
  if (event?.record?.id && event?.record?.fields) return event.record;
  throw new Error(
    'No print record found in trigger step. Use an Airtable "New Record in View" trigger on the Prints → Committed view.',
  );
}

export async function markRecordCommitted($, airtable, {
  tableName,
  statusField,
  recordId,
  currentStatus,
  committedStatus,
  dryRun,
}) {
  if (textValue(currentStatus) === committedStatus) {
    return {recordId, status: 'already_committed'};
  }

  if (dryRun) {
    return {recordId, status: 'pending', dryRun: true};
  }

  await updateTableRecord($, airtable, tableName, recordId, {
    [statusField]: committedStatus,
  });
  return {recordId, status: 'committed'};
}

export async function fetchVariantCatalog($, airtable) {
  const records = await listTableRecords($, airtable, AIRTABLE.variantsTable, {
    sortField: AIRTABLE.variants.rank,
  });
  return records
    .map((record) => normalizeVariant(record.fields ?? {}))
    .filter((v) => v.sizeName && v.shortSide && v.longSide && v.price);
}

// ─── Shopify API ──────────────────────────────────────────────────────────────

function shopifyGraphqlUrl(shopId) {
  return `https://${shopId}.myshopify.com/admin/api/${SHOPIFY.apiVersion}/graphql.json`;
}

export async function shopifyRequest($, shopify, {query, variables}) {
  const response = await axios($, {
    method: 'post',
    url: shopifyGraphqlUrl(shopify.$auth.shop_id),
    headers: {
      'X-Shopify-Access-Token': shopify.$auth.access_token,
      'Content-Type': 'application/json',
    },
    data: {query, variables},
  });

  if (response.errors?.length) {
    throw new Error(`Shopify GraphQL: ${JSON.stringify(response.errors)}`);
  }
  return response.data ?? response;
}

export async function getMetaobjectIdByHandle($, shopify, type, handle) {
  const data = await shopifyRequest($, shopify, {
    query: `query($handle: MetaobjectHandleInput!) {
      metaobjectByHandle(handle: $handle) { id }
    }`,
    variables: {handle: {type, handle}},
  });
  return data.metaobjectByHandle?.id ?? null;
}

export async function getProductIdByHandle($, shopify, handle) {
  const data = await shopifyRequest($, shopify, {
    query: `query($handle: String!) { productByHandle(handle: $handle) { id } }`,
    variables: {handle},
  });
  return data.productByHandle?.id ?? null;
}

export async function getPublicationIds($, shopify) {
  const data = await shopifyRequest($, shopify, {
    query: `query { publications(first: 25) { nodes { id name } } }`,
  });
  const nodes = data.publications?.nodes ?? [];
  const wanted = nodes.filter((pub) => /online store|hydrogen|headless/i.test(pub.name));
  return (wanted.length ? wanted : nodes).map((pub) => pub.id);
}

export async function createFileFromUrl($, shopify, {url, alt}) {
  const data = await shopifyRequest($, shopify, {
    query: `mutation($files: [FileCreateInput!]!) {
      fileCreate(files: $files) {
        files { id }
        userErrors { field message }
      }
    }`,
    variables: {
      files: [{alt, contentType: 'IMAGE', originalSource: url}],
    },
  });
  const errors = data.fileCreate?.userErrors ?? [];
  if (errors.length) throw new Error(`fileCreate: ${JSON.stringify(errors)}`);
  const fileId = data.fileCreate?.files?.[0]?.id;
  if (!fileId) throw new Error('fileCreate returned no file id');
  return fileId;
}

export async function upsertMetaobject($, shopify, {type, handle, fields}) {
  const existingId = await getMetaobjectIdByHandle($, shopify, type, handle);

  if (existingId) {
    const data = await shopifyRequest($, shopify, {
      query: `mutation($id: ID!, $metaobject: MetaobjectUpdateInput!) {
        metaobjectUpdate(id: $id, metaobject: $metaobject) {
          metaobject { id handle }
          userErrors { field message }
        }
      }`,
      variables: {id: existingId, metaobject: {handle, fields}},
    });
    const errors = data.metaobjectUpdate?.userErrors ?? [];
    if (errors.length) throw new Error(`metaobjectUpdate: ${JSON.stringify(errors)}`);
    return data.metaobjectUpdate.metaobject;
  }

  const data = await shopifyRequest($, shopify, {
    query: `mutation($metaobject: MetaobjectCreateInput!) {
      metaobjectCreate(metaobject: $metaobject) {
        metaobject { id handle }
        userErrors { field message }
      }
    }`,
    variables: {metaobject: {type, handle, fields}},
  });
  const errors = data.metaobjectCreate?.userErrors ?? [];
  if (errors.length) throw new Error(`metaobjectCreate: ${JSON.stringify(errors)}`);
  return data.metaobjectCreate.metaobject;
}

export function buildProductInput({title, description, imageUrl, productId, catalog, vendor}) {
  const sizeNames = [...new Set(catalog.map((v) => v.sizeName))].sort((a, b) => {
    const rankA = catalog.find((v) => v.sizeName === a)?.rank ?? 999;
    const rankB = catalog.find((v) => v.sizeName === b)?.rank ?? 999;
    return rankA - rankB;
  });
  const frameNames = ['Black', 'White', 'No Frame'].filter((name) =>
    catalog.some((v) => v.frame === name),
  );
  const mountNames = ['Border', 'Full Bleed'].filter((name) =>
    catalog.some((v) => v.mount === name),
  );
  const mf = SHOPIFY.metafields;

  const input = {
    title,
    descriptionHtml: description ? `<p>${description}</p>` : undefined,
    vendor,
    productType: SHOPIFY.productType,
    status: 'ACTIVE',
    productOptions: [
      {name: 'Size', values: sizeNames.map((name) => ({name}))},
      {name: 'Frame', values: frameNames.map((name) => ({name}))},
      {name: 'Mount', values: mountNames.map((name) => ({name}))},
    ],
    files: [{originalSource: imageUrl, alt: title, contentType: 'IMAGE'}],
    variants: catalog.map((variant) => ({
      optionValues: [
        {optionName: 'Size', name: variant.sizeName},
        {optionName: 'Frame', name: variant.frame},
        {optionName: 'Mount', name: variant.mount},
      ],
      price: variant.price,
      inventoryPolicy: 'CONTINUE',
      metafields: [
        {namespace: mf.namespace, key: mf.shortInches, type: 'number_decimal', value: String(variant.shortSide)},
        {namespace: mf.namespace, key: mf.longInches, type: 'number_decimal', value: String(variant.longSide)},
        {namespace: mf.namespace, key: mf.paddingInches, type: 'number_decimal', value: String(variant.padding)},
        {namespace: mf.namespace, key: mf.frameWidthInches, type: 'number_decimal', value: String(variant.frameWidth)},
        {namespace: mf.namespace, key: mf.rank, type: 'number_integer', value: String(variant.rank)},
      ],
    })),
  };

  if (productId) input.id = productId;
  return input;
}

export async function upsertProduct($, shopify, input) {
  const data = await shopifyRequest($, shopify, {
    query: `mutation($input: ProductSetInput!, $sync: Boolean!) {
      productSet(synchronous: $sync, input: $input) {
        product { id handle variantsCount { count } }
        userErrors { field message }
      }
    }`,
    variables: {sync: true, input},
  });
  const errors = data.productSet?.userErrors ?? [];
  if (errors.length) throw new Error(`productSet: ${JSON.stringify(errors)}`);
  return data.productSet.product;
}

export async function publishProduct($, shopify, productId, publicationIds) {
  if (!publicationIds.length) return;
  const data = await shopifyRequest($, shopify, {
    query: `mutation($id: ID!, $input: [PublicationInput!]!) {
      publishablePublish(id: $id, input: $input) {
        userErrors { field message }
      }
    }`,
    variables: {
      id: productId,
      input: publicationIds.map((publicationId) => ({publicationId})),
    },
  });
  const errors = data.publishablePublish?.userErrors ?? [];
  if (errors.length) throw new Error(`publishablePublish: ${JSON.stringify(errors)}`);
}

// ─── Entity sync ──────────────────────────────────────────────────────────────

export async function syncArtist($, shopify, record, dryRun) {
  const f = AIRTABLE.artists;
  const fields = record.fields ?? {};
  const name = textValue(fields[f.name]);
  if (!name) return {recordId: record.id, status: 'skipped', reason: 'Missing name'};

  const handle = slugify(name);
  const bio = plainText(fields[f.description]);
  const location = textValue(fields[f.hometown]);

  if (dryRun) {
    return {recordId: record.id, status: 'pending', dryRun: true, handle, name};
  }

  const metaFields = [{key: 'name', value: name}];
  if (bio) metaFields.push({key: 'bio', value: bio});
  if (location) metaFields.push({key: 'location', value: location});

  const metaobject = await upsertMetaobject($, shopify, {
    type: 'artist',
    handle,
    fields: metaFields,
  });

  return {recordId: record.id, status: 'synced', handle, shopifyId: metaobject.id};
}

export async function syncCollection($, shopify, record, dryRun) {
  const f = AIRTABLE.collections;
  const fields = record.fields ?? {};
  const title = textValue(fields[f.name]);
  if (!title) return {recordId: record.id, status: 'skipped', reason: 'Missing name'};

  const handle = slugify(title);
  const description = plainText(fields[f.description]);

  if (dryRun) {
    return {recordId: record.id, status: 'pending', dryRun: true, handle, title};
  }

  const metaFields = [{key: 'title', value: title}];
  if (description) metaFields.push({key: 'description', value: description});

  const metaobject = await upsertMetaobject($, shopify, {
    type: 'collection',
    handle,
    fields: metaFields,
  });

  return {recordId: record.id, status: 'synced', handle, shopifyId: metaobject.id};
}

export async function syncPrint($, {
  shopify,
  record,
  catalog,
  artistMap,
  collectionMap,
  artistNameByRecordId,
  publicationIds,
  dryRun,
}) {
  const f = AIRTABLE.prints;
  const fields = record.fields ?? {};
  const title = textValue(fields[f.name]);
  const handle = slugify(title);
  const description = plainText(fields[f.description]);
  const imageUrl = attachmentUrl(fields[f.image]);

  if (!title) return {recordId: record.id, status: 'skipped', reason: 'Missing name'};
  if (!imageUrl) return {recordId: record.id, status: 'skipped', reason: 'Missing picture'};

  const artistRecordId = linkedRecordIds(fields[f.artist])[0];
  if (!artistRecordId || !artistMap.has(artistRecordId)) {
    return {recordId: record.id, status: 'skipped', reason: 'Missing or unsynced artist'};
  }

  const collectionShopifyIds = linkedRecordIds(fields[f.collection])
    .map((id) => collectionMap.get(id))
    .filter((id) => id && !String(id).startsWith('dry-run:'));

  if (dryRun) {
    return {
      recordId: record.id,
      status: 'pending',
      dryRun: true,
      handle,
      title,
      variantCount: catalog.length,
      collectionCount: collectionShopifyIds.length,
    };
  }

  const artistShopifyId = artistMap.get(artistRecordId);
  const vendor = artistNameByRecordId.get(artistRecordId) ?? 'The Long Look';
  const productId = await getProductIdByHandle($, shopify, handle);

  const product = await upsertProduct(
    $,
    shopify,
    buildProductInput({title, description, imageUrl, productId, catalog, vendor}),
  );
  await publishProduct($, shopify, product.id, publicationIds);

  const imageFileId = await createFileFromUrl($, shopify, {url: imageUrl, alt: title});
  const pictureFields = [
    {key: 'title', value: title},
    {key: 'image', value: imageFileId},
    {key: 'artist', value: artistShopifyId},
    {key: 'product', value: product.id},
  ];
  if (description) pictureFields.push({key: 'description', value: description});
  if (collectionShopifyIds.length) {
    pictureFields.push({
      key: 'collections',
      value: JSON.stringify(collectionShopifyIds),
    });
  }

  const picture = await upsertMetaobject($, shopify, {
    type: 'picture',
    handle,
    fields: pictureFields,
  });

  return {
    recordId: record.id,
    status: 'synced',
    handle,
    pictureId: picture.id,
    productId: product.id,
    variantCount: product.variantsCount?.count ?? catalog.length,
    collectionCount: collectionShopifyIds.length,
  };
}
