import {
  ARTISTS_QUERY,
  ARTIST_BY_HANDLE_QUERY,
  COLLECTION_BY_HANDLE_QUERY,
  COLLECTIONS_QUERY,
  PICTURE_BY_HANDLE_QUERY,
  PICTURES_QUERY,
} from '~/graphql/content-model';
import type {Artist, Collection, Picture, Tag} from '~/lib/content-model';
import {
  loadAllPrintProducts,
  loadArtistIndex,
  getProductCollectionHandles,
  productsToPrintCards,
  productBelongsToCollection,
  collectionAirtableRecordId,
  resolveArtistForProduct,
  type PictureCard,
} from '~/lib/print-catalog';

type Storefront = {
  query: (
    query: string,
    options?: {variables?: Record<string, unknown>; cache?: unknown},
  ) => Promise<Record<string, unknown>>;
};

type FieldValue = {value?: string | null} | null | undefined;
type ImageRef = {
  reference?: {
    image?: {
      url?: string;
      altText?: string | null;
      width?: number | null;
      height?: number | null;
    } | null;
  } | null;
} | null;
type MetaobjectRef = {
  reference?: {id?: string; handle?: string} | null;
} | null;
type MetaobjectRefs = {
  references?: {nodes?: Array<{id?: string; handle?: string}> | null} | null;
} | null;

export type PictureCard = import('~/lib/print-catalog').PrintCatalogCard;

export type ContentNav = {
  artists: Array<{name: string; handle: string; works: number}>;
  collections: Array<{title: string; handle: string; count: number}>;
  totalPictures: number;
};

const CONTENT_NAV_QUERY = `#graphql
  query ContentNav {
    artists: metaobjects(type: "artist", first: 50) {
      nodes {
        id
        handle
        name: field(key: "name") {
          value
        }
      }
    }
    collections: metaobjects(type: "collection", first: 50) {
      nodes {
        id
        handle
        title: field(key: "title") {
          value
        }
      }
    }
  }
`;

function parseImage(field: ImageRef) {
  const image = field?.reference?.image;
  if (!image?.url) return null;
  return {
    url: image.url,
    altText: image.altText,
    width: image.width,
    height: image.height,
  };
}

function parseTag(node: {
  id: string;
  handle: string;
  label?: FieldValue;
}): Tag {
  return {
    id: node.id,
    handle: node.handle,
    label: node.label?.value ?? '',
  };
}

function parseArtist(node: Record<string, unknown>): Artist {
  const n = node as {
    id: string;
    handle: string;
    name?: FieldValue;
    airtableRecordId?: FieldValue;
    bio?: FieldValue;
    birthYear?: FieldValue;
    location?: FieldValue;
    portrait?: ImageRef;
    instagramHandle?: FieldValue;
    tags?: {references?: {nodes?: Array<Record<string, unknown>> | null} | null};
  };

  return {
    id: n.id,
    handle: n.handle,
    name: n.name?.value ?? '',
    airtableRecordId: n.airtableRecordId?.value ?? null,
    bio: n.bio?.value,
    birthYear: n.birthYear?.value ? Number(n.birthYear.value) : null,
    location: n.location?.value,
    portrait: parseImage(n.portrait),
    instagramHandle: n.instagramHandle?.value,
    tags: (n.tags?.references?.nodes ?? []).map((tag) => parseTag(tag as Parameters<typeof parseTag>[0])),
  };
}

function parseCollection(node: Record<string, unknown>): Collection {
  const n = node as {
    id: string;
    handle: string;
    title?: FieldValue;
    airtableRecordId?: FieldValue;
    description?: FieldValue;
    coverImage?: ImageRef;
    tags?: {references?: {nodes?: Array<Record<string, unknown>> | null} | null};
  };

  return {
    id: n.id,
    handle: n.handle,
    title: n.title?.value ?? '',
    airtableRecordId: n.airtableRecordId?.value ?? null,
    description: n.description?.value,
    coverImage: parseImage(n.coverImage),
    tags: (n.tags?.references?.nodes ?? []).map((tag) => parseTag(tag as Parameters<typeof parseTag>[0])),
  };
}

