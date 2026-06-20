import {
  useOptimisticVariant,
  getProductOptions,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
  Money,
} from '@shopify/hydrogen';
import {ProductForm} from '~/components/ProductForm';

/**
 * Size selection and add-to-cart for a Shopify product.
 * @param {{product: import('storefrontapi.generated').ProductFragment}}
 */
export function ProductPurchase({product}) {
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });

  return (
    <div className="space-y-6">
      {selectedVariant?.price && (
        <p className="text-[14px] text-neutral-600">
          <Money data={selectedVariant.price} withoutTrailingZeros />
        </p>
      )}
      <ProductForm
        productOptions={productOptions}
        selectedVariant={selectedVariant}
        analytics={{
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
