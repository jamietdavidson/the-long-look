import {EASYPOST} from './config.js';
import {isPickupSupportedCarrier} from './easypost-carriers.mjs';
import {
  buyEasypostPickup,
  createEasypostPickup,
  retrieveEasypostShipment,
} from './easypost-client.mjs';

const PICKUP_WINDOW_HOURS = Number(process.env.EASYPOST_PICKUP_WINDOW_HOURS ?? 4);

function buildPickupAddress() {
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
    phone: from.phone || undefined,
    email: from.email || undefined,
  };
}

function carrierMatches(rateCarrier, shipmentCarrier) {
  const left = String(rateCarrier ?? '').toLowerCase();
  const right = String(shipmentCarrier ?? '').toLowerCase();
  if (!left || !right) return false;
  return left.includes(right) || right.includes(left);
}

function pickupSupportedCarrier(carrier) {
  return isPickupSupportedCarrier(carrier);
}

function formatPickupWindow(date, hours) {
  const start = new Date(date);
  const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
  return {
    min_datetime: start.toISOString(),
    max_datetime: end.toISOString(),
  };
}

function pickPickupRate(rates, carrier) {
  const available = [...(rates ?? [])].filter((rate) => rate?.carrier && rate?.service);
  if (!available.length) return null;

  const preferred = available.filter((rate) => carrierMatches(rate.carrier, carrier));
  const pool = preferred.length ? preferred : available;
  pool.sort((left, right) => Number(left.rate) - Number(right.rate));
  return pool[0] ?? null;
}

/**
 * Schedule a carrier pickup in EasyPost for a labeled fulfillment.
 * @param {{
 *   fulfillmentRecordId: string;
 *   scheduledAt: Date;
 *   pickupReference?: string | null;
 * }} params
 */
export async function scheduleEasypostCarrierPickup(params) {
  const {fulfillmentRecordId, scheduledAt, pickupReference = null} = params;

  if (!EASYPOST.isConfigured()) {
    return {
      skipped: true,
      reason: 'EasyPost is not configured (set EASYPOST_API_KEY)',
    };
  }

  if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
    return {skipped: true, reason: 'Pickup slot is missing a valid scheduled time'};
  }

  let shipment;
  try {
    shipment = await retrieveEasypostShipment(fulfillmentRecordId);
  } catch (error) {
    return {
      skipped: true,
      reason: `Could not load EasyPost shipment for fulfillment ${fulfillmentRecordId}: ${error.message}`,
    };
  }

  const carrier = shipment.selected_rate?.carrier ?? shipment.rates?.[0]?.carrier ?? null;
  if (!carrier) {
    return {skipped: true, reason: 'EasyPost shipment has no purchased carrier rate'};
  }

  if (!pickupSupportedCarrier(carrier)) {
    return {
      skipped: true,
      reason: `Carrier ${carrier} does not support scheduled pickup via EasyPost`,
      carrier,
      easypostShipmentId: shipment.id ?? null,
    };
  }

  const window = formatPickupWindow(scheduledAt, PICKUP_WINDOW_HOURS);
  const pickup = await createEasypostPickup({
    reference: pickupReference ?? `pickup-${fulfillmentRecordId}`,
    shipment: {id: shipment.id},
    address: buildPickupAddress(),
    is_account_address: true,
    instructions: 'Fine art prints — handle with care',
    ...window,
  });

  const rate = pickPickupRate(pickup.pickup_rates, carrier);
  if (!rate) {
    const messages = (pickup.messages ?? [])
      .map((message) => `${message.carrier}: ${message.message}`)
      .join('; ');
    return {
      skipped: true,
      reason: messages || 'EasyPost returned no pickup rates for this shipment and time window',
      easypostPickupId: pickup.id ?? null,
      carrier,
      easypostShipmentId: shipment.id ?? null,
    };
  }

  const purchased = await buyEasypostPickup(pickup.id, rate.carrier, rate.service);

  return {
    action: 'scheduled',
    easypostPickupId: purchased.id ?? pickup.id,
    confirmation: purchased.confirmation ?? null,
    status: purchased.status ?? null,
    carrier: rate.carrier,
    service: rate.service,
    pickupCost: Number(rate.rate),
    easypostShipmentId: shipment.id ?? null,
    minDatetime: window.min_datetime,
    maxDatetime: window.max_datetime,
  };
}