function parsePicture(node: Record<string, unknown>): Picture {
  const n = node as {
    id: string;
    handle: string;
    title?: FieldValue;
    description?: FieldValue;
    image?: ImageRef;
    artist?: {reference?: Record<string, unknown> | null};
    collections?: {references?: {nodes?: Array<Record<string, unknown>> | null} | null};
    tags?: {references?: {nodes?: Array<Record<string, unknown>> | null} | null};
    product?: {
      reference?: {
        id?: string;
        handle?: string;
        title?: string;
        priceRange?: {
          minVariantPrice?: {amount?: string; currencyCode?: string};
        };
      } | null;
    };
  };

  const artistNode = n.artist?.reference;
  const image = parseImage(n.image);

  return {
    id: n.id,
    handle: n.handle,
    title: n.title?.value ?? '',
    description: n.description?.value,
    image: image ?? {url: '', altText: n.title?.value},
    artist: artistNode ? parseArtist(artistNode) : {id: '', handle: '', name: '', tags: []},
    collections: (n.collections?.references?.nodes ?? []).map((c) =>
      parseCollection(c),
    ),
    tags: (n.tags?.references?.nodes ?? []).map((tag) => parseTag(tag as Parameters<typeof parseTag>[0])),
    product: n.product?.reference?.id
      ? {
          id: n.product.reference.id,
          handle: n.product.reference.handle ?? '',
          title: n.product.reference.title ?? '',
          priceRange: n.product.reference.priceRange?.minVariantPrice
            ? {minVariantPrice: n.product.reference.priceRange.minVariantPrice as {amount: string; currencyCode: string}}
            : undefined,
        }
      : null,
  };
}

export function pictureToCard(picture: Picture): PictureCard {
  const price = picture.product?.priceRange?.minVariantPrice;

  return {
    id: picture.id,
    title: picture.title,
    handle: picture.handle,
    artistName: picture.artist?.name ?? null,
    artistHandle: picture.artist?.handle ?? null,
    featuredImage: picture.image?.url
      ? {
          id: picture.id,
          url: picture.image.url,
          altText: picture.image.altText,
          width: picture.image.width,
          height: picture.image.height,
        }
      : null,
    priceRange: {
      minVariantPrice: price ?? {amount: '0', currencyCode: 'USD'},
    },
  };
}

export function picturesToCards(pictures: Picture[]): PictureCard[] {
  return pictures.map(pictureToCard);
}

export function getRecommendedPictures(
  picture: Picture,
  allPictures: Picture[],
  limit = 4,
): Picture[] {
  const others = allPictures.filter((candidate) => candidate.handle !== picture.handle);
  const collectionHandles = new Set(picture.collections.map((collection) => collection.handle));

  const score = (candidate: Picture) => {
    let value = 0;
    if (candidate.artist.handle === picture.artist.handle) value += 2;
    for (const collection of candidate.collections) {
      if (collectionHandles.has(collection.handle)) value += 1;
    }
    return value;
  };

  return [...others].sort((a, b) => score(b) - score(a)).slice(0, limit);
}

export async function loadRecommendedPictures(
  storefront: Storefront,
  picture: Picture,
  limit = 4,
): Promise<PictureCard[]> {
  const allPictures = await loadAllPictures(storefront).catch(() => []);
  return picturesToCards(getRecommendedPictures(picture, allPictures, limit));
}

export function toProductConnection(pictures: Picture[]) {
  return {
    nodes: picturesToCards(pictures),
    pageInfo: {
      hasPreviousPage: false,
      hasNextPage: false,
      startCursor: null,
      endCursor: null,
    },
  };
}

export async function loadContentNav(storefront: Storefront): Promise<ContentNav> {
  const [data, products, artists] = await Promise.all([
    storefront.query(CONTENT_NAV_QUERY),
    loadAllPrintProducts(storefront).catch(() => []),
    loadArtistIndex(storefront).catch(() => []),
  ]);

  const artistNodes = (data.artists as {nodes?: Array<Record<string, unknown>>})?.nodes ?? [];
  const collectionNodes =
    (data.collections as {nodes?: Array<Record<string, unknown>>})?.nodes ?? [];

  const artistCounts = new Map<string, number>();
  for (const product of products) {
    const artist = resolveArtistForProduct(product, artists);
    if (artist) {
      artistCounts.set(artist.handle, (artistCounts.get(artist.handle) ?? 0) + 1);
    }
  }

  const collectionCounts = new Map<string, number>();
  const collections = collectionNodes.map((node) => parseCollection(node));
  for (const product of products) {
    for (const collection of collections) {
      if (
        productBelongsToCollection(product, {
          recordId: collectionAirtableRecordId(collection),
          handle: collection.handle,
        })
      ) {
        collectionCounts.set(
          collection.handle,
          (collectionCounts.get(collection.handle) ?? 0) + 1,
        );
      }
    }
  }

  return {
    artists: artistNodes.map((node) => {
      const n = node as {handle: string; name?: FieldValue};
      return {
        handle: n.handle,
        name: n.name?.value ?? n.handle,
        works: artistCounts.get(n.handle) ?? 0,
      };
    }),
    collections: collectionNodes.map((node) => {
      const n = node as {handle: string; title?: FieldValue};
      return {
        handle: n.handle,
        title: n.title?.value ?? n.handle,
        count: collectionCounts.get(n.handle) ?? 0,
      };
    }),
    totalPictures: products.length,
  };
}

