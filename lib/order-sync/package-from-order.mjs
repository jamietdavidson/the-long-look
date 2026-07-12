import {createSyncClients} from '../catalog-sync/clients.mjs';
import {
  computeShippingBoxSpecsBySizeTier,
  estimateVariantShippingWeightLb,
} from '../catalog-sync/shipping-box-spec.mjs';
import {fetchVariantCatalog, shopifyRequest, slugify} from '../catalog-sync/utils.js';
import {FEDEX} from './config.js';

const SPEC_CACHE_MS = 5 * 60 * 1000;
let cachedCatalog = null;
let cachedSpecs = null;
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

async function loadCatalogAndSpecs() {
  if (cachedCatalog && cachedSpecs && Date.now() - cachedAt < SPEC_CACHE_MS) {
    return {catalog: cachedCatalog, specs: cachedSpecs};
  }

  const clients = createSyncClients();
  const catalog = await fetchVariantCatalog(clients.$, clients.airtable);
  const specs = computeShippingBoxSpecsBySizeTier(catalog);
  cachedCatalog = catalog;
  cachedSpecs = specs;
  cachedAt = Date.now();
  return {catalog, specs};
}

function fallbackPackage() {
  return {
    length: FEDEX.packageLengthIn,
    width: FEDEX.packageWidthIn,
    height: FEDEX.packageHeightIn,
    weightLb: FEDEX.packageWeightLb,
    sizeName: null,
    source: 'env_fallback',
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

async function orientationForLineItem(item) {
  const productId = item?.product_id;
  const token =
    process.env.SHOPIFY_ACCESS_TOKEN?.trim() ?? process.env.SHOPIFY_ADMIN_TOKEN?.trim();
  if (!productId || !token) return 'vertical';

  const shopId = process.env.SHOPIFY_SHOP_ID?.trim() ?? 'thelonglookco';
  const gid = String(productId).startsWith('gid://')
    ? String(productId)
    : `gid://shopify/Product/${productId}`;

  try {
    const data = await shopifyRequest(
      {},
      {$auth: {shop_id: shopId, access_token: token}},
      {
        query: `query($id: ID!) {
          product(id: $id) {
            featuredImage { width height }
          }
        }`,
        variables: {id: gid},
      },
    );
    const image = data.product?.featuredImage;
    if (image?.width && image?.height) {
      return image.width >= image.height ? 'horizontal' : 'vertical';
    }
  } catch {
    // Default to portrait box dimensions.
  }

  return 'vertical';
}

function applyOrientationToBox(spec, orientation) {
  if (orientation !== 'horizontal') {
    return {
      length: spec.length,
      width: spec.width,
      height: spec.height,
    };
  }

  return {
    length: spec.width,
    width: spec.length,
    height: spec.height,
  };
}

/**
 * Resolve FedEx package dimensions + weight from order line items and Airtable variant catalog.
 * @param {Record<string, unknown>} order Shopify order webhook payload
 */
export async function resolveShipmentPackageForOrder(order) {
  const items = Array.isArray(order.line_items) ? order.line_items : [];
  if (!items.length) return fallbackPackage();

  let catalog;
  let specs;
  try {
    ({catalog, specs} = await loadCatalogAndSpecs());
  } catch (error) {
    return {
      ...fallbackPackage(),
      source: 'env_fallback',
      resolveError: error.message,
    };
  }

  let chosenSpec = null;
  let chosenItem = null;
  let totalWeightLb = 0;

  for (const item of items) {
    const parsed = parseVariantTitle(item.variant_title ?? item.title);
    if (!parsed) continue;

    const spec = specBySizeName(specs, parsed.sizeName);
    const catalogVariant = findCatalogVariant(catalog, parsed);
    const qty = Number(item.quantity ?? 1);

    if (catalogVariant) {
      totalWeightLb += estimateVariantShippingWeightLb(catalogVariant) * qty;
    }

    if (!spec) continue;
    if (!chosenSpec || spec.rank > chosenSpec.rank) {
      chosenSpec = spec;
      chosenItem = item;
    }
  }

  if (!chosenSpec) {
    return {
      ...fallbackPackage(),
      weightLb: totalWeightLb > 0 ? Math.max(totalWeightLb, FEDEX.packageWeightLb) : FEDEX.packageWeightLb,
      source: 'env_fallback',
    };
  }

  const orientation = chosenItem ? await orientationForLineItem(chosenItem) : 'vertical';
  const dimensions = applyOrientationToBox(chosenSpec, orientation);
  const weightLb = Math.max(
    totalWeightLb || estimatePackageWeightLbFromSpec(chosenSpec),
    FEDEX.packageWeightLb,
  );

  return {
    ...dimensions,
    weightLb,
    sizeName: chosenSpec.sizeName,
    bufferIn: chosenSpec.bufferIn,
    orientation,
    source: 'airtable_catalog',
  };
}

function estimatePackageWeightLbFromSpec(spec) {
  return Math.max(
    Number(process.env.FEDEX_PACKAGE_WEIGHT_LB ?? 2),
    Number(spec.boxWeightLb ?? 0.5) + 2,
  );
}
