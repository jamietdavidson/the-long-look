import {useLoaderData} from 'react-router';
import {getPrintDetailSelectedOptions} from '~/lib/print-options';
import {PrintDetail} from '~/components/PrintDetail';
import {loadPictureByHandle, loadRecommendedPictures} from '~/lib/content-api';
import {PRODUCT_QUERY} from '~/graphql/product';

/**
 * @type {Route.MetaFunction}
 */
export const meta = ({data}) => {
  return [{title: `${data?.picture?.title ?? 'Print'} | The Long Look`}];
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

  const picture = await loadPictureByHandle(context.storefront, handle);
  if (!picture) {
    throw new Response(null, {status: 404});
  }

  let product = null;
  const productPromise = picture.product?.handle
    ? context.storefront.query(PRODUCT_QUERY, {
        variables: {
          handle: picture.product.handle,
          selectedOptions: getPrintDetailSelectedOptions(request),
        },
      })
    : Promise.resolve({product: null});

  const [{product: loadedProduct}, recommended] = await Promise.all([
    productPromise,
    loadRecommendedPictures(context.storefront, picture, 12),
  ]);

  product = loadedProduct ?? null;

  return {picture, product, recommended};
}

export default function PrintRoute() {
  /** @type {LoaderReturnData} */
  const {picture, product, recommended} = useLoaderData();

  return (
    <PrintDetail picture={picture} product={product} recommended={recommended} />
  );
}

/** @typedef {import('./+types/prints.$handle').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
