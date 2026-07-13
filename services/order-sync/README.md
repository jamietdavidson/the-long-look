# Order sync (Railway)

Receives **Shopify order webhooks** and creates/updates rows in the Airtable **Orders** table. Each physical product unit gets its own row in the **Fullfillments** table (Status = **Ordered**). **EasyPost** labels are purchased per fulfillment when that row’s Status moves to **In Progress**, then tracking is written back to Shopify.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness check |
| `POST` | `/webhooks/shopify/orders` | Shopify `orders/create` and `orders/paid` webhooks |
| `POST` | `/webhooks/airtable/fulfillments` | Optional Airtable automation when a fulfillment moves to **In Progress** or **Pickup Requested** |
| `POST` | `/webhooks/airtable/pickups` | Optional Airtable automation when a pickup moves to **Requested** |

## Flow

1. **Shopify webhook** → create/update **Orders** row + one **Fullfillments** row per line-item unit (linked Print + Variant when Shopify metafields are present).
2. Team sets a fulfillment to **In Progress** in Airtable when ready to ship.
3. **EasyPost label purchase** runs via polling (every 60s) or the Airtable webhook → one label per fulfillment → **Shipping: Label** URL on that row + `fulfillmentCreate` in Shopify with tracking.
4. Team sets a fulfillment to **Pickup Requested** when the package is ready — links it to the next **Pickups** row (auto-created on Tue/Fri afternoons if none exist). New pickup rows start as **Pending**.
5. Set the **Pickups** row to **Requested** when ready to book the carrier — EasyPost schedules the truck and moves the row to **Scheduled**.
6. After the pickup window passes, the poller marks the row **Confirmed**.

