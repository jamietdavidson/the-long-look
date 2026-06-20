/**
 * Storefront API queries for The Long Look content metaobjects.
 * Requires definitions with storefront access: PUBLIC_READ.
 */

export const TAG_FRAGMENT = `#graphql
  fragment TagFields on Metaobject {
    id
    handle
    label: field(key: "label") {
      value
    }
  }
` as const;

export const ARTIST_FRAGMENT = `#graphql
  fragment ArtistFields on Metaobject {
    id
    handle
    name: field(key: "name") {
      value
    }
    bio: field(key: "bio") {
      value
    }
    birthYear: field(key: "birth_year") {
      value
    }
    location: field(key: "location") {
      value
    }
    instagramHandle: field(key: "instagram_handle") {
      value
    }
    portrait: field(key: "portrait") {
      reference {
        ... on MediaImage {
          image {
            url
            altText
            width
            height
          }
        }
      }
    }
    tags: field(key: "tags") {
      references(first: 20) {
        nodes {
          ...TagFields
        }
      }
    }
  }
` as const;

export const COLLECTION_FRAGMENT = `#graphql
  fragment CollectionFields on Metaobject {
    id
    handle
    title: field(key: "title") {
      value
    }
    description: field(key: "description") {
      value
    }
    coverImage: field(key: "cover_image") {
      reference {
        ... on MediaImage {
          image {
            url
            altText
            width
            height
          }
        }
      }
    }
    tags: field(key: "tags") {
      references(first: 20) {
        nodes {
          ...TagFields
        }
      }
    }
  }
` as const;

export const PICTURE_FRAGMENT = `#graphql
  fragment PictureFields on Metaobject {
    id
    handle
    title: field(key: "title") {
      value
    }
    description: field(key: "description") {
      value
    }
    image: field(key: "image") {
      reference {
        ... on MediaImage {
          image {
            url
            altText
            width
            height
          }
        }
      }
    }
    artist: field(key: "artist") {
      reference {
        ... on Metaobject {
          id
          handle
          name: field(key: "name") {
            value
          }
          bio: field(key: "bio") {
            value
          }
          birthYear: field(key: "birth_year") {
            value
          }
          location: field(key: "location") {
            value
          }
          instagramHandle: field(key: "instagram_handle") {
            value
          }
          portrait: field(key: "portrait") {
            reference {
              ... on MediaImage {
                image {
                  url
                  altText
                  width
                  height
                }
              }
            }
          }
        }
      }
    }
    collections: field(key: "collections") {
      references(first: 20) {
        nodes {
          ... on Metaobject {
            id
            handle
            title: field(key: "title") {
              value
            }
            description: field(key: "description") {
              value
            }
          }
        }
      }
    }
    tags: field(key: "tags") {
      references(first: 20) {
        nodes {
          ...TagFields
        }
      }
    }
    product: field(key: "product") {
      reference {
        ... on Product {
          id
          handle
          title
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
` as const;

export const ARTISTS_QUERY = `#graphql
  query Artists($first: Int = 50) {
    artists: metaobjects(type: "artist", first: $first) {
      nodes {
        ...ArtistFields
      }
    }
  }
  ${TAG_FRAGMENT}
  ${ARTIST_FRAGMENT}
` as const;

export const ARTIST_BY_HANDLE_QUERY = `#graphql
  query ArtistByHandle($handle: String!) {
    artist: metaobject(handle: {type: "artist", handle: $handle}) {
      ...ArtistFields
    }
  }
  ${TAG_FRAGMENT}
  ${ARTIST_FRAGMENT}
` as const;

export const COLLECTIONS_QUERY = `#graphql
  query Collections($first: Int = 50) {
    collections: metaobjects(type: "collection", first: $first) {
      nodes {
        ...CollectionFields
      }
    }
  }
  ${TAG_FRAGMENT}
  ${COLLECTION_FRAGMENT}
` as const;

export const COLLECTION_BY_HANDLE_QUERY = `#graphql
  query CollectionByHandle($handle: String!) {
    collection: metaobject(handle: {type: "collection", handle: $handle}) {
      ...CollectionFields
    }
  }
  ${TAG_FRAGMENT}
  ${COLLECTION_FRAGMENT}
` as const;

export const PICTURES_QUERY = `#graphql
  query Pictures($first: Int = 50) {
    pictures: metaobjects(type: "picture", first: $first) {
      nodes {
        ...PictureFields
      }
    }
  }
  ${TAG_FRAGMENT}
  ${PICTURE_FRAGMENT}
` as const;

export const PICTURE_BY_HANDLE_QUERY = `#graphql
  query PictureByHandle($handle: String!) {
    picture: metaobject(handle: {type: "picture", handle: $handle}) {
      ...PictureFields
    }
  }
  ${TAG_FRAGMENT}
  ${PICTURE_FRAGMENT}
` as const;
