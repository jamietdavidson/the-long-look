import {redirect, useLoaderData} from 'react-router';
import {getPaginationVariables, Analytics} from '@shopify/hydrogen';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {SpoilsProductCard} from '~/components/spoils/ProductGrid';
import {
  loadArtistByHandle,
  loadContentCollectionByHandle,
  loadPicturesForCollection,
  toProductConnection,
} from '~/lib/content-api';
import {artistPath, artistsPath, printsPath} from '~/lib/paths';

/**
 * @type {Route.MetaFunction}
 */
export const meta = ({data}) => {
  return [{title: `${data?.collection?.title ?? 'Collection'} | The Long Look`}];
};

/**
 * @param {Route.LoaderArgs} args
 */
export async function loader(args) {
  const {handle} = args.params;
  const {storefront} = args.context;

  if (!handle) {
    throw redirect('/collections');
  }

  if (handle === 'artists') {
    throw redirect(artistsPath());
  }

  if (handle === 'all') {
    throw redirect(printsPath());
  }

  const artist = await loadArtistByHandle(storefront, handle);
  if (artist) {
    throw redirect(artistPath(handle));
  }

  const contentCollection = await loadContentCollectionByHandle(storefront, handle);
  if (contentCollection) {
    const pictures = await loadPicturesForCollection(storefront, handle);
    return {
      collection: {
        ...contentCollection,
        products: toProductConnection(pictures),
      },
    };
  }

  return loadShopifyCollection(args);
}

/**
 * @param {Route.LoaderArgs}
 */
async function loadShopifyCollection({context, params, request}) {
  const {handle} = params;
  const {storefront} = context;
  const paginationVariables = getPaginationVariables(request, {pageBy: 8});

  const [{collection}] = await Promise.all([
    storefront.query(COLLECTION_QUERY, {
      variables: {handle, ...paginationVariables},
    }),
  ]);

  if (!collection) {
    throw new Response(`Collection ${handle} not found`, {status: 404});
  }

  redirectIfHandleIsLocalized(request, {handle, data: collection});

  return {collection};
}

export default function CollectionRoute() {
  /** @type {LoaderReturnData} */
  const {collection} = useLoaderData();

  return (
    <div className="pt-20">
      <div className="text-center py-12 px-6 border-b border-neutral-100">
        <h1 className="text-[22px] md:text-[30px] uppercase tracking-[0.15em] font-semibold">
          {collection.title}
        </h1>
        {collection.description && (
          <p className="mt-4 text-[12px] text-neutral-500 max-w-xl mx-auto">{collection.description}</p>
        )}
      </div>
      <section className="w-full">
        {collection.products?.nodes?.length ? (
          <PaginatedResourceSection
            connection={collection.products}
            resourcesClassName="print-grid w-full"
          >
            {({node: product, index}) => (
              <SpoilsProductCard
                key={product.id}
                product={product}
                loading={index < 8 ? 'eager' : undefined}
              />
            )}
          </PaginatedResourceSection>
        ) : (
          <p className="text-center text-[12px] text-neutral-500">
            No pictures in this collection yet.
          </p>
        )}
      </section>
      <Analytics.CollectionView
        data={{
          collection: {
            id: collection.id,
            handle: collection.handle,
          },
        }}
      />
    </div>
  );
}

const PRODUCT_ITEM_FRAGMENT = `#graphql
  fragment MoneyProductItem on MoneyV2 {
    amount
    currencyCode
  }
  fragment ProductItem on Product {
    id
    handle
    title
    featuredImage {
      id
      altText
      url
      width
      height
    }
    priceRange {
      minVariantPrice {
        ...MoneyProductItem
      }
      maxVariantPrice {
        ...MoneyProductItem
      }
    }
  }
`;

const COLLECTION_QUERY = `#graphql
  ${PRODUCT_ITEM_FRAGMENT}
  query Collection(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      products(
        first: $first,
        last: $last,
        before: $startCursor,
        after: $endCursor
      ) {
        nodes {
          ...ProductItem
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          endCursor
          startCursor
        }
      }
    }
  }
`;

/** @typedef {import('./+types/collections.$handle').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
