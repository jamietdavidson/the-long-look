/**
 * Native Shopify collections for Admin / merchandising.
 * Storefront collection pages use collection metaobjects only.
 */
import {SHOPIFY} from './config.js';
import {productAirtableMetafield, shopifyRequest} from './utils.js';

const ALL_PRINTS_HANDLE =
  process.env.SHOPIFY_ALL_PRINTS_COLLECTION_HANDLE || 'fine-art-prints';
const ALL_PRINTS_TITLE =
  process.env.SHOPIFY_ALL_PRINTS_COLLECTION_TITLE || 'Fine Art Prints';

function throwUserErrors(operation, errors) {
  if (!errors?.length) return;
  throw new Error(`${operation}: ${errors.map((error) => error.message).join('; ')}`);
}

async function findCollectionByHandle($, shopify, handle) {
  const data = await shopifyRequest($, shopify, {
    query: `query CollectionByHandle($handle: String!) {
      collectionByHandle(handle: $handle) {
        id
        handle
        title
      }
    }`,
    variables: {handle},
  });
  return data.collectionByHandle ?? null;
}

async function findCollectionByAirtableRecordId($, shopify, recordId) {
  if (!recordId) return null;

  const {namespace, key} = SHOPIFY.airtableMetafield;
  const data = await shopifyRequest($, shopify, {
    query: `query CollectionsByAirtableId($query: String!) {
      collections(first: 5, query: $query) {
        nodes {
          id
          handle
          title
        }
      }
    }`,
    variables: {
      query: `metafields.${namespace}.${key}:${recordId}`,
    },
  });
  return data.collections?.nodes?.[0] ?? null;
}

/** Smart collection: all products with product type Fine Art Print. */
export async function ensureAllPrintsSmartCollection($, shopify) {
  const existing = await findCollectionByHandle($, shopify, ALL_PRINTS_HANDLE);
  if (existing) return existing;

  const data = await shopifyRequest($, shopify, {
    query: `mutation CreateAllPrintsCollection($input: CollectionInput!) {
      collectionCreate(input: $input) {
        collection { id handle title }
        userErrors { field message }
      }
    }`,
    variables: {
      input: {
        title: ALL_PRINTS_TITLE,
        handle: ALL_PRINTS_HANDLE,
        ruleSet: {
          appliedDisjunctively: false,
          rules: [
            {
              column: 'TYPE',
              relation: 'EQUALS',
              condition: SHOPIFY.productType,
            },
          ],
        },
      },
    },
  });
  throwUserErrors('collectionCreate', data.collectionCreate?.userErrors);
  return data.collectionCreate.collection;
}

/** Manual native collection mirroring an Airtable-driven collection metaobject. */
export async function ensureNativeEditorialCollection($, shopify, {
  title,
  handle,
  description = '',
  airtableRecordId,
}) {
  const existing =
    (await findCollectionByAirtableRecordId($, shopify, airtableRecordId)) ??
    (await findCollectionByHandle($, shopify, handle));

  if (existing) {
    const data = await shopifyRequest($, shopify, {
      query: `mutation UpdateNativeCollection($input: CollectionInput!) {
        collectionUpdate(input: $input) {
          collection { id handle title }
          userErrors { field message }
        }
      }`,
      variables: {
        input: {
          id: existing.id,
          title,
          handle,
          descriptionHtml: description || '',
        },
      },
    });
    throwUserErrors('collectionUpdate', data.collectionUpdate?.userErrors);

    const metafieldData = await shopifyRequest($, shopify, {
      query: `mutation SetCollectionMetafield($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          userErrors { field message }
        }
      }`,
      variables: {
        metafields: [
          {
            ownerId: existing.id,
            ...productAirtableMetafield(airtableRecordId),
          },
        ],
      },
    });
    throwUserErrors('metafieldsSet', metafieldData.metafieldsSet?.userErrors);
    return data.collectionUpdate.collection;
  }

  const data = await shopifyRequest($, shopify, {
    query: `mutation CreateNativeCollection($input: CollectionInput!) {
      collectionCreate(input: $input) {
        collection { id handle title }
        userErrors { field message }
      }
    }`,
    variables: {
      input: {
        title,
        handle,
        descriptionHtml: description || '',
        metafields: [productAirtableMetafield(airtableRecordId)],
      },
    },
  });
  throwUserErrors('collectionCreate', data.collectionCreate?.userErrors);
  return data.collectionCreate.collection;
}

/** Keep product membership in sync with linked editorial native collections. */
export async function syncProductNativeCollectionMembership($, shopify, {
  productId,
  collectionRecordIds = [],
  collectionHandleByRecordId = new Map(),
}) {
  await ensureAllPrintsSmartCollection($, shopify);

  const targetCollectionIds = new Set();
  for (const recordId of collectionRecordIds) {
    const handle = collectionHandleByRecordId.get(recordId);
    const collection =
      (await findCollectionByAirtableRecordId($, shopify, recordId)) ??
      (handle ? await findCollectionByHandle($, shopify, handle) : null);
    if (collection) targetCollectionIds.add(collection.id);
  }

  const {namespace, key} = SHOPIFY.airtableMetafield;
  const productData = await shopifyRequest($, shopify, {
    query: `query ProductCollections($id: ID!) {
      product(id: $id) {
        collections(first: 50) {
          nodes {
            id
            airtableRecordId: metafield(namespace: "${namespace}", key: "${key}") {
              value
            }
          }
        }
      }
    }`,
    variables: {id: productId},
  });

  const editorialCollections = (productData.product?.collections?.nodes ?? []).filter(
    (collection) => collection.airtableRecordId?.value,
  );

  const toAdd = [...targetCollectionIds].filter(
    (id) => !editorialCollections.some((collection) => collection.id === id),
  );
  const toRemove = editorialCollections
    .filter((collection) => !targetCollectionIds.has(collection.id))
    .map((collection) => collection.id);

  for (const collectionId of toAdd) {
    const addData = await shopifyRequest($, shopify, {
      query: `mutation AddProducts($id: ID!, $productIds: [ID!]!) {
        collectionAddProducts(id: $id, productIds: $productIds) {
          userErrors { field message }
        }
      }`,
      variables: {id: collectionId, productIds: [productId]},
    });
    throwUserErrors('collectionAddProducts', addData.collectionAddProducts?.userErrors);
  }

  for (const collectionId of toRemove) {
    const removeData = await shopifyRequest($, shopify, {
      query: `mutation RemoveProducts($id: ID!, $productIds: [ID!]!) {
        collectionRemoveProducts(id: $id, productIds: $productIds) {
          userErrors { field message }
        }
      }`,
      variables: {id: collectionId, productIds: [productId]},
    });
    throwUserErrors(
      'collectionRemoveProducts',
      removeData.collectionRemoveProducts?.userErrors,
    );
  }

  return {
    added: toAdd.length,
    removed: toRemove.length,
    targetCount: targetCollectionIds.size,
  };
}

export async function deleteNativeCollectionByAirtableRecordId($, shopify, airtableRecordId) {
  const collection = await findCollectionByAirtableRecordId($, shopify, airtableRecordId);
  if (!collection) return null;

  const data = await shopifyRequest($, shopify, {
    query: `mutation DeleteCollection($input: CollectionDeleteInput!) {
      collectionDelete(input: $input) {
        deletedCollectionId
        userErrors { field message }
      }
    }`,
    variables: {input: {id: collection.id}},
  });
  throwUserErrors('collectionDelete', data.collectionDelete?.userErrors);
  return collection;
}
