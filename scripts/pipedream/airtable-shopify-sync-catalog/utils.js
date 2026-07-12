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

  // Always fetch the latest row — trigger payloads can be stale after renames.
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
  const raw = component.shopify_developer_app;
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

export async function listCommittedPrints($, airtable) {
  const records = [];
  let offset;

  do {
    const params = new URLSearchParams();
    params.set('view', AIRTABLE.printsViewId);
    if (offset) params.set('offset', offset);

    const response = await airtableRequest($, airtable, {
      path: `/${AIRTABLE.baseId}/${tablePath('prints')}?${params}`,
    });

    records.push(...(response.records ?? []).map(normalizePrintRecord));
    offset = response.offset;
  } while (offset);

  return records;
}

/** Every print row in Airtable (any status) — used to detect deleted records. */
export async function listAllPrintRecords($, airtable) {
  const records = [];
  let offset;

  do {
    const params = new URLSearchParams();
    if (offset) params.set('offset', offset);

    const response = await airtableRequest($, airtable, {
      path: `/${AIRTABLE.baseId}/${tablePath('prints')}?${params}`,
    });

    records.push(...(response.records ?? []).map(normalizePrintRecord));
    offset = response.offset;
  } while (offset);

  return records;
}

export function printHandle(record) {
  return slugify(textValue(record?.fields?.[AIRTABLE.prints.name]));
}

