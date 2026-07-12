# Catalog sync (Railway)

Replaces Pipedream for **Airtable → Shopify** print catalog sync. Core logic lives in `lib/catalog-sync/`.

**Railway project:** [the-long-look catalog sync](https://railway.com/project/b3ab32a9-416f-48f6-ad0b-10b92ec53e47)

## How it works

The service **polls** Airtable every minute (configurable) for Prints, Artists, Collections, and Variants with Status **Queued**, syncs them to Shopify, then marks them **Committed**. Queued artists and collections sync even when they have no linked prints. Related artist/collection rows are still created or updated when a print is queued.

Queued **variants** update shipping packages and push the catalog (prices, dimensions, new Size/Frame/Mount combinations) to every Fine Art Print product. Print sync uses only **Committed** variant rows.

Each poll also lists all Airtable record ids and linked Shopify entities, then removes orphans (deleted print products, artist/collection metaobjects, and product variants whose Airtable row or Size/Frame/Mount combo no longer exists). Variant rows write an `airtable.record_id` metafield on sync for stable matching; older variants without that metafield fall back to Size/Frame/Mount.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness check + current poll interval |

Optional manual sync (for debugging): `POST /sync/:recordId` — set `SYNC_SECRET` and pass `Authorization: Bearer <secret>`.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AIRTABLE_PAT` | yes | Airtable personal access token |
| `SHOPIFY_ACCESS_TOKEN` | yes | Shopify Admin API token (`shpat_…`) for `thelonglookco` |
| `POLL_INTERVAL_MS` | no | Default `60000` (1 minute). Minimum `60000`. |
| `SHOPIFY_SHOP_ID` | no | Default `thelonglookco` |
| `SYNC_SECRET` | no | Optional auth for manual `POST /sync/…` only |
| `PRINT_IMAGE_MAX_PX` | no | Long-edge cap before WebP encode (default `2400`) |
| `PRINT_IMAGE_WEBP_QUALITY` | no | WebP quality 1–100 (default `82`) |
| `PORT` | no | Set by Railway |

Print images are downloaded from Airtable, resized, encoded as WebP, and uploaded to Shopify via staged upload. Re-sync skips image processing when the Airtable attachment id is unchanged (`print.picture_source_id` metafield).

## Deploy to Railway

1. Log in: `railway login`
2. Link project: `railway link -p b3ab32a9-416f-48f6-ad0b-10b92ec53e47`
3. Set variables:

```bash
railway variable set AIRTABLE_PAT=pat… \
  SHOPIFY_ACCESS_TOKEN=shpat_… \
  POLL_INTERVAL_MS=60000
```

4. Deploy from repo root: `railway up`
5. **Networking → Generate Domain** (only needed for `/health` monitoring)

### Railway dashboard

1. [Open project](https://railway.com/project/b3ab32a9-416f-48f6-ad0b-10b92ec53e47) → connect `jamietdavidson/the-long-look`
2. Variables: `AIRTABLE_PAT`, `SHOPIFY_ACCESS_TOKEN`, `POLL_INTERVAL_MS=60000`
3. Deploy from `main`

## Local dev

```bash
AIRTABLE_PAT=pat… \
SHOPIFY_ACCESS_TOKEN=shpat_… \
POLL_INTERVAL_MS=60000 \
node services/catalog-sync/server.mjs
```

```bash
curl http://localhost:3000/health
```

## Docker

```bash
docker build -f services/catalog-sync/Dockerfile -t catalog-sync .
docker run --rm -p 3000:3000 \
  -e AIRTABLE_PAT=pat… \
  -e SHOPIFY_ACCESS_TOKEN=shpat_… \
  -e POLL_INTERVAL_MS=60000 \
  catalog-sync
```
