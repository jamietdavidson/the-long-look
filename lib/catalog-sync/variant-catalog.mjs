/**
 * Push the Airtable variant catalog to Shopify product variants and prune orphans.
 * Shopify variants are keyed by Size / Frame / Mount; airtable.record_id metafields are
 * written on sync for stable deletion matching.
 */
import {AIRTABLE, SHOPIFY} from './config.js';
import {
  buildCanonicalSizeSizingMap,
  buildVariantMetafields,
  listFineArtPrintProducts,
  listTableRecords,
  normalizeVariant,
  selectedOptionsKey,
  shopifyRequest,
  variantSelectionKey,
} from './utils.js';

const AIRTABLE_MF = SHOPIFY.airtableMetafield;

async function listProductVariantsDetailed($, shopify, productId) {
  const variants = [];
  let cursor = null;

  do {
    const data = await shopifyRequest($, shopify, {
      query: `query($id: ID!, $cursor: String) {
        product(id: $id) {
          variants(first: 100, after: $cursor) {
            nodes {
              id
              price
              selectedOptions { name value }
              airtableId: metafield(namespace: "${AIRTABLE_MF.namespace}", key: "${AIRTABLE_MF.key}") {
                value
              }
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      }`,
      variables: {id: productId, cursor},
    });

    variants.push(
      ...(data.product?.variants?.nodes ?? []).map((node) => ({
        id: node.id,
        price: node.price,
        selectedOptions: node.selectedOptions,
        airtableRecordId: node.airtableId?.value ?? null,
      })),
    );
    const pageInfo = data.product?.variants?.pageInfo;
    cursor = pageInfo?.hasNextPage ? pageInfo.endCursor : null;
  } while (cursor);

  return variants;
}

async function setVariantMetafields($, shopify, metafieldInputs) {
  for (let index = 0; index < metafieldInputs.length; index += 25) {
    const chunk = metafieldInputs.slice(index, index + 25);
    const data = await shopifyRequest($, shopify, {
      query: `mutation($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { id }
          userErrors { field message }
        }
      }`,
      variables: {metafields: chunk},
    });
    const errors = data.metafieldsSet?.userErrors ?? [];
    if (errors.length) throw new Error(`metafieldsSet: ${JSON.stringify(errors)}`);
  }
}

function buildVariantCreateInput(catalogVariant) {
  return {
    optionValues: [
      {optionName: 'Size', name: catalogVariant.sizeName},
      {optionName: 'Frame', name: catalogVariant.frame},
      {optionName: 'Mount', name: catalogVariant.mount},
    ],
    price: catalogVariant.price,
    inventoryPolicy: 'CONTINUE',
  };
}

/**
 * Align one product's variants with the Airtable catalog (update, create, delete).
 */
export async function reconcileProductVariantCatalog(
  $,
  shopify,
  {productId, catalog, dryRun = false},
) {
  const existingVariants = await listProductVariantsDetailed($, shopify, productId);
  const catalogByKey = new Map(catalog.map((variant) => [variantSelectionKey(variant), variant]));
  const existingByKey = new Map(
    existingVariants.map((variant) => [selectedOptionsKey(variant.selectedOptions), variant]),
  );
  const sizingMap = buildCanonicalSizeSizingMap(catalog);

  const toUpdate = [];
  const toCreate = [];
  const toDelete = [];

  for (const [key, catalogVariant] of catalogByKey) {
    if (existingByKey.has(key)) {
      toUpdate.push({catalogVariant, existing: existingByKey.get(key)});
    } else {
      toCreate.push(catalogVariant);
    }
  }

  for (const [key, existing] of existingByKey) {
    if (!catalogByKey.has(key)) {
      toDelete.push(existing);
    }
  }

  if (dryRun) {
    return {
      productId,
      updated: toUpdate.length,
      created: toCreate.length,
      deleted: toDelete.length,
      dryRun: true,
    };
  }

  const metafieldInputs = [];

  if (toUpdate.length) {
    const bulkInputs = toUpdate.map(({catalogVariant, existing}) => ({
      id: existing.id,
      price: catalogVariant.price,
      inventoryPolicy: 'CONTINUE',
    }));

    const data = await shopifyRequest($, shopify, {
      query: `mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $productId, variants: $variants) {
          productVariants { id }
          userErrors { field message }
        }
      }`,
      variables: {productId, variants: bulkInputs},
    });
    const errors = data.productVariantsBulkUpdate?.userErrors ?? [];
    if (errors.length) {
      throw new Error(`productVariantsBulkUpdate: ${JSON.stringify(errors)}`);
    }

    for (const {catalogVariant, existing} of toUpdate) {
      for (const field of buildVariantMetafields(catalogVariant, sizingMap)) {
        metafieldInputs.push({ownerId: existing.id, ...field});
      }
    }
  }

  let createdVariants = [];
  if (toCreate.length) {
    const data = await shopifyRequest($, shopify, {
      query: `mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkCreate(productId: $productId, variants: $variants) {
          productVariants {
            id
            selectedOptions { name value }
          }
          userErrors { field message }
        }
      }`,
      variables: {
        productId,
        variants: toCreate.map((variant) => buildVariantCreateInput(variant)),
      },
    });
    const errors = data.productVariantsBulkCreate?.userErrors ?? [];
    if (errors.length) {
      throw new Error(`productVariantsBulkCreate: ${JSON.stringify(errors)}`);
    }

    createdVariants = data.productVariantsBulkCreate?.productVariants ?? [];
    for (const created of createdVariants) {
      const key = selectedOptionsKey(created.selectedOptions);
      const catalogVariant = catalogByKey.get(key);
      if (!catalogVariant) continue;
      for (const field of buildVariantMetafields(catalogVariant, sizingMap)) {
        metafieldInputs.push({ownerId: created.id, ...field});
      }
    }
  }

  if (metafieldInputs.length) {
    await setVariantMetafields($, shopify, metafieldInputs);
  }

  if (toDelete.length) {
    const data = await shopifyRequest($, shopify, {
      query: `mutation($productId: ID!, $variantsIds: [ID!]!) {
        productVariantsBulkDelete(productId: $productId, variantsIds: $variantsIds) {
          userErrors { field message }
        }
      }`,
      variables: {
        productId,
        variantsIds: toDelete.map((variant) => variant.id),
      },
    });
    const errors = data.productVariantsBulkDelete?.userErrors ?? [];
    if (errors.length) {
      throw new Error(`productVariantsBulkDelete: ${JSON.stringify(errors)}`);
    }
  }

  return {
    productId,
    updated: toUpdate.length,
    created: createdVariants.length,
    deleted: toDelete.length,
  };
}

