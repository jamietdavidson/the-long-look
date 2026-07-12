import {Await, useLoaderData} from 'react-router';
import {Suspense} from 'react';
import {Hero} from '~/components/Hero';
import {ProductGrid, VideoSection, printCatalogGridProps} from '~/components/ProductGrid';
import {
  loadAllPrintProducts,
  loadArtistIndex,
  productsToPrintCards,
} from '~/lib/print-catalog';
import {cn} from '~/lib/utils';
import {type} from '~/lib/typography';

/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return [{title: 'The Long Look'}];
};

/** @type {import('~/components/AppPageLayout').AppRouteHandle} */
export const handle = {
  compensateForTopbar: false,
  topbar: {mode: 'transparent'},
};

/** @param {Route.LoaderArgs} args */
export async function loader({context}) {
  const [products, artists] = await Promise.all([
    loadAllPrintProducts(context.storefront).catch(() => []),
    loadArtistIndex(context.storefront).catch(() => []),
  ]);
  const cards = productsToPrintCards(products, artists);
  const featured = cards.slice(0, 8);
  const recent = cards.slice().reverse().slice(0, 8);

  return {
    newArrivals: Promise.resolve({products: {nodes: recent}}),
    bestSellers: Promise.resolve({products: {nodes: featured}}),
  };
}

export default function Homepage() {
  /** @type {LoaderReturnData} */
  const {newArrivals, bestSellers} = useLoaderData();

  return (
    <>
      <Hero />
      <Suspense fallback={<SectionSkeleton title="Recent Works" />}>
        <Await resolve={newArrivals}>
          {(data) => (
            <ProductGrid
              title="Recent Works"
              products={data?.products?.nodes ?? []}
              {...printCatalogGridProps}
              eagerCount={3}
            />
          )}
        </Await>
      </Suspense>
      <VideoSection />
      <Suspense fallback={<SectionSkeleton title="Featured Works" />}>
        <Await resolve={bestSellers}>
          {(data) => (
            <ProductGrid
              title="Featured Works"
              products={data?.products?.nodes ?? []}
              {...printCatalogGridProps}
            />
          )}
        </Await>
      </Suspense>
    </>
  );
}

/** @param {{title: string}} */
function SectionSkeleton({title}) {
  return (
    <section className="py-16 px-6 text-center">
      <p className={cn(type.body.md, 'text-neutral-400')}>Loading {title}...</p>
    </section>
  );
}

/** @typedef {import('./+types/_index').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
