import {EASYPOST, SHIPPING} from './config.js';
import {
  buyEnterpriseShipment,
  createEnterpriseShipment,
  downloadEnterpriseLabelPdf,
  isEasypostEnterpriseConfigured,
} from './easypost-enterprise-client.mjs';
import {
  lengthPlusGirth,
  normalizeParcelDimensions,
  requiresFreightShipping,
} from './easypost-parcel.mjs';
import {formatEasypostRateForAirtable} from './shipping-from-order.mjs';

const LTL_RATE_PATTERN = /ltl|freight|pallet|truckload|volume|standard freight/i;

function poundsToOunces(weightLb) {
  const pounds = Number(weightLb ?? SHIPPING.packageWeightLb);
  return Math.max(1, Math.round(pounds * 16));
}

function contactPhone(phone) {
  const normalized = String(phone ?? '').trim();
  if (normalized) return normalized;
  const fallback = String(EASYPOST.fromAddress.phone ?? '').trim();
  if (fallback) return fallback;
  throw new Error(
    'Missing contact phone for shipping (set EASYPOST_FROM_PHONE on the sender address)',
  );
}

function buildFromAddress() {
  const from = EASYPOST.fromAddress;
  return {
    name: from.name,
    company: from.company || undefined,
    street1: from.street1,
    street2: from.street2 || undefined,
    city: from.city,
    state: from.state,
    zip: from.zip,
    country: from.country,
    phone: contactPhone(from.phone),
    email: from.email || undefined,
  };
}

/** @param {Record<string, unknown> | null | undefined} address */
function buildToAddress(address) {
  if (!address) {
    throw new Error('Order is missing a shipping address');
  }

  return {
    name: address.name ?? `${address.first_name ?? ''} ${address.last_name ?? ''}`.trim(),
    company: address.company || undefined,
    street1: address.address1,
    street2: address.address2 || undefined,
    city: address.city,
    state: address.province_code ?? address.province,
    zip: address.zip,
    country: address.country_code ?? address.country,
    phone: contactPhone(address.phone),
  };
}

function buildParcel(pkg) {
  return {
    length: Number(pkg.length ?? SHIPPING.packageLengthIn),
    width: Number(pkg.width ?? SHIPPING.packageWidthIn),
    height: Number(pkg.height ?? SHIPPING.packageHeightIn),
    weight: poundsToOunces(pkg.weightLb),
  };
}

function buildFreightOptions(pkg) {
  const freightClass = process.env.EASYPOST_FREIGHT_CLASS?.trim() ?? '70';
  const instructions =
    process.env.EASYPOST_FREIGHT_HANDLING_INSTRUCTIONS?.trim() ??
    'Framed fine art — fragile, keep flat, do not stack';

  return {
    freight_class: freightClass,
    additional_handling: true,
    handling_instructions: instructions,
    content_description: pkg.sizeName ? `${pkg.sizeName} framed artwork` : 'Framed artwork',
  };
}

function formatRateErrors(messages) {
  const errors = (messages ?? [])
    .filter((message) => message?.type === 'rate_error')
    .map((message) => `${message.carrier}: ${message.message}`);
  return errors.length ? errors.join('; ') : null;
}

function pickFreightRate(rates) {
  const available = [...(rates ?? [])].filter((rate) => rate?.id && rate?.rate != null);
  if (!available.length) return null;

  const ltlPreferred = available.filter(
    (rate) =>
      LTL_RATE_PATTERN.test(String(rate.service ?? '')) ||
      LTL_RATE_PATTERN.test(String(rate.carrier ?? '')),
  );
  const pool = ltlPreferred.length ? ltlPreferred : available;
  pool.sort((left, right) => Number(left.rate) - Number(right.rate));
  return pool[0] ?? null;
}

/**
 * Quote and purchase an LTL/freight label via EasyPost Enterprise.
 * @param {Record<string, unknown>} order
 * @param {Record<string, unknown>} pkg
 * @param {{ fulfillmentRecordId?: string | null }} [context]
 */
export async function createEasypostFreightLabelForPackage(order, pkg, context = {}) {
  if (!isEasypostEnterpriseConfigured()) {
    return {
      skipped: true,
      reason:
        'EasyPost Enterprise is disabled. Set EASYPOST_ENTERPRISE_ENABLED=true and EASYPOST_ENTERPRISE_API_KEY to route Museum-tier shipments via LTL.',
    };
  }

  if (!requiresFreightShipping(pkg)) {
    return {
      skipped: true,
      reason: 'Package does not require freight shipping',
    };
  }

  const shipment = await createEnterpriseShipment({
    from_address: buildFromAddress(),
    to_address: buildToAddress(order.shipping_address),
    parcel: buildParcel(pkg),
    options: buildFreightOptions(pkg),
    reference: context.fulfillmentRecordId ?? order.name ?? order.id ?? undefined,
  });

  const rate = pickFreightRate(shipment.rates);
  if (!rate) {
    const {longest, second, shortest} = normalizeParcelDimensions(pkg);
    const girth = lengthPlusGirth(longest, second, shortest);

    return {
      skipped: true,
      reason:
        [
          formatRateErrors(shipment.messages),
          `No LTL/freight rates for ${pkg.sizeName ?? 'large'} package (${longest}×${second}×${shortest}", L+g ${girth}")`,
          'Confirm EasyPost Enterprise LTL carriers are enabled on your account',
        ]
          .filter(Boolean)
          .join('; '),
      easypostShipmentId: shipment.id ?? null,
      freight: true,
    };
  }

  const purchased = await buyEnterpriseShipment(shipment.id, rate.id);
  const labelUrl = purchased.postage_label?.label_url;
  if (!labelUrl) {
    throw new Error('EasyPost Enterprise purchase succeeded but returned no label URL');
  }

  const labelPdf = await downloadEnterpriseLabelPdf(labelUrl);
  const labelCost = Number(purchased.selected_rate?.rate ?? rate.rate);
  const labelCostCurrency = purchased.selected_rate?.currency ?? rate.currency ?? 'CAD';

  return {
    trackingNumber: String(purchased.tracking_code ?? ''),
    trackingCompany: String(purchased.selected_rate?.carrier ?? rate.carrier ?? ''),
    trackingUrl: purchased.tracker?.public_url ?? null,
    serviceLabel: formatEasypostRateForAirtable(purchased.selected_rate ?? rate),
    serviceCode: purchased.selected_rate?.service ?? rate.service ?? null,
    labelPdf,
    labelUrl,
    labelCost: Number.isFinite(labelCost) ? labelCost : null,
    labelCostCurrency,
    easypostShipmentId: purchased.id ?? shipment.id,
    freight: true,
    rateSelection: 'enterprise_freight',
    package: pkg,
  };
}
