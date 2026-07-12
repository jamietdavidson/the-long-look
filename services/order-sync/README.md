# Order sync (Railway)

Receives **Shopify order webhooks** and creates/updates rows in the Airtable **Orders** table, including **DHL Express labels purchased through Shopify Shipping**.

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
| `SHOPIFY_ACCESS_TOKEN` | for labels | Shopify Admin token with `write_orders` + fulfillment scopes |
| `SHOPIFY_SHOP_ID` | no | Default `thelonglookco` |
| `SHOPIFY_GRAPHQL_VERSION` | no | Default `2026-07` (required for `shippingLabelPurchase`) |
| `SHOPIFY_DHL_CARRIER_CODE` | no | Default `DHL_EXPRESS_CANADA` |
| `SHOPIFY_DHL_DEFAULT_SERVICE_CODE` | no | Fallback DHL service (default `dhl_canada_express_worldwide`) |
| `SHOPIFY_SHIPPING_CODE_MAP` | no | JSON map of flat-rate `shipping_lines` title/code → DHL service (e.g. `{"Standard":"dhl_canada_express_worldwide"}`) |
| `SHOPIFY_SHIPPING_HOURS_FROM_NOW` | no | Planned ship time for label purchase (default `24`) |
| `SHIPPING_PACKAGE_WEIGHT_LB` | no | Minimum package weight (default `2`) |
| `SHIPPING_WEIGHT_PER_ITEM_LB` | no | Estimated lb per line item (default `2`) |
| `SHIPPING_PACKAGE_LENGTH_IN` | no | Fallback box length (default `24`) |
| `SHIPPING_PACKAGE_WIDTH_IN` | no | Fallback box width (default `18`) |
| `SHIPPING_PACKAGE_HEIGHT_IN` | no | Fallback box height (default `4`) |
| `SHIPPING_BOX_BUFFER_IN` | no | Packing foam buffer per side (default `1`) — shared with catalog sync |
| `PORT` | no | Set by Railway |

If `SHOPIFY_ACCESS_TOKEN` is missing or scopes are insufficient, orders still sync to Airtable with **Label Status = Skipped**.

### Where label data comes from

| Data | Source |
|------|--------|
| **Carrier + service** | Customer's Shopify checkout selection (`order.shipping_lines`) mapped to Shopify Shipping `carrierCode` + `serviceCode` for DHL |
| **Label purchase + pickup** | Shopify GraphQL `shippingLabelPurchase` (Shopify's DHL Express account; pickup included) |
| **Box dimensions** | Shopify shipping package registry (synced from Airtable via catalog-sync), one box per line-item unit |

No separate DHL API credentials are needed. Shopify bills your store through Shopify Shipping.

## Airtable schema

Orders table: `tbltQOChGICsCnfkX` in base `appC7O4qp56Rdaj7c`. Field names are defined in `lib/order-sync/config.js`.

| Airtable field | Source |
|----------------|--------|
| FedEx Tracking / FedEx Service | **Legacy column names** — stores DHL tracking + Shopify service |
| Shipping Label | PDF attachment |
| Shipping Label URL | Link to hosted PDF |
| Label Status | `Pending` → `Created`, `Failed`, or `Skipped` |

## Shopify app setup

1. Deploy updated scopes from `integrations/shopify-app/shopify.app.toml`:
   ```bash
   cd integrations/shopify-app
   shopify app deploy --allow-updates --no-build
   ```
2. Re-authorize the app in Shopify Admin so the token includes:
   - `read_orders`, `write_orders`
   - `read_merchant_managed_fulfillment_orders`, `write_merchant_managed_fulfillment_orders`
3. Accept **Shopify Shipping** terms in Admin (Settings → Shipping and delivery).
4. Enable **DHL Express Canada** carrier rates at checkout.
5. Update `SHOPIFY_ACCESS_TOKEN` on Railway order-sync after re-auth.

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

## Deploy to Railway

1. Service: `order-sync`
2. Variables: `AIRTABLE_PAT`, `SHOPIFY_WEBHOOK_SECRET`, `SHOPIFY_ACCESS_TOKEN`, shipping vars above
3. **Networking → Generate Domain**

Webhook URL: `https://<your-railway-domain>/webhooks/shopify/orders`
