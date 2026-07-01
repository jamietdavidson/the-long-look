import {useState} from 'react';
import {Link, useSearchParams} from 'react-router';
import {
  getAdjacentAndFirstAvailableVariants,
  Money,
  useOptimisticVariant,
  useSelectedOptionInUrlParam,
} from '@shopify/hydrogen';
import {DisplaysWellWith} from '~/components/DisplaysWellWith';
import {FramedPicture} from '~/components/FramedPicture';
import {
  FRAMED_PICTURE_IMAGE_SIZES,
  FramedPictureWall,
} from '~/components/FramedPictureWall';
import {
  PrintFeatureList,
  PrintFulfillmentNotes,
  PrintPurchasePanel,
  FrameSwatches,
  MountToggle,
} from '~/components/PrintPurchasePanel';
import {SizeOptionTable} from '~/components/SizeOptionTable';
import {
  formatPrintDimensions,
  FRAMED_PICTURE_SIZE_LABELS,
  FRAMED_PICTURE_SIZES,
  getFramedPictureSpecFromVariant,
  getOrientationFromImage,
  resolveFrameColorFromOption,
  resolveMountFromOption,
} from '~/lib/framed-picture';
import {artistPath, printsPath} from '~/lib/paths';

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
  const [searchParams] = useSearchParams();
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  const orientation = getOrientationFromImage(image);
  const framedSpec = getFramedPictureSpecFromVariant(selectedVariant, undefined, {
    frame: searchParams.get('frame'),
    mount: searchParams.get('mount'),
  });
  const minPrice =
    picture.product?.priceRange?.minVariantPrice ?? selectedVariant?.price;

  return (
    <div className="flex w-full flex-col md:flex-row md:items-start">
      <FramedPictureWall variant="detail">
        <FramedPicture
          image={image}
          alt={picture.title}
          size={framedSpec}
          loading="eager"
          sizes={FRAMED_PICTURE_IMAGE_SIZES.detail}
        />
      </FramedPictureWall>
      <PrintDetailAside>
        <PrintDetailHeader picture={picture} minPrice={minPrice} />
        <div className="space-y-6">
          <PrintPurchasePanel
            product={product}
            selectedVariant={selectedVariant}
            printHandle={picture.handle}
            orientation={orientation}
            relatedProducts={recommended}
          />
        </div>
      </PrintDetailAside>
    </div>
  );
}

/** @param {{picture: Picture; image: {id?: string; url: string; altText?: string | null; width?: number | null; height?: number | null} | null; recommended?: Array<import('~/lib/content-api').PictureCard>}} */
function PrintDetailPreview({picture, image, recommended = []}) {
  const [selectedSize, setSelectedSize] = useState(
    /** @type {import('~/lib/framed-picture').FramedPictureNamedSize} */ ('medium'),
  );
  const [selectedFrame, setSelectedFrame] = useState('Black');
  const [selectedMount, setSelectedMount] = useState('Border');
  const [expanded, setExpanded] = useState(false);
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
    <div className="flex w-full flex-col md:flex-row md:items-start">
      <FramedPictureWall variant="detail">
        <FramedPicture
          image={image}
          alt={picture.title}
          size={framedSpec}
          loading="eager"
          sizes={FRAMED_PICTURE_IMAGE_SIZES.detail}
        />
      </FramedPictureWall>
      <PrintDetailAside>
        <PrintDetailHeader picture={picture} minPrice={price} />
        <div className="space-y-6">
          <PrintFeatureList />
          <div className="overflow-hidden">
            <button
              type="button"
              className={
                expanded
                  ? 'flex w-full items-center justify-center gap-2 bg-neutral-100 px-4 py-4 text-sm font-medium text-neutral-900'
                  : 'flex w-full items-center justify-center gap-2 bg-neutral-900 px-4 py-4 text-sm font-medium text-white hover:bg-neutral-800'
              }
              onClick={() => setExpanded((open) => !open)}
            >
              {!expanded ? (
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full bg-[#3b82f6]"
                />
              ) : null}
              <span>Select Size, Frame &amp; Mount</span>
            </button>
            {expanded ? (
              <div className="space-y-8 bg-white pt-6 pb-8">
                <PreviewSizeTable
                  selectedSize={selectedSize}
                  onSelect={setSelectedSize}
                  orientation={orientation}
                />
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
              </div>
            ) : null}
          </div>
          <div className="space-y-4">
            <PrintFulfillmentNotes />
            <DisplaysWellWith products={recommended} />
          </div>
          {price && Number(price.amount) > 0 ? null : (
            <Link
              to={printsPath()}
              className="inline-block border border-neutral-900 px-8 py-3 text-[10px] uppercase tracking-[0.3em] transition-colors hover:bg-neutral-900 hover:text-white"
            >
              Continue Shopping
            </Link>
          )}
        </div>
      </PrintDetailAside>
    </div>
  );
}

/** @param {{children: import('react').ReactNode}} */
function PrintDetailAside({children}) {
  return (
    <div className="flex w-full flex-1 justify-center px-6 py-10 md:px-10 md:py-14">
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
  const location =
    picture.artist?.location ||
    picture.tags?.[0]?.label ||
    picture.collections?.[0]?.title ||
    null;

  return (
    <header className="mb-8">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 uppercase md:text-[1.75rem]">
        {picture.title}
      </h1>
      <p className="mt-2 text-sm text-neutral-600">
        {picture.artist?.name ? (
          <>
            <Link
              to={artistPath(picture.artist.handle)}
              className="text-neutral-900 underline underline-offset-2"
            >
              {picture.artist.name}
            </Link>
            {location ? ` | ${location}` : null}
          </>
        ) : (
          location
        )}
      </p>
      {minPrice && Number(minPrice.amount) > 0 ? (
        <p className="mt-4 text-sm text-neutral-700">
          Starting at <Money data={minPrice} withoutTrailingZeros />
        </p>
      ) : null}
      {picture.description ? (
        <p className="mt-4 text-sm leading-relaxed text-neutral-600">
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
 * }}
 */
function PreviewSizeTable({selectedSize, onSelect, orientation}) {
  return (
    <SizeOptionTable
      rows={
        /** @type {Array<import('~/lib/framed-picture').FramedPictureNamedSize>} */ (
          Object.keys(FRAMED_PICTURE_SIZES)
        ).map((sizeKey) => {
          const spec = FRAMED_PICTURE_SIZES[sizeKey];

          return {
            key: sizeKey,
            label: FRAMED_PICTURE_SIZE_LABELS[sizeKey],
            dimensions: formatPrintDimensions(spec, orientation),
            selected: selectedSize === sizeKey,
            onSelect: () => onSelect(sizeKey),
          };
        })
      }
    />
  );
}
