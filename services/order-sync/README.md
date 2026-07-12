# Order sync (Railway)

Receives **Shopify order webhooks** and creates/updates rows in the Airtable **Orders** table.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness check |
| `POST` | `/webhooks/shopify/orders` | Shopify `orders/create` and `orders/paid` webhooks |

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AIRTABLE_PAT` | yes | Airtable personal access token (write access to Orders) |
| `SHOPIFY_WEBHOOK_SECRET` | yes | Shopify webhook signing secret |
| `PORT` | no | Set by Railway |

## Airtable mapping

Each order writes to **Orders** (`tbltQOChGICsCnfkX`):

| Airtable field | Source |
|----------------|--------|
| Name | Shopify order name (`#1001`) |
| Notes | Customer, totals, line items, shipping address, `shopify_order_id:…` marker |
| Status | `Todo` (on create only; updates leave Status unchanged) |

Re-delivered webhooks update the same row (matched by `shopify_order_id` in Notes).

## Local dev

```bash
AIRTABLE_PAT=pat… \
SHOPIFY_WEBHOOK_SECRET=… \
node services/order-sync/server.mjs
```

Test with a saved webhook payload:

```bash
node scripts/sync-order-test.mjs path/to/order.json
```

## Deploy to Railway

1. Create a **new Railway service** in your project (separate from catalog-sync).
2. Set root directory / config to use `services/order-sync/railway.json`.
3. Variables: `AIRTABLE_PAT`, `SHOPIFY_WEBHOOK_SECRET`.
4. **Networking → Generate Domain** (required — Shopify must reach this URL).
5. Register the webhook in Shopify Admin (see repo root `scripts/README.md`).

## Shopify webhook setup

In [Shopify Admin → Settings → Notifications → Webhooks](https://admin.shopify.com/store/thelonglookco/settings/notifications):

| Field | Value |
|-------|-------|
| Event | Order creation |
| Format | JSON |
| URL | `https://<your-railway-domain>/webhooks/shopify/orders` |

Copy the **webhook signing secret** into Railway as `SHOPIFY_WEBHOOK_SECRET`.

Optional: add a second webhook for **Order payment** (`orders/paid`) to the same URL if you only want paid orders — both are supported; duplicates update the same Airtable row.
