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
    fedexTracking: 'FedEx Tracking',
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
  shopId: 'thelonglookco',
};

/** Legacy marker stored in Notes for older rows. */
export const SHOPIFY_ORDER_ID_PREFIX = 'shopify_order_id:';

export const FEDEX = {
  get apiUrl() {
    const env = process.env.FEDEX_ENV?.trim() ?? 'sandbox';
    return (
      process.env.FEDEX_API_URL?.trim() ??
      (env === 'production' ? 'https://apis.fedex.com' : 'https://apis-sandbox.fedex.com')
    );
  },
  get clientId() {
    return process.env.FEDEX_CLIENT_ID?.trim() ?? '';
  },
  get clientSecret() {
    return process.env.FEDEX_CLIENT_SECRET?.trim() ?? '';
  },
  get accountNumber() {
    return process.env.FEDEX_ACCOUNT_NUMBER?.trim() ?? '';
  },
  get serviceType() {
    return process.env.FEDEX_SERVICE_TYPE?.trim() ?? 'FEDEX_GROUND';
  },
  get pickupType() {
    return process.env.FEDEX_PICKUP_TYPE?.trim() ?? 'USE_SCHEDULED_PICKUP';
  },
  get packageWeightLb() {
    return Number(process.env.FEDEX_PACKAGE_WEIGHT_LB ?? 2);
  },
  get weightPerItemLb() {
    return Number(process.env.FEDEX_WEIGHT_PER_ITEM_LB ?? 2);
  },
  get packageLengthIn() {
    return Number(process.env.FEDEX_PACKAGE_LENGTH_IN ?? 24);
  },
  get packageWidthIn() {
    return Number(process.env.FEDEX_PACKAGE_WIDTH_IN ?? 18);
  },
  get packageHeightIn() {
    return Number(process.env.FEDEX_PACKAGE_HEIGHT_IN ?? 4);
  },
  shipper() {
    return {
      name: process.env.FEDEX_SHIPPER_NAME?.trim() ?? 'The Long Look',
      company: process.env.FEDEX_SHIPPER_COMPANY?.trim() ?? 'The Long Look',
      phone: process.env.FEDEX_SHIPPER_PHONE?.trim() ?? '0000000000',
      address1: process.env.FEDEX_SHIPPER_ADDRESS1?.trim() ?? '',
      address2: process.env.FEDEX_SHIPPER_ADDRESS2?.trim() ?? '',
      city: process.env.FEDEX_SHIPPER_CITY?.trim() ?? '',
      state: process.env.FEDEX_SHIPPER_STATE?.trim() ?? '',
      postal: process.env.FEDEX_SHIPPER_POSTAL?.trim() ?? '',
      country: process.env.FEDEX_SHIPPER_COUNTRY?.trim() ?? 'US',
    };
  },
  isConfigured() {
    const shipper = this.shipper();
    return Boolean(
      this.clientId &&
        this.clientSecret &&
        this.accountNumber &&
        shipper.address1 &&
        shipper.city &&
        shipper.state &&
        shipper.postal,
    );
  },
};
