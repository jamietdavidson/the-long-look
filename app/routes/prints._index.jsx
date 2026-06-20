import {useLoaderData} from 'react-router';
import {SpoilsProductCard} from '~/components/spoils/ProductGrid';
import {loadAllPictures, toProductConnection} from '~/lib/content-api';

/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return [{title: 'All Prints | The Long Look'}];
};

/**
 * @param {Route.LoaderArgs} args
 */
export async function loader({context}) {
  const pictures = await loadAllPictures(context.storefront).catch(() => []);
  return {products: toProductConnection(pictures)};
}

export default function PrintsIndex() {
  /** @type {LoaderReturnData} */
  const {products} = useLoaderData();

  return (
    <div className="pt-20">
      <div className="text-center py-12 px-6 border-b border-neutral-100">
        <h1 className="text-[22px] md:text-[30px] uppercase tracking-[0.15em] font-semibold">
          All Prints
        </h1>
      </div>
      <section
        className={
          products.nodes.length > 0
            ? 'print-grid w-full'
            : 'w-full'
        }
      >
        {products.nodes.length > 0 ? (
          products.nodes.map((product, index) => (
            <SpoilsProductCard
              key={product.id}
              product={product}
              loading={index < 8 ? 'eager' : undefined}
            />
          ))
        ) : (
          <p className="col-span-full text-center text-[12px] text-neutral-500">
            No pictures published yet. Add pictures in Shopify Admin → Content → Metaobjects.
          </p>
        )}
      </section>
    </div>
  );
}

/** @typedef {import('./+types/prints._index').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
