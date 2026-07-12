/**
 * Airtable + Shopify settings for order sync.
 * https://airtable.com/appC7O4qp56Rdaj7c
 */
export const AIRTABLE = {
  baseId: 'appC7O4qp56Rdaj7c',
  ordersTable: 'Orders',
  ordersTableId: 'tbltQOChGICsCnfkX',
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
  },
  defaultStatus: 'Todo',
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
    return Boolean(
      process.env.SHOPIFY_ACCESS_TOKEN?.trim() ??
        process.env.SHOPIFY_ADMIN_TOKEN?.trim(),
    );
  },
};
