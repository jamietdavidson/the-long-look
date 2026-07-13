import {axios} from '../http.mjs';
import {AIRTABLE, SHOPIFY_ORDER_ID_PREFIX} from './config.js';

function requirePat() {
  const token = process.env.AIRTABLE_PAT?.trim();
  if (!token) throw new Error('Missing AIRTABLE_PAT');
  return token;
}

export async function airtableRequest($, {method = 'get', path, data}) {
  const token = requirePat();
  try {
    return await axios($, {
      method,
      url: `https://api.airtable.com/v0${path}`,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data,
    });
  } catch (error) {
    const status = error?.response?.status;
    const body = error?.response?.data;
    throw new Error(
      `Airtable ${method.toUpperCase()} ${path} failed (${status ?? 'unknown'}): ${JSON.stringify(body ?? error.message)}`,
    );
  }
}

export async function findOrderByShopifyId($, shopifyOrderId) {
  const idField = AIRTABLE.fields.shopifyOrderId;
  const formulas = [
    `{${idField}} = "${shopifyOrderId}"`,
    `FIND("${SHOPIFY_ORDER_ID_PREFIX}${shopifyOrderId}", {${AIRTABLE.fields.notes}})`,
  ];

  for (const formula of formulas) {
    const params = new URLSearchParams({
      filterByFormula: formula,
      maxRecords: '1',
    });

    const response = await airtableRequest($, {
      path: `/${AIRTABLE.baseId}/${AIRTABLE.ordersTableId}?${params}`,
    });

    if (response.records?.[0]) {
      return response.records[0];
    }
  }

  return null;
}

export async function createOrderRecord($, fields) {
  const response = await airtableRequest($, {
    method: 'post',
    path: `/${AIRTABLE.baseId}/${AIRTABLE.ordersTableId}`,
    data: {records: [{fields}]},
  });
  return response.records?.[0] ?? null;
}

export async function updateOrderRecord($, recordId, fields) {
  const response = await airtableRequest($, {
    method: 'patch',
    path: `/${AIRTABLE.baseId}/${AIRTABLE.ordersTableId}`,
    data: {records: [{id: recordId, fields}]},
  });
  return response.records?.[0] ?? null;
}

export async function getOrderRecord($, recordId) {
  const response = await airtableRequest($, {
    path: `/${AIRTABLE.baseId}/${AIRTABLE.ordersTableId}/${recordId}`,
  });
  return response ?? null;
}

export async function listFulfillmentsForOrder($, orderRecordId) {
  const ff = AIRTABLE.fulfillmentFields;
  const params = new URLSearchParams({
    filterByFormula: `{${ff.order}} = "${orderRecordId}"`,
    pageSize: '100',
  });

  const records = [];
  let offset = null;

  do {
    if (offset) params.set('offset', offset);
    const response = await airtableRequest($, {
      path: `/${AIRTABLE.baseId}/${AIRTABLE.fulfillmentsTableId}?${params}`,
    });
    records.push(...(response.records ?? []));
    offset = response.offset ?? null;
  } while (offset);

  return records;
}

export async function createFulfillmentRecords($, fieldsList) {
  if (!fieldsList.length) return [];

  const response = await airtableRequest($, {
    method: 'post',
    path: `/${AIRTABLE.baseId}/${AIRTABLE.fulfillmentsTableId}`,
    data: {records: fieldsList.map((fields) => ({fields}))},
  });
  return response.records ?? [];
}

export async function updateFulfillmentRecord($, recordId, fields) {
  const response = await airtableRequest($, {
    method: 'patch',
    path: `/${AIRTABLE.baseId}/${AIRTABLE.fulfillmentsTableId}`,
    data: {records: [{id: recordId, fields}]},
  });
  return response.records?.[0] ?? null;
}

export async function getFulfillmentRecord($, recordId) {
  const response = await airtableRequest($, {
    path: `/${AIRTABLE.baseId}/${AIRTABLE.fulfillmentsTableId}/${recordId}`,
  });
  return response ?? null;
}

/** Fulfillments ready for a shipping label (Status = In Progress, no label URL yet). */
export async function listFulfillmentsNeedingLabels($) {
  const ff = AIRTABLE.fulfillmentFields;
  const formula = `AND({${ff.status}} = "${AIRTABLE.fulfillmentStatus.inProgress}", {${ff.shippingLabel}} = BLANK())`;
  const params = new URLSearchParams({
    filterByFormula: formula,
    pageSize: '100',
  });

  const records = [];
  let offset = null;

  do {
    if (offset) params.set('offset', offset);
    const response = await airtableRequest($, {
      path: `/${AIRTABLE.baseId}/${AIRTABLE.fulfillmentsTableId}?${params}`,
    });
    records.push(...(response.records ?? []));
    offset = response.offset ?? null;
  } while (offset);

  return records;
}
