import {PRINT_PRODUCTS_QUERY, PRODUCT_QUERY} from '~/graphql/product';
import {ARTISTS_QUERY} from '~/graphql/content-model';
import type {Artist} from '~/lib/content-model';
import {getPrintDetailSelectedOptions} from '~/lib/print-options';
import type {PrintFilterSource} from '~/lib/print-filters';

/** Must match catalog sync `SHOPIFY.productType`. */
export const FINE_ART_PRINT_PRODUCT_TYPE = 'Fine Art Print';

const PRINT_PRODUCTS_SEARCH = `product_type:'${FINE_ART_PRINT_PRODUCT_TYPE}'`;

type Storefront = {
  query: (
    query: string,
    options?: {variables?: Record<string, unknown>; cache?: unknown},
  ) => Promise<Record<string, unknown>>;
};

type CatalogDisplayVariant = {
  metafields?: Array<{
    namespace?: string | null;
    key?: string | null;
    value?: string | null;
    type?: string | null;
  }> | null;
  selectedOptions?: Array<{name: string; value: string}>;
  title?: string | null;
};

export type PrintCatalogProduct = {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  productType: string;
  description?: string | null;
  featuredImage: {
    id: string;
    url: string;
    altText?: string | null;
    width?: number | null;
    height?: number | null;
  } | null;
  collectionHandles?: {value?: string | null} | null;
  artistRecordId?: {value?: string | null} | null;
  collectionRecordIds?: {value?: string | null} | null;
  priceRange: {
    minVariantPrice: {amount: string; currencyCode: string};
  };
  catalogDisplayVariant?: CatalogDisplayVariant | null;
};

export type PrintCatalogCard = {
  id: string;
  title: string;
  handle: string;
  artistName?: string | null;
  artistHandle?: string | null;
  featuredImage: {
    id: string;
    url: string;
    altText?: string | null;
    width?: number | null;
    height?: number | null;
  } | null;
  priceRange: {
    minVariantPrice: {amount: string; currencyCode: string};
  };
  catalogDisplayVariant?: CatalogDisplayVariant | null;
};

/** @deprecated Use PrintCatalogCard — kept for existing grid components. */
export type PictureCard = PrintCatalogCard;

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function normalizeAirtableRecordId(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

function airtableRecordIdFromHandle(handle: string | null | undefined) {
  const normalized = normalizeAirtableRecordId(handle);
  return /^rec[a-z0-9]+$/.test(normalized) ? normalized : '';
}

export function artistAirtableRecordId(artist: Pick<Artist, 'handle' | 'airtableRecordId'>) {
  return (
    normalizeAirtableRecordId(artist.airtableRecordId) ||
    airtableRecordIdFromHandle(artist.handle)
  );
}

export function collectionAirtableRecordId(
  collection: Pick<import('~/lib/content-model').Collection, 'handle' | 'airtableRecordId'>,
) {
  return (
    normalizeAirtableRecordId(collection.airtableRecordId) ||
    airtableRecordIdFromHandle(collection.handle)
  );
}

function parseJsonStringArray(raw: string | null | undefined) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string')
      : [];
  } catch {
    return [];
  }
}

function parseArtistIndex(nodes: Array<Record<string, unknown>>): Artist[] {
  return nodes.map((node) => {
    const n = node as {
      id: string;
      handle: string;
      name?: {value?: string | null};
      airtableRecordId?: {value?: string | null};
    };
    return {
      id: n.id,
      handle: n.handle,
      name: n.name?.value ?? '',
      airtableRecordId: n.airtableRecordId?.value ?? null,
      tags: [],
    };
  });
}

export async function loadArtistIndex(storefront: Storefront): Promise<Artist[]> {
  const data = await storefront.query(ARTISTS_QUERY, {variables: {first: 50}});
  const nodes = (data.artists as {nodes?: Array<Record<string, unknown>>})?.nodes ?? [];
  return parseArtistIndex(nodes);
}

function isFineArtPrint(product: {productType?: string | null}) {
  return product.productType === FINE_ART_PRINT_PRODUCT_TYPE;
}

function buildArtistLookup(artists: Artist[]) {
  const byName = new Map<string, Artist>();
  const byHandle = new Map<string, Artist>();
  const byRecordId = new Map<string, Artist>();
  for (const artist of artists) {
    byName.set(artist.name.toLowerCase(), artist);
    byHandle.set(artist.handle, artist);
    const recordId = artistAirtableRecordId(artist);
    if (recordId) byRecordId.set(recordId, artist);
  }
  return {byName, byHandle, byRecordId};
}

export function resolveArtistForVendor(
  vendor: string | null | undefined,
  artists: Artist[],
) {
  const trimmed = vendor?.trim();
  if (!trimmed) return null;

  const {byName, byHandle} = buildArtistLookup(artists);
  return (
    byName.get(trimmed.toLowerCase()) ??
    byHandle.get(slugify(trimmed)) ??
    null
  );
}

export function resolveArtistForProduct(
  product: Pick<PrintCatalogProduct, 'vendor' | 'artistRecordId'>,
  artists: Artist[],
) {
  const recordId = normalizeAirtableRecordId(product.artistRecordId?.value);
  if (recordId) {
    const {byRecordId} = buildArtistLookup(artists);
    const match = byRecordId.get(recordId);
    if (match) return match;
  }

  return resolveArtistForVendor(product.vendor, artists);
}

