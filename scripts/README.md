# Scripts

Operational CLI tools for The Long Look. Sync services run on **Railway** (`services/`); these scripts are for local debugging and one-off tasks.

## Catalog sync (Airtable → Shopify)

| Script | Purpose |
|--------|---------|
| `run-catalog-sync.mjs` | Sync one print by Airtable record id |
| `catalog-sync-assert.mjs` | Full idempotency + variant dimension check |
| `debug-prune-prints.mjs` | Inspect orphaned Shopify print products |
| `add-airtable-record-id-fields.mjs` | Create Shopify metafield / metaobject definitions |
| `airtable-discover.mjs` | Dump Airtable base schema |

```bash
set -a && source services/catalog-sync/.env.railway && set +a
node scripts/run-catalog-sync.mjs recXXXXXXXXXXXXXX
```

Production poller: `services/catalog-sync/` on Railway.

## Order sync (Shopify → Airtable)

| Script | Purpose |
|--------|---------|
| `register-shopify-order-webhook.mjs` | Point Shopify `orders/create` at Railway |
| `sync-order-test.mjs` | Replay a saved order JSON into Airtable |

Production webhook receiver: `services/order-sync/` on Railway.

## Content / data

| Script | Purpose |
|--------|---------|
| `upload-prints-to-airtable.mjs` | Bulk upload print images to Airtable |
| `upload-film-photos.mjs` | Upload film scan assets |
| `enrich-pictures.mjs` | Legacy picture enrichment |
| `print-catalog.mjs` | Legacy print catalog helper |
| `update-print-sizes.mjs` | Legacy size update utility |
| `enable-print-sales.mjs` | Enable sales channel settings |
| `enable-search.mjs` | Enable storefront search |
| `setup-content-model.sh` | Bootstrap Shopify metaobjects |

## Mock checkout → Airtable order

1. Deploy `services/order-sync` on Railway and set `AIRTABLE_PAT` + `SHOPIFY_WEBHOOK_SECRET`.
2. Register webhook: `ORDER_SYNC_URL=https://… node scripts/register-shopify-order-webhook.mjs`
3. In Shopify Admin → Payments, enable **Bogus Gateway** or **test mode**.
4. Buy a print on the storefront; confirm a row appears in Airtable **Orders**.

See `services/order-sync/README.md` for webhook URL and field mapping.
