const API_BASE = 'https://api.easypost.com/v2';

function requireApiKey() {
  const apiKey = process.env.EASYPOST_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Missing EASYPOST_API_KEY');
  }
  return apiKey;
}

function authHeader(apiKey) {
  return `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
}

/**
 * @param {'GET' | 'POST'} method
 * @param {string} path
 * @param {Record<string, unknown> | undefined} body
 */
export async function easypostRequest(method, path, body) {
  const apiKey = requireApiKey();
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: authHeader(apiKey),
      'Content-Type': 'application/json',
    },
    body: body == null ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = {raw: text};
  }

  if (!response.ok) {
    const detail =
      parsed?.error?.message ??
      parsed?.errors?.map((error) => error.message).join('; ') ??
      text;
    throw new Error(`EasyPost ${method} ${path} failed (${response.status}): ${detail}`);
  }

  return parsed;
}

/** @param {Record<string, unknown>} shipmentInput */
export async function createEasypostShipment(shipmentInput) {
  const shipment = await easypostRequest('POST', '/shipments', {shipment: shipmentInput});
  return shipment;
}

/** @param {string} shipmentId @param {string} rateId */
export async function buyEasypostShipment(shipmentId, rateId) {
  return easypostRequest('POST', `/shipments/${shipmentId}/buy`, {
    rate: {id: rateId},
  });
}

/** @param {string} idOrReference */
export async function retrieveEasypostShipment(idOrReference) {
  return easypostRequest('GET', `/shipments/${encodeURIComponent(idOrReference)}`);
}

/** @param {Record<string, unknown>} pickupInput */
export async function createEasypostPickup(pickupInput) {
  const response = await easypostRequest('POST', '/pickups', {pickup: pickupInput});
  return response;
}

/** @param {string} pickupId @param {string} carrier @param {string} service */
export async function buyEasypostPickup(pickupId, carrier, service) {
  return easypostRequest('POST', `/pickups/${pickupId}/buy`, {carrier, service});
}

/** @param {string} url */
export async function downloadEasypostLabelPdf(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download EasyPost label (${response.status})`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) {
    throw new Error('Downloaded EasyPost label PDF was empty');
  }
  return buffer;
}
