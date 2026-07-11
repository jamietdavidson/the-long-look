# Pipedream workflows

Source-of-truth workflow code for [Pipedream project `proj_Vbs7LgY`](https://pipedream.com/@thelonglook/projects/proj_Vbs7LgY).

| Workflow | Pipedream URL | Local folder |
|----------|---------------|--------------|
| Airtable → Shopify catalog | [airtable-shopify-sync-catalog](https://pipedream.com/@thelonglook/projects/proj_Vbs7LgY/airtable-shopify-sync-catalog-p_n1CGZzK/build) | `airtable-shopify-sync-catalog/` |
| Shopify → Airtable orders | [shopify-airtable-product-ordered](https://pipedream.com/@thelonglook/projects/proj_Vbs7LgY/shopify-airtable-product-ordered-p_8rCVdYp/build) | `shopify-airtable-sync-orders/` |

## CI deploy

On pushes to `scripts/pipedream/**`, GitHub Actions runs `scripts/pipedream/deploy.mjs`, which:

1. Bundles `config.js` + `utils.js` + `script.js`
2. Looks up each workflow's Node code step via `GET /workflows/{id}`
3. Updates the saved component (`sc_...`) via `POST /components`

### Secrets (already configured in GitHub)

- `PIPEDREAM_API_KEY`
- `PIPEDREAM_ORG_ID`

### Local deploy

```bash
PIPEDREAM_API_KEY=pda_... \
PIPEDREAM_ORG_ID=o_... \
node scripts/pipedream/deploy.mjs
```
