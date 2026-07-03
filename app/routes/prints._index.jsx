import {useLoaderData} from 'react-router';
import {ProductGrid, printCatalogGridProps} from '~/components/ProductGrid';
import {loadAllPictures, toProductConnection} from '~/lib/content-api';
import {type} from '~/lib/typography';

/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return [{title: 'Prints | The Long Look'}];
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
    <>
      <div className="text-center py-12 px-6 border-b border-neutral-100">
        <h1 className={type.title.md}>
          Prints
        </h1>
      </div>
      <ProductGrid
        products={products.nodes}
        {...printCatalogGridProps}
        eagerCount={8}
        emptyMessage="No pictures published yet. Add pictures in Shopify Admin → Content → Metaobjects."
      />
    </>
  );
}

/** @typedef {import('./+types/prints._index').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
