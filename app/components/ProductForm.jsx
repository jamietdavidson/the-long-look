import {Link, useNavigate} from 'react-router';
import {AddToCartButton} from './AddToCartButton';
import {useAside} from './Aside';
import {getPrintHandleLineAttributes} from '~/lib/cart';
import {cn} from '~/lib/utils';
import {type} from '~/lib/typography';

/**
 * @param {{
 *   analytics?: unknown;
 *   productOptions: MappedProductOptions[];
 *   selectedVariant: ProductFragment['selectedOrFirstAvailableVariant'];
 *   formatOptionLabel?: (optionName: string, valueName: string) => string;
 *   printHandle?: string;
 * }}
 */
export function ProductForm({
  analytics,
  productOptions,
  selectedVariant,
  formatOptionLabel,
  printHandle,
}) {
  const navigate = useNavigate();
  const {open} = useAside();
  const cartLines =
    selectedVariant
      ? [
          {
            merchandiseId: selectedVariant.id,
            quantity: 1,
            selectedVariant,
            attributes: getPrintHandleLineAttributes(printHandle),
          },
        ]
      : [];

  return (
    <div>
      {productOptions.map((option) => {
        // If there is only a single value in the option values, don't display the option
        if (option.optionValues.length === 1) return null;

        return (
          <div key={option.name}>
            <h5 className={cn(type.overline.xs, 'mb-2 text-neutral-500')}>
              {option.name}
            </h5>
            <div className="mb-4 flex flex-wrap gap-2">
              {option.optionValues.map((value) => {
                const {
                  name,
                  handle,
                  variantUriQuery,
                  selected,
                  available,
                  exists,
                  isDifferentProduct,
                  swatch,
                } = value;

                if (isDifferentProduct) {
                  // SEO
                  // When the variant is a combined listing child product
                  // that leads to a different url, we need to render it
                  // as an anchor tag
                  return (
                    <Link
                      className={cn(type.overline.sm, 'border border-neutral-200 px-3 py-2 text-neutral-700 hover:border-neutral-900')}
                      key={option.name + name}
                      prefetch="intent"
                      preventScrollReset
                      replace
                      to={`/products/${handle}?${variantUriQuery}`}
                      style={{
                        border: selected
                          ? '1px solid black'
                          : '1px solid transparent',
                        opacity: available ? 1 : 0.3,
                      }}
                    >
                      <ProductOptionSwatch
                        swatch={swatch}
                        name={formatOptionLabel?.(option.name, name) ?? name}
                      />
                    </Link>
                  );
                } else {
                  // SEO
                  // When the variant is an update to the search param,
                  // render it as a button with javascript navigating to
                  // the variant so that SEO bots do not index these as
                  // duplicated links
                  return (
                    <button
                      type="button"
                      className={cn(type.overline.sm, `border border-neutral-200 px-3 py-2 text-neutral-700 hover:border-neutral-900${exists && !selected ? ' link' : ''}`)}
                      key={option.name + name}
                      style={{
                        border: selected
                          ? '1px solid black'
                          : '1px solid transparent',
                        opacity: available ? 1 : 0.3,
                      }}
                      disabled={!exists}
                      onClick={() => {
                        if (!selected) {
                          void navigate(`?${variantUriQuery}`, {
                            replace: true,
                            preventScrollReset: true,
                          });
                        }
                      }}
                    >
                      <ProductOptionSwatch
                        swatch={swatch}
                        name={formatOptionLabel?.(option.name, name) ?? name}
                      />
                    </button>
                  );
                }
              })}
            </div>
            <br />
          </div>
        );
      })}
      <div className="flex flex-wrap gap-3">
        <AddToCartButton
          analytics={analytics}
          disabled={!selectedVariant || !selectedVariant.availableForSale}
          onClick={() => {
            open('cart');
          }}
          lines={cartLines}
        >
          {selectedVariant?.availableForSale ? 'Add to cart' : 'Sold out'}
        </AddToCartButton>
        {selectedVariant?.availableForSale ? (
          <AddToCartButton
            analytics={analytics}
            lines={cartLines}
            redirectTo="checkout"
          >
            Buy now
          </AddToCartButton>
        ) : null}
      </div>
    </div>
  );
}

/**
 * @param {{
 *   swatch?: Maybe<ProductOptionValueSwatch> | undefined;
 *   name: string;
 * }}
 */
function ProductOptionSwatch({swatch, name}) {
  const image = swatch?.image?.previewImage?.url;
  const color = swatch?.color;

  if (!image && !color) return name;

  return (
    <div
      aria-label={name}
      className="product-option-label-swatch"
      style={{
        backgroundColor: color || 'transparent',
      }}
    >
      {!!image && <img src={image} alt={name} />}
    </div>
  );
}

/** @typedef {import('@shopify/hydrogen').MappedProductOptions} MappedProductOptions */
/** @typedef {import('@shopify/hydrogen/storefront-api-types').Maybe} Maybe */
/** @typedef {import('@shopify/hydrogen/storefront-api-types').ProductOptionValueSwatch} ProductOptionValueSwatch */
/** @typedef {import('storefrontapi.generated').ProductFragment} ProductFragment */
