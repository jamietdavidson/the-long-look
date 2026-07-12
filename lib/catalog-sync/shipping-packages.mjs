import {SHOPIFY} from './config.js';
import {
  computeShippingBoxSpecsBySizeTier,
  estimateVariantShippingWeightLb,
  shippingPackageInputFromSpec,
} from './shipping-box-spec.mjs';
import {
  selectedOptionsKey,
  shopifyRequest,
  slugify,
  variantSelectionKey,
} from './utils.js';

const REGISTRY_VERSION = 1;

function parseEnvPackageIds() {
  const raw = process.env.SHOPIFY_SHIPPING_PACKAGE_IDS?.trim();
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    throw new Error('SHOPIFY_SHIPPING_PACKAGE_IDS must be valid JSON');
  }
}

function isAccessDenied(error) {
  const message = String(error?.message ?? error);
  return /access denied|ACCESS_DENIED|write_shipping|shipping access scopes/i.test(
    message,
  );
}

function isMissingPackageError(error) {
  const message = String(error?.message ?? error);
  return /invalid id|RESOURCE_NOT_FOUND|not found/i.test(message);
}

async function getShopGid($, shopify) {
  const data = await shopifyRequest($, shopify, {
    query: `query { shop { id } }`,
  });
  const shopId = data.shop?.id;
  if (!shopId) throw new Error('Could not resolve shop id');
  return shopId;
}

export async function readShippingPackageRegistry($, shopify) {
  const mf = SHOPIFY.metafields;
  const data = await shopifyRequest($, shopify, {
    query: `query {
      shop {
        registry: metafield(namespace: "${mf.namespace}", key: "${mf.shippingPackageRegistry}") {
          value
        }
      }
    }`,
  });

  const raw = data.shop?.registry?.value;
  if (!raw) {
    return {version: REGISTRY_VERSION, packages: {}};
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      version: parsed.version ?? REGISTRY_VERSION,
      packages: parsed.packages ?? {},
    };
  } catch {
    return {version: REGISTRY_VERSION, packages: {}};
  }
}

export async function writeShippingPackageRegistry($, shopify, registry) {
  const mf = SHOPIFY.metafields;
  const shopId = await getShopGid($, shopify);
  const data = await shopifyRequest($, shopify, {
    query: `mutation($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id }
        userErrors { field message }
      }
    }`,
    variables: {
      metafields: [
        {
          ownerId: shopId,
          namespace: mf.namespace,
          key: mf.shippingPackageRegistry,
          type: 'json',
          value: JSON.stringify({
            version: REGISTRY_VERSION,
            packages: registry.packages ?? {},
            updatedAt: new Date().toISOString(),
          }),
        },
      ],
    },
  });

  const errors = data.metafieldsSet?.userErrors ?? [];
  if (errors.length) {
    throw new Error(`metafieldsSet (shipping registry): ${JSON.stringify(errors)}`);
  }
}

async function updateShopifyShippingPackage($, shopify, packageId, spec, {isDefault = false} = {}) {
  const data = await shopifyRequest($, shopify, {
    query: `mutation($id: ID!, $shippingPackage: CustomShippingPackageInput!) {
      shippingPackageUpdate(id: $id, shippingPackage: $shippingPackage) {
        userErrors { field message }
      }
    }`,
    variables: {
      id: packageId,
      shippingPackage: shippingPackageInputFromSpec(spec, {isDefault}),
    },
  });

  const errors = data.shippingPackageUpdate?.userErrors ?? [];
  if (errors.length) {
    throw new Error(`shippingPackageUpdate: ${JSON.stringify(errors)}`);
  }
}

async function makeDefaultShippingPackage($, shopify, packageId) {
  const data = await shopifyRequest($, shopify, {
    query: `mutation($id: ID!) {
      shippingPackageMakeDefault(id: $id) {
        userErrors { field message }
      }
    }`,
    variables: {id: packageId},
  });

  const errors = data.shippingPackageMakeDefault?.userErrors ?? [];
  if (errors.length) {
    throw new Error(`shippingPackageMakeDefault: ${JSON.stringify(errors)}`);
  }
}

/**
 * Shopify's Admin API can update/delete packages but cannot create or list them.
 * Package GIDs are stored in a shop metafield registry (and optional env overrides).
 */
