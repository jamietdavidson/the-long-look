FROM node:22-alpine

WORKDIR /app

# Preserve repo paths so run-sync.mjs can import pipedream sync source
COPY scripts/pipedream/e2e-pipedream-platform.mjs scripts/pipedream/e2e-pipedream-platform.mjs
COPY scripts/pipedream/airtable-shopify-sync-catalog scripts/pipedream/airtable-shopify-sync-catalog
COPY services/catalog-sync services/catalog-sync

WORKDIR /app/services/catalog-sync

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.mjs"]
