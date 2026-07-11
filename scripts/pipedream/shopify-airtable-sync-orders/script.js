/**
 * Pipedream: Shopify → Airtable order sync (not implemented).
 *
 * https://pipedream.com/@thelonglook/projects/proj_Vbs7LgY/shopify-airtable-product-ordered-p_8rCVdYp/build
 */
export default defineComponent({
  props: {
    airtable_oauth: {type: 'app', app: 'airtable_oauth'},
    shopify_developer_app: {type: 'app', app: 'shopify_developer_app'},
  },
  async run() {
    throw new Error(
      'Order sync is not implemented yet. See README.md in this folder.',
    );
  },
});
