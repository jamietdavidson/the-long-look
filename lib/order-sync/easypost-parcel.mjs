/** Canadian parcel network hard limits (Purolator / UPS / FedEx). */
export const CANADIAN_PARCEL_LIMITS = {
  maxLengthIn: 108,
  maxLengthPlusGirthIn: 165,
  maxWeightLb: 150,
};

/** Canada Post parcel limit (shorter than UPS/FedEx). */
export const CANADA_POST_PARCEL_LIMITS = {
  maxLengthPlusGirthIn: 118,
  maxWeightLb: 66,
};

const FREIGHT_SIZE_TIERS = new Set(
  (process.env.EASYPOST_FREIGHT_SIZE_TIERS?.trim() ?? 'Museum')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean),
);

/**
 * Sort parcel dimensions longest → shortest.
 * @param {{ length?: number, width?: number, height?: number, weightLb?: number }} pkg
 */
export function normalizeParcelDimensions(pkg) {
  const dims = [
    Number(pkg.length ?? 0),
    Number(pkg.width ?? 0),
    Number(pkg.height ?? 0),
  ]
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((left, right) => right - left);

  return {
    longest: dims[0] ?? 0,
    second: dims[1] ?? 0,
    shortest: dims[2] ?? 0,
    weightLb: Number(pkg.weightLb ?? 0),
  };
}

/** length + 2 * (width + height), using longest side as length. */
export function lengthPlusGirth(longest, second, shortest) {
  return longest + 2 * (second + shortest);
}

/**
 * EasyPost additional_handling — longest side > 60", second-longest > 30", or weight > 70 lb.
 * @param {{ length?: number, width?: number, height?: number, weightLb?: number }} pkg
 */
export function needsAdditionalHandling(pkg) {
  const {longest, second, weightLb} = normalizeParcelDimensions(pkg);
  return longest > 60 || second > 30 || weightLb > 70;
}

/**
 * Whether the box exceeds standard Canadian parcel carrier limits.
 * @param {{ length?: number, width?: number, height?: number, weightLb?: number }} pkg
 */
export function exceedsCanadianParcelLimits(pkg) {
  const {longest, second, shortest, weightLb} = normalizeParcelDimensions(pkg);
  const girth = lengthPlusGirth(longest, second, shortest);

  return (
    longest > CANADIAN_PARCEL_LIMITS.maxLengthIn ||
    girth > CANADIAN_PARCEL_LIMITS.maxLengthPlusGirthIn ||
    weightLb > CANADIAN_PARCEL_LIMITS.maxWeightLb
  );
}

export function exceedsCanadaPostParcelLimits(pkg) {
  const {longest, second, shortest, weightLb} = normalizeParcelDimensions(pkg);
  const girth = lengthPlusGirth(longest, second, shortest);

  return (
    girth > CANADA_POST_PARCEL_LIMITS.maxLengthPlusGirthIn ||
    weightLb > CANADA_POST_PARCEL_LIMITS.maxWeightLb
  );
}

/** Museum-tier and other packages that exceed parcel network limits need LTL/freight. */
export function requiresFreightShipping(pkg) {
  if (pkg?.sizeName && FREIGHT_SIZE_TIERS.has(String(pkg.sizeName))) {
    return true;
  }
  return exceedsCanadianParcelLimits(pkg);
}

/**
 * EasyPost shipment options for oversized / heavy parcels.
 * @param {{ length?: number, width?: number, height?: number, weightLb?: number }} pkg
 */
export function buildEasypostShipmentOptions(pkg) {
  if (!needsAdditionalHandling(pkg)) {
    return undefined;
  }

  return {additional_handling: true};
}
