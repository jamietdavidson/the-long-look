import {slugify} from './utils.js';

/** Extra inches per side inside the box (foam, corners, void fill). */
const DEFAULT_BOX_BUFFER_IN = 1;
/** Empty corrugated box depth (inches) — artwork ships flat in a shallow box. */
const DEFAULT_BOX_DEPTH_IN = 4;
const DEFAULT_BOX_TARE_WEIGHT_LB = 0.5;
const DEFAULT_TUBE_CAP_IN = 4;
const DEFAULT_TUBE_TARE_WEIGHT_LB = 0.3;
const DEFAULT_WEIGHT_BASE_LB = 1;
const DEFAULT_WEIGHT_PER_SQ_IN_LB = 0.02;

/** Empty tube tare by size rank (larger tubes weigh slightly more). */
const TUBE_TARE_WEIGHT_BY_RANK = {
  1: 0.3,
  2: 0.3,
  3: 0.35,
  4: 0.4,
  5: 0.45,
  6: 0.5,
  7: 0.6,
};

function roundUpShippingInches(value, step = 0.25) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.ceil(number / step) * step;
}

function roundNearestShippingInches(value, step = 0.5) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.round(number / step) * step;
}

/**
 * Outer frame dimensions in inches for a catalog variant.
 * @param {import('./utils.js').normalizeVariant extends (...args: any) => infer R ? R : never} variant
 * @param {'vertical' | 'horizontal'} orientation
 */
export function getOuterDimensionsForVariant(variant, orientation = 'vertical') {
  const padding = variant.mount === 'Full Bleed' ? 0 : Number(variant.padding ?? 0);
  const frame =
    variant.frame === 'No Frame' ? 0 : Number(variant.frameWidth ?? 0);
  const shortSide = Number(variant.shortSide);
  const longSide = Number(variant.longSide);

  const pictureWidth = orientation === 'horizontal' ? longSide : shortSide;
  const pictureHeight = orientation === 'horizontal' ? shortSide : longSide;

  return {
    width: pictureWidth + 2 * padding + 2 * frame,
    height: pictureHeight + 2 * padding + 2 * frame,
  };
}

/**
 * One shipping box per Airtable size tier (max outer dimensions across frame/mount combos).
 * @param {Array<ReturnType<typeof import('./utils.js').normalizeVariant>>} catalog
 */
export function computeShippingBoxSpecsBySizeTier(catalog) {
  const bySize = new Map();

  for (const variant of catalog) {
    if (!variant.sizeName) continue;
    if (!bySize.has(variant.sizeName)) bySize.set(variant.sizeName, []);
    bySize.get(variant.sizeName).push(variant);
  }

  const boxDepthIn = Number(process.env.SHIPPING_BOX_DEPTH_IN ?? DEFAULT_BOX_DEPTH_IN);
  const boxBufferIn = Number(process.env.SHIPPING_BOX_BUFFER_IN ?? DEFAULT_BOX_BUFFER_IN);
  const boxTareWeightLb = Number(
    process.env.SHIPPING_BOX_TARE_WEIGHT_LB ?? DEFAULT_BOX_TARE_WEIGHT_LB,
  );

  const specs = [];

  for (const [sizeName, variants] of bySize) {
    let maxWidth = 0;
    let maxHeight = 0;

    // Portrait outer size only (short × long). Do not mix in horizontal
    // orientation — that takes max(width) and max(height) from rotated layouts
    // and collapses 2:3 rectangles into squares.
    for (const variant of variants) {
      const {width, height} = getOuterDimensionsForVariant(variant, 'vertical');
      maxWidth = Math.max(maxWidth, width);
      maxHeight = Math.max(maxHeight, height);
    }

    const paddedWidth = maxWidth + 2 * boxBufferIn;
    const paddedHeight = maxHeight + 2 * boxBufferIn;
    const length = roundUpShippingInches(paddedHeight);
    const width = roundUpShippingInches(paddedWidth);
    const height = roundUpShippingInches(boxDepthIn + 2 * boxBufferIn);
    const rank = Math.min(...variants.map((variant) => Number(variant.rank ?? 999)));

    specs.push({
      sizeKey: slugify(sizeName),
      sizeName,
      name: `${sizeName} Print Box`,
      length,
      width,
      height,
      boxWeightLb: boxTareWeightLb,
      packagingType: 'box',
      bufferIn: boxBufferIn,
      rank,
    });
  }

  specs.sort((a, b) => a.rank - b.rank);
  return specs;
}