export async function listFineArtPrintProducts($, shopify) {
  const products = [];
  let cursor = null;

  do {
    const data = await shopifyRequest($, shopify, {
      query: `query($cursor: String, $query: String!) {
        products(first: 100, after: $cursor, query: $query) {
          nodes {
            id
            handle
            airtableId: metafield(namespace: "${SHOPIFY.airtableMetafield.namespace}", key: "${SHOPIFY.airtableMetafield.key}") {
              value
            }
          }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      variables: {
        cursor,
        query: `product_type:'${SHOPIFY.productType}'`,
      },
    });

    products.push(
      ...(data.products?.nodes ?? []).map((node) => ({
        id: node.id,
        handle: node.handle,
        airtableRecordId: node.airtableId?.value ?? null,
      })),
    );
    const pageInfo = data.products?.pageInfo;
    cursor = pageInfo?.hasNextPage ? pageInfo.endCursor : null;
  } while (cursor);

  return products;
}

const METAOBJECT_DISPLAY_FIELD = {
  artist: 'name',
  collection: 'title',
};

/** Stable Shopify handle derived from an Airtable record id (fallback when airtable_record_id field is unavailable). */
export function airtableStableHandle(recordId) {
  return String(recordId ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function metaobjectDisplayFieldKey(type) {
  return METAOBJECT_DISPLAY_FIELD[type] ?? 'name';
}

export async function listMetaobjectsByType($, shopify, type) {
  const metaobjects = [];
  let cursor = null;
  const fieldKey = SHOPIFY.airtableRecordIdField;
  const displayFieldKey = metaobjectDisplayFieldKey(type);

  do {
    const data = await shopifyRequest($, shopify, {
      query: `query($cursor: String, $type: String!) {
        metaobjects(first: 100, after: $cursor, type: $type) {
          nodes {
            id
            handle
            airtableId: field(key: "${fieldKey}") { value }
            display: field(key: "${displayFieldKey}") { value }
          }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      variables: {cursor, type},
    });

    metaobjects.push(
      ...(data.metaobjects?.nodes ?? []).map((node) => ({
        id: node.id,
        handle: node.handle,
        airtableRecordId: node.airtableId?.value ?? null,
        displayValue: node.display?.value ?? null,
      })),
    );
    const pageInfo = data.metaobjects?.pageInfo;
    cursor = pageInfo?.hasNextPage ? pageInfo.endCursor : null;
  } while (cursor);

  return metaobjects;
}

async function findMetaobjectIdByDisplayName($, shopify, type, displayName) {
  const normalized = textValue(displayName).toLowerCase();
  if (!normalized) return null;

  const metaobjects = await listMetaobjectsByType($, shopify, type);
  const match = metaobjects.find(
    (entry) => textValue(entry.displayValue).toLowerCase() === normalized,
  );
  return match?.id ?? null;
}

/**
 * Resolve an artist/collection metaobject for sync — Airtable record id first, then legacy handle/name.
 * @returns {{ id: string | null, useStableHandle: boolean }}
 */
export async function resolveMetaobjectForSync(
  $,
  shopify,
  type,
  {recordId, displayName},
) {
  const stableHandle = airtableStableHandle(recordId);
  const displayHandle = slugify(displayName);

  if (recordId) {
    const byAirtableId = await getMetaobjectIdByAirtableId($, shopify, type, recordId);
    if (byAirtableId) {
      return {id: byAirtableId, useStableHandle: false};
    }
  }

  const byStableHandle = await getMetaobjectIdByHandle($, shopify, type, stableHandle);
  if (byStableHandle) {
    return {id: byStableHandle, useStableHandle: true};
  }

  const byDisplayHandle = await getMetaobjectIdByHandle($, shopify, type, displayHandle);
  if (byDisplayHandle) {
    return {id: byDisplayHandle, useStableHandle: true};
  }

  const byDisplayName = await findMetaobjectIdByDisplayName($, shopify, type, displayName);
  if (byDisplayName) {
    return {id: byDisplayName, useStableHandle: true};
  }

  return {id: null, useStableHandle: true};
}

export async function listPictureMetaobjects($, shopify) {
  return listMetaobjectsByType($, shopify, SHOPIFY.metaobjectTypes.picture);
}

function isPrintInAirtable({airtableRecordId, handle}, validRecordIds, validHandles) {
  if (airtableRecordId && validRecordIds.has(airtableRecordId)) return true;
  if (handle && validHandles.has(handle)) return true;
  return false;
}

export async function deleteProduct($, shopify, productId) {
  const data = await shopifyRequest($, shopify, {
    query: `mutation($id: ID!) {
      productDelete(input: {id: $id}) {
        deletedProductId
        userErrors { field message }
      }
    }`,
    variables: {id: productId},
  });
  const errors = data.productDelete?.userErrors ?? [];
  if (errors.length) throw new Error(`productDelete: ${JSON.stringify(errors)}`);
  return data.productDelete?.deletedProductId ?? null;
}

export async function deleteMetaobject($, shopify, metaobjectId) {
  const data = await shopifyRequest($, shopify, {
    query: `mutation($id: ID!) {
      metaobjectDelete(id: $id) {
        deletedId
        userErrors { field message }
      }
    }`,
    variables: {id: metaobjectId},
  });
  const errors = data.metaobjectDelete?.userErrors ?? [];
  if (errors.length) throw new Error(`metaobjectDelete: ${JSON.stringify(errors)}`);
  return data.metaobjectDelete?.deletedId ?? null;
}

export async function removePrintByAirtableId($, shopify, recordId, handle, dryRun) {
  if (!recordId && !handle) {
    return {status: 'skipped', reason: 'Missing Airtable record ID'};
  }

  const productId = await resolveProductId($, shopify, {recordId, handle});
  const pictureId = await resolveMetaobjectId($, shopify, 'picture', {recordId, handle});

  if (!productId && !pictureId) {
    return {status: 'not_found', recordId, handle};
  }

  if (dryRun) {
    return {status: 'pending', dryRun: true, recordId, handle, productId, pictureId};
  }

  if (productId) await deleteProduct($, shopify, productId);
  if (pictureId) await deleteMetaobject($, shopify, pictureId);

  return {status: 'removed', recordId, handle, productId, pictureId};
}

/** @deprecated use removePrintByAirtableId */
export async function removePrintByHandle($, shopify, handle, dryRun) {
  return removePrintByAirtableId($, shopify, null, handle, dryRun);
}

/** Remove Fine Art Print products (and legacy picture metaobjects) not in Airtable. */
export async function pruneOrphanedPrints($, airtable, shopify, dryRun) {
  const airtablePrints = await listAllPrintRecords($, airtable);
  const validRecordIds = new Set(airtablePrints.map((record) => record.id));
  const validHandles = new Set(airtablePrints.map((record) => printHandle(record)));

  const shopifyProducts = await listFineArtPrintProducts($, shopify);
  const productOrphans = shopifyProducts.filter(
    (product) => !isPrintInAirtable(product, validRecordIds, validHandles),
  );

  const legacyPictures = await listPictureMetaobjects($, shopify);

  const orphanTargets = productOrphans.map((product) => ({
    airtableRecordId: product.airtableRecordId,
    handle: product.handle,
    productId: product.id,
  }));

  if (!orphanTargets.length && !legacyPictures.length) {
    return {
      removed: [],
      wouldRemove: [],
      legacyPicturesRemoved: 0,
      count: 0,
      shopifyTotal: shopifyProducts.length,
    };
  }

  if (dryRun) {
    return {
      dryRun: true,
      wouldRemove: orphanTargets,
      legacyPicturesWouldRemove: legacyPictures.map((picture) => ({
        handle: picture.handle,
        pictureId: picture.id,
      })),
      count: orphanTargets.length + legacyPictures.length,
      shopifyTotal: shopifyProducts.length,
    };
  }

  const removed = [];
  for (const orphan of orphanTargets) {
    const result = await removePrintByAirtableId(
      $,
      shopify,
      orphan.airtableRecordId,
      orphan.handle,
      dryRun,
    );
    removed.push({...orphan, ...result});
  }

  let legacyPicturesRemoved = 0;
  for (const picture of legacyPictures) {
    await deleteMetaobject($, shopify, picture.id);
    legacyPicturesRemoved += 1;
  }

  return {
    removed,
    legacyPicturesRemoved,
    count: removed.length + legacyPicturesRemoved,
    shopifyTotal: shopifyProducts.length,
  };
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

export function withAirtableRecordId(fields, recordId) {
  const fieldKey = SHOPIFY.airtableRecordIdField;
  const without = fields.filter((field) => field.key !== fieldKey);
  return [...without, {key: fieldKey, value: recordId}];
}

export function productAirtableMetafield(recordId) {
  const mf = SHOPIFY.airtableMetafield;
  return {
    namespace: mf.namespace,
    key: mf.key,
    type: 'single_line_text_field',
    value: recordId,
  };
}

async function findMetaobjectIdByAirtableRecordId($, shopify, type, recordId) {
  const metaobjects = await listMetaobjectsByType($, shopify, type);
  return metaobjects.find((entry) => entry.airtableRecordId === recordId)?.id ?? null;
}

export async function getMetaobjectIdByAirtableId($, shopify, type, recordId) {
  if (!recordId) return null;

  const fieldKey = SHOPIFY.airtableRecordIdField;
  const data = await shopifyRequest($, shopify, {
    query: `query($type: String!, $query: String!) {
      metaobjects(first: 1, type: $type, query: $query) {
        nodes { id handle }
      }
    }`,
    variables: {
      type,
      query: `fields.${fieldKey}:${recordId}`,
    },
  });
  const fromSearch = data.metaobjects?.nodes?.[0]?.id ?? null;
  if (fromSearch) return fromSearch;

  return findMetaobjectIdByAirtableRecordId($, shopify, type, recordId);
}

export async function resolveMetaobjectId($, shopify, type, {recordId, handle}) {
  if (recordId) {
    const byId = await getMetaobjectIdByAirtableId($, shopify, type, recordId);
    if (byId) return byId;

    const byStableHandle = await getMetaobjectIdByHandle(
      $,
      shopify,
      type,
      airtableStableHandle(recordId),
    );
    if (byStableHandle) return byStableHandle;
  }
  if (handle) {
    return getMetaobjectIdByHandle($, shopify, type, handle);
  }
  return null;
}

export async function resolveProductId($, shopify, {recordId, handle}) {
  if (recordId) {
    const byId = await getProductIdByAirtableId($, shopify, recordId);
    if (byId) return byId;
  }
  if (handle) {
    return getProductIdByHandle($, shopify, handle);
  }
  return null;
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

async function findProductIdByAirtableRecordId($, shopify, recordId) {
  const products = await listFineArtPrintProducts($, shopify);
  return products.find((product) => product.airtableRecordId === recordId)?.id ?? null;
}

export async function getProductIdByAirtableId($, shopify, recordId) {
  if (!recordId) return null;

  const mf = SHOPIFY.airtableMetafield;
  const data = await shopifyRequest($, shopify, {
    query: `query($query: String!) {
      products(first: 1, query: $query) {
        nodes { id handle }
      }
    }`,
    variables: {
      query: `metafields.${mf.namespace}.${mf.key}:${recordId}`,
    },
  });
  const fromSearch = data.products?.nodes?.[0]?.id ?? null;
  if (fromSearch) return fromSearch;

  return findProductIdByAirtableRecordId($, shopify, recordId);
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
  // Hydrogen/headless channels often use the store name (e.g. "The Long Look"), not
  // "Hydrogen" in the publication name — publish everywhere except POS.
  const wanted = nodes.filter((pub) => !/point of sale/i.test(pub.name));
  return wanted.map((pub) => pub.id);
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

function isMissingAirtableFieldError(errors) {
  const text = JSON.stringify(errors ?? []);
  return /airtable_record_id.*does not exist/i.test(text)
    || /record_id.*does not exist/i.test(text);
}

function stripAirtableRecordId(fields) {
  const fieldKey = SHOPIFY.airtableRecordIdField;
  return fields.filter((field) => field.key !== fieldKey);
}

const metaobjectAirtableFieldSupported = new Map();

async function upsertMetaobject(
  $,
  shopify,
  {type, handle, stableHandle, fields, airtableRecordId, existingId},
) {
  const resolvedId =
    existingId ??
    (await resolveMetaobjectId($, shopify, type, {
      recordId: airtableRecordId,
      handle,
    }));
  const fallbackHandle = stableHandle ?? handle;
  const mutationHandle =
    metaobjectAirtableFieldSupported.get(type) === false ? fallbackHandle : handle;

  const runMutation = async (mutationHandleValue, mutationFields) => {
    if (resolvedId) {
      const data = await shopifyRequest($, shopify, {
        query: `mutation($id: ID!, $metaobject: MetaobjectUpdateInput!) {
          metaobjectUpdate(id: $id, metaobject: $metaobject) {
            metaobject { id handle }
            userErrors { field message }
          }
        }`,
        variables: {
          id: resolvedId,
          metaobject: {handle: mutationHandleValue, fields: mutationFields},
        },
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
      variables: {metaobject: {type, handle: mutationHandleValue, fields: mutationFields}},
    });
    const errors = data.metaobjectCreate?.userErrors ?? [];
    if (errors.length) throw new Error(`metaobjectCreate: ${JSON.stringify(errors)}`);
    return data.metaobjectCreate.metaobject;
  };

  const payloadFields = airtableRecordId
    ? withAirtableRecordId(fields, airtableRecordId)
    : fields;

  try {
    const metaobject = await runMutation(mutationHandle, payloadFields);
    if (airtableRecordId) metaobjectAirtableFieldSupported.set(type, true);
    return metaobject;
  } catch (error) {
    const message = String(error.message);
    if (!airtableRecordId || !isMissingAirtableFieldError(message)) throw error;

    metaobjectAirtableFieldSupported.set(type, false);
    return runMutation(fallbackHandle, stripAirtableRecordId(fields));
  }
}

export function buildProductInput({
  title,
  description,
  imageUrl,
  productId,
  catalog,
  vendor,
  handle,
  airtableRecordId,
  artistRecordId,
  collectionRecordIds = [],
  collectionHandles = [],
}) {
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
  const productMetafields = [];
  if (airtableRecordId) {
    productMetafields.push(productAirtableMetafield(airtableRecordId));
  }
  if (artistRecordId) {
    productMetafields.push({
      namespace: mf.namespace,
      key: mf.artistRecordId,
      type: 'single_line_text_field',
      value: artistRecordId,
    });
  }
  productMetafields.push({
    namespace: mf.namespace,
    key: mf.collectionRecordIds,
    type: 'json',
    value: JSON.stringify(collectionRecordIds),
  });
  productMetafields.push({
    namespace: mf.namespace,
    key: mf.collectionHandles,
    type: 'json',
    value: JSON.stringify(collectionHandles),
  });

  const input = {
    title,
    handle,
    descriptionHtml: description ? `<p>${description}</p>` : undefined,
    vendor,
    productType: SHOPIFY.productType,
    status: 'ACTIVE',
    metafields: productMetafields.length ? productMetafields : undefined,
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

/** Apply scalar product fields (title, handle, description, vendor) on an existing row. */
async function updateProductScalars(
  $,
  shopify,
  {productId, title, handle, descriptionHtml, vendor},
) {
  const data = await shopifyRequest($, shopify, {
    query: `mutation($product: ProductUpdateInput!) {
      productUpdate(product: $product) {
        product { id handle title }
        userErrors { field message }
      }
    }`,
    variables: {
      product: {
        id: productId,
        title,
        handle,
        descriptionHtml,
        vendor,
      },
    },
  });
  const errors = data.productUpdate?.userErrors ?? [];
  if (errors.length) throw new Error(`productUpdate: ${JSON.stringify(errors)}`);
  return data.productUpdate.product;
}

/** Force link metafields on an existing product (artist/collection membership). */
async function updateProductLinkMetafields(
  $,
  shopify,
  {productId, artistRecordId, collectionRecordIds = [], collectionHandles = []},
) {
  const mf = SHOPIFY.metafields;
  const metafields = [
    {
      namespace: mf.namespace,
      key: mf.collectionRecordIds,
      type: 'json',
      value: JSON.stringify(collectionRecordIds),
    },
    {
      namespace: mf.namespace,
      key: mf.collectionHandles,
      type: 'json',
      value: JSON.stringify(collectionHandles),
    },
  ];

  if (artistRecordId) {
    metafields.unshift({
      namespace: mf.namespace,
      key: mf.artistRecordId,
      type: 'single_line_text_field',
      value: artistRecordId,
    });
  }

  const data = await shopifyRequest($, shopify, {
    query: `mutation($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id key namespace }
        userErrors { field message }
      }
    }`,
    variables: {
      metafields: metafields.map((field) => ({
        ownerId: productId,
        ...field,
      })),
    },
  });
  const errors = data.metafieldsSet?.userErrors ?? [];
  if (errors.length) throw new Error(`metafieldsSet: ${JSON.stringify(errors)}`);
}

export async function upsertProduct($, shopify, input) {
  const productId = input.id ?? null;
  const run = async (productInput) => {
    const data = await shopifyRequest($, shopify, {
      query: `mutation($input: ProductSetInput!, $sync: Boolean!) {
        productSet(synchronous: $sync, input: $input) {
          product { id handle title variantsCount { count } }
          userErrors { field message }
        }
      }`,
      variables: {sync: true, input: productInput},
    });
    const errors = data.productSet?.userErrors ?? [];
    if (errors.length) throw new Error(`productSet: ${JSON.stringify(errors)}`);
    return data.productSet.product;
  };

  try {
    const product = await run(input);
    if (productId) {
      await updateProductScalars($, shopify, {
        productId: product.id,
        title: input.title,
        handle: input.handle,
        descriptionHtml: input.descriptionHtml,
        vendor: input.vendor,
      });
    }
    return product;
  } catch (error) {
    const message = String(error.message);
    if (!input.metafields?.length || !isMissingAirtableFieldError(message)) throw error;
    const {metafields, ...rest} = input;
    const product = await run(rest);
    if (productId) {
      await updateProductScalars($, shopify, {
        productId: product.id,
        title: rest.title,
        handle: rest.handle,
        descriptionHtml: rest.descriptionHtml,
        vendor: rest.vendor,
      });
    }
    return product;
  }
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

  const displayHandle = slugify(name);
  const stableHandle = airtableStableHandle(record.id);
  const bio = plainText(fields[f.description]);
  const location = textValue(fields[f.hometown]);

  if (dryRun) {
    return {
      recordId: record.id,
      status: 'pending',
      dryRun: true,
      handle: displayHandle,
      stableHandle,
      name,
    };
  }

  const metaFields = [{key: 'name', value: name}];
  if (bio) metaFields.push({key: 'bio', value: bio});
  if (location) metaFields.push({key: 'location', value: location});

  const resolved = await resolveMetaobjectForSync($, shopify, 'artist', {
    recordId: record.id,
    displayName: name,
  });
  const metaobject = await upsertMetaobject($, shopify, {
    type: 'artist',
    handle: displayHandle,
    stableHandle,
    airtableRecordId: record.id,
    fields: metaFields,
    existingId: resolved.id,
  });

  return {
    recordId: record.id,
    status: 'synced',
    mode: resolved.id ? 'updated' : 'created',
    handle: metaobject.handle,
    name,
    shopifyId: metaobject.id,
  };
}

export async function syncCollection($, shopify, record, dryRun) {
  const f = AIRTABLE.collections;
  const fields = record.fields ?? {};
  const title = textValue(fields[f.name]);
  if (!title) return {recordId: record.id, status: 'skipped', reason: 'Missing name'};

  const displayHandle = slugify(title);
  const stableHandle = airtableStableHandle(record.id);
  const description = plainText(fields[f.description]);

  if (dryRun) {
    return {
      recordId: record.id,
      status: 'pending',
      dryRun: true,
      handle: displayHandle,
      stableHandle,
      title,
    };
  }

  const metaFields = [{key: 'title', value: title}];
  if (description) metaFields.push({key: 'description', value: description});

  const resolved = await resolveMetaobjectForSync($, shopify, 'collection', {
    recordId: record.id,
    displayName: title,
  });
  const metaobject = await upsertMetaobject($, shopify, {
    type: 'collection',
    handle: displayHandle,
    stableHandle,
    airtableRecordId: record.id,
    fields: metaFields,
    existingId: resolved.id,
  });

  return {
    recordId: record.id,
    status: 'synced',
    mode: resolved.id ? 'updated' : 'created',
    handle: metaobject.handle,
    title,
    shopifyId: metaobject.id,
  };
}

function isCommittedLinkedRecord(record, statusField) {
  return textValue(record?.fields?.[statusField]) === AIRTABLE.linkedCommittedStatus;
}

export async function listCommittedArtists($, airtable) {
  const records = await listTableRecords($, airtable, 'artists');
  return records.filter((record) =>
    isCommittedLinkedRecord(record, AIRTABLE.artists.status),
  );
}

export async function listCommittedCollections($, airtable) {
  const records = await listTableRecords($, airtable, 'collections');
  return records.filter((record) =>
    isCommittedLinkedRecord(record, AIRTABLE.collections.status),
  );
}

/** Sync artists and collections already marked Commited in Airtable (handles renames without a print re-commit). */
export async function syncCommittedArtistsAndCollections($, airtable, shopify, dryRun) {
  const artists = await listCommittedArtists($, airtable);
  const collections = await listCommittedCollections($, airtable);

  const artistResults = [];
  for (const record of artists) {
    artistResults.push(await syncArtist($, shopify, record, dryRun));
  }

  const collectionResults = [];
  for (const record of collections) {
    collectionResults.push(await syncCollection($, shopify, record, dryRun));
  }

  return {
    artists: artistResults,
    collections: collectionResults,
    artistCount: artistResults.length,
    collectionCount: collectionResults.length,
  };
}

export async function syncPrint($, {
  shopify,
  record,
  catalog,
  artistNameByRecordId,
  collectionHandleByRecordId = new Map(),
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
  if (!artistRecordId || !artistNameByRecordId.has(artistRecordId)) {
    return {recordId: record.id, status: 'skipped', reason: 'Missing or unsynced artist'};
  }

  const collectionRecordIds = linkedRecordIds(fields[f.collection]);
  const collectionHandles = collectionRecordIds
    .map((id) => collectionHandleByRecordId.get(id))
    .filter(Boolean);

  if (dryRun) {
    return {
      recordId: record.id,
      status: 'pending',
      dryRun: true,
      handle,
      title,
      artistRecordId,
      collectionRecordIds,
      variantCount: catalog.length,
      collectionCount: collectionRecordIds.length,
    };
  }

  const vendor = artistNameByRecordId.get(artistRecordId) ?? 'The Long Look';
  const productId = await resolveProductId($, shopify, {
    recordId: record.id,
    handle,
  });
  const productInput = buildProductInput({
    title,
    description,
    imageUrl,
    productId,
    catalog,
    vendor,
    handle,
    airtableRecordId: record.id,
    artistRecordId,
    collectionRecordIds,
    collectionHandles,
  });

  const product = await upsertProduct($, shopify, productInput);
  await updateProductLinkMetafields($, shopify, {
    productId: product.id,
    artistRecordId,
    collectionRecordIds,
    collectionHandles,
  });
  await publishProduct($, shopify, product.id, publicationIds);

  return {
    recordId: record.id,
    status: 'synced',
    mode: productId ? 'updated' : 'created',
    handle,
    title,
    artistRecordId,
    collectionRecordIds,
    productId: product.id,
    variantCount: product.variantsCount?.count ?? catalog.length,
    collectionCount: collectionRecordIds.length,
  };
}
