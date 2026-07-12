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
