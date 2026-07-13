const DEFAULT_API_BASE = 'https://api.easypost.com/v2';

export function easypostEnterpriseConfig() {
  return {
    apiKey: process.env.EASYPOST_ENTERPRISE_API_KEY?.trim() ?? '',
    apiBase: process.env.EASYPOST_ENTERPRISE_API_BASE?.trim() || DEFAULT_API_BASE,
  };
}

export function isEasypostEnterpriseEnabled() {
  const raw = process.env.EASYPOST_ENTERPRISE_ENABLED?.trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function isEasypostEnterpriseConfigured() {
  return isEasypostEnterpriseEnabled() && Boolean(easypostEnterpriseConfig().apiKey);
}

function authHeader(apiKey) {
  return `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
}

/**
 * EasyPost Enterprise / GlobalShip API (sales-enabled accounts).
 * EasyPost may provide a custom base URL — set EASYPOST_ENTERPRISE_API_BASE.
 * @param {'GET' | 'POST'} method
 * @param {string} path
 * @param {Record<string, unknown> | undefined} body
 */
export async function easypostEnterpriseRequest(method, path, body) {
  const {apiKey, apiBase} = easypostEnterpriseConfig();
  if (!apiKey) {
    throw new Error('Missing EASYPOST_ENTERPRISE_API_KEY');
  }

  const response = await fetch(`${apiBase}${path}`, {
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
    throw new Error(`EasyPost Enterprise ${method} ${path} failed (${response.status}): ${detail}`);
  }

  return parsed;
}

/** @param {Record<string, unknown>} shipmentInput */
export async function createEnterpriseShipment(shipmentInput) {
  return easypostEnterpriseRequest('POST', '/shipments', {shipment: shipmentInput});
}

/** @param {string} shipmentId @param {string} rateId */
export async function buyEnterpriseShipment(shipmentId, rateId) {
  return easypostEnterpriseRequest('POST', `/shipments/${shipmentId}/buy`, {
    rate: {id: rateId},
  });
}

/** @param {string} idOrReference */
export async function retrieveEnterpriseShipment(idOrReference) {
  return easypostEnterpriseRequest(
    'GET',
    `/shipments/${encodeURIComponent(idOrReference)}`,
  );
}

/** @param {string} url */
export async function downloadEnterpriseLabelPdf(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download EasyPost Enterprise label (${response.status})`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) {
    throw new Error('Downloaded EasyPost Enterprise label PDF was empty');
  }
  return buffer;
}
