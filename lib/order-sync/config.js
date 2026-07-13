/**
 * Airtable + Shopify settings for order sync.
 * https://airtable.com/appC7O4qp56Rdaj7c
 */

export const AIRTABLE = {
  baseId: 'appC7O4qp56Rdaj7c',
  ordersTable: 'Orders',
  ordersTableId: 'tbltQOChGICsCnfkX',
  /** Table name uses the existing Airtable spelling. */
  fulfillmentsTable: 'Fullfillments',
  fulfillmentsTableId: 'tblQsjLIW8loNh0qR',
  fields: {
    name: 'Name',
    notes: 'Notes',
    shopifyOrderId: 'Shopify Order ID',
    customerEmail: 'Customer Email',
    customerName: 'Customer Name',
    lineItems: 'Line Items',
    orderTotal: 'Order Total',
    subtotal: 'Subtotal',
    tax: 'Tax',
    shippingPaid: 'Shipping Paid',
    financialStatus: 'Financial Status',
    fulfillmentStatus: 'Fulfillment Status',
    shipName: 'Ship Name',
    shipCompany: 'Ship Company',
    shipAddress1: 'Ship Address 1',
    shipAddress2: 'Ship Address 2',
    shipCity: 'Ship City',
    shipState: 'Ship State',
    shipZip: 'Ship ZIP',
    shipCountry: 'Ship Country',
    customerNote: 'Customer Note',
    /** Linked fulfillment rows (existing Airtable spelling). */
    fulfillments: 'Fullfillments',
    /** Rollup from linked Fullfillments rows. */
    fulfillmentStatusLookup: 'Status (from Fullfillments)',
  },
  pickupsTable: 'Pickups',
  pickupsTableId:
    process.env.AIRTABLE_PICKUPS_TABLE_ID?.trim() ?? 'tbld2RYHB2XL9ELXA',
  pickupFields: {
    when: 'When',
    notes: 'Notes',
    /** Inverse link from Fullfillments → Pickup. */
    fulfillments: 'Fullfillments',
    status: 'Status',
  },
  pickupStatus: {
    pending: 'Pending',
    requested: 'Requested',
    scheduled: 'Scheduled',
    confirmed: 'Confirmed',
  },
  fulfillmentFields: {
    status: 'Status',
    order: 'Order',
    print: 'Print',
    variant: 'Variant',
    shippingLabel: 'Shipping: Label',
    shippingCost: 'Shipping: Cost',
    pickup: 'Pickup',
  },
  defaultFulfillmentStatus: 'Ordered',
  fulfillmentStatus: {
    ordered: 'Ordered',
    inProgress: 'In Progress',
    pickupRequested: 'Pickup Requested',
    shipped: 'Shipped',
    received: 'Received',
  },
  labelStatus: {
    pending: 'Pending',
    created: 'Created',
    failed: 'Failed',
    skipped: 'Skipped',
  },
};

export const SHOPIFY = {
  shopDomain: 'thelonglookco.myshopify.com',
  apiVersion: '2025-01',
  graphqlVersion: '2026-07',
  shopId: 'thelonglookco',
};

/** Legacy marker stored in Notes for older rows. */
export const SHOPIFY_ORDER_ID_PREFIX = 'shopify_order_id:';

function parseFromAddressJson() {
  const raw = process.env.EASYPOST_FROM_ADDRESS_JSON?.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('EASYPOST_FROM_ADDRESS_JSON must be valid JSON');
  }
}

export const EASYPOST = {
  get apiKey() {
    return process.env.EASYPOST_API_KEY?.trim() ?? '';
  },
  isConfigured() {
    return Boolean(this.apiKey);
  },
  get fromAddress() {
    const fromJson = parseFromAddressJson();
    if (fromJson) return fromJson;

    return {
      name: process.env.EASYPOST_FROM_NAME?.trim() ?? 'The Long Look',
      company: process.env.EASYPOST_FROM_COMPANY?.trim() ?? 'The Long Look',
      street1: process.env.EASYPOST_FROM_STREET1?.trim() ?? '303 Stevens Road',
      street2: process.env.EASYPOST_FROM_STREET2?.trim() ?? '',
      city: process.env.EASYPOST_FROM_CITY?.trim() ?? 'Victoria',
      state: process.env.EASYPOST_FROM_STATE?.trim() ?? 'BC',
      zip: process.env.EASYPOST_FROM_ZIP?.trim() ?? 'V9E2J1',
      country: process.env.EASYPOST_FROM_COUNTRY?.trim() ?? 'CA',
      phone: process.env.EASYPOST_FROM_PHONE?.trim() ?? '',
      email: process.env.EASYPOST_FROM_EMAIL?.trim() ?? '',
    };
  },
};

export const SHIPPING = {
  get packageWeightLb() {
    return Number(process.env.SHIPPING_PACKAGE_WEIGHT_LB ?? 2);
  },
  get weightPerItemLb() {
    return Number(process.env.SHIPPING_WEIGHT_PER_ITEM_LB ?? 2);
  },
  get packageLengthIn() {
    return Number(process.env.SHIPPING_PACKAGE_LENGTH_IN ?? 24);
  },
  get packageWidthIn() {
    return Number(process.env.SHIPPING_PACKAGE_WIDTH_IN ?? 18);
  },
  get packageHeightIn() {
    return Number(process.env.SHIPPING_PACKAGE_HEIGHT_IN ?? 4);
  },
  isConfigured() {
    return EASYPOST.isConfigured();
  },
};

/** Default DHL pickup windows: Tuesday and Friday afternoons (shop can edit rows in Airtable). */
export const PICKUP_SCHEDULE = {
  days: (() => {
    const raw = process.env.PICKUP_SCHEDULE_DAYS?.trim();
    if (!raw) return [2, 5];
    const map = {sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6};
    const parsed = raw
      .split(',')
      .map((part) => part.trim().toLowerCase())
      .map((part) => (Number.isFinite(Number(part)) ? Number(part) : map[part]))
      .filter((day) => Number.isFinite(day) && day >= 0 && day <= 6);
    return parsed.length ? parsed : [2, 5];
  })(),
  hour: (() => {
    const parsed = Number(process.env.PICKUP_SCHEDULE_HOUR ?? 14);
    return Number.isFinite(parsed) ? Math.min(23, Math.max(0, Math.floor(parsed))) : 14;
  })(),
  minute: (() => {
    const parsed = Number(process.env.PICKUP_SCHEDULE_MINUTE ?? 0);
    return Number.isFinite(parsed) ? Math.min(59, Math.max(0, Math.floor(parsed))) : 0;
  })(),
  timeZone: process.env.PICKUP_SCHEDULE_TIMEZONE?.trim() ?? 'America/Vancouver',
};

/** Poll interval for fulfillments moved to In Progress (default 60s, min 60s). */
export const FULFILLMENT_POLL = {
  intervalMs: (() => {
    const parsed = Number(process.env.FULFILLMENT_POLL_INTERVAL_MS);
    if (!Number.isFinite(parsed) || parsed < 60_000) return 60_000;
    return Math.floor(parsed);
  })(),
};
