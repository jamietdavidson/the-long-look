import {useCallback, useRef, useState} from 'react';
import {Link, useSearchParams} from 'react-router';
import {
  getAdjacentAndFirstAvailableVariants,
  Money,
  useOptimisticVariant,
  useSelectedOptionInUrlParam,
} from '@shopify/hydrogen';
import {ProductGrid, printCatalogGridProps} from '~/components/ProductGrid';
import {PrintDetailGallery} from '~/components/PrintDetailGallery';
import {PrintProductInfoAside} from '~/components/PrintProductInfoTabs';
import {SizeOptionTable} from '~/components/SizeOptionTable';
import {
  PrintFeatureList,
  FrameMountOptions,
  PrintPurchaseDock,
  PrintPurchasePanel,
  usePurchasePanelExpanded,
  FrameSwatches,
  MountToggle,
} from '~/components/PrintPurchasePanel';
import {cn} from '~/lib/utils';
import {type} from '~/lib/typography';
import {
  formatOuterDimensions,
  FRAMED_PICTURE_DEFAULT_NAMED_SIZE,
  FRAMED_PICTURE_SIZE_LABELS,
  FRAMED_PICTURE_SIZES,
  getFramedPictureSpecFromVariant,
  getOrientationFromImage,
  resolveFrameColorFromOption,
  resolveMountFromOption,
} from '~/lib/framed-picture';
import {artistPath, printsPath} from '~/lib/paths';
import {getResolvedFramedSize} from '~/lib/print-options';
import {scrollPageToTop} from '~/lib/page-scroll';
import {useGalleryInView} from '~/lib/use-gallery-in-view';

/** @typedef {import('~/lib/content-model').Picture} Picture */

/**
 * @param {{
 *   picture: Picture;
 *   product: import('storefrontapi.generated').ProductFragment | null;
 *   recommended?: Array<import('~/lib/content-api').PictureCard>;
 * }}
 */
export function PrintDetail({picture, product, recommended = []}) {
  const image = picture.image?.url
    ? {id: picture.id, ...picture.image}
    : null;

  return product ? (
    <PrintDetailWithProduct
      picture={picture}
      product={product}
      image={image}
      recommended={recommended}
    />
  ) : (
    <PrintDetailPreview
      picture={picture}
      image={image}
      recommended={recommended}
    />
  );
}

/**
 * @param {{
 *   picture: Picture;
 *   product: import('storefrontapi.generated').ProductFragment;
 *   image: {id?: string; url: string; altText?: string | null; width?: number | null; height?: number | null} | null;
 *   recommended?: Array<import('~/lib/content-api').PictureCard>;
 * }}
 */