/**
 * One shipping tube per size tier (No Frame variants — rolled print).
 * Length = longest outer height + end caps; diameter from print short side roll.
 * @param {Array<ReturnType<typeof import('./utils.js').normalizeVariant>>} catalog
 */
export function computeTubeSpecsBySizeTier(catalog) {
  const bySize = new Map();

  for (const variant of catalog) {
    if (!variant.sizeName || variant.frame !== 'No Frame') continue;
    if (!bySize.has(variant.sizeName)) bySize.set(variant.sizeName, []);
    bySize.get(variant.sizeName).push(variant);
  }

  const tubeCapIn = Number(process.env.SHIPPING_TUBE_CAP_IN ?? DEFAULT_TUBE_CAP_IN);
  const defaultTubeTareLb = Number(
    process.env.SHIPPING_TUBE_TARE_WEIGHT_LB ?? DEFAULT_TUBE_TARE_WEIGHT_LB,
  );

  const specs = [];

  for (const [sizeName, variants] of bySize) {
    let maxHeight = 0;
    let maxShortSide = 0;

    for (const variant of variants) {
      const {height} = getOuterDimensionsForVariant(variant, 'vertical');
      maxHeight = Math.max(maxHeight, height);
      maxShortSide = Math.max(maxShortSide, Number(variant.shortSide ?? 0));
    }

    const length = roundUpShippingInches(maxHeight + tubeCapIn);
    const tubeCoreOffset =
      maxShortSide >= 40
        ? 4.15
        : maxShortSide >= 30
          ? 3.75
          : maxShortSide >= 24
            ? 3
            : maxShortSide >= 20
              ? 3.25
              : 3;
    const diameter = roundNearestShippingInches(maxShortSide / Math.PI + tubeCoreOffset);
    const rank = Math.min(...variants.map((variant) => Number(variant.rank ?? 999)));
    const boxWeightLb =
      TUBE_TARE_WEIGHT_BY_RANK[rank] ??
      defaultTubeTareLb;

    specs.push({
      sizeKey: `${slugify(sizeName)}-tube`,
      sizeName,
      name: `${sizeName} Print Tube`,
      length,
      width: diameter,
      height: diameter,
      boxWeightLb,
      packagingType: 'tube',
      rank,
    });
  }

  specs.sort((a, b) => a.rank - b.rank);
  return specs;
}

/** All courier box + tube package specs for Shopify. */
export function computeAllShippingPackageSpecs(catalog) {
  return [
    ...computeShippingBoxSpecsBySizeTier(catalog),
    ...computeTubeSpecsBySizeTier(catalog),
  ];
}

/** Packed weight for Shopify — prefers Airtable formula when present. */
export function resolveVariantShippingWeightLb(variant) {
  if (variant.predictedWeightLb != null) {
    return variant.predictedWeightLb;
  }
  return estimateVariantShippingWeightLb(variant);
}

/** Estimated packed weight for a variant (print + frame/mat, not empty box tare). */
export function estimateVariantShippingWeightLb(variant) {
  const vertical = getOuterDimensionsForVariant(variant, 'vertical');
  const horizontal = getOuterDimensionsForVariant(variant, 'horizontal');
  const area = Math.max(vertical.width * vertical.height, horizontal.width * horizontal.height);

  const baseLb = Number(process.env.SHIPPING_WEIGHT_BASE_LB ?? DEFAULT_WEIGHT_BASE_LB);
  const perSqInLb = Number(
    process.env.SHIPPING_WEIGHT_PER_SQ_IN_LB ?? DEFAULT_WEIGHT_PER_SQ_IN_LB,
  );
  const estimated = baseLb + area * perSqInLb;
  return Math.max(Math.round(estimated * 100) / 100, baseLb);
}

export function shippingPackageInputFromSpec(spec, {isDefault = false} = {}) {
  const shopifyType = spec.packagingType === 'tube' ? 'SOFT_PACKAGE' : 'BOX';
  return {
    name: spec.name,
    type: shopifyType,
    default: isDefault,
    dimensions: {
      length: spec.length,
      width: spec.width,
      height: spec.height,
      unit: 'INCHES',
    },
    weight: {
      value: spec.boxWeightLb,
      unit: 'POUNDS',
    },
  };
}
