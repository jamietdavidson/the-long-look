# Shopify → Airtable order sync (Pipedream)

**Not implemented yet.** Separate workflow from the catalog sync; this one **will write back to Airtable**.

## Files

| File | Purpose |
|------|---------|
| `script.js` | Pipedream entry point (stub) |
| `config.js` | Base and table settings |
| `utils.js` | Order sync helpers (empty) |

## Intended behaviour

| Direction | Data |
|-----------|------|
| Shopify → Airtable | New/paid orders → `Orders` table |

Catalog sync (one-way, no write-back): [`../airtable-shopify-sync-catalog/`](../airtable-shopify-sync-catalog/)
