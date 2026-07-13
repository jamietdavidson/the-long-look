import {createSyncClients} from '../catalog-sync/clients.mjs';
import {
  computeAllShippingPackageSpecs,
  estimateVariantShippingWeightLb,
} from '../catalog-sync/shipping-box-spec.mjs';
import {
  readShippingPackageRegistry,
  resolveShippingBoxForSizeName,
} from '../catalog-sync/shipping-packages.mjs';
import {fetchVariantCatalog, shopifyRequest, slugify} from '../catalog-sync/utils.js';
import {SHIPPING} from './config.js';

const SPEC_CACHE_MS = 5 * 60 * 1000;
let cachedContext = null;
let cachedAt = 0;

/** @param {string | null | undefined} variantTitle e.g. "Gallery / Black / Border" */
export function parseVariantTitle(variantTitle) {
  if (!variantTitle) return null;
  const parts = String(variantTitle)
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) return null;

  return {
    sizeName: parts[0],
    frame: parts[1] ?? null,
    mount: parts[2] ?? null,
  };
}

function variantGid(variantId) {
  if (variantId == null || variantId === '') return null;
  const value = String(variantId);
  return value.startsWith('gid://') ? value : `gid://shopify/ProductVariant/${value}`;
}

function sizeNameFromVariantNode(node) {
  const sizeOption = node?.selectedOptions?.find(
    (option) => option.name?.toLowerCase() === 'size',
  );
  return sizeOption?.value?.trim() || null;
}

function findCatalogVariant(catalog, {sizeName, frame, mount}) {
  const exact = catalog.find(
    (variant) =>
      variant.sizeName === sizeName &&
      (!frame || variant.frame === frame) &&
      (!mount || variant.mount === mount),
  );
  if (exact) return exact;

  return catalog.find((variant) => variant.sizeName === sizeName) ?? null;
}

async function loadShippingContext() {
  if (cachedContext && Date.now() - cachedAt < SPEC_CACHE_MS) {
    return cachedContext;
  }

  const clients = await createSyncClients();
  const [catalog, registry] = await Promise.all([
    fetchVariantCatalog(clients.$, clients.airtable),
    readShippingPackageRegistry(clients.$, clients.shopify),
  ]);
  const specs = computeAllShippingPackageSpecs(catalog);
  cachedContext = {clients, catalog, specs, registry};
  cachedAt = Date.now();
  return cachedContext;
}

async function fetchOrderLineVariants(clients, lineItems) {
  const gids = [
    ...new Set(
      lineItems
        .map((item) => variantGid(item.variant_id))
        .filter(Boolean),
    ),
  ];

  if (!gids.length) return new Map();

  const data = await shopifyRequest(clients.$, clients.shopify, {
    query: `query($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on ProductVariant {
          id
          selectedOptions { name value }
        }
      }
    }`,
    variables: {ids: gids},
  });

  const byGid = new Map();
  for (const node of data.nodes ?? []) {
    if (!node?.id) continue;
    byGid.set(node.id, node);
    const numericId = node.id.split('/').pop();
    if (numericId) byGid.set(numericId, node);
  }
  return byGid;
}

function fallbackPackage(extra = {}) {
  return {
    length: SHIPPING.packageLengthIn,
    width: SHIPPING.packageWidthIn,
    height: SHIPPING.packageHeightIn,
    weightLb: SHIPPING.packageWeightLb,
    sizeName: null,
    shopifyPackageId: null,
    source: 'env_fallback',
    ...extra,
  };
}

function specBySizeName(specs, sizeName) {
  if (!sizeName) return null;
  const key = slugify(sizeName);
  return (
    specs.find((spec) => spec.sizeKey === key) ??
    specs.find((spec) => spec.sizeName.toLowerCase() === sizeName.toLowerCase()) ??
    null
  );
}

