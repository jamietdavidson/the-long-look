import {Await, useLoaderData} from 'react-router';
import {Suspense} from 'react';
import {Hero} from '~/components/spoils/Hero';
import {ProductGrid, VideoSection} from '~/components/spoils/ProductGrid';
import {
  bestSellers as mockBestSellers,
  newArrivals as mockNewArrivals,
} from '~/lib/mock-data';
import {mockProductsToCards} from '~/lib/spoils-data';

/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return [{title: 'The Long Look | The Art of Living'}];
};

/** @param {Promise<{products?: {nodes?: unknown[]}} | null>} query */
async function withMockFallback(query, mockProducts) {
  const data = await query;
  if (data?.products?.nodes?.length) return data;
  return {products: {nodes: mockProductsToCards(mockProducts)}};
}

/** @param {Route.LoaderArgs} args */
export async function loader({context}) {
  const newArrivals = withMockFallback(
    context.storefront.query(NEW_ARRIVALS_QUERY).catch(() => null),
    mockNewArrivals,
  );
  const bestSellers = withMockFallback(
    context.storefront.query(BEST_SELLERS_QUERY).catch(() => null),
    mockBestSellers,
  );

  return {newArrivals, bestSellers};
}

export default function Homepage() {
  /** @type {LoaderReturnData} */
  const {newArrivals, bestSellers} = useLoaderData();

  return (
    <div className="pt-16">
      <Hero />
      <Suspense fallback={<SectionSkeleton title="New Arrivals" />}>
        <Await resolve={newArrivals}>
          {(data) => (
            <ProductGrid
              title="New Arrivals"
              subtitle="The Art of Living"
              products={data?.products?.nodes ?? []}
            />
          )}
        </Await>
      </Suspense>
      <VideoSection />
      <Suspense fallback={<SectionSkeleton title="Best Sellers" />}>
        <Await resolve={bestSellers}>
          {(data) => (
            <ProductGrid title="Best Sellers" products={data?.products?.nodes ?? []} />
          )}
        </Await>
      </Suspense>
    </div>
  );
}

/** @param {{title: string}} */
function SectionSkeleton({title}) {
  return (
    <section className="py-16 px-6 text-center">
      <p className="text-[11px] text-neutral-400">Loading {title}...</p>
    </section>
  );
}

const PRODUCT_FRAGMENT = `#graphql
  fragment HomeProduct on Product {
    id
    title
    handle
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    featuredImage {
      id
      url
      altText
      width
      height
    }
  }
`;

const NEW_ARRIVALS_QUERY = `#graphql
  ${PRODUCT_FRAGMENT}
  query NewArrivals($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 8, sortKey: CREATED_AT, reverse: true) {
      nodes {
        ...HomeProduct
      }
    }
  }
`;

const BEST_SELLERS_QUERY = `#graphql
  ${PRODUCT_FRAGMENT}
  query BestSellers($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 8, sortKey: BEST_SELLING) {
      nodes {
        ...HomeProduct
      }
    }
  }
`;

/** @typedef {import('./+types/_index').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
