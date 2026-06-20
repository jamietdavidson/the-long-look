import {
  ARTISTS_QUERY,
  ARTIST_BY_HANDLE_QUERY,
  COLLECTION_BY_HANDLE_QUERY,
  COLLECTIONS_QUERY,
  PICTURE_BY_HANDLE_QUERY,
  PICTURES_QUERY,
} from '~/graphql/content-model';
import type {Artist, Collection, Picture, Tag} from '~/lib/content-model';

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

export type PictureCard = {
  id: string;
  title: string;
  handle: string;
  artistName?: string | null;
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
    pictures: metaobjects(type: "picture", first: 100) {
      nodes {
        id
        artist: field(key: "artist") {
          reference {
            ... on Metaobject {
              handle
            }
          }
        }
        collections: field(key: "collections") {
          references(first: 20) {
            nodes {
              ... on Metaobject {
                handle
              }
            }
          }
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
    description?: FieldValue;
    coverImage?: ImageRef;
    tags?: {references?: {nodes?: Array<Record<string, unknown>> | null} | null};
  };

  return {
    id: n.id,
    handle: n.handle,
    title: n.title?.value ?? '',
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
  const data = await storefront.query(CONTENT_NAV_QUERY);
  const artists = (data.artists as {nodes?: Array<Record<string, unknown>>})?.nodes ?? [];
  const collections =
    (data.collections as {nodes?: Array<Record<string, unknown>>})?.nodes ?? [];
  const pictures = (data.pictures as {nodes?: Array<Record<string, unknown>>})?.nodes ?? [];

  const artistCounts = new Map<string, number>();
  const collectionCounts = new Map<string, number>();

  for (const picture of pictures) {
    const p = picture as {
      artist?: MetaobjectRef;
      collections?: MetaobjectRefs;
    };
    const artistHandle = p.artist?.reference?.handle;
    if (artistHandle) {
      artistCounts.set(artistHandle, (artistCounts.get(artistHandle) ?? 0) + 1);
    }
    for (const collection of p.collections?.references?.nodes ?? []) {
      if (collection?.handle) {
        collectionCounts.set(
          collection.handle,
          (collectionCounts.get(collection.handle) ?? 0) + 1,
        );
      }
    }
  }

  return {
    artists: artists.map((node) => {
      const n = node as {handle: string; name?: FieldValue};
      return {
        handle: n.handle,
        name: n.name?.value ?? n.handle,
        works: artistCounts.get(n.handle) ?? 0,
      };
    }),
    collections: collections.map((node) => {
      const n = node as {handle: string; title?: FieldValue};
      return {
        handle: n.handle,
        title: n.title?.value ?? n.handle,
        count: collectionCounts.get(n.handle) ?? 0,
      };
    }),
    totalPictures: pictures.length,
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
  const [artists, pictures] = await Promise.all([
    loadAllArtists(storefront),
    loadAllPictures(storefront),
  ]);

  return artists.map((artist) => ({
    ...artist,
    pictures: pictures.filter((picture) => picture.artist.handle === artist.handle),
    works: pictures.filter((picture) => picture.artist.handle === artist.handle),
  }));
}
