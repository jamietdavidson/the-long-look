/**
 * Airtable → Shopify catalog sync config.
 * https://airtable.com/appC7O4qp56Rdaj7c
 */

export const AIRTABLE = {
  baseId: 'appC7O4qp56Rdaj7c',
  baseName: 'Operations',
  printsTable: 'Prints',
  printsTableId: 'tblcFW8sQcKON8zW4',
  variantsTable: 'Variants',
  variantsTableId: 'tblfD4UD5OCMI99nN',
  artistsTable: 'Artists',
  artistsTableId: 'tblPmfI2BWIUSzKBU',
  collectionsTable: 'Collections',
  collectionsTableId: 'tblo70cnCHTLuBnki',
  statuses: {
    pending: 'Pending',
    modified: 'Modified',
    queued: 'Queued',
    committed: 'Committed',
  },
  queuedStatus: 'Queued',
  committedStatus: 'Committed',
  prints: {
    name: 'Name',
    description: 'Description',
    image: 'Picture',
    artist: 'Artist',
    collection: 'Collection',
    orientation: 'Orientation',
    status: 'Status',
  },
  variants: {
    sizeName: 'Name',
    frame: 'Frame',
    shortSide: 'Print: Short"',
    longSide: 'Print: Long"',
    padding: 'Padding: Width"',
    frameWidth: 'Frame: Width"',
    salePrice: 'Sale Price',
    rank: 'Rank',
    status: 'Status',
  },
  artists: {
    name: 'Name',
    description: 'Description',
    hometown: 'Hometown',
    status: 'Status',
  },
  collections: {
    name: 'Name',
    description: 'Decsription',
    status: 'Status',
  },
};

export const SHOPIFY = {
  shopDomain: 'thelonglookco.myshopify.com',
  apiVersion: '2025-01',
  productType: 'Fine Art Print',
  productOptions: {
    size: 'Size',
    frame: 'Frame',
    mount: 'Mount',
  },
  metafields: {
    namespace: 'print',
    shortInches: 'short_inches',
    longInches: 'long_inches',
    /**
     * Border mat width for the size tier (picture-lock reference).
     * Same value on every variant for a size — including Full Bleed.
     * Mount is expressed by the Mount option, not by zeroing this field.
     */
    paddingInches: 'padding_inches',
    /**
     * Moulding width for the size tier (picture-lock reference).
     * Same value on every framed variant for a size; 0 only on No Frame rows.
     */
    frameWidthInches: 'frame_width_inches',
    rank: 'rank',
    collectionHandles: 'collection_handles',
    artistRecordId: 'artist_record_id',
    collectionRecordIds: 'collection_record_ids',
    shippingPackageRegistry: 'shipping_package_registry',
    /** Airtable attachment id — skip re-uploading when unchanged. */
    pictureSourceId: 'picture_source_id',
  },
  metaobjectTypes: {
    artist: 'artist',
    collection: 'collection',
    picture: 'picture',
  },
  /** Metaobject field + product metafield for stable Airtable ↔ Shopify linking across renames. */
  airtableRecordIdField: 'airtable_record_id',
  airtableMetafield: {
    namespace: 'airtable',
    key: 'record_id',
  },
};
