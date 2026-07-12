import {useLoaderData} from 'react-router';
import {ProductGrid, printCatalogGridProps} from '~/components/ProductGrid';
import {
  loadAllPrintProducts,
  loadArtistIndex,
  toPrintProductConnection,
} from '~/lib/print-catalog';
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
  const [products, artists] = await Promise.all([
    loadAllPrintProducts(context.storefront),
    loadArtistIndex(context.storefront).catch(() => []),
  ]);

  return {products: toPrintProductConnection(products, artists)};
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
        emptyMessage="No prints for sale yet. Commit prints in Airtable to sync them to Shopify."
      />
    </>
  );
}

/** @typedef {import('./+types/prints._index').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
