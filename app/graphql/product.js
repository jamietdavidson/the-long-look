export const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    availableForSale
    compareAtPrice {
      amount
      currencyCode
    }
    id
    image {
      __typename
      id
      url
      altText
      width
      height
    }
    price {
      amount
      currencyCode
    }
    product {
      title
      handle
    }
    selectedOptions {
      name
      value
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
    metafields(
      identifiers: [
        {namespace: "print", key: "short_inches"}
        {namespace: "print", key: "long_inches"}
        {namespace: "print", key: "padding_inches"}
        {namespace: "print", key: "frame_width_inches"}
        {namespace: "print", key: "rank"}
      ]
    ) {
      namespace
      key
      value
      type
    }
  }
`;

export const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    productType
    descriptionHtml
    description
    featuredImage {
      id
      url
      altText
      width
      height
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    encodedVariantExistence
    encodedVariantAvailability
    options {
      name
      optionValues {
        name
        firstSelectableVariant {
          ...ProductVariant
        }
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
      }
    }
    selectedOrFirstAvailableVariant(
      selectedOptions: $selectedOptions
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      ...ProductVariant
    }
    adjacentVariants(selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    seo {
      description
      title
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
`;

export const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
  }
  ${PRODUCT_FRAGMENT}
`;

export const PRINT_CATALOG_PRODUCT_FRAGMENT = `#graphql
  fragment PrintCatalogProduct on Product {
    id
    title
    handle
    vendor
    productType
    description
    featuredImage {
      id
      url
      altText
      width
      height
    }
    collectionHandles: metafield(namespace: "print", key: "collection_handles") {
      value
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
  }
`;

export const PRINT_PRODUCTS_QUERY = `#graphql
  query PrintProducts(
    $country: CountryCode
    $language: LanguageCode
    $first: Int!
    $after: String
    $query: String!
  ) @inContext(country: $country, language: $language) {
    products(first: $first, after: $after, query: $query) {
      nodes {
        ...PrintCatalogProduct
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
  ${PRINT_CATALOG_PRODUCT_FRAGMENT}
`;
