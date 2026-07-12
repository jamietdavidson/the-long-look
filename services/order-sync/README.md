# Order sync (Railway)

Receives **Shopify order webhooks** and creates/updates rows in the Airtable **Orders** table, including FedEx shipping labels for printers.

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
| `SHOPIFY_ACCESS_TOKEN` | for labels | Shopify Admin token (`write_files`) to host label PDFs for Airtable attachments |
| `SHOPIFY_SHOP_ID` | no | Default `thelonglookco` |
| `FEDEX_CLIENT_ID` | for labels | FedEx API client ID |
| `FEDEX_CLIENT_SECRET` | for labels | FedEx API client secret |
| `FEDEX_ACCOUNT_NUMBER` | for labels | FedEx billing account number |
| `FEDEX_SHIPPER_NAME` | for labels | Return / ship-from contact name |
| `FEDEX_SHIPPER_COMPANY` | no | Ship-from company (default: The Long Look) |
| `FEDEX_SHIPPER_PHONE` | for labels | Ship-from phone |
| `FEDEX_SHIPPER_ADDRESS1` | for labels | Printer / fulfillment address line 1 |
| `FEDEX_SHIPPER_ADDRESS2` | no | Ship-from address line 2 |
| `FEDEX_SHIPPER_CITY` | for labels | Ship-from city |
| `FEDEX_SHIPPER_STATE` | for labels | Ship-from state code |
| `FEDEX_SHIPPER_POSTAL` | for labels | Ship-from ZIP |
| `FEDEX_SHIPPER_COUNTRY` | no | Default `US` |
| `FEDEX_ENV` | no | `sandbox` (default) or `production` |
| `FEDEX_SERVICE_TYPE` | no | Default `FEDEX_GROUND` |
| `FEDEX_PACKAGE_WEIGHT_LB` | no | Minimum package weight (default `2`) |
| `FEDEX_WEIGHT_PER_ITEM_LB` | no | Estimated lb per line item (default `2`) |
| `FEDEX_PACKAGE_LENGTH_IN` | no | Fallback box length if size tier cannot be parsed (default `24`) |
| `FEDEX_PACKAGE_WIDTH_IN` | no | Fallback box width (default `18`) |
| `FEDEX_PACKAGE_HEIGHT_IN` | no | Fallback box height (default `4`) |
| `SHIPPING_BOX_BUFFER_IN` | no | Packing foam buffer per side (default `1`) — shared with catalog sync |
| `PORT` | no | Set by Railway |

If FedEx credentials are missing, orders still sync to Airtable with **Label Status = Skipped**.

FedEx labels use **box dimensions from the Airtable Variants catalog** (same logic as Shopify shipping packages): the largest size tier on the order, portrait outer size + 1″ packing buffer per side. Horizontal prints swap length/width using the product featured image aspect ratio.

## Airtable schema

Orders table: `tbltQOChGICsCnfkX` in base `appC7O4qp56Rdaj7c`. Field names are defined in `lib/order-sync/config.js`.

| Airtable field | Source |
|----------------|--------|
| Name | Shopify order name (`#1001`) |
| Status | `Todo` on create |
| Shopify Order ID | Shopify numeric order id |
| Customer Email | Buyer email |
| Customer Name | Ship-to name |
| Line Items | One line per variant |
| Order Total / Subtotal / Tax / Shipping Paid | Shopify totals |
| Financial Status / Fulfillment Status | Shopify statuses |
| Ship Name … Ship Country | Shipping address columns |
| Customer Note | Order note |
| FedEx Tracking / FedEx Service | FedEx Ship API |
| Shipping Label | PDF attachment (4×6 label for printers) |
| Shipping Label URL | Clickable link to the label PDF on Shopify CDN |
| Label Status | `Pending` → `Created`, `Failed`, or `Skipped` |
| Label Error | Error detail when label generation fails |
| Notes | Legacy `shopify_order_id:` marker |

Re-delivered webhooks update the same row (matched by **Shopify Order ID**). Labels are created once per order.

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

## FedEx setup

1. Create a project at [FedEx Developer Portal](https://developer.fedex.com/).
2. Enable the **Ship** API and note client ID, secret, and account number.
3. Set ship-from address env vars to your printer’s return address (labels bill to your FedEx account).
4. Test in `FEDEX_ENV=sandbox`, then switch to `production` after certification.

## Deploy to Railway

1. Service: `order-sync` (separate from catalog-sync).
2. Variables: `AIRTABLE_PAT`, `SHOPIFY_WEBHOOK_SECRET`, `SHOPIFY_ACCESS_TOKEN`, FedEx vars above.
3. **Networking → Generate Domain** (Shopify must reach this URL).

## Shopify webhook setup

Webhooks are declared in `integrations/shopify-app/shopify.app.toml` (`orders/create` and `orders/paid`). Deploy with:

```bash
cd integrations/shopify-app
shopify app deploy --allow-updates --no-build
```

Webhook URL: `https://<your-railway-domain>/webhooks/shopify/orders`
