# Airtable → Shopify catalog sync (Pipedream)

One-way, idempotent sync from the **Operations** Airtable base to Shopify. **Does not write back to Airtable.**

| | |
|---|---|
| **Airtable base** | [Operations (appC7O4qp56Rdaj7c)](https://airtable.com/appC7O4qp56Rdaj7c) |
| **Shopify store** | `thelonglookco.myshopify.com` |
| **Pipedream workflow** | [airtable-shopify-sync-catalog](https://pipedream.com/@thelonglook/projects/proj_Vbs7LgY/airtable-shopify-sync-catalog-p_n1CGZzK/build) |

Order sync (Shopify → Airtable) is a **separate workflow** — see [`../shopify-airtable-sync-orders/`](../shopify-airtable-sync-orders/).

## Sync order

```
Variants    → shared variant catalog (all products)
Artists     → artist metaobjects
Collections → collection metaobjects
Prints      → picture metaobjects + products
```

Re-running is safe: each entity is looked up by **handle** (slugified name) and updated if it already exists.

## Files

| File | Purpose |
|------|---------|
| `script.js` | Pipedream entry point (`defineComponent`) |
| `config.js` | Airtable field mappings and Shopify settings |
| `utils.js` | API clients, transforms, and entity sync functions |

## Pipedream setup

1. Connect **airtable_oauth** and **shopify_developer_app**
2. Add `script.js`, `config.js`, and `utils.js` to the workflow code step
3. Test with **Dry run** = `true`
4. Deploy

Required Shopify scopes: `read/write_metaobjects`, `read/write_products`, `read/write_publications`, `read/write_files`

## Related

- [`../airtable-discover-schema/`](../airtable-discover-schema/) — verify base schema before first sync
- [`../../airtable-discover.mjs`](../../airtable-discover.mjs) — local schema discovery CLI
