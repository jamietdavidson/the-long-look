# Order sync (Railway)

Polling-only worker: pulls recent Shopify orders into Airtable, then watches **Fullfillments** and **Pickups** for label purchase, pickup linking, and carrier scheduling. No inbound webhooks.

## HTTP surface

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Railway liveness check only |

There are no public webhook endpoints. Remove the Railway public domain if you do not need external health checks.

## Flow (all via polling)

1. **Shopify orders** — every 60s, fetch orders updated in the last `ORDER_POLL_LOOKBACK_HOURS` (default 48h) → create/update **Orders** + **Fullfillments** rows.
2. **In Progress** — buy EasyPost label → **Shipping: Label** + Shopify `fulfillmentCreate` tracking.
3. **Pickup Requested** — link fulfillment to next **Pickups** row (**Pending**).
4. **Pickups → Requested** — EasyPost schedules carrier pickup → **Scheduled**.
5. After the pickup window passes → **Confirmed**.

Labels are **not** purchased at checkout time.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AIRTABLE_PAT` | yes | Airtable personal access token (write access to Orders, Fullfillments, and Pickups) |
| `EASYPOST_API_KEY` | for labels | EasyPost API key (`EZTK…` test, `EZAK…` production) |
| `SHOPIFY_ACCESS_TOKEN` | for Shopify sync | Static Admin token (`shpat_…`) or use client credentials below |
| `SHOPIFY_CLIENT_ID` | for Shopify sync | App client ID — with `SHOPIFY_CLIENT_SECRET`, tokens auto-refresh every 24h |
| `SHOPIFY_CLIENT_SECRET` | for Shopify sync | App client secret from `shopify app env show` |
| `ORDER_SYNC_POLL_INTERVAL_MS` | no | Poll interval (default `60000`, min `60000`) |
| `ORDER_POLL_LOOKBACK_HOURS` | no | How far back to scan Shopify orders each tick (default `48`) |
| `FULFILLMENT_POLL_INTERVAL_MS` | no | Legacy alias for `ORDER_SYNC_POLL_INTERVAL_MS` |
| `EASYPOST_FROM_*` | no | Ship-from address |
| `EASYPOST_PREFERRED_CARRIERS` | no | Pickup-capable carriers only (default `CanadaPost,UPS,FedExDefault`) |
| `EASYPOST_OVERSIZED_CARRIERS` | no | Oversized pickup-capable carriers (default `UPS,FedExDefault`) |
| `EASYPOST_CHECKOUT_CARRIER_MAP` | no | Checkout shipping line → carrier map |
| `AIRTABLE_PICKUPS_TABLE_ID` | no | Pickups table id (default `tbld2RYHB2XL9ELXA`) |
| `PICKUP_SCHEDULE_*` | no | Pickup auto-create schedule (see `lib/order-sync/config.js`) |
| `SHOPIFY_SHOP_ID` | no | Default `thelonglookco` |
| `SHOPIFY_GRAPHQL_VERSION` | no | Default `2026-07` (for `fulfillmentCreate`) |
| `SHIPPING_PACKAGE_*` | no | Fallback box dimensions/weight |
| `PORT` | no | Set by Railway |

**Recommended:** set `SHOPIFY_CLIENT_ID` + `SHOPIFY_CLIENT_SECRET` so access tokens refresh automatically.

## Airtable schema

Base `appC7O4qp56Rdaj7c`. Field names are in `lib/order-sync/config.js`.

| Table | Role |
|-------|------|
| **Orders** | One row per Shopify order |
| **Fullfillments** | One row per physical unit |
| **Pickups** | **Pending** → **Requested** → **Scheduled** → **Confirmed** |

No Airtable automations need to call Railway — the poller watches status fields directly.

## Shopify app setup

1. Deploy updated app config (webhooks removed): `shopify app deploy --allow-updates --no-build`
2. Re-authorize if scopes changed (`read_orders`, `write_orders`, `write_merchant_managed_fulfillment_orders`)

## Local dev

```bash
AIRTABLE_PAT=pat… \
SHOPIFY_ACCESS_TOKEN=shpat_… \
EASYPOST_API_KEY=EZTK… \
node services/order-sync/server.mjs
```

## Deploy to Railway

1. Service: `order-sync`
2. Variables: `AIRTABLE_PAT`, `EASYPOST_API_KEY`, Shopify credentials
3. Optional: remove the public domain under **Networking** if you only want outbound polling (keep `/health` reachable for Railway deploy checks)