Labels are **not** purchased at checkout time.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AIRTABLE_PAT` | yes | Airtable personal access token (write access to Orders, Fullfillments, and Pickups) |
| `SHOPIFY_WEBHOOK_SECRET` | yes | Shopify webhook signing secret |
| `EASYPOST_API_KEY` | for labels | EasyPost API key (`EZTK…` test, `EZAK…` production) |
| `SHOPIFY_ACCESS_TOKEN` | for Shopify sync | Static Admin token (`shpat_…`) or use client credentials below |
| `SHOPIFY_CLIENT_ID` | for Shopify sync | App client ID — with `SHOPIFY_CLIENT_SECRET`, tokens auto-refresh every 24h |
| `SHOPIFY_CLIENT_SECRET` | for Shopify sync | App client secret from `shopify app env show` |
| `EASYPOST_FROM_NAME` | no | Ship-from name (default `The Long Look`) |
| `EASYPOST_FROM_COMPANY` | no | Ship-from company |
| `EASYPOST_FROM_STREET1` | no | Default `303 Stevens Road` |
| `EASYPOST_FROM_CITY` | no | Default `Victoria` |
| `EASYPOST_FROM_STATE` | no | Default `BC` |
| `EASYPOST_FROM_ZIP` | no | Default `V9E2J1` |
| `EASYPOST_FROM_COUNTRY` | no | Default `CA` |
| `EASYPOST_FROM_PHONE` | no | Ship-from phone |
| `EASYPOST_FROM_ADDRESS_JSON` | no | Optional JSON override for the full from-address object |
| `EASYPOST_PREFERRED_CARRIERS` | no | Comma-separated carrier preference when buying (default `Purolator,CanadaPost,UPS,FedExDefault`) |
| `EASYPOST_OVERSIZED_CARRIERS` | no | Carriers for oversized parcels — longest side > 60", second-longest > 30", or weight > 70 lb (default `Purolator,UPS,FedExDefault`; excludes Canada Post) |
| `EASYPOST_CHECKOUT_CARRIER_MAP` | no | JSON map of checkout `shipping_lines` title/code → carrier name(s), e.g. `{"Standard":"Purolator"}` |
| `FULFILLMENT_POLL_INTERVAL_MS` | no | Poll for In Progress / Pickup Requested fulfillments (default `60000`, min `60000`) |
| `AIRTABLE_PICKUPS_TABLE_ID` | no | Pickups table id (default `tbld2RYHB2XL9ELXA`) |
| `PICKUP_SCHEDULE_*` | no | Pickup auto-create schedule (see `lib/order-sync/config.js`) |
| `AIRTABLE_WEBHOOK_SECRET` | no | Bearer / `x-sync-secret` for `/webhooks/airtable/fulfillments` |
| `SHOPIFY_SHOP_ID` | no | Default `thelonglookco` |
| `SHOPIFY_GRAPHQL_VERSION` | no | Default `2026-07` (for `fulfillmentCreate`) |
| `SHIPPING_PACKAGE_*` | no | Fallback box dimensions/weight |
| `PORT` | no | Set by Railway |

If EasyPost is not configured, orders and fulfillments still sync; label creation is skipped until `EASYPOST_API_KEY` is set.

Shopify credentials are still required for order fetch, label PDF upload to Shopify Files (for Airtable URLs), and posting fulfillments/tracking back to Shopify.

**Recommended:** set `SHOPIFY_CLIENT_ID` + `SHOPIFY_CLIENT_SECRET` so access tokens refresh automatically.

### Where label data lives

| Data | Location |
|------|----------|
| **Per-product label URL** | Fullfillments → **Shipping: Label** |
| **Label cost** | Fullfillments → **Shipping: Cost** (EasyPost purchased rate) |
| **Carrier + service** | EasyPost rate selection (prefers Purolator/Canada Post by default) |
| **Shopify tracking** | `fulfillmentCreate` on the matching line item when the label is purchased |
| **Carrier pickup** | EasyPost Pickup API on **Pickup Requested** (skipped for Purolator — drop-off only) |
| **Box dimensions** | Shopify shipping package registry (catalog-sync), one package per fulfillment |

## Airtable schema

Base `appC7O4qp56Rdaj7c`. Field names are in `lib/order-sync/config.js`.

| Table | Role |
|-------|------|
| **Orders** (`tbltQOChGICsCnfkX`) | One row per Shopify order |
| **Fullfillments** (`tblQsjLIW8loNh0qR`) | One row per physical unit; Status `Ordered` → `In Progress` → `Pickup Requested` → … |
| **Pickups** (`tbld2RYHB2XL9ELXA`) | Pickup windows: **Pending** → **Requested** → **Scheduled** → **Confirmed** |

### Optional Airtable automation

When **Status** changes to **In Progress** or **Pickup Requested**, POST the fulfillment record id to:

`https://<your-railway-domain>/webhooks/airtable/fulfillments`

When a **Pickups** row changes to **Requested**, POST the pickup record id to:

`https://<your-railway-domain>/webhooks/airtable/pickups`

Body: `{"recordId":"rec…"}` with `Authorization: Bearer <AIRTABLE_WEBHOOK_SECRET>` if configured.

## Shopify app setup

1. Deploy updated scopes from `integrations/shopify-app/shopify.app.toml`
2. Re-authorize the app in Shopify Admin (`read_orders`, `write_orders`, `write_merchant_managed_fulfillment_orders`)
3. Set `EASYPOST_API_KEY` on Railway (use test key for staging, production key when live)

## Local dev

```bash
AIRTABLE_PAT=pat… \
SHOPIFY_WEBHOOK_SECRET=… \
SHOPIFY_ACCESS_TOKEN=shpat_… \
EASYPOST_API_KEY=EZTK… \
node services/order-sync/server.mjs
```

Purchase a label for one fulfillment:

```bash
EASYPOST_API_KEY=EZTK… \
node -e "import {createLabelForFulfillment} from './lib/order-sync/fulfillment-label.mjs'; console.log(await createLabelForFulfillment('rec…'))"
```

## Deploy to Railway

1. Service: `order-sync`
2. Variables: `AIRTABLE_PAT`, `SHOPIFY_WEBHOOK_SECRET`, `EASYPOST_API_KEY`, Shopify credentials
3. **Networking → Generate Domain**

Webhook URL: `https://<your-railway-domain>/webhooks/shopify/orders`
