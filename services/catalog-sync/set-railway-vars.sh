#!/usr/bin/env bash
# Set Railway variables for catalog-sync (run after: railway login && railway link -p b3ab32a9-416f-48f6-ad0b-10b92ec53e47)
set -euo pipefail
cd "$(dirname "$0")/../.."

: "${AIRTABLE_PAT:?Set AIRTABLE_PAT}"
: "${SHOPIFY_ACCESS_TOKEN:?Set SHOPIFY_ACCESS_TOKEN}"
WEBHOOK_SECRET="${WEBHOOK_SECRET:-fede84cf70c8fd85cdd15381e56222b6350002118a2a1f2c}"
POLL_INTERVAL_MS="${POLL_INTERVAL_MS:-300000}"

railway variable set \
  "AIRTABLE_PAT=${AIRTABLE_PAT}" \
  "SHOPIFY_ACCESS_TOKEN=${SHOPIFY_ACCESS_TOKEN}" \
  "WEBHOOK_SECRET=${WEBHOOK_SECRET}" \
  "POLL_INTERVAL_MS=${POLL_INTERVAL_MS}" \
  "SHOPIFY_SHOP_ID=thelonglookco"

echo "Variables set. Deploy with: railway up --detach"
echo "WEBHOOK_SECRET=${WEBHOOK_SECRET}"
