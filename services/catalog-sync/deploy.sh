#!/usr/bin/env bash
# Deploy catalog-sync to Railway (requires: railway login && railway link)
set -euo pipefail
cd "$(dirname "$0")/../.."

if ! railway whoami &>/dev/null; then
  echo "Run: railway login"
  exit 1
fi

echo "Deploying catalog-sync from repo root…"
railway up --detach

echo "Done. Set variables if needed:"
echo "  railway variables set AIRTABLE_PAT=… SHOPIFY_ACCESS_TOKEN=… WEBHOOK_SECRET=… POLL_INTERVAL_MS=300000"
echo "Then generate a public URL in Railway → Networking."
