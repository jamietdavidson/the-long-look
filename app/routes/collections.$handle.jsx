import {redirect, useLoaderData} from 'react-router';
import {Analytics} from '@shopify/hydrogen';
import {
  CatalogPageHeader,
  ProductGrid,
  printCatalogGridProps,
} from '~/components/ProductGrid';
import {
  loadArtistByHandle,
  loadContentCollectionByHandle,
} from '~/lib/content-api';
import {
  loadArtistIndex,
  loadPrintProductsForCollection,
  toPrintProductConnection,
} from '~/lib/print-catalog';
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
  if (!contentCollection) {
    throw new Response(`Collection ${handle} not found`, {status: 404});
  }

  const [products, artists] = await Promise.all([
    loadPrintProductsForCollection(
      storefront,
      handle,
      contentCollection.airtableRecordId,
    ),
    loadArtistIndex(storefront),
  ]);

  return {
    collection: {
      ...contentCollection,
      products: toPrintProductConnection(products, artists),
    },
  };
}

export default function CollectionRoute() {
  /** @type {LoaderReturnData} */
  const {collection} = useLoaderData();

  return (
    <>
      <CatalogPageHeader
        title={collection.title}
        description={collection.description}
      />
      <ProductGrid
        connection={collection.products}
        {...printCatalogGridProps}
        eagerCount={4}
        emptyMessage="No pictures in this collection yet."
      />
      <Analytics.CollectionView
        data={{
          collection: {
            id: collection.id,
            handle: collection.handle,
          },
        }}
      />
    </>
  );
}

/** @typedef {import('./+types/collections.$handle').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
