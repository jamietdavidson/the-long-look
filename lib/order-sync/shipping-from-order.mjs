import {SHOPIFY} from './config.js';

/** Shopify Shipping service codes for DHL Express Canada. */
const DHL_SERVICE_BY_CODE = new Map(
  Object.entries({
    dhl_canada_express_worldwide: 'dhl_canada_express_worldwide',
    dhl_canada_express_worldwide_documents: 'dhl_canada_express_worldwide_documents',
    dhl_canada_express_worldwide_1200: 'dhl_canada_express_worldwide_1200',
    dhl_canada_express_worldwide_1030: 'dhl_canada_express_worldwide_1030',
    dhl_canada_express_worldwide_900: 'dhl_canada_express_worldwide_900',
    dhl_canada_economy_select: 'dhl_canada_economy_select',
    P: 'dhl_canada_express_worldwide',
    N: 'dhl_canada_express_domestic',
    H: 'dhl_canada_economy_select',
  }),
);

const DHL_TITLE_PATTERNS = [
  [/dhl\s*express\s*worldwide/i, 'dhl_canada_express_worldwide'],
  [/dhl\s*express\s*domestic/i, 'dhl_canada_express_domestic'],
  [/dhl\s*economy\s*select/i, 'dhl_canada_economy_select'],
  [/dhl\s*express/i, 'dhl_canada_express_worldwide'],
];

function normalizeKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function parseEnvShippingCodeMap() {
  const raw = process.env.SHOPIFY_SHIPPING_CODE_MAP?.trim();
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    throw new Error('SHOPIFY_SHIPPING_CODE_MAP must be valid JSON');
  }
}

function dhlServiceFromCode(code) {
  if (!code) return null;
  const trimmed = String(code).trim();
  const lower = trimmed.toLowerCase();
  if (DHL_SERVICE_BY_CODE.has(lower)) return DHL_SERVICE_BY_CODE.get(lower);
  if (DHL_SERVICE_BY_CODE.has(trimmed.toUpperCase())) {
    return DHL_SERVICE_BY_CODE.get(trimmed.toUpperCase());
  }
  if (/^dhl_/i.test(trimmed)) return lower;
  if (trimmed.length > 2 && !['standard', 'shipping'].includes(lower)) {
    return trimmed;
  }
  return null;
}

function dhlServiceFromTitle(title) {
  if (!title) return null;
  for (const [pattern, serviceCode] of DHL_TITLE_PATTERNS) {
    if (pattern.test(title)) return serviceCode;
  }
  return null;
}

function dhlServiceFromEnvMap({code, title}) {
  const map = parseEnvShippingCodeMap();
  const candidates = [code, title, normalizeKey(code), normalizeKey(title)].filter(Boolean);

  for (const candidate of candidates) {
    const mapped = map[candidate] ?? map[normalizeKey(candidate)];
    if (mapped) {
      return dhlServiceFromCode(mapped) ?? String(mapped).trim().toLowerCase();
    }
  }

  return null;
}

function isExplicitNonDhlCarrier(line) {
  const source = normalizeKey(line?.source);
  if (!source || source === 'shopify') return false;
  return ['fedex', 'ups', 'usps', 'purolator', 'canada post', 'canadapost'].some((carrier) =>
    source.includes(carrier),
  );
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
 * Resolve Shopify Shipping preferred rate for DHL Express label purchase.
 * @param {Record<string, unknown>} order
 */
export function resolveShopifyShippingRateFromOrder(order) {
  const line = selectedShippingLine(order);
  const carrierCode = SHOPIFY.dhlCarrierCode;
  const defaultServiceCode = SHOPIFY.dhlDefaultServiceCode;
  const shopifyShipping = line
    ? {
        title: line.title ?? null,
        code: line.code ?? null,
        source: line.source ?? null,
        carrierIdentifier: line.carrier_identifier ?? null,
        price: line.price ?? null,
      }
    : null;

  if (!line) {
    return {
      carrierCode,
      serviceCode: defaultServiceCode,
      shopifyShipping,
      resolutionSource: 'env_default',
      resolutionNote: 'Order has no shipping line; using SHOPIFY_DHL_DEFAULT_SERVICE_CODE',
    };
  }

  if (isExplicitNonDhlCarrier(line)) {
    return {
      skipped: true,
      reason: `Customer selected ${line.source} (${line.title}); label purchase uses Shopify Shipping with DHL Express only`,
      shopifyShipping,
      resolutionSource: 'unsupported_carrier',
    };
  }

  const fromCode = dhlServiceFromCode(line.code);
  if (fromCode) {
    return {
      carrierCode,
      serviceCode: fromCode,
      shopifyShipping,
      resolutionSource: 'shopify_shipping_code',
    };
  }

  const fromTitle = dhlServiceFromTitle(line.title);
  if (fromTitle) {
    return {
      carrierCode,
      serviceCode: fromTitle,
      shopifyShipping,
      resolutionSource: 'shopify_shipping_title',
    };
  }

  const fromEnvMap = dhlServiceFromEnvMap({
    code: line.code,
    title: line.title,
  });
  if (fromEnvMap) {
    return {
      carrierCode,
      serviceCode: fromEnvMap,
      shopifyShipping,
      resolutionSource: 'env_code_map',
    };
  }

  return {
    carrierCode,
    serviceCode: defaultServiceCode,
    shopifyShipping,
    resolutionSource: 'env_fallback',
    resolutionNote: `Could not map Shopify shipping "${line.title}" (code: ${line.code ?? 'n/a'}) to a DHL service; using SHOPIFY_DHL_DEFAULT_SERVICE_CODE. Set SHOPIFY_SHIPPING_CODE_MAP for flat rates.`,
  };
}

export function formatShopifyShippingForAirtable(resolved) {
  const title = resolved.shopifyShipping?.title;
  const serviceCode = resolved.serviceCode;
  if (title && serviceCode && !String(title).toLowerCase().includes(serviceCode)) {
    return `${title} (${serviceCode})`;
  }
  return title ?? serviceCode ?? '';
}
