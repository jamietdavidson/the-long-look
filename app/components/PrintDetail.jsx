import {useRef} from 'react';
import {Link} from 'react-router';
import {
  getAdjacentAndFirstAvailableVariants,
  Money,
  useOptimisticVariant,
  useSelectedOptionInUrlParam,
} from '@shopify/hydrogen';
import {useSearchParams} from 'react-router';
import {ProductGrid, printCatalogGridProps} from '~/components/ProductGrid';
import {PrintDetailGallery} from '~/components/PrintDetailGallery';
import {PrintProductInfoAside} from '~/components/PrintProductInfoTabs';
import {
  PrintFeatureList,
  PrintPurchaseDock,
  PrintPurchasePanel,
} from '~/components/PrintPurchasePanel';
import {cn} from '~/lib/utils';
import {type} from '~/lib/typography';
import {
  getFramedPictureSpecFromVariant,
  getOrientationFromImage,
} from '~/lib/framed-picture';
import {artistPath} from '~/lib/paths';
import {
  getResolvedFrameAndMount,
  getResolvedFramedSize,
} from '~/lib/print-options';
import {useGalleryInView} from '~/lib/use-gallery-in-view';

/**
 * @param {{
 *   product: import('storefrontapi.generated').ProductFragment;
 *   artist?: import('~/lib/content-model').Artist | null;
 *   recommended?: Array<import('~/lib/print-catalog').PrintCatalogCard>;
 * }}
 */
export function PrintDetail({product, artist = null, recommended = []}) {
  const galleryRef = useRef(null);
  const galleryInView = useGalleryInView(galleryRef, 0.15);
  const [searchParams] = useSearchParams();
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  const imageSource =
    selectedVariant?.image ??
    product.featuredImage ??
    null;
  const image = imageSource?.url
    ? {id: imageSource.id ?? product.id, ...imageSource}
    : null;

  const orientation = getOrientationFromImage(image);
  const resolvedNamedSize = getResolvedFramedSize(selectedVariant, searchParams);
  const {frame: resolvedFrame, mount: resolvedMount} = getResolvedFrameAndMount(
    selectedVariant,
    searchParams,
  );
  const framedSpec = getFramedPictureSpecFromVariant(
    selectedVariant,
    resolvedNamedSize,
    {
      frame: resolvedFrame,
      mount: resolvedMount,
    },
  );
  const minPrice =
    product.priceRange?.minVariantPrice ?? selectedVariant?.price ?? null;

  return (
    <>
      <div className="flex w-full flex-col md:flex-row md:items-start">
        <PrintDetailGallery
          ref={galleryRef}
          image={image}
          alt={product.title}
          framedSpec={framedSpec}
          namedSize={resolvedNamedSize}
          selectedVariant={selectedVariant}
          printHandle={product.handle}
        />
        <PrintDetailAside>
          <PrintDetailHeader
            product={product}
            artist={artist}
            minPrice={minPrice}
          />
          <div className="space-y-4">
            <PrintPurchasePanel
              product={product}
              selectedVariant={selectedVariant}
              printHandle={product.handle}
              artistName={artist?.name ?? product.vendor}
              orientation={orientation}
              galleryInView={galleryInView}
              title={product.title}
              image={image}
              framedSpec={framedSpec}
              minPrice={minPrice}
            />
          </div>
        </PrintDetailAside>
      </div>
      <RecommendedForYou products={recommended} />
    </>
  );
}

/** @param {{children: import('react').ReactNode}} */
function PrintDetailAside({children}) {
  return (
    <div className="flex w-full flex-1 justify-center px-4 py-6 md:px-10 md:pt-24 md:pb-6">
      <div className="w-full max-w-md text-left">{children}</div>
    </div>
  );
}

/**
 * @param {{
 *   product: {title: string; vendor?: string | null; description?: string | null};
 *   artist?: import('~/lib/content-model').Artist | null;
 *   minPrice?: {amount: string; currencyCode: string} | null;
 * }}
 */
function PrintDetailHeader({product, artist, minPrice}) {
  const location = artist?.location ?? null;

  return (
    <header className="mb-6 md:mb-8">
      <h1 className={cn(type.title.lg, 'text-neutral-900')}>
        {product.title}
      </h1>
      {artist?.name ? (
        <p className={cn(type.body.xl, 'mt-2')}>
          <Link
            to={artistPath(artist.handle)}
            prefetch="intent"
            className="text-neutral-600 underline underline-offset-2 transition-colors hover:text-neutral-900"
          >
            {artist.name}
          </Link>
        </p>
      ) : product.vendor ? (
        <p className={cn(type.body.xl, 'mt-2 text-neutral-600')}>{product.vendor}</p>
      ) : null}
      {location ? (
        <p className={cn(type.body.xl, 'mt-1 text-neutral-600')}>{location}</p>
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
      {product.description ? (
        <p className={cn(type.body.xl, 'mt-4 text-neutral-600')}>
          {product.description}
        </p>
      ) : null}
    </header>
  );
}

/**
 * @param {{
 *   products: Array<import('~/lib/print-catalog').PrintCatalogCard & {
 *     priceRange: {minVariantPrice: {amount: string; currencyCode: string}};
 *   }>;
 * }}
 */
function RecommendedForYou({products}) {
  if (products.length === 0) return null;

  return (
    <div className="border-t border-neutral-100">
      <ProductGrid
        title="More like this"
        products={products}
        {...printCatalogGridProps}
      />
    </div>
  );
}
