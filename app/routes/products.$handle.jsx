import {Link, useLoaderData} from 'react-router';
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
  getProductOptions,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
  Image,
  Money,
} from '@shopify/hydrogen';
import {ProductForm} from '~/components/ProductForm';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {getMockProductByHandle} from '~/lib/spoils-data';

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

  const mockProduct = getMockProductByHandle(handle);
  if (mockProduct) {
    return {product: mockProduct, isMock: true};
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
  const {product, isMock} = useLoaderData();

  if (isMock) {
    return <MockProductPage product={product} />;
  }

  return <ShopifyProductPage product={product} />;
}

/** @param {{product: import('~/lib/types').Product}} */
function MockProductPage({product}) {
  const image = product.images?.edges?.[0]?.node;
  const price = product.priceRange?.minVariantPrice;

  return (
    <div className="pt-20">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
          <div className="aspect-[3/4] bg-neutral-100 overflow-hidden">
            {image && (
              <img src={image.url} alt={image.altText || product.title} className="w-full h-full object-cover" />
            )}
          </div>
          <div className="md:pt-8">
            <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 mb-3">The Long Look</p>
            <h1 className="text-[22px] uppercase tracking-[0.1em] font-semibold mb-4">{product.title}</h1>
            {price && (
              <p className="text-[14px] text-neutral-600 mb-6">
                From{' '}
                <Money
                  data={price}
                  withoutTrailingZeros
                />
              </p>
            )}
            <p className="text-[12px] text-neutral-600 leading-relaxed mb-8">{product.description}</p>
            <p className="text-[11px] text-neutral-400 mb-8">
              Connect your Shopify store to enable checkout for this product.
            </p>
            <Link
              to="/collections/all"
              className="inline-block border border-neutral-900 px-8 py-3 text-[10px] uppercase tracking-[0.3em] hover:bg-neutral-900 hover:text-white transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/** @param {{product: NonNullable<Awaited<ReturnType<typeof loader>>['product']>}} */
function ShopifyProductPage({product}) {
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });

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
            {selectedVariant?.price && (
              <p className="text-[14px] text-neutral-600 mb-6">
                <Money data={selectedVariant.price} withoutTrailingZeros />
              </p>
            )}
            <ProductForm productOptions={productOptions} selectedVariant={selectedVariant} />
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

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    availableForSale
    compareAtPrice {
      amount
      currencyCode
    }
    id
    image {
      __typename
      id
      url
      altText
      width
      height
    }
    price {
      amount
      currencyCode
    }
    product {
      title
      handle
    }
    selectedOptions {
      name
      value
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
  }
`;

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    descriptionHtml
    description
    encodedVariantExistence
    encodedVariantAvailability
    options {
      name
      optionValues {
        name
        firstSelectableVariant {
          ...ProductVariant
        }
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
      }
    }
    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
    }
    adjacentVariants (selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    seo {
      description
      title
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
`;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
  }
  ${PRODUCT_FRAGMENT}
`;

/** @typedef {import('./+types/products.$handle').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
