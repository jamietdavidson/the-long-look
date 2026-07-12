import {useLoaderData} from 'react-router';
import {getPrintDetailSelectedOptions} from '~/lib/print-options';
import {PrintDetail} from '~/components/PrintDetail';
import {
  loadPrintProductByHandle,
  loadRecommendedPrintProducts,
  resolveArtistForVendor,
  loadArtistIndex,
} from '~/lib/print-catalog';

/**
 * @type {Route.MetaFunction}
 */
export const meta = ({data}) => {
  return [{title: `${data?.product?.title ?? 'Print'} | The Long Look`}];
};

/** @type {import('~/components/AppPageLayout').AppRouteHandle} */
export const handle = {
  compensateForTopbar: false,
  topbar: {mode: 'transparent'},
};

/**
 * @param {Route.LoaderArgs} args
 */
export async function loader({context, request, params}) {
  const {handle} = params;

  if (!handle) {
    throw new Response(null, {status: 404});
  }

  const product = await loadPrintProductByHandle(context.storefront, handle, request);
  if (!product) {
    throw new Response(null, {status: 404});
  }

  const [artists, recommended] = await Promise.all([
    loadArtistIndex(context.storefront),
    loadRecommendedPrintProducts(context.storefront, handle, 12),
  ]);

  const artist = resolveArtistForVendor(product.vendor, artists);

  return {product, artist, recommended};
}

export default function PrintRoute() {
  /** @type {LoaderReturnData} */
  const {product, artist, recommended} = useLoaderData();

  return (
    <PrintDetail product={product} artist={artist} recommended={recommended} />
  );
}

/** @typedef {import('./+types/prints.$handle').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
