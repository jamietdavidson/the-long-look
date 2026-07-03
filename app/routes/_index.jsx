import {Await, useLoaderData} from 'react-router';
import {Suspense} from 'react';
import {Hero} from '~/components/Hero';
import {ProductGrid, VideoSection, printCatalogGridProps} from '~/components/ProductGrid';
import {loadAllPictures, picturesToCards} from '~/lib/content-api';

/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return [{title: 'The Long Look | The Art of Living'}];
};

/** @type {import('~/components/AppPageLayout').AppRouteHandle} */
export const handle = {
  compensateForTopbar: false,
  topbar: {mode: 'transparent'},
};

/** @param {Route.LoaderArgs} args */
export async function loader({context}) {
  const pictures = await loadAllPictures(context.storefront).catch(() => []);
  const cards = picturesToCards(pictures);
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
              subtitle="The Art of Living"
              products={data?.products?.nodes ?? []}
              {...printCatalogGridProps}
              eagerCount={8}
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
      <p className="text-[11px] text-neutral-400">Loading {title}...</p>
    </section>
  );
}

/** @typedef {import('./+types/_index').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
