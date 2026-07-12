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

export type PrintCatalogProduct = {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  productType: string;
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

function parseArtistIndex(nodes: Array<Record<string, unknown>>): Artist[] {
  return nodes.map((node) => {
    const n = node as {id: string; handle: string; name?: {value?: string | null}};
    return {
      id: n.id,
      handle: n.handle,
      name: n.name?.value ?? '',
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
  for (const artist of artists) {
    byName.set(artist.name.toLowerCase(), artist);
    byHandle.set(artist.handle, artist);
  }
  return {byName, byHandle};
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

export function productToPrintCard(
  product: PrintCatalogProduct,
  artists: Artist[] = [],
): PrintCatalogCard {
  const artist = resolveArtistForVendor(product.vendor, artists);

  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    artistName: artist?.name ?? product.vendor ?? null,
    artistHandle: artist?.handle ?? (product.vendor ? slugify(product.vendor) : null),
    featuredImage: product.featuredImage,
    priceRange: product.priceRange,
  };
}

export function productToFilterSource(
  product: PrintCatalogProduct,
  artists: Artist[] = [],
): PrintFilterSource {
  const artist = resolveArtistForVendor(product.vendor, artists);

  return {
    title: product.title,
    description: null,
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

  return products.filter((product) => {
    const match = resolveArtistForVendor(product.vendor, artists);
    return match?.handle === artistHandle;
  });
}

export async function loadPrintProductsForCollection(
  storefront: Storefront,
  collectionHandle: string,
  pictureHandlesInCollection: string[],
) {
  const handleSet = new Set(pictureHandlesInCollection);
  const products = await loadAllPrintProducts(storefront);
  return products.filter((product) => handleSet.has(product.handle));
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

  const currentArtist = resolveArtistForVendor(current.vendor, artists);
  const others = products.filter((product) => product.handle !== currentHandle);

  const score = (product: PrintCatalogProduct) => {
    if (!currentArtist) return 0;
    const artist = resolveArtistForVendor(product.vendor, artists);
    return artist?.handle === currentArtist.handle ? 1 : 0;
  };

  return productsToPrintCards(
    [...others].sort((a, b) => score(b) - score(a)).slice(0, limit),
    artists,
  );
}
