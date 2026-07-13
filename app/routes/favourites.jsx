import {useLoaderData} from 'react-router';
import {Link} from 'react-router';
import {
  CatalogPageHeader,
  ProductGrid,
  printCatalogGridProps,
} from '~/components/ProductGrid';
import {useFavoritesStore} from '~/lib/favorites-store';
import {
  loadAllPrintProducts,
  loadArtistIndex,
  toPrintProductConnection,
} from '~/lib/print-catalog';
import {printsPath} from '~/lib/paths';
import {cn} from '~/lib/utils';
import {type} from '~/lib/typography';

/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return [{title: 'Favourites | The Long Look'}];
};

/** @type {import('~/components/AppPageLayout').AppRouteHandle} */
export const handle = {
  compensateForTopbar: true,
  topbar: {autohide: false},
};

/**
 * @param {Route.LoaderArgs} args
 */
export async function loader({context}) {
  const [products, artists] = await Promise.all([
    loadAllPrintProducts(context.storefront).catch(() => []),
    loadArtistIndex(context.storefront).catch(() => []),
  ]);

  return {products: toPrintProductConnection(products, artists)};
}

export default function FavouritesPage() {
  /** @type {LoaderReturnData} */
  const {products} = useLoaderData();

  return (
    <>
      <CatalogPageHeader title="Favourites" />
      <FavouritesGrid allProducts={products.nodes} />
    </>
  );
}

/** @param {{allProducts: LoaderReturnData['products']['nodes']}} */
function FavouritesGrid({allProducts}) {
  const hasHydrated = useFavoritesStore((state) => state.hasHydrated);
  const ids = useFavoritesStore((state) => state.ids);

  const favourites = hasHydrated
    ? allProducts.filter((product) => ids.includes(product.id))
    : [];

  if (!hasHydrated) {
    return (
      <p className={cn(type.body.md, 'px-6 py-20 text-center text-neutral-400')}>
        Loading favourites…
      </p>
    );
  }

  if (favourites.length === 0) {
    return (
      <div className="px-6 py-20 text-center">
        <p className={cn(type.body.lg, 'text-neutral-500')}>
          You haven&apos;t saved any prints yet.
        </p>
        <Link
          to={printsPath()}
          className={cn(
            type.overline.xs,
            'mt-4 inline-block text-neutral-900 underline-offset-4 hover:underline',
          )}
        >
          Browse Prints
        </Link>
      </div>
    );
  }

  return (
    <ProductGrid
      products={favourites}
      {...printCatalogGridProps}
      eagerCount={4}
    />
  );
}

/** @typedef {import('./+types/favourites').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
