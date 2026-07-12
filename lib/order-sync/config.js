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
  },
  defaultStatus: 'Todo',
};

export const SHOPIFY = {
  shopDomain: 'thelonglookco.myshopify.com',
  apiVersion: '2025-01',
};

/** Marker stored in Notes for idempotent upserts. */
export const SHOPIFY_ORDER_ID_PREFIX = 'shopify_order_id:';
