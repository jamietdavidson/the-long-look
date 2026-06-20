import {useLoaderData} from 'react-router';
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
  Image,
} from '@shopify/hydrogen';
import {ProductPurchase} from '~/components/ProductPurchase';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {PRODUCT_QUERY} from '~/graphql/product';

/**
 * @type {Route.MetaFunction}
 */
export const meta = ({data}) => {
  return [{title: `${data?.product?.title ?? 'Product'} | The Long Look`}];
};

/**
 * @param {Route.LoaderArgs} args
 */
export async function loader(args) {
  const {handle} = args.params;
  const {storefront} = args.context;

  if (!handle) {
    throw new Response(null, {status: 404});
  }

  const [{product}] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
      variables: {handle, selectedOptions: getSelectedProductOptions(args.request)},
    }),
  ]);

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  redirectIfHandleIsLocalized(args.request, {handle, data: product});

  return {product, isMock: false};
}

export default function ProductRoute() {
  /** @type {LoaderReturnData} */
  const {product} = useLoaderData();

  return <ShopifyProductPage product={product} />;
}

/** @param {{product: NonNullable<Awaited<ReturnType<typeof loader>>['product']>}} */
function ShopifyProductPage({product}) {
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  const {title, descriptionHtml} = product;

  return (
    <div className="pt-20">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
          <div className="aspect-[3/4] bg-neutral-100 overflow-hidden">
            {selectedVariant?.image && (
              <Image
                alt={selectedVariant.image.altText || title}
                aspectRatio="3/4"
                data={selectedVariant.image}
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover w-full h-full"
              />
            )}
          </div>
          <div className="md:pt-8">
            <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 mb-3">{product.vendor}</p>
            <h1 className="text-[22px] uppercase tracking-[0.1em] font-semibold mb-4">{title}</h1>
            <ProductPurchase product={product} />
            {descriptionHtml && (
              <div
                className="mt-8 text-[12px] text-neutral-600 leading-relaxed prose-spoils"
                dangerouslySetInnerHTML={{__html: descriptionHtml}}
              />
            )}
          </div>
        </div>
      </div>
      <Analytics.ProductView
        data={{
          products: [
            {
              id: product.id,
              title: product.title,
              price: selectedVariant?.price.amount || '0',
              vendor: product.vendor,
              variantId: selectedVariant?.id || '',
              variantTitle: selectedVariant?.title || '',
              quantity: 1,
            },
          ],
        }}
      />
    </div>
  );
}

/** @typedef {import('./+types/products.$handle').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