export async function ensureShippingPackages($, shopify, catalog, {dryRun = false} = {}) {
  const specs = computeShippingBoxSpecsBySizeTier(catalog);
  if (!specs.length) {
    return {specs: [], updated: [], pending: [], skipped: true, reason: 'No size tiers'};
  }

  const envIds = parseEnvPackageIds();
  const registry = await readShippingPackageRegistry($, shopify);
  const updated = [];
  const pending = [];

  for (const spec of specs) {
    const existing = registry.packages[spec.sizeKey] ?? {};
    const shopifyPackageId =
      envIds[spec.sizeKey] ??
      envIds[spec.sizeName] ??
      existing.shopifyPackageId ??
      null;

    const nextEntry = {
      ...existing,
      ...spec,
      shopifyPackageId,
      status: shopifyPackageId ? 'linked' : 'pending_create',
    };

    if (!shopifyPackageId) {
      registry.packages[spec.sizeKey] = nextEntry;
      pending.push({
        sizeKey: spec.sizeKey,
        sizeName: spec.sizeName,
        name: spec.name,
        dimensions: `${spec.length}" × ${spec.width}" × ${spec.height}"`,
      });
      continue;
    }

    if (dryRun) {
      updated.push({sizeKey: spec.sizeKey, shopifyPackageId, dryRun: true});
      registry.packages[spec.sizeKey] = nextEntry;
      continue;
    }

    try {
      const isDefault = spec.rank === specs[0]?.rank;
      await updateShopifyShippingPackage($, shopify, shopifyPackageId, spec, {
        isDefault,
      });
      if (isDefault) {
        await makeDefaultShippingPackage($, shopify, shopifyPackageId);
      }
      registry.packages[spec.sizeKey] = {
        ...nextEntry,
        status: 'synced',
        syncedAt: new Date().toISOString(),
      };
      updated.push({sizeKey: spec.sizeKey, shopifyPackageId, status: 'synced'});
    } catch (error) {
      if (isAccessDenied(error)) {
        throw new Error(
          `${error.message} — approve write_shipping on from-airtable-sync-catalog (Settings → Apps), then update SHOPIFY_ACCESS_TOKEN.`,
        );
      }
      if (isMissingPackageError(error)) {
        registry.packages[spec.sizeKey] = {
          ...nextEntry,
          shopifyPackageId: null,
          status: 'missing',
          lastError: String(error.message),
        };
        pending.push({
          sizeKey: spec.sizeKey,
          sizeName: spec.sizeName,
          reason: 'Stored package id is invalid — recreate in Admin or update registry',
        });
        continue;
      }
      throw error;
    }
  }

  if (!dryRun) {
    await writeShippingPackageRegistry($, shopify, registry);
  }

  return {
    specs,
    updated,
    pending,
    registry,
    needsBootstrap: pending.length > 0,
  };
}

async function listProductVariantsWithInventory($, shopify, productId) {
  const variants = [];
  let cursor = null;

  do {
    const data = await shopifyRequest($, shopify, {
      query: `query($id: ID!, $cursor: String) {
        product(id: $id) {
          variants(first: 100, after: $cursor) {
            nodes {
              id
              selectedOptions { name value }
              inventoryItem { id }
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      }`,
      variables: {id: productId, cursor},
    });

    variants.push(...(data.product?.variants?.nodes ?? []));
    const pageInfo = data.product?.variants?.pageInfo;
    cursor = pageInfo?.hasNextPage ? pageInfo.endCursor : null;
  } while (cursor);

  return variants;
}

/**
 * Assign each variant's inventory item to the shipping package for its size tier.
 */
export async function assignProductVariantShippingPackages(
  $,
  shopify,
  {productId, catalog, registry},
  {dryRun = false} = {},
) {
  const packages = registry?.packages ?? {};
  const variants = await listProductVariantsWithInventory($, shopify, productId);
  const variantsByKey = new Map(
    variants.map((variant) => [selectedOptionsKey(variant.selectedOptions), variant]),
  );

  const bulkInputs = [];
  const skipped = [];

  for (const catalogVariant of catalog) {
    const sizeKey = slugify(catalogVariant.sizeName);
    const packageEntry = packages[sizeKey];
    const shopifyPackageId = packageEntry?.shopifyPackageId;
    if (!shopifyPackageId) {
      skipped.push({sizeName: catalogVariant.sizeName, reason: 'No shipping package id'});
      continue;
    }

    const variant = variantsByKey.get(variantSelectionKey(catalogVariant));
    if (!variant?.id) {
      skipped.push({
        sizeName: catalogVariant.sizeName,
        frame: catalogVariant.frame,
        mount: catalogVariant.mount,
        reason: 'Variant not found on product',
      });
      continue;
    }

    bulkInputs.push({
      id: variant.id,
      inventoryItem: {
        measurement: {
          shippingPackageId: shopifyPackageId,
          weight: {
            value: estimateVariantShippingWeightLb(catalogVariant),
            unit: 'POUNDS',
          },
        },
      },
    });
  }

  if (!bulkInputs.length || dryRun) {
    return {assigned: 0, skipped, dryRun};
  }

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
    throw new Error(`productVariantsBulkUpdate (shipping packages): ${JSON.stringify(errors)}`);
  }

  return {
    assigned: bulkInputs.length,
    skipped,
  };
}

export function resolveShippingBoxForSizeName(registry, sizeName) {
  if (!sizeName) return null;
  const sizeKey = slugify(sizeName);
  const packages = registry?.packages ?? {};
  const entry =
    packages[sizeKey] ??
    Object.values(packages).find(
      (pkg) => pkg.sizeName?.toLowerCase() === sizeName.toLowerCase(),
    ) ??
    null;

  if (!entry) return null;
  return {
    sizeKey: entry.sizeKey ?? sizeKey,
    sizeName: entry.sizeName ?? sizeName,
    length: entry.length,
    width: entry.width,
    height: entry.height,
    rank: entry.rank,
    shopifyPackageId: entry.shopifyPackageId ?? null,
  };
}
