# Scripts

Local debugging helpers for the Railway sync services in `services/`.

## Catalog sync

Sync one print by Airtable record id:

```bash
set -a && source services/catalog-sync/.env.railway && set +a
node scripts/run-catalog-sync.mjs recXXXXXXXXXXXXXX
```

Re-upload all print images as optimized WebP (e.g. after changing `PRINT_IMAGE_MAX_PX`):

```bash
cd services/catalog-sync && node ../../scripts/resync-print-images.mjs
```

Production poller: `services/catalog-sync/` on Railway.

## Order sync

Replay a saved Shopify order JSON into Airtable:

```bash
set -a && source services/catalog-sync/.env.railway && set +a
node scripts/sync-order-test.mjs path/to/order.json
```

Production webhook receiver: `services/order-sync/` on Railway. See `services/order-sync/README.md`.
