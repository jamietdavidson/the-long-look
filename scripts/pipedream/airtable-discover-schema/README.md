# Airtable discover schema (Pipedream)

One-time helper to list tables, fields, and views in the Operations base.

## Files

| File | Purpose |
|------|---------|
| `script.js` | Pipedream entry point |
| `config.js` | Base ID |
| `utils.js` | Schema fetch logic |

## Pipedream setup

1. Connect **airtable_oauth**
2. Add all three files to the code step (or use Pipedream file imports)
3. Run once and check the `schema` export against `../airtable-shopify-sync-catalog/config.js`
