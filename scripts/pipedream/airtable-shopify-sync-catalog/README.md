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
5. Prune Shopify products and picture metaobjects deleted from Airtable (any status still in Airtable is kept)
6. Write back Artist Status → Commited (Airtable typo on Artists/Collections)
7. Write back Collection Status → Commited
```

Re-running is safe: Shopify entities are upserted by **Airtable record ID** (with handle fallback for legacy rows). Handles/titles can change in Airtable without creating duplicates. Prints **deleted from Airtable** are removed from Shopify on the next sync run. Legacy products without `airtable.record_id` are matched by handle; only rows with no Airtable ID or name match are pruned. Prints that still exist in Airtable (Pending, Staged, Committed, etc.) are left in Shopify even if they leave the Committed view.

### Airtable ID fields (one-time Shopify setup)

Run once to add schema fields the sync writes:

```bash
SHOPIFY_ACCESS_TOKEN=shpat_… node scripts/add-airtable-record-id-fields.mjs
```

| Shopify object | Field |
|----------------|-------|
| Product | metafield `airtable.record_id` |
| Artist / Collection / Picture metaobject | field `airtable_record_id` |

## Pipedream setup

1. **Trigger:** Airtable → **New or Modified Records in View** → Prints table → **Committed** view  
   (Do **not** use “New Records in View” — that only fires for newly created rows, not Status changes.)
2. **Action:** Use the published action `thelonglook-airtable-shopify-sync-catalog` (latest: `sc_v4ix1Rzg`) — **replace** any inline AI-generated code step; the REST API cannot update inline workflow code in place.
3. Connect **airtable_oauth** and **Shopify** on the **action step** (same account as trigger; trigger connection alone is not enough)
4. For Shopify, **Shopify (Key Required)** works — Shop ID `thelonglookco` + your `shpat_` token
5. Leave **Print record ID** blank in workflows (`{{steps.trigger.event.id}}` is only needed for isolated step tests)
6. Test with **Dry run** = `true` first, then **Deploy**

Required Shopify scopes: `read/write_metaobjects`, `read/write_products`, `read/write_publications`, `read/write_files`

## Files

| File | Purpose |
|------|---------|
| `script.js` | Trigger handler — one print per run |
| `config.js` | Airtable field mappings and Shopify settings |
| `utils.js` | API clients, transforms, and entity sync functions |

## Local E2E test

```bash
AIRTABLE_PAT=pat… SHOPIFY_ACCESS_TOKEN=shpat_… \
  node scripts/pipedream/run-catalog-sync-e2e.mjs recJjzHivCkA6IgnR
```

Add `--dry-run` to simulate without writes.

## Related

- [`../airtable-discover-schema/`](../airtable-discover-schema/) — verify base schema before first sync
- [`../../airtable-discover.mjs`](../../airtable-discover.mjs) — local schema discovery CLI
