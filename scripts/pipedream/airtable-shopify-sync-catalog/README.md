# Airtable → Shopify catalog sync

Triggered when a **Print** is created or updated in the **Committed** view. Syncs that print and its linked entities to Shopify, then marks the linked artist and collections as Committed in Airtable.

| | |
|---|---|
| **Airtable base** | [Operations (appC7O4qp56Rdaj7c)](https://airtable.com/appC7O4qp56Rdaj7c) |
| **Shopify store** | `thelonglookco.myshopify.com` |
| **Production runner** | Railway service in `services/catalog-sync/` (polls Committed view every 60s) |

Order sync (Shopify → Airtable) is a **separate workflow** — see [`../shopify-airtable-sync-orders/`](../shopify-airtable-sync-orders/).

## Architecture (single source of truth)

**Sellable prints = Shopify products only.** The sync creates a `Fine Art Print` product with:

- **Image** on the product (`files` from Airtable attachment URL)
- **Variants** from the Variants catalog (size / frame / mount)
- **Metafields** for dimensions and `airtable.record_id`
- **`print.collection_handles`** JSON metafield (collection handles, no metaobject links)

The storefront reads **products** for every print surface (catalog, detail, search, favourites, artist grids, collection grids). If there is no product, there is no page.

**Picture metaobjects are not created.** Legacy picture metaobjects are deleted on each prune run. This prevents ghost pages where a metaobject existed without a matching product.

**Artist and collection metaobjects** remain for editorial pages only (bio, portrait, collection title/description/cover). They are not the catalog source of truth.

## Flow

```
Airtable trigger: Prints → Committed view (new record)
        ↓
1. Load Variants catalog (shared product options)
2. Sync linked Artist → Shopify artist metaobject (editorial)
3. Sync linked Collections → Shopify collection metaobjects (editorial)
4. Sync Print → Shopify product (image, variants, metafields)
5. Prune orphaned Fine Art Print products + delete all legacy picture metaobjects
6. Write back Artist Status → Commited (Airtable typo on Artists/Collections)
7. Write back Collection Status → Commited
```

Re-running is safe: existing Shopify rows are matched by **Airtable record ID** (with handle fallback for legacy rows) and updated in place — renames, descriptions, images, variant metafields, and collection links all refresh on each sync. Prints **deleted from Airtable** are removed from Shopify on the next sync run. Prints that still exist in Airtable (any status) are kept even if they leave the Committed view.

### Shopify schema (one-time setup)

Run once to add fields the sync writes:

```bash
SHOPIFY_ACCESS_TOKEN=shpat_… node scripts/add-airtable-record-id-fields.mjs
```

| Shopify object | Field |
|----------------|-------|
| Product | metafield `airtable.record_id` |
| Product | metafield `print.collection_handles` (JSON array of handles) |
| Artist / Collection metaobject | field `airtable_record_id` |

## Railway (production)

See `services/catalog-sync/` and `railway.toml`. Env: `AIRTABLE_PAT`, `SHOPIFY_ACCESS_TOKEN`, `SHOPIFY_SHOP_ID`, `POLL_INTERVAL_MS`.

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
