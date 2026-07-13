/**
 * Airtable + Shopify settings for order sync.
 * https://airtable.com/appC7O4qp56Rdaj7c
 */
import {hasShopifyAccessConfigured} from '../shopify-access-token.mjs';

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
    status: 'Status',
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
    /** Legacy column name — stores carrier tracking numbers. */
    fedexTracking: 'FedEx Tracking',
    /** Legacy column name — stores the Shopify-selected shipping service. */
    fedexService: 'FedEx Service',
    shippingLabel: 'Shipping Label',
    shippingLabelUrl: 'Shipping Label URL',
    labelStatus: 'Label Status',
    labelError: 'Label Error',
    /** Linked fulfillment rows (existing Airtable spelling). */
    fulfillments: 'Fullfillments',
  },
  fulfillmentFields: {
    status: 'Status',
    order: 'Order',
    print: 'Print',
    variant: 'Variant',
    shippingLabel: 'Shipping: Label',
    shippingCost: 'Shipping: Cost',
  },
  defaultStatus: 'Todo',
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
  get dhlCarrierCode() {
    return process.env.SHOPIFY_DHL_CARRIER_CODE?.trim() ?? 'DHL_EXPRESS_CANADA';
  },
  get dhlDefaultServiceCode() {
    return (
      process.env.SHOPIFY_DHL_DEFAULT_SERVICE_CODE?.trim() ??
      'dhl_canada_express_worldwide'
    );
  },
};

/** Legacy marker stored in Notes for older rows. */
export const SHOPIFY_ORDER_ID_PREFIX = 'shopify_order_id:';

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
    return hasShopifyAccessConfigured();
  },
};

/** Poll interval for fulfillments moved to In Progress (default 60s, min 60s). */
export const FULFILLMENT_POLL = {
  intervalMs: (() => {
    const parsed = Number(process.env.FULFILLMENT_POLL_INTERVAL_MS);
    if (!Number.isFinite(parsed) || parsed < 60_000) return 60_000;
    return Math.floor(parsed);
  })(),
};
