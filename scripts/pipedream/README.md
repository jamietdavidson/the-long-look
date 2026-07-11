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

### Secrets

Use **one** of these auth methods in GitHub repository secrets:

**Option A — User API key (required for workflow code updates)**

1. In Pipedream, open **My Account → API Key** (not Workspace → API / OAuth).
2. Copy the key (do not include a `Bearer ` prefix).
3. Set `PIPEDREAM_API_KEY` and `PIPEDREAM_ORG_ID` (workspace org id `o_...` from workspace settings).

**Option B — OAuth client credentials**

1. Workspace → **API** → create OAuth client.
2. Set `PIPEDREAM_CLIENT_ID`, `PIPEDREAM_CLIENT_SECRET`, and `PIPEDREAM_ORG_ID`.

Note: workflow code deploy endpoints currently require the **user API key** path.

### Local deploy

```bash
PIPEDREAM_API_KEY=pda_... \
PIPEDREAM_ORG_ID=o_... \
node scripts/pipedream/deploy.mjs
```