/** Remove product variants whose Airtable row or Size/Frame/Mount combo no longer exists. */
export async function pruneOrphanedProductVariants($, airtable, shopify, dryRun) {
  const records = await listTableRecords($, airtable, 'variants', {
    sortField: AIRTABLE.variants.rank,
  });
  const validRecordIds = new Set(records.map((record) => record.id));
  const validKeys = new Set(
    records.map((record) => variantSelectionKey(normalizeVariant(record.fields ?? {}))),
  );

  const products = await listFineArtPrintProducts($, shopify);
  const removed = [];

  for (const product of products) {
    const variants = await listProductVariantsDetailed($, shopify, product.id);
    const orphanIds = variants
      .filter((variant) => {
        const key = selectedOptionsKey(variant.selectedOptions);
        if (variant.airtableRecordId) {
          return !validRecordIds.has(variant.airtableRecordId);
        }
        return !validKeys.has(key);
      })
      .map((variant) => variant.id);

    if (!orphanIds.length) continue;

    // Shopify requires at least one variant per product.
    if (orphanIds.length >= variants.length) {
      removed.push({
        productId: product.id,
        handle: product.handle,
        variantIds: orphanIds,
        status: 'skipped',
        reason: 'Cannot remove every variant from a product',
      });
      continue;
    }

    if (dryRun) {
      removed.push({
        productId: product.id,
        handle: product.handle,
        variantIds: orphanIds,
        status: 'pending',
      });
      continue;
    }

    const data = await shopifyRequest($, shopify, {
      query: `mutation($productId: ID!, $variantsIds: [ID!]!) {
        productVariantsBulkDelete(productId: $productId, variantsIds: $variantsIds) {
          userErrors { field message }
        }
      }`,
      variables: {productId: product.id, variantsIds: orphanIds},
    });
    const errors = data.productVariantsBulkDelete?.userErrors ?? [];
    if (errors.length) {
      throw new Error(`productVariantsBulkDelete: ${JSON.stringify(errors)}`);
    }

    removed.push({
      productId: product.id,
      handle: product.handle,
      variantIds: orphanIds,
      status: 'removed',
    });
  }

  return {
    removed,
    count: removed.reduce(
      (total, entry) => total + (entry.status === 'removed' ? entry.variantIds.length : 0),
      0,
    ),
    skipped: removed.filter((entry) => entry.status === 'skipped').length,
  };
}

/**
 * Push the live catalog to every Fine Art Print product.
 */
export async function syncCatalogToAllProducts($, shopify, catalog, {dryRun = false} = {}) {
  const products = await listFineArtPrintProducts($, shopify);
  const results = [];

  for (const product of products) {
    results.push(
      await reconcileProductVariantCatalog($, shopify, {
        productId: product.id,
        catalog,
        dryRun,
      }),
    );
  }

  return {productCount: products.length, results};
}
