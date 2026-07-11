# Catalog sync (Railway)

Replaces Pipedream for **Airtable → Shopify** print catalog sync. Uses the same logic as `scripts/pipedream/airtable-shopify-sync-catalog/`.

**Railway project:** [the-long-look catalog sync](https://railway.com/project/b3ab32a9-416f-48f6-ad0b-10b92ec53e47)

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness check |
| `POST` | `/sync/:recordId` | Sync one print (`rec…`). `?dryRun=true` to simulate |
| `POST` | `/webhook/airtable` | Webhook body `{ "recordId": "rec…" }` |

Auth (when `WEBHOOK_SECRET` is set): `Authorization: Bearer <secret>` or header `X-Webhook-Secret: <secret>`.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AIRTABLE_PAT` | yes | Airtable personal access token |
| `SHOPIFY_ACCESS_TOKEN` | yes | Shopify Admin API token (`shpat_…`) for `thelonglookco` |
| `WEBHOOK_SECRET` | recommended | Shared secret for `/sync` and `/webhook` |
| `SHOPIFY_SHOP_ID` | no | Default `thelonglookco` |
| `POLL_INTERVAL_MS` | no | Poll Committed view (min `60000`). e.g. `300000` = 5 min |
| `PORT` | no | Set by Railway |

## Deploy to Railway

1. Log in: `railway login`
2. Link project: `railway link -p b3ab32a9-416f-48f6-ad0b-10b92ec53e47`
3. From **repo root**, set variables in Railway dashboard or CLI:

```bash
railway variables set AIRTABLE_PAT=pat… \
  SHOPIFY_ACCESS_TOKEN=shpat_… \
  WEBHOOK_SECRET="$(openssl rand -hex 24)" \
  POLL_INTERVAL_MS=300000
```

4. Deploy (repo root — Dockerfile copies `scripts/pipedream/…`):

```bash
railway up
```

5. Generate domain: Railway → service → **Settings → Networking → Generate Domain**

## Airtable automation (recommended trigger)

In **Operations** base → **Automations**:

1. **Trigger:** When record enters view → Prints → **Committed** (or when `Status` changes to `Committed`)
2. **Action:** Send webhook → your Railway URL:

```
POST https://<your-service>.up.railway.app/webhook/airtable
```

Headers:

```
Authorization: Bearer <WEBHOOK_SECRET>
Content-Type: application/json
```

Body:

```json
{
  "recordId": "{{record.id}}"
}
```

Disable the Pipedream workflow once this is verified.

## Finish deploy (one-time)

Your CLI token is expired. Pick **one** path:

### Path A — Railway dashboard (fastest)

1. Open [Railway project](https://railway.com/project/b3ab32a9-416f-48f6-ad0b-10b92ec53e47)
2. **New Service → GitHub Repo** → `jamietdavidson/the-long-look`
3. Set **Root Directory** to `/` (repo root — Dockerfile path is in `railway.toml`)
4. **Variables** tab — add `AIRTABLE_PAT`, `SHOPIFY_ACCESS_TOKEN`, `WEBHOOK_SECRET`, `POLL_INTERVAL_MS=300000`
5. **Networking → Generate Domain**
6. Deploy runs automatically from `main`

### Path B — CLI

```bash
railway login
cd /path/to/the-long-look
railway link -p b3ab32a9-416f-48f6-ad0b-10b92ec53e47
AIRTABLE_PAT=pat… SHOPIFY_ACCESS_TOKEN=shpat_… ./services/catalog-sync/set-railway-vars.sh
railway up --detach
```

### Path C — GitHub Actions

1. Railway project → **Settings → Tokens** → Create project token
2. GitHub repo → **Settings → Secrets** → `RAILWAY_TOKEN` = that token
3. Re-run [Deploy catalog sync workflow](https://github.com/jamietdavidson/the-long-look/actions/workflows/railway-catalog-sync.yml)

## Local dev

From repo root:

```bash
AIRTABLE_PAT=pat… \
SHOPIFY_ACCESS_TOKEN=shpat_… \
WEBHOOK_SECRET=dev \
node services/catalog-sync/server.mjs
```

```bash
curl http://localhost:3000/health
curl -X POST -H "Authorization: Bearer dev" http://localhost:3000/sync/recyCGKwa4S14gkgf
```

## Docker (matches Railway build)

From repo root:

```bash
docker build -f services/catalog-sync/Dockerfile -t catalog-sync .
docker run --rm -p 3000:3000 \
  -e AIRTABLE_PAT=pat… \
  -e SHOPIFY_ACCESS_TOKEN=shpat_… \
  -e WEBHOOK_SECRET=dev \
  catalog-sync
```
