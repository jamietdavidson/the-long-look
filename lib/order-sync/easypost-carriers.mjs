/**
 * EasyPost carriers that support scheduled pickup via POST /pickups.
 * Purolator is parcel-only through EasyPost — no pickup API.
 * @see https://docs.easypost.com/docs/pickups
 */
const PICKUP_CAPABLE_CARRIER_PATTERNS = [
  /canadapost/i,
  /ups/i,
  /fedex/i,
  /dhlexpress/i,
  /dhlecommerce/i,
  /^dhl$/i,
];

const PICKUP_INCAPABLE_CARRIER_PATTERNS = [/purolator/i];

/** @param {string | null | undefined} carrier */
export function isPickupSupportedCarrier(carrier) {
  const normalized = String(carrier ?? '').trim();
  if (!normalized) return false;
  if (PICKUP_INCAPABLE_CARRIER_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return false;
  }
  return PICKUP_CAPABLE_CARRIER_PATTERNS.some((pattern) => pattern.test(normalized));
}

/** @param {string[]} carriers */
export function filterPickupSupportedCarriers(carriers) {
  return [...new Set((carriers ?? []).filter((carrier) => isPickupSupportedCarrier(carrier)))];
}

/** @param {Array<Record<string, unknown>>} rates */
export function filterPickupSupportedRates(rates) {
  return [...(rates ?? [])].filter(
    (rate) => rate?.id && rate?.rate != null && isPickupSupportedCarrier(rate.carrier),
  );
}

/** @param {string} preferred @param {string} rateCarrier */
export function carrierPreferenceMatches(preferred, rateCarrier) {
  const left = String(preferred ?? '').toLowerCase();
  const right = String(rateCarrier ?? '').toLowerCase();
  if (!left || !right) return false;
  return right.includes(left) || left.includes(right);
}

export function parsePreferredCarrierList() {
  return (process.env.EASYPOST_PREFERRED_CARRIERS?.trim() ?? 'CanadaPost,UPS,FedExDefault')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function defaultPreferredCarriers() {
  const configured = filterPickupSupportedCarriers(parsePreferredCarrierList());
  return configured.length ? configured : ['CanadaPost', 'UPS', 'FedExDefault'];
}

export function parseOversizedCarrierList() {
  return (process.env.EASYPOST_OVERSIZED_CARRIERS?.trim() ?? 'UPS,FedExDefault')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Oversized parcels that can still be picked up via EasyPost (excludes Canada Post L+g 118"). */
export function defaultOversizedCarriers() {
  const configured = filterPickupSupportedCarriers(parseOversizedCarrierList());
  return configured.length ? configured : ['UPS', 'FedExDefault'];
}

/**
 * Keep only pickup-capable carrier preferences.
 * @param {string[]} carriers
 */
export function carriersForPickupWorkflow(carriers) {
  const pickupCapable = filterPickupSupportedCarriers(carriers);
  return pickupCapable.length ? pickupCapable : defaultPreferredCarriers();
}
