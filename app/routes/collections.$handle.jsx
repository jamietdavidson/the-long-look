import {redirect, useLoaderData} from 'react-router';
import {getPaginationVariables, Analytics} from '@shopify/hydrogen';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {SpoilsProductCard} from '~/components/spoils/ProductGrid';
import {ArtistProfile, ArtistsIndex} from '~/components/spoils/ArtistProfile';
import {getArtistByHandle, artists} from '~/lib/spoils-data';
import {getMockCollectionByHandle} from '~/lib/collections-data';

/**
 * @type {Route.MetaFunction}
 */
export const meta = ({data}) => {
  if (data?.pageType === 'artist') {
    return [{title: `${data.artist.name} | The Long Look`}];
  }
  if (data?.pageType === 'artists-index') {
    return [{title: 'Artists | The Long Look'}];
  }
  return [{title: `${data?.collection?.title ?? 'Collection'} | The Long Look`}];
};

/**
 * @param {Route.LoaderArgs} args
 */
export async function loader(args) {
  const {handle} = args.params;

  if (!handle) {
    throw redirect('/collections');
  }

  if (handle === 'artists') {
    return {pageType: 'artists-index', artists};
  }

  const artist = getArtistByHandle(handle);
  if (artist) {
    return {pageType: 'artist', artist};
  }

  const mockCollection = getMockCollectionByHandle(handle);
  if (mockCollection) {
    return {pageType: 'collection', collection: mockCollection};
  }

  const criticalData = await loadCriticalData(args);
  return {pageType: 'collection', ...criticalData};
}

/**
 * @param {Route.LoaderArgs}
 */
async function loadCriticalData({context, params, request}) {
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
  const data = useLoaderData();

  if (data.pageType === 'artist') {
    return <ArtistProfile artist={data.artist} />;
  }

  if (data.pageType === 'artists-index') {
    return <ArtistsIndex artists={data.artists} />;
  }

  const {collection} = data;

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
      <section className="py-12 px-6 md:px-10 max-w-7xl mx-auto">
        <PaginatedResourceSection
          connection={collection.products}
          resourcesClassName="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
        >
          {({node: product, index}) => (
            <SpoilsProductCard
              key={product.id}
              product={product}
              loading={index < 8 ? 'eager' : undefined}
            />
          )}
        </PaginatedResourceSection>
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
