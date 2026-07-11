/**
 * Airtable → Shopify catalog sync config.
 * https://airtable.com/appC7O4qp56Rdaj7c
 */

export const AIRTABLE = {
  baseId: 'appC7O4qp56Rdaj7c',
  baseName: 'Operations',
  printsTable: 'Prints',
  printsView: 'Committed',
  variantsTable: 'Variants',
  artistsTable: 'Artists',
  collectionsTable: 'Collections',
  committedStatus: 'Committed',
  prints: {
    name: 'Name',
    description: 'Description',
    image: 'Picture',
    artist: 'Artist',
    collections: 'Collections',
    orientation: 'Orientation',
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
    paddingInches: 'padding_inches',
    frameWidthInches: 'frame_width_inches',
    rank: 'rank',
  },
  metaobjectTypes: {
    artist: 'artist',
    collection: 'collection',
    picture: 'picture',
  },
};
