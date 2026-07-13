import {EASYPOST, SHIPPING} from './config.js';
import {buyEasypostShipment, createEasypostShipment, downloadEasypostLabelPdf} from './easypost-client.mjs';
import {
  buildEasypostShipmentOptions,
  exceedsCanadianParcelLimits,
  normalizeParcelDimensions,
  lengthPlusGirth,
} from './easypost-parcel.mjs';
import {
  formatEasypostRateForAirtable,
  pickEasypostRate,
  resolveEasypostCarrierPreference,
} from './shipping-from-order.mjs';
import {filterPickupSupportedRates} from './easypost-carriers.mjs';

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

function formatRateErrors(messages) {
  const errors = (messages ?? [])
    .filter((message) => message?.type === 'rate_error')
    .map((message) => `${message.carrier}: ${message.message}`);
  return errors.length ? errors.join('; ') : null;
}

/**
 * Purchase one EasyPost label for a package on a Shopify order.
 * @param {Record<string, unknown>} order
 * @param {Record<string, unknown>} pkg
 * @param {{ fulfillmentRecordId?: string | null }} [context]
 */
export async function createEasypostLabelForPackage(order, pkg, context = {}) {
  if (!EASYPOST.isConfigured()) {
    return {
      skipped: true,
      reason: 'EasyPost is not configured (set EASYPOST_API_KEY)',
    };
  }

  const preference = resolveEasypostCarrierPreference(order, pkg);
  const shipmentOptions = buildEasypostShipmentOptions(pkg);
  const shipment = await createEasypostShipment({
    from_address: buildFromAddress(),
    to_address: buildToAddress(order.shipping_address),
    parcel: buildParcel(pkg),
    ...(shipmentOptions ? {options: shipmentOptions} : {}),
    reference: context.fulfillmentRecordId ?? order.name ?? order.id ?? undefined,
  });

  const rate = pickEasypostRate(shipment.rates, preference);
  if (!rate) {
    const rateErrors = formatRateErrors(shipment.messages);
    const pickupCapableRates = filterPickupSupportedRates(shipment.rates);
    const {longest, second, shortest} = normalizeParcelDimensions(pkg);
    const girth = lengthPlusGirth(longest, second, shortest);
    const limitNote = exceedsCanadianParcelLimits(pkg)
      ? `Package is ${longest}×${second}×${shortest}" (L+g ${girth}") — exceeds Canadian parcel network limit of 165" L+g`
      : null;

    return {
      skipped: true,
      reason:
        [
          rateErrors,
          limitNote,
          pickupCapableRates.length
            ? null
            : 'No pickup-capable carrier rates returned (need Canada Post, UPS, or FedEx — Purolator cannot be scheduled for pickup)',
          'EasyPost returned no rates for this package and destination',
        ]
          .filter(Boolean)
          .join('; '),
      easypostShipmentId: shipment.id ?? null,
      oversized: preference.oversized ?? false,
    };
  }

  const purchased = await buyEasypostShipment(shipment.id, rate.id);
  const labelUrl = purchased.postage_label?.label_url;
  if (!labelUrl) {
    throw new Error('EasyPost purchase succeeded but returned no label URL');
  }

  const labelPdf = await downloadEasypostLabelPdf(labelUrl);
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
    rateSelection: preference.resolutionSource,
    oversized: preference.oversized ?? false,
    additionalHandling: Boolean(shipmentOptions?.additional_handling),
    rateSelectionNote:
      preference.carriers?.length && !preference.carriers.some((carrier) =>
        String(rate.carrier ?? '').toLowerCase().includes(carrier.toLowerCase()),
      )
        ? `No rate matched preferred carriers; used ${rate.carrier} ${rate.service}`
        : null,
    package: pkg,
  };
}