export async function loadAllPictures(storefront: Storefront): Promise<Picture[]> {
  const data = await storefront.query(PICTURES_QUERY, {variables: {first: 100}});
  const nodes = (data.pictures as {nodes?: Array<Record<string, unknown>>})?.nodes ?? [];
  return nodes.map(parsePicture);
}

export async function loadPictureByHandle(
  storefront: Storefront,
  handle: string,
): Promise<Picture | null> {
  const data = await storefront.query(PICTURE_BY_HANDLE_QUERY, {variables: {handle}});
  const node = data.picture as Record<string, unknown> | null;
  return node ? parsePicture(node) : null;
}

export async function loadAllArtists(storefront: Storefront): Promise<Artist[]> {
  const data = await storefront.query(ARTISTS_QUERY, {variables: {first: 50}});
  const nodes = (data.artists as {nodes?: Array<Record<string, unknown>>})?.nodes ?? [];
  return nodes.map(parseArtist);
}

export async function loadArtistByHandle(
  storefront: Storefront,
  handle: string,
): Promise<Artist | null> {
  const data = await storefront.query(ARTIST_BY_HANDLE_QUERY, {variables: {handle}});
  const node = data.artist as Record<string, unknown> | null;
  return node ? parseArtist(node) : null;
}

export async function loadContentCollectionByHandle(
  storefront: Storefront,
  handle: string,
): Promise<Collection | null> {
  const data = await storefront.query(COLLECTION_BY_HANDLE_QUERY, {variables: {handle}});
  const node = data.collection as Record<string, unknown> | null;
  return node ? parseCollection(node) : null;
}

export async function loadAllContentCollections(
  storefront: Storefront,
): Promise<Collection[]> {
  const data = await storefront.query(COLLECTIONS_QUERY, {variables: {first: 50}});
  const nodes = (data.collections as {nodes?: Array<Record<string, unknown>>})?.nodes ?? [];
  return nodes.map(parseCollection);
}

export async function loadPicturesForArtist(
  storefront: Storefront,
  artistHandle: string,
): Promise<Picture[]> {
  const pictures = await loadAllPictures(storefront);
  return pictures.filter((picture) => picture.artist.handle === artistHandle);
}

export async function loadPicturesForCollection(
  storefront: Storefront,
  collectionHandle: string,
): Promise<Picture[]> {
  const pictures = await loadAllPictures(storefront);
  return pictures.filter((picture) =>
    picture.collections.some((collection) => collection.handle === collectionHandle),
  );
}

export async function loadArtistsIndex(storefront: Storefront) {
  const [artists, products, artistIndex] = await Promise.all([
    loadAllArtists(storefront),
    loadAllPrintProducts(storefront).catch(() => []),
    loadArtistIndex(storefront).catch(() => []),
  ]);

  return artists.map((artist) => {
    const works = productsToPrintCards(
      products.filter(
        (product) => resolveArtistForProduct(product, artistIndex)?.handle === artist.handle,
      ),
      artistIndex,
    );

    return {
      ...artist,
      works,
    };
  });
}

export type SearchContentResult = {
  prints: PictureCard[];
  artists: Artist[];
};

/**
 * Search pictures and artists by title, description, artist name, or location.
 * @param {Storefront} storefront
 * @param {string} term
 */
export async function searchContent(
  storefront: Storefront,
  term: string,
): Promise<SearchContentResult> {
  const query = term.trim().toLowerCase();
  if (!query) {
    return {prints: [], artists: []};
  }

  const [products, artists] = await Promise.all([
    loadAllPrintProducts(storefront).catch(() => []),
    loadAllArtists(storefront).catch(() => []),
  ]);

  const matchedArtists = artists.filter((artist) => {
    const haystack = [artist.name, artist.location, artist.bio]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });

  const matchedArtistHandles = new Set(matchedArtists.map((artist) => artist.handle));
  const artistIndex = await loadArtistIndex(storefront).catch(() => []);

  const matchedPrints = products.filter((product) => {
    const artist = resolveArtistForProduct(product, artistIndex);
    if (artist && matchedArtistHandles.has(artist.handle)) {
      return true;
    }

    const haystack = [product.title, product.vendor]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });

  return {
    prints: productsToPrintCards(matchedPrints, artistIndex),
    artists: matchedArtists,
  };
}
