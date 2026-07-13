import {AIRTABLE, SHOPIFY_ORDER_ID_PREFIX} from './config.js';

function text(value) {
  return value == null || value === '' ? undefined : String(value);
}

function money(value) {
  if (value == null || value === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function formatLineItems(order) {
  const items = Array.isArray(order.line_items) ? order.line_items : [];
  if (items.length === 0) return '(none)';

  return items
    .map((item) => {
      const title = text(item.title) ?? 'Item';
      const variant = text(item.variant_title);
      const sku = text(item.sku);
      const qty = item.quantity ?? 1;
      const price = money(item.price);
      const bits = [title];
      if (variant) bits.push(`(${variant})`);
      bits.push(`× ${qty}`);
      if (price != null) bits.push(`@ $${price.toFixed(2)}`);
      if (sku) bits.push(`SKU ${sku}`);
      return bits.join(' ');
    })
    .join('\n');
}

function shippingAddress(order) {
  const address = order.shipping_address;
  if (!address || typeof address !== 'object') return null;
  return address;
}

export function orderRecordName(order) {
  if (order.name) return String(order.name);
  if (order.order_number != null) return `#${order.order_number}`;
  return `Order ${order.id}`;
}

export function estimatePackageWeightLb(order) {
  const items = Array.isArray(order.line_items) ? order.line_items : [];
  const perItem = Number(process.env.SHIPPING_WEIGHT_PER_ITEM_LB ?? 2);
  const qty = items.reduce((sum, item) => sum + (item.quantity ?? 1), 0);
  const estimated = Math.max(qty, 1) * perItem;
  const floor = Number(process.env.SHIPPING_PACKAGE_WEIGHT_LB ?? 2);
  return Math.max(estimated, floor);
}

/**
 * @param {Record<string, unknown>} order Shopify order webhook payload
 */
export function mapShopifyOrderToAirtableFields(order) {
  const shopifyOrderId = String(order.id ?? '');
  const ship = shippingAddress(order);

  const fields = {
    [AIRTABLE.fields.name]: orderRecordName(order),
    [AIRTABLE.fields.shopifyOrderId]: shopifyOrderId,
    [AIRTABLE.fields.customerEmail]: text(order.email ?? order.contact_email),
    [AIRTABLE.fields.customerName]: text(ship?.name),
    [AIRTABLE.fields.lineItems]: formatLineItems(order),
    [AIRTABLE.fields.orderTotal]: money(order.total_price),
    [AIRTABLE.fields.subtotal]: money(order.subtotal_price),
    [AIRTABLE.fields.tax]: money(order.total_tax),
    [AIRTABLE.fields.shippingPaid]: money(
      order.total_shipping_price_set?.shop_money?.amount ??
        order.shipping_lines?.[0]?.price,
    ),
    [AIRTABLE.fields.financialStatus]: text(order.financial_status),
    [AIRTABLE.fields.fulfillmentStatus]: text(order.fulfillment_status),
    [AIRTABLE.fields.shipName]: text(ship?.name),
    [AIRTABLE.fields.shipCompany]: text(ship?.company),
    [AIRTABLE.fields.shipAddress1]: text(ship?.address1),
    [AIRTABLE.fields.shipAddress2]: text(ship?.address2),
    [AIRTABLE.fields.shipCity]: text(ship?.city),
    [AIRTABLE.fields.shipState]: text(ship?.province_code ?? ship?.province),
    [AIRTABLE.fields.shipZip]: text(ship?.zip),
    [AIRTABLE.fields.shipCountry]: text(ship?.country_code ?? ship?.country),
    [AIRTABLE.fields.customerNote]: text(order.note),
    [AIRTABLE.fields.notes]: `${SHOPIFY_ORDER_ID_PREFIX}${shopifyOrderId}`,
  };

  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  );
}

export function recipientFromOrder(order) {
  const ship = shippingAddress(order);
  if (!ship) return null;

  const streetLines = [text(ship.address1), text(ship.address2)].filter(Boolean);
  if (streetLines.length === 0) return null;

  return {
    contact: {
      personName: text(ship.name) ?? 'Customer',
      companyName: text(ship.company),
      phoneNumber: text(ship.phone) ?? '0000000000',
    },
    address: {
      streetLines,
      city: text(ship.city) ?? '',
      stateOrProvinceCode: text(ship.province_code ?? ship.province) ?? '',
      postalCode: text(ship.zip) ?? '',
      countryCode: text(ship.country_code ?? ship.country) ?? 'US',
      residential: true,
    },
  };
}