export function productToPrintCard(
  product: PrintCatalogProduct,
  artists: Artist[] = [],
): PrintCatalogCard {
  const artist = resolveArtistForProduct(product, artists);

  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    artistName: artist?.name ?? product.vendor ?? null,
    artistHandle: artist?.handle ?? (product.vendor ? slugify(product.vendor) : null),
    featuredImage: product.featuredImage,
    priceRange: product.priceRange,
    catalogDisplayVariant: product.catalogDisplayVariant ?? null,
  };
}

function parseCollectionHandles(product: PrintCatalogProduct) {
  return parseJsonStringArray(product.collectionHandles?.value);
}

export function parseCollectionRecordIds(product: PrintCatalogProduct) {
  return parseJsonStringArray(product.collectionRecordIds?.value).map((id) =>
    normalizeAirtableRecordId(id),
  );
}

export function getProductCollectionHandles(product: PrintCatalogProduct) {
  return parseCollectionHandles(product);
}

export function productBelongsToCollection(
  product: PrintCatalogProduct,
  {
    recordId,
    handle,
  }: {
    recordId?: string | null;
    handle?: string | null;
  },
) {
  const normalizedRecordId = normalizeAirtableRecordId(recordId);
  const recordIds = parseCollectionRecordIds(product);
  if (normalizedRecordId && recordIds.length > 0) {
    return recordIds.includes(normalizedRecordId);
  }

  const collectionHandle = handle?.trim();
  if (!collectionHandle) return false;
  return parseCollectionHandles(product).includes(collectionHandle);
}

export function productToFilterSource(
  product: PrintCatalogProduct,
  artists: Artist[] = [],
): PrintFilterSource {
  const artist = resolveArtistForProduct(product, artists);

  return {
    title: product.title,
    description: product.description ?? null,
    artist: {
      handle: artist?.handle ?? slugify(product.vendor ?? ''),
      name: artist?.name ?? product.vendor ?? '',
    },
    image: product.featuredImage ?? {url: ''},
  };
}

export function productsToPrintCards(
  products: PrintCatalogProduct[],
  artists: Artist[] = [],
) {
  return products.map((product) => productToPrintCard(product, artists));
}

export function toPrintProductConnection(products: PrintCatalogProduct[], artists: Artist[] = []) {
  return {
    nodes: productsToPrintCards(products, artists),
    pageInfo: {
      hasPreviousPage: false,
      hasNextPage: false,
      startCursor: null,
      endCursor: null,
    },
  };
}

export async function loadAllPrintProducts(
  storefront: Storefront,
): Promise<PrintCatalogProduct[]> {
  const products: PrintCatalogProduct[] = [];
  let after: string | null = null;

  do {
    const data = await storefront.query(PRINT_PRODUCTS_QUERY, {
      variables: {
        first: 100,
        after,
        query: PRINT_PRODUCTS_SEARCH,
      },
    });

    const connection = data.products as {
      nodes?: PrintCatalogProduct[];
      pageInfo?: {hasNextPage?: boolean; endCursor?: string | null};
    };

    products.push(...(connection.nodes ?? []).filter(isFineArtPrint));
    after = connection.pageInfo?.hasNextPage ? connection.pageInfo.endCursor ?? null : null;
  } while (after);

  return products;
}

export async function loadPrintProductByHandle(
  storefront: Storefront,
  handle: string,
  request?: Request,
) {
  const selectedOptions = request
    ? getPrintDetailSelectedOptions(request)
    : [];

  const data = await storefront.query(PRODUCT_QUERY, {
    variables: {handle, selectedOptions},
  });

  const product = data.product as (PrintCatalogProduct & Record<string, unknown>) | null;
  if (!product?.id || !isFineArtPrint(product)) {
    return null;
  }

  return product;
}

export async function loadPrintProductsForArtist(
  storefront: Storefront,
  artistHandle: string,
) {
  const [products, artists] = await Promise.all([
    loadAllPrintProducts(storefront),
    loadArtistIndex(storefront),
  ]);

  const artist = artists.find((entry) => entry.handle === artistHandle);
  const artistRecordId = artist ? artistAirtableRecordId(artist) : '';

  return products.filter((product) => {
    const productArtistRecordId = normalizeAirtableRecordId(product.artistRecordId?.value);
    if (artistRecordId && productArtistRecordId) {
      return productArtistRecordId === artistRecordId;
    }

    const match = resolveArtistForProduct(product, artists);
    return match?.handle === artistHandle;
  });
}

export async function loadPrintProductsForCollection(
  storefront: Storefront,
  collectionHandle: string,
  collectionRecordId?: string | null,
) {
  const products = await loadAllPrintProducts(storefront);
  const recordId =
    normalizeAirtableRecordId(collectionRecordId) ||
    airtableRecordIdFromHandle(collectionHandle);

  return products.filter((product) =>
    productBelongsToCollection(product, {
      recordId,
      handle: collectionHandle,
    }),
  );
}

export async function loadRecommendedPrintProducts(
  storefront: Storefront,
  currentHandle: string,
  limit = 4,
) {
  const [products, artists] = await Promise.all([
    loadAllPrintProducts(storefront),
    loadArtistIndex(storefront),
  ]);

  const current = products.find((product) => product.handle === currentHandle);
  if (!current) return [];

  const currentArtist = resolveArtistForProduct(current, artists);
  const others = products.filter((product) => product.handle !== currentHandle);

  const score = (product: PrintCatalogProduct) => {
    if (!currentArtist) return 0;
    const artist = resolveArtistForProduct(product, artists);
    return artist?.handle === currentArtist.handle ? 1 : 0;
  };

  return productsToPrintCards(
    others.sort((a, b) => score(b) - score(a)).slice(0, limit),
    artists,
  );
}
