import {
  carrierPreferenceMatches,
  carriersForPickupWorkflow,
  defaultOversizedCarriers,
  defaultPreferredCarriers,
  filterPickupSupportedCarriers,
  filterPickupSupportedRates,
} from './easypost-carriers.mjs';
import {
  exceedsCanadianParcelLimits,
  needsAdditionalHandling,
  normalizeParcelDimensions,
  lengthPlusGirth,
} from './easypost-parcel.mjs';

function normalizeKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function parseEnvCarrierMap() {
  const raw = process.env.EASYPOST_CHECKOUT_CARRIER_MAP?.trim();
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    throw new Error('EASYPOST_CHECKOUT_CARRIER_MAP must be valid JSON');
  }
}

/**
 * Primary shipping method the customer selected at Shopify checkout.
 * @param {Record<string, unknown>} order
 */
export function selectedShippingLine(order) {
  const lines = (order.shipping_lines ?? []).filter((line) => !line.is_removed);
  if (!lines.length) return null;
  if (lines.length === 1) return lines[0];

  return lines.reduce((best, line) =>
    Number(line.price ?? 0) > Number(best.price ?? 0) ? line : best,
  );
}

/**
 * Preferred EasyPost carriers for an order based on checkout selection + env map.
 * @param {Record<string, unknown>} order
 * @param {{ length?: number, width?: number, height?: number, weightLb?: number } | null | undefined} [pkg]
 */
export function resolveEasypostCarrierPreference(order, pkg = null) {
  const line = selectedShippingLine(order);
  const map = parseEnvCarrierMap();
  const defaultCarriers = defaultPreferredCarriers();

  const checkoutShipping = line
    ? {
        title: line.title ?? null,
        code: line.code ?? null,
        source: line.source ?? null,
        price: line.price ?? null,
      }
    : null;

  const candidates = [line?.code, line?.title, normalizeKey(line?.code), normalizeKey(line?.title)].filter(
    Boolean,
  );

  for (const candidate of candidates) {
    const mapped = map[candidate] ?? map[normalizeKey(candidate)];
    if (mapped) {
      const carriers = filterPickupSupportedCarriers(
        String(mapped)
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean),
      );
      const resolved = {
        carriers: carriers.length ? carriers : defaultCarriers,
        checkoutShipping,
        resolutionSource: 'env_carrier_map',
        pickupCapableOnly: true,
      };
      return applyOversizedCarrierPreference(pkg, resolved);
    }
  }

  return applyOversizedCarrierPreference(pkg, {
    carriers: defaultCarriers,
    checkoutShipping,
    resolutionSource: 'env_default',
    pickupCapableOnly: true,
  });
}

/**
 * @param {{ length?: number, width?: number, height?: number, weightLb?: number } | null | undefined} pkg
 * @param {{ carriers: string[], checkoutShipping: Record<string, unknown> | null, resolutionSource: string }} preference
 */
function applyOversizedCarrierPreference(pkg, preference) {
  if (!pkg || !needsAdditionalHandling(pkg)) {
    return {...preference, oversized: false};
  }

  const {longest, second, shortest} = normalizeParcelDimensions(pkg);
  const girth = lengthPlusGirth(longest, second, shortest);

  return {
    ...preference,
    carriers: carriersForPickupWorkflow(defaultOversizedCarriers()),
    oversized: true,
    oversizedDetails: {
      lengthPlusGirthIn: girth,
      exceedsParcelLimits: exceedsCanadianParcelLimits(pkg),
    },
    resolutionSource: `${preference.resolutionSource}_oversized`,
  };
}

/**
 * @param {Array<Record<string, unknown>>} rates
 * @param {{ carriers?: string[], service?: string | null }} preference
 */
export function pickEasypostRate(rates, preference = {}) {
  const pickupCapable = filterPickupSupportedRates(rates);
  if (!pickupCapable.length) {
    return null;
  }

  const carriers = preference.carriers ?? [];
  let pool = pickupCapable;

  if (carriers.length) {
    const preferred = pickupCapable.filter((rate) =>
      carriers.some((carrier) => carrierPreferenceMatches(carrier, rate.carrier)),
    );
    if (preferred.length) {
      pool = preferred;
    }
  }

  pool.sort((left, right) => Number(left.rate) - Number(right.rate));
  return pool[0] ?? null;
}

export function formatEasypostRateForAirtable(rate) {
  if (!rate) return '';
  const carrier = rate.carrier ?? 'Carrier';
  const service = rate.service ?? '';
  return service ? `${carrier} ${service}` : carrier;
}