function PrintDetailWithProduct({picture, product, image, recommended = []}) {
  const galleryRef = useRef(null);
  const galleryInView = useGalleryInView(galleryRef, 0.15);
  const [searchParams] = useSearchParams();
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  const orientation = getOrientationFromImage(image);
  const resolvedNamedSize = getResolvedFramedSize(selectedVariant, searchParams);
  const framedSpec = getFramedPictureSpecFromVariant(
    selectedVariant,
    resolvedNamedSize,
    {
      frame: searchParams.get('frame'),
      mount: searchParams.get('mount'),
    },
  );
  const minPrice =
    picture.product?.priceRange?.minVariantPrice ?? selectedVariant?.price;

  return (
    <>
      <div className="flex w-full flex-col md:flex-row md:items-start">
        <PrintDetailGallery
          ref={galleryRef}
          image={image}
          alt={picture.title}
          framedSpec={framedSpec}
          namedSize={resolvedNamedSize}
          selectedVariant={selectedVariant}
        />
        <PrintDetailAside>
          <PrintDetailHeader picture={picture} minPrice={minPrice} />
          <div className="space-y-4">
            <PrintPurchasePanel
              product={product}
              selectedVariant={selectedVariant}
              printHandle={picture.handle}
              artistName={picture.artist?.name}
              orientation={orientation}
              galleryInView={galleryInView}
              title={picture.title}
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

/** @param {{picture: Picture; image: {id?: string; url: string; altText?: string | null; width?: number | null; height?: number | null} | null; recommended?: Array<import('~/lib/content-api').PictureCard>}} */
function PrintDetailPreview({picture, image, recommended = []}) {
  const galleryRef = useRef(null);
  const galleryInView = useGalleryInView(galleryRef, 0.15);
  const [selectedSize, setSelectedSize] = useState(
    /** @type {import('~/lib/framed-picture').FramedPictureNamedSize} */ (
      FRAMED_PICTURE_DEFAULT_NAMED_SIZE
    ),
  );
  const [selectedFrame, setSelectedFrame] = useState('Black');
  const [selectedMount, setSelectedMount] = useState('Border');
  const [expanded, setExpanded] = usePurchasePanelExpanded();
  const handleSummaryExpand = useCallback(async () => {
    setExpanded(true);
    await scrollPageToTop({behavior: 'smooth'});
  }, []);
  const orientation = getOrientationFromImage(image);
  const price = picture.product?.priceRange?.minVariantPrice;
  const spec = FRAMED_PICTURE_SIZES[selectedSize];
  const framedSpec = {
    ...spec,
    frameColor: resolveFrameColorFromOption(selectedFrame),
    padding: resolveMountFromOption(selectedMount) === 'fullBleed' ? 0 : spec.padding,
    frame:
      selectedFrame.toLowerCase().includes('no frame') ||
      selectedFrame.toLowerCase().includes('unframed')
        ? 0
        : spec.frame,
  };

  return (
    <>
      <div className="flex w-full flex-col md:flex-row md:items-start">
        <PrintDetailGallery
          ref={galleryRef}
          image={image}
          alt={picture.title}
          framedSpec={framedSpec}
          namedSize={selectedSize}
        />
        <PrintDetailAside>
          <PrintDetailHeader picture={picture} minPrice={price} />
          <div className="space-y-4">
            <PrintFeatureList />
            <PrintPurchaseDock
              expanded={expanded}
              onToggle={() => setExpanded((open) => !open)}
              onSummaryExpand={handleSummaryExpand}
              galleryInView={galleryInView}
              summary={{
                title: picture.title,
                artistName: picture.artist?.name,
                image,
                framedSpec,
                price: price ?? null,
                showFromPrefix: true,
              }}
            >
              <PreviewSizeTable
                selectedSize={selectedSize}
                onSelect={setSelectedSize}
                orientation={orientation}
                frame={selectedFrame}
                mount={selectedMount}
              />
              <FrameMountOptions>
                <FrameSwatches
                  selectedFrame={selectedFrame}
                  onSelectShopify={() => {}}
                  onSelectFallback={setSelectedFrame}
                />
                <MountToggle
                  selectedMount={selectedMount}
                  onSelectShopify={() => {}}
                  onSelectFallback={setSelectedMount}
                />
              </FrameMountOptions>
            </PrintPurchaseDock>
            <PrintProductInfoAside selectedFrame={selectedFrame} />
            {price && Number(price.amount) > 0 ? null : (
              <Link
                to={printsPath()}
                className={cn(type.cta, 'inline-block border border-neutral-900 px-8 py-3 transition-colors hover:bg-neutral-900 hover:text-white')}
              >
                Continue Shopping
              </Link>
            )}
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
 *   picture: Picture;
 *   minPrice?: {amount: string; currencyCode: string} | null;
 * }}
 */
function PrintDetailHeader({picture, minPrice}) {
  const artist = picture.artist;
  const location =
    artist?.location ||
    picture.tags?.[0]?.label ||
    picture.collections?.[0]?.title ||
    null;

  return (
    <header className="mb-6 text-center md:mb-8 md:text-left">
      <h1 className={cn(type.title.lg, 'text-neutral-900')}>
        {picture.title}
      </h1>
      {artist?.name ? (
        <p className={cn(type.body.xl, 'mt-2')}>
          {artist.handle ? (
            <Link
              to={artistPath(artist.handle)}
              prefetch="intent"
              className="text-neutral-600 underline underline-offset-2 transition-colors hover:text-neutral-900"
            >
              {artist.name}
            </Link>
          ) : (
            <span className="text-neutral-600">{artist.name}</span>
          )}
        </p>
      ) : location ? (
        <p className={cn(type.body.xl, 'mt-2 text-neutral-600')}>{location}</p>
      ) : null}
      {artist?.name && location ? (
        <p className={cn(type.body.xl, 'mt-1 text-neutral-600')}>{location}</p>
      ) : null}
      {minPrice && Number(minPrice.amount) > 0 ? (
        <div
          className={cn(
            type.body.xl,
            'mt-4 flex items-baseline justify-center gap-1 text-neutral-700 md:justify-start',
          )}
        >
          <span>From</span>
          <Money data={minPrice} withoutTrailingZeros />
        </div>
      ) : null}
      {picture.description ? (
        <p className={cn(type.body.xl, 'mt-4 text-neutral-600')}>
          {picture.description}
        </p>
      ) : null}
    </header>
  );
}

/**
 * @param {{
 *   selectedSize: import('~/lib/framed-picture').FramedPictureNamedSize;
 *   onSelect: (size: import('~/lib/framed-picture').FramedPictureNamedSize) => void;
 *   orientation: import('~/lib/framed-picture').PictureOrientation;
 *   frame: string;
 *   mount: string;
 * }}
 */
function PreviewSizeTable({selectedSize, onSelect, orientation, frame, mount}) {
  return (
    <SizeOptionTable
      rows={
        /** @type {Array<import('~/lib/framed-picture').FramedPictureNamedSize>} */ (
          Object.keys(FRAMED_PICTURE_SIZES)
        ).map((sizeKey) => {
          return {
            key: sizeKey,
            label: FRAMED_PICTURE_SIZE_LABELS[sizeKey],
            dimensions: formatOuterDimensions(
              getFramedPictureSpecFromVariant(null, sizeKey, {frame, mount}),
              orientation,
            ),
            selected: selectedSize === sizeKey,
            onSelect: () => onSelect(sizeKey),
          };
        })
      }
    />
  );
}

/**
 * @param {{
 *   products: Array<import('~/lib/content-api').PictureCard & {
 *     priceRange: {minVariantPrice: {amount: string; currencyCode: string}};
 *   }>;
 * }}
 */
function RecommendedForYou({products}) {
  if (products.length === 0) return null;

  return (
    <div className="border-t border-neutral-100 py-12 md:py-16">
      <ProductGrid
        title="More like this"
        products={products}
        {...printCatalogGridProps}
      />
    </div>
  );
}
