# Order sync (Railway)

Receives **Shopify order webhooks** and creates/updates rows in the Airtable **Orders** table. Each physical product unit gets its own row in the **Fullfillments** table (Status = **Ordered**). **DHL Express labels** are purchased per fulfillment when that row’s Status moves to **In Progress**.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness check |
| `POST` | `/webhooks/shopify/orders` | Shopify `orders/create` and `orders/paid` webhooks |
| `POST` | `/webhooks/airtable/fulfillments` | Optional Airtable automation when a fulfillment moves to In Progress |

## Flow

1. **Shopify webhook** → create/update **Orders** row + one **Fullfillments** row per line-item unit (linked Print + Variant when Shopify metafields are present).
2. Team sets a fulfillment to **In Progress** in Airtable when ready to ship.
3. **Label purchase** runs via polling (every 60s) or the Airtable webhook → one DHL label per fulfillment → **Shipping: Label** URL on that row.

Labels are **not** purchased at checkout time anymore.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AIRTABLE_PAT` | yes | Airtable personal access token (write access to Orders + Fullfillments) |
| `SHOPIFY_WEBHOOK_SECRET` | yes | Shopify webhook signing secret |
| `SHOPIFY_ACCESS_TOKEN` | for labels | Optional static Admin token (`shpat_…`) |
| `SHOPIFY_CLIENT_ID` | for labels | App client ID — with `SHOPIFY_CLIENT_SECRET`, tokens auto-refresh every 24h |
| `SHOPIFY_CLIENT_SECRET` | for labels | App client secret from `shopify app env show` |
| `FULFILLMENT_POLL_INTERVAL_MS` | no | Poll for In Progress fulfillments (default `60000`, min `60000`) |
| `AIRTABLE_WEBHOOK_SECRET` | no | Bearer / `x-sync-secret` for `/webhooks/airtable/fulfillments` |
| `SHOPIFY_SHOP_ID` | no | Default `thelonglookco` |
| `SHOPIFY_GRAPHQL_VERSION` | no | Default `2026-07` (required for `shippingLabelPurchase`) |
| `SHOPIFY_DHL_CARRIER_CODE` | no | Default `DHL_EXPRESS_CANADA` |
| `SHOPIFY_DHL_DEFAULT_SERVICE_CODE` | no | Fallback DHL service (default `dhl_canada_express_worldwide`) |
| `SHOPIFY_SHIPPING_CODE_MAP` | no | JSON map of flat-rate `shipping_lines` title/code → DHL service |
| `SHOPIFY_SHIPPING_HOURS_FROM_NOW` | no | Planned ship time for label purchase (default `24`) |
| `SHIPPING_PACKAGE_*` | no | Fallback box dimensions/weight |
| `PORT` | no | Set by Railway |

If Shopify credentials are missing or scopes are insufficient, orders and fulfillments still sync; label creation is skipped until configured.

**Recommended:** set `SHOPIFY_CLIENT_ID` + `SHOPIFY_CLIENT_SECRET` (from `cd integrations/shopify-app && shopify app env show`) so the service refreshes access tokens automatically. `SHOPIFY_ACCESS_TOKEN` alone still works but expires after 24 hours when obtained via client credentials.

### Where label data lives

| Data | Location |
|------|----------|
| **Per-product label URL** | Fullfillments → **Shipping: Label** |
| **Carrier + service** | Resolved from the Shopify order’s `shipping_lines` at label time |
| **Box dimensions** | Shopify shipping package registry (catalog-sync), one package per fulfillment |

Legacy **Orders** label columns (FedEx Tracking, Shipping Label, etc.) are no longer written on new orders.

## Airtable schema

Base `appC7O4qp56Rdaj7c`. Field names are in `lib/order-sync/config.js`.

| Table | Role |
|-------|------|
| **Orders** (`tbltQOChGICsCnfkX`) | One row per Shopify order |
| **Fullfillments** (`tblQsjLIW8loNh0qR`) | One row per physical unit; Status `Ordered` → `In Progress` → … |

### Optional Airtable automation

When **Status** changes to **In Progress**, POST the record id to:

`https://<your-railway-domain>/webhooks/airtable/fulfillments`

Body: `{"recordId":"rec…"}` with `Authorization: Bearer <AIRTABLE_WEBHOOK_SECRET>` if configured.

Polling covers the same cases if you skip the automation.

## Shopify app setup

1. Deploy updated scopes from `integrations/shopify-app/shopify.app.toml`
2. Re-authorize the app in Shopify Admin (`read_orders`, `write_orders`, fulfillment order scopes)
3. Accept **Shopify Shipping** terms and enable **DHL Express Canada**
4. Update `SHOPIFY_ACCESS_TOKEN` on Railway order-sync after re-auth

## Local dev

```bash
AIRTABLE_PAT=pat… \
SHOPIFY_WEBHOOK_SECRET=… \
SHOPIFY_ACCESS_TOKEN=shpat_… \
node services/order-sync/server.mjs
```

Test with a saved webhook payload:

```bash
node scripts/sync-order-test.mjs path/to/order.json
```

Purchase a label for one fulfillment:

```bash
node -e "import {createLabelForFulfillment} from './lib/order-sync/fulfillment-label.mjs'; console.log(await createLabelForFulfillment('rec…'))"
```

## Deploy to Railway

1. Service: `order-sync`
2. Variables: `AIRTABLE_PAT`, `SHOPIFY_WEBHOOK_SECRET`, `SHOPIFY_ACCESS_TOKEN`, shipping vars above
3. **Networking → Generate Domain**

Webhook URL: `https://<your-railway-domain>/webhooks/shopify/orders`
