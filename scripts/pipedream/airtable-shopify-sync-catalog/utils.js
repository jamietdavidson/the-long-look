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

const TABLE_REF = {
  prints: {id: AIRTABLE.printsTableId, name: AIRTABLE.printsTable},
  variants: {id: AIRTABLE.variantsTableId, name: AIRTABLE.variantsTable},
  artists: {id: AIRTABLE.artistsTableId, name: AIRTABLE.artistsTable},
  collections: {id: AIRTABLE.collectionsTableId, name: AIRTABLE.collectionsTable},
};

const PRINT_FIELD_IDS = {
  [AIRTABLE.prints.name]: 'fldodweSrQJrDeTof',
  [AIRTABLE.prints.description]: 'fldLpQ5eALLzTiGh0',
  [AIRTABLE.prints.image]: 'fldyM2cKNOWimkTHy',
  [AIRTABLE.prints.orientation]: 'fldwzuXg1F2f5ZGdZ',
  [AIRTABLE.prints.artist]: 'fld27VD19QKXTMdJr',
  [AIRTABLE.prints.collection]: 'fldx68uBGY28whBD9',
  [AIRTABLE.prints.status]: 'fldhLQ5qh9X9aIklx',
};

export function tableRef(tableKey) {
  return TABLE_REF[tableKey] ?? {id: null, name: tableKey};
}

function tablePath(tableKey) {
  const ref = tableRef(tableKey);
  return ref.id ?? ref.name;
}

export function normalizeNamedFields(fields, fieldIdsByName) {
  if (!fields || typeof fields !== 'object') return {};
  const hasNamedKeys = Object.keys(fieldIdsByName).some((name) => name in fields);
  if (hasNamedKeys) return fields;

  const normalized = {};
  for (const [name, fieldId] of Object.entries(fieldIdsByName)) {
    if (fieldId in fields) normalized[name] = fields[fieldId];
  }
  return Object.keys(normalized).length ? normalized : fields;
}

export function normalizePrintRecord(record) {
  if (!record?.id) return record;
  return {
    ...record,
    fields: normalizeNamedFields(record.fields, PRINT_FIELD_IDS),
  };
}

export function extractPrintRecordId(steps, explicitId) {
  if (explicitId) return explicitId;

  const candidates = [
    steps?.trigger?.event,
    steps?.trigger?.context?.event,
    steps?.trigger,
    steps?.trigger?.event?.record,
  ].filter(Boolean);

  for (const event of candidates) {
    if (typeof event === 'string' && event.startsWith('rec')) return event;
    if (event?.id?.startsWith?.('rec')) return event.id;
    if (event?.recordId?.startsWith?.('rec')) return event.recordId;
  }

  return null;
}

export async function resolvePrintRecord($, airtable, steps, explicitId) {
  const recordId = extractPrintRecordId(steps, explicitId);
  if (!recordId) {
    throw new Error(
      'No print record ID found. Use an Airtable "New or Modified Records in View" trigger on Prints → Committed, or set Print Record ID for manual tests.',
    );
  }

  const candidates = [
    steps?.trigger?.event,
    steps?.trigger?.context?.event,
    steps?.trigger?.event?.record,
  ].filter(Boolean);

  for (const event of candidates) {
    const record = event?.record ?? event;
    if (record?.id === recordId && record?.fields && Object.keys(record.fields).length) {
      return normalizePrintRecord(record);
    }
  }

  const fetched = await getTableRecord($, airtable, 'prints', recordId);
  return normalizePrintRecord(fetched);
}

/** @deprecated use resolvePrintRecord */
export function getTriggerPrintRecord(steps) {
  const recordId = extractPrintRecordId(steps);
  const candidates = [
    steps?.trigger?.event,
    steps?.trigger?.context?.event,
    steps?.trigger?.event?.record,
  ].filter(Boolean);

  for (const event of candidates) {
    const record = normalizePrintRecord(event?.record ?? event);
    if (record?.id && record?.fields && Object.keys(record.fields).length) {
      return record;
    }
  }

  throw new Error(
    `No print fields on trigger event${recordId ? ` for ${recordId}` : ''}. The sync will fetch the record by ID when run in a workflow.`,
  );
}

export function getShopifyConnection(component) {
  const raw = component.shopify_developer_app ?? component.shopify;
  const auth = raw?.$auth;
  if (!auth) {
    throw new Error(
      'Connect Shopify on this step (Shopify Key Required or shopify_developer_app).',
    );
  }

  const shopId = String(auth.shop_id ?? auth.shopId ?? 'thelonglookco').replace(
    /\.myshopify\.com$/,
    '',
  );
  const accessToken = auth.access_token ?? auth.api_key;
  if (!accessToken) {
    throw new Error('Shopify access token missing — reconnect the Shopify account on this step.');
  }

  return {$auth: {shop_id: shopId, access_token: accessToken}};
}

export async function airtableRequest($, airtable, {method = 'get', path, data}) {
  const token = airtable?.$auth?.oauth_access_token;
  if (!token) {
    throw new Error(
      'Airtable OAuth token missing — connect airtable_oauth on this action step (not just the trigger).',
    );
  }

  try {
    return await axios($, {
      method,
      url: `https://api.airtable.com/v0${path}`,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data,
    });
  } catch (error) {
    const status = error?.response?.status;
    const body = error?.response?.data;
    if (status === 403) {
      throw new Error(
        `Airtable denied access to ${path}. Reconnect airtable_oauth on this step with access to base ${AIRTABLE.baseId}, or verify table/record IDs. ${JSON.stringify(body ?? {})}`,
      );
    }
    throw error;
  }
}

export async function listTableRecords($, airtable, tableKey, {sortField} = {}) {
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
      path: `/${AIRTABLE.baseId}/${tablePath(tableKey)}${query}`,
    });

    records.push(...(response.records ?? []));
    offset = response.offset;
  } while (offset);

  return records;
}

export async function getTableRecord($, airtable, tableKey, recordId) {
  return airtableRequest($, airtable, {
    path: `/${AIRTABLE.baseId}/${tablePath(tableKey)}/${recordId}`,
  });
}

export async function updateTableRecord($, airtable, tableKey, recordId, fields) {
  return airtableRequest($, airtable, {
    method: 'patch',
    path: `/${AIRTABLE.baseId}/${tablePath(tableKey)}/${recordId}`,
    data: {fields},
  });
}

export async function markRecordCommitted($, airtable, {
  tableKey,
  tableName,
  statusField,
  recordId,
  currentStatus,
  committedStatus,
  dryRun,
}) {
  const resolvedTableKey =
    tableKey ??
    (tableName === AIRTABLE.artistsTable
      ? 'artists'
      : tableName === AIRTABLE.collectionsTable
        ? 'collections'
        : tableName);

  if (textValue(currentStatus) === committedStatus) {
    return {recordId, status: 'already_committed'};
  }

  if (dryRun) {
    return {recordId, status: 'pending', dryRun: true};
  }

  await updateTableRecord($, airtable, resolvedTableKey, recordId, {
    [statusField]: committedStatus,
  });
  return {recordId, status: 'committed'};
}

export async function fetchVariantCatalog($, airtable) {
  const records = await listTableRecords($, airtable, 'variants', {
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
