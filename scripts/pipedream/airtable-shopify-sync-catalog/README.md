# Airtable → Shopify catalog sync (Pipedream)

Triggered when a **Print** enters the **Committed** view in the Operations Airtable base. Syncs that print and its linked entities to Shopify, then marks the linked artist and collections as Committed in Airtable.

| | |
|---|---|
| **Airtable base** | [Operations (appC7O4qp56Rdaj7c)](https://airtable.com/appC7O4qp56Rdaj7c) |
| **Shopify store** | `thelonglookco.myshopify.com` |
| **Pipedream workflow** | [airtable-shopify-sync-catalog](https://pipedream.com/@thelonglook/projects/proj_Vbs7LgY/airtable-shopify-sync-catalog-p_n1CGZzK/build) |

Order sync (Shopify → Airtable) is a **separate workflow** — see [`../shopify-airtable-sync-orders/`](../shopify-airtable-sync-orders/).

## Flow

```
Airtable trigger: Prints → Committed view (new record)
        ↓
1. Load Variants catalog (shared product options)
2. Sync linked Artist → Shopify artist metaobject
3. Sync linked Collections → Shopify collection metaobjects
4. Sync Print → picture metaobject + product
5. Write back Artist Status → Committed
6. Write back Collection Status → Committed
```

Re-running is safe: Shopify entities are upserted by handle; Airtable status writes are skipped when already Committed.

## Pipedream setup

1. **Trigger:** Airtable → *New Record in View* → Prints table → **Committed** view
2. **Action:** Use the published action `thelonglook-airtable-shopify-sync-catalog` (or paste `script.js` + `config.js` + `utils.js` into a Node code step)
3. Connect **airtable_oauth** and **shopify_developer_app**
4. Test with **Dry run** = `true` first

Required Shopify scopes: `read/write_metaobjects`, `read/write_products`, `read/write_publications`, `read/write_files`

## Files

| File | Purpose |
|------|---------|
| `script.js` | Trigger handler — one print per run |
| `config.js` | Airtable field mappings and Shopify settings |
| `utils.js` | API clients, transforms, and entity sync functions |

## Related

- [`../airtable-discover-schema/`](../airtable-discover-schema/) — verify base schema before first sync
- [`../../airtable-discover.mjs`](../../airtable-discover.mjs) — local schema discovery CLI
