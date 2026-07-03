import {
  useOptimisticVariant,
  getProductOptions,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
  Money,
} from '@shopify/hydrogen';
import {ProductForm} from '~/components/ProductForm';
import {cn} from '~/lib/utils';
import {type} from '~/lib/typography';

/**
 * Size selection and add-to-cart for a Shopify product.
 * @param {{
 *   product: import('storefrontapi.generated').ProductFragment;
 *   selectedVariant?: import('storefrontapi.generated').ProductFragment['selectedOrFirstAvailableVariant'];
 *   formatOptionLabel?: (optionName: string, valueName: string) => string;
 *   printHandle?: string;
 * }}
 */
export function ProductPurchase({
  product,
  selectedVariant: selectedVariantProp,
  formatOptionLabel,
  printHandle,
}) {
  const optimisticVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  useSelectedOptionInUrlParam(
    (selectedVariantProp ?? optimisticVariant)?.selectedOptions ?? [],
  );

  const selectedVariant = selectedVariantProp ?? optimisticVariant;

  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });

  return (
    <div className="space-y-6">
      {selectedVariant?.price && (
        <p className={cn(type.body.xl, 'text-neutral-600')}>
          <Money data={selectedVariant.price} withoutTrailingZeros />
        </p>
      )}
      <ProductForm
        productOptions={productOptions}
        selectedVariant={selectedVariant}
        formatOptionLabel={formatOptionLabel}
        printHandle={printHandle}
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
