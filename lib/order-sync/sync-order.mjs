import {AIRTABLE, SHOPIFY_ORDER_ID_PREFIX} from './config.js';
import {
  createOrderRecord,
  findOrderByShopifyId,
  updateOrderRecord,
} from './airtable.mjs';

function line(value) {
  return value == null || value === '' ? null : String(value);
}

function formatMoney(amount, currency) {
  if (amount == null || amount === '') return null;
  const code = currency ?? 'USD';
  return `${amount} ${code}`;
}

/**
 * @param {Record<string, unknown>} order Shopify order webhook payload
 */
export function formatOrderNotes(order) {
  const shopifyOrderId = String(order.id ?? '');
  const lines = [
    `${SHOPIFY_ORDER_ID_PREFIX}${shopifyOrderId}`,
    order.admin_graphql_api_id
      ? `shopify_graphql_id: ${order.admin_graphql_api_id}`
      : null,
    order.email ? `customer_email: ${order.email}` : null,
    order.contact_email ? `contact_email: ${order.contact_email}` : null,
    order.financial_status
      ? `financial_status: ${order.financial_status}`
      : null,
    order.fulfillment_status
      ? `fulfillment_status: ${order.fulfillment_status}`
      : null,
    order.total_price
      ? `total: ${formatMoney(order.total_price, order.currency)}`
      : null,
    order.subtotal_price
      ? `subtotal: ${formatMoney(order.subtotal_price, order.currency)}`
      : null,
    order.total_tax
      ? `tax: ${formatMoney(order.total_tax, order.currency)}`
      : null,
    order.total_shipping_price_set?.shop_money?.amount
      ? `shipping: ${formatMoney(
          order.total_shipping_price_set.shop_money.amount,
          order.total_shipping_price_set.shop_money.currency_code,
        )}`
      : null,
    '',
    'Line items:',
  ].filter((entry) => entry !== null);

  const items = Array.isArray(order.line_items) ? order.line_items : [];
  if (items.length === 0) {
    lines.push('(none)');
  } else {
    for (const item of items) {
      const title = line(item.title) ?? 'Item';
      const variant = line(item.variant_title);
      const sku = line(item.sku);
      const qty = item.quantity ?? 1;
      const price = formatMoney(item.price, order.currency);
      const bits = [title];
      if (variant) bits.push(`(${variant})`);
      bits.push(`× ${qty}`);
      if (price) bits.push(`@ ${price}`);
      if (sku) bits.push(`SKU ${sku}`);
      lines.push(`- ${bits.join(' ')}`);
    }
  }

  const shipping = order.shipping_address;
  if (shipping && typeof shipping === 'object') {
    lines.push(
      '',
      'Ship to:',
      [
        shipping.name,
        shipping.company,
        shipping.address1,
        shipping.address2,
        [shipping.city, shipping.province, shipping.zip].filter(Boolean).join(', '),
        shipping.country,
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }

  if (order.note) {
    lines.push('', 'Customer note:', String(order.note));
  }

  return lines.join('\n');
}

export function orderRecordName(order) {
  if (order.name) return String(order.name);
  if (order.order_number != null) return `#${order.order_number}`;
  return `Order ${order.id}`;
}

/**
 * Create or update an Airtable Orders row from a Shopify order payload.
 * @param {Record<string, unknown>} order
 */
export async function syncShopifyOrderToAirtable(order) {
  const shopifyOrderId = String(order.id ?? '');
  if (!shopifyOrderId) {
    throw new Error('Shopify order payload is missing id');
  }

  const $ = {};
  const fields = {
    [AIRTABLE.fields.name]: orderRecordName(order),
    [AIRTABLE.fields.notes]: formatOrderNotes(order),
    [AIRTABLE.fields.status]: AIRTABLE.defaultStatus,
  };

  const existing = await findOrderByShopifyId($, shopifyOrderId);
  if (existing?.id) {
    const updated = await updateOrderRecord($, existing.id, {
      [AIRTABLE.fields.name]: fields[AIRTABLE.fields.name],
      [AIRTABLE.fields.notes]: fields[AIRTABLE.fields.notes],
    });
    return {
      action: 'updated',
      airtableRecordId: updated?.id ?? existing.id,
      shopifyOrderId,
      orderName: fields[AIRTABLE.fields.name],
    };
  }

  const created = await createOrderRecord($, fields);
  return {
    action: 'created',
    airtableRecordId: created?.id ?? null,
    shopifyOrderId,
    orderName: fields[AIRTABLE.fields.name],
  };
}
