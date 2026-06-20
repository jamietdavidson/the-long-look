import {Link, useLoaderData} from 'react-router';
import {getSelectedProductOptions, Money} from '@shopify/hydrogen';
import {ProductPurchase} from '~/components/ProductPurchase';
import {loadPictureByHandle} from '~/lib/content-api';
import {PRODUCT_QUERY} from '~/graphql/product';
import {artistPath, printsPath} from '~/lib/paths';

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

  const price = picture.product?.priceRange?.minVariantPrice;

  return (
    <div className="pt-20">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
          <div className="aspect-[3/4] bg-neutral-100 overflow-hidden">
            {picture.image?.url && (
              <img
                src={picture.image.url}
                alt={picture.image.altText || picture.title}
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <div className="md:pt-8">
            <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 mb-3">The Long Look</p>
            <h1 className="text-[22px] uppercase tracking-[0.1em] font-semibold mb-4">{picture.title}</h1>
            {picture.artist?.name && (
              <p className="text-[12px] text-neutral-500 mb-4">
                by{' '}
                <Link
                  to={artistPath(picture.artist.handle)}
                  className="text-neutral-800 hover:underline"
                >
                  {picture.artist.name}
                </Link>
              </p>
            )}
            {picture.description && (
              <p className="text-[12px] text-neutral-600 leading-relaxed mb-8">{picture.description}</p>
            )}
            {product ? (
              <ProductPurchase product={product} />
            ) : price && Number(price.amount) > 0 ? (
              <p className="text-[14px] text-neutral-600 mb-6">
                From <Money data={price} withoutTrailingZeros />
              </p>
            ) : (
              <Link
                to={printsPath()}
                className="inline-block border border-neutral-900 px-8 py-3 text-[10px] uppercase tracking-[0.3em] hover:bg-neutral-900 hover:text-white transition-colors"
              >
                Continue Shopping
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** @typedef {import('./+types/prints.$handle').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
