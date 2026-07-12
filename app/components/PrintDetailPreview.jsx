import {Money} from '@shopify/hydrogen';
import {PrintDetailGallery} from '~/components/PrintDetailGallery';
import {FRAMED_PICTURE_DEFAULT_NAMED_SIZE} from '~/lib/framed-picture';
import {
  buildPreviewProduct,
  getDetailPreviewFramedSpec,
} from '~/lib/print-product-client-cache';
import {cn} from '~/lib/utils';
import {type} from '~/lib/typography';

/**
 * Instant detail shell painted from grid cache while the Storefront API loads.
 * @param {{
 *   card: import('~/lib/print-catalog').PrintCatalogCard;
 *   placeholderSrc?: string | null;
 * }}
 */
export function PrintDetailPreview({card, placeholderSrc = null}) {
  const product = buildPreviewProduct(card);
  const image = product.featuredImage?.url ? product.featuredImage : null;
  const framedSpec = getDetailPreviewFramedSpec(card);
  const minPrice = product.priceRange?.minVariantPrice ?? null;

  return (
    <div className="flex w-full flex-col md:flex-row md:items-start">
      <PrintDetailGallery
        image={image}
        alt={product.title}
        framedSpec={framedSpec}
        namedSize={FRAMED_PICTURE_DEFAULT_NAMED_SIZE}
        printHandle={product.handle}
        placeholderSrc={placeholderSrc}
      />
      <div className="flex w-full flex-1 px-4 py-6 md:justify-center md:px-10 md:pt-24 md:pb-6">
        <div className="w-full text-left md:max-w-md">
          <header className="mb-6 md:mb-8">
            <h1 className={cn(type.title.lg, 'text-neutral-900')}>
              {product.title}
            </h1>
            {card.artistName ? (
              <p className={cn(type.body.xl, 'mt-2 text-neutral-600')}>
                {card.artistName}
              </p>
            ) : product.vendor ? (
              <p className={cn(type.body.xl, 'mt-2 text-neutral-600')}>
                {product.vendor}
              </p>
            ) : null}
            {minPrice && Number(minPrice.amount) > 0 ? (
              <div
                className={cn(
                  type.body.xl,
                  'mt-4 flex items-baseline gap-1 text-neutral-700',
                )}
              >
                <span>From</span>
                <Money data={minPrice} withoutTrailingZeros />
              </div>
            ) : null}
          </header>
          <div
            className="h-48 animate-pulse rounded-md bg-neutral-100"
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}