function packageEntryForSizeName({registry, specs, sizeName, frame = null}) {
  if (!sizeName) return null;

  const fromRegistry = resolveShippingBoxForSizeName(registry, sizeName, {frame});
  const sizeKey = slugify(sizeName);
  const packageKey = frame === 'No Frame' ? `${sizeKey}-tube` : sizeKey;
  const spec =
    specs.find((entry) => entry.sizeKey === packageKey) ??
    specBySizeName(specs, sizeName);
  const rank = spec?.rank ?? fromRegistry?.rank ?? 999;

  if (
    fromRegistry?.length &&
    fromRegistry?.width &&
    fromRegistry?.height
  ) {
    return {
      sizeName: fromRegistry.sizeName ?? sizeName,
      sizeKey: fromRegistry.sizeKey ?? packageKey,
      length: fromRegistry.length,
      width: fromRegistry.width,
      height: fromRegistry.height,
      rank,
      packagingType: fromRegistry.packagingType ?? spec?.packagingType ?? null,
      shopifyPackageId: fromRegistry.shopifyPackageId ?? null,
      source: fromRegistry.shopifyPackageId
        ? 'shopify_package_registry'
        : 'shopify_package_registry_dims',
    };
  }

  if (spec) {
    return {
      sizeName: spec.sizeName,
      sizeKey: spec.sizeKey,
      length: spec.length,
      width: spec.width,
      height: spec.height,
      rank: spec.rank,
      packagingType: spec.packagingType ?? null,
      shopifyPackageId: fromRegistry?.shopifyPackageId ?? null,
      source: 'airtable_catalog',
    };
  }

  return null;
}

function estimatePackageWeightLbFromSpec(spec) {
  return Math.max(
    Number(process.env.SHIPPING_PACKAGE_WEIGHT_LB ?? 2),
    Number(spec?.boxWeightLb ?? 0.5) + 2,
  );
}

function variantNodeForLineItem(variantByKey, item) {
  const gid = variantGid(item.variant_id);
  return (
    (gid && variantByKey.get(gid)) ||
    (item.variant_id != null && variantByKey.get(String(item.variant_id))) ||
    null
  );
}

function parsedVariantForLineItem(item, variantNode) {
  if (variantNode && sizeNameFromVariantNode(variantNode)) {
    return {
      sizeName: sizeNameFromVariantNode(variantNode),
      frame: null,
      mount: null,
    };
  }

  return parseVariantTitle(item.variant_title ?? item.name);
}

function resolvePackageForLineItem({catalog, specs, registry, item, variantNode}) {
  const parsed = parsedVariantForLineItem(item, variantNode);
  const catalogVariant = parsed ? findCatalogVariant(catalog, parsed) : null;
  const frame = catalogVariant?.frame ?? parsed?.frame ?? null;
  const packageEntry = parsed?.sizeName
    ? packageEntryForSizeName({
        registry,
        specs,
        sizeName: parsed.sizeName,
        frame,
      })
    : null;

  if (!packageEntry) {
    return fallbackPackage({
      lineItemId: item.id ?? null,
      lineItemTitle: item.title ?? null,
      variantTitle: item.variant_title ?? null,
    });
  }

  const weightLb = Math.max(
    catalogVariant
      ? estimateVariantShippingWeightLb(catalogVariant)
      : estimatePackageWeightLbFromSpec(packageEntry),
    SHIPPING.packageWeightLb,
  );

  return {
    length: packageEntry.length,
    width: packageEntry.width,
    height: packageEntry.height,
    weightLb,
    sizeName: packageEntry.sizeName,
    sizeKey: packageEntry.sizeKey,
    shopifyPackageId: packageEntry.shopifyPackageId,
    source: packageEntry.source,
    lineItemId: item.id ?? null,
    lineItemTitle: item.title ?? null,
    variantTitle: item.variant_title ?? null,
  };
}

/**
 * Resolve one shipping package per physical unit on the order (quantity expands to multiple boxes).
 * Uses the same Shopify shipping package registry + size tiers as catalog sync.
 * @param {Record<string, unknown>} order Shopify order webhook payload
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function resolveShipmentPackagesForOrder(order) {
  const items = Array.isArray(order.line_items) ? order.line_items : [];
  if (!items.length) return [fallbackPackage()];

  let catalog;
  let specs;
  let registry;
  let clients;

  try {
    ({catalog, specs, registry, clients} = await loadShippingContext());
  } catch (error) {
    return [fallbackPackage({resolveError: error.message})];
  }

  let variantByKey = new Map();
  try {
    variantByKey = await fetchOrderLineVariants(clients, items);
  } catch {
    // Fall back to variant_title parsing only.
  }

  const packages = [];

  for (const item of items) {
    const variantNode = variantNodeForLineItem(variantByKey, item);
    const unitPackage = resolvePackageForLineItem({
      catalog,
      specs,
      registry,
      item,
      variantNode,
    });
    const quantity = Math.max(1, Number(item.quantity ?? 1));

    for (let unitIndex = 1; unitIndex <= quantity; unitIndex += 1) {
      packages.push({
        ...unitPackage,
        unitIndex,
        unitOf: quantity,
      });
    }
  }

  return packages.length ? packages : [fallbackPackage()];
}
