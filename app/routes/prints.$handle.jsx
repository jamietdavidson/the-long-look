import {useLoaderData} from 'react-router';
import {getSelectedProductOptions} from '@shopify/hydrogen';
import {PrintDetail} from '~/components/PrintDetail';
import {loadPictureByHandle} from '~/lib/content-api';
import {PRODUCT_QUERY} from '~/graphql/product';

/**
 * @type {Route.MetaFunction}
 */
export const meta = ({data}) => {
  return [{title: `${data?.picture?.title ?? 'Print'} | The Long Look`}];
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
  if (picture.product?.handle) {
    const {product: loadedProduct} = await context.storefront.query(PRODUCT_QUERY, {
      variables: {
        handle: picture.product.handle,
        selectedOptions: getSelectedProductOptions(request),
      },
    });
    product = loadedProduct ?? null;
  }

  return {picture, product};
}

export default function PrintRoute() {
  /** @type {LoaderReturnData} */
  const {picture, product} = useLoaderData();

  return (
    <PrintDetail picture={picture} product={product} />
  );
}

/** @typedef {import('./+types/prints.$handle').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
