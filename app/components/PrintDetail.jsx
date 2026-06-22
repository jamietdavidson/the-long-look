import {useState} from 'react';
import {Link} from 'react-router';
import {
  getAdjacentAndFirstAvailableVariants,
  Money,
  useOptimisticVariant,
  useSelectedOptionInUrlParam,
} from '@shopify/hydrogen';
import {FramedPicture} from '~/components/FramedPicture';
import {
  FRAMED_PICTURE_IMAGE_SIZES,
  FramedPictureWall,
} from '~/components/FramedPictureWall';
import {ProductPurchase} from '~/components/ProductPurchase';
import {
  formatPrintDimensions,
  formatPrintSizeOptionLabel,
  FRAMED_PICTURE_SIZE_LABELS,
  FRAMED_PICTURE_SIZES,
  getFramedSizeFromVariant,
  getOrientationFromImage,
} from '~/lib/framed-picture';
import {artistPath, printsPath} from '~/lib/paths';

/** @typedef {import('~/lib/content-model').Picture} Picture */

/**
 * @param {{
 *   picture: Picture;
 *   product: import('storefrontapi.generated').ProductFragment | null;
 * }}
 */
export function PrintDetail({picture, product}) {
  const image = picture.image?.url
    ? {id: picture.id, ...picture.image}
    : null;

  if (product) {
    return (
      <PrintDetailWithProduct picture={picture} product={product} image={image} />
    );
  }

  return <PrintDetailPreview picture={picture} image={image} />;
}

/**
 * @param {{
 *   picture: Picture;
 *   product: import('storefrontapi.generated').ProductFragment;
 *   image: {id?: string; url: string; altText?: string | null; width?: number | null; height?: number | null} | null;
 * }}
 */
function PrintDetailWithProduct({picture, product, image}) {
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  const framedSize = getFramedSizeFromVariant(selectedVariant);
  const orientation = getOrientationFromImage(image);

  return (
    <div className="flex w-full flex-col md:min-h-screen md:flex-row">
      <FramedPictureWall variant="detail">
        <FramedPicture
          image={image}
          alt={picture.title}
          size={framedSize}
          loading="eager"
          sizes={FRAMED_PICTURE_IMAGE_SIZES.detail}
        />
      </FramedPictureWall>
      <div className="w-full flex-1 px-6 py-12 md:px-10">
        <PrintDetailInfo picture={picture}>
          <ProductPurchase
            product={product}
            selectedVariant={selectedVariant}
            formatOptionLabel={(optionName, valueName) =>
              formatPrintSizeOptionLabel(optionName, valueName, orientation)
            }
          />
        </PrintDetailInfo>
      </div>
    </div>
  );
}

/** @param {{picture: Picture; image: {id?: string; url: string; altText?: string | null; width?: number | null; height?: number | null} | null}} */
function PrintDetailPreview({picture, image}) {
  const [selectedSize, setSelectedSize] = useState(
    /** @type {import('~/lib/framed-picture').FramedPictureNamedSize} */ ('medium'),
  );
  const orientation = getOrientationFromImage(image);
  const price = picture.product?.priceRange?.minVariantPrice;

  return (
    <div className="flex w-full flex-col md:min-h-screen md:flex-row">
      <FramedPictureWall variant="detail">
        <FramedPicture
          image={image}
          alt={picture.title}
          size={selectedSize}
          loading="eager"
          sizes={FRAMED_PICTURE_IMAGE_SIZES.detail}
        />
      </FramedPictureWall>
      <div className="w-full flex-1 px-6 py-12 md:px-10">
        <PrintDetailInfo picture={picture}>
          <div className="space-y-6">
            <PrintSizePicker
              selectedSize={selectedSize}
              onSelect={setSelectedSize}
              orientation={orientation}
            />
            {price && Number(price.amount) > 0 ? (
              <p className="text-[14px] text-neutral-600">
                From <Money data={price} withoutTrailingZeros />
              </p>
            ) : (
              <Link
                to={printsPath()}
                className="inline-block border border-neutral-900 px-8 py-3 text-[10px] uppercase tracking-[0.3em] transition-colors hover:bg-neutral-900 hover:text-white"
              >
                Continue Shopping
              </Link>
            )}
          </div>
        </PrintDetailInfo>
      </div>
    </div>
  );
}

/**
 * @param {{
 *   selectedSize: import('~/lib/framed-picture').FramedPictureNamedSize;
 *   onSelect: (size: import('~/lib/framed-picture').FramedPictureNamedSize) => void;
 *   orientation: import('~/lib/framed-picture').PictureOrientation;
 * }}
 */
function PrintSizePicker({selectedSize, onSelect, orientation}) {
  return (
    <div>
      <h5 className="mb-2 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
        Size
      </h5>
      <div className="flex flex-wrap gap-2">
        {/** @type {Array<import('~/lib/framed-picture').FramedPictureNamedSize>} */ (
          Object.keys(FRAMED_PICTURE_SIZES)
        ).map((sizeKey) => {
          const spec = FRAMED_PICTURE_SIZES[sizeKey];
          const label = `${FRAMED_PICTURE_SIZE_LABELS[sizeKey]} (${formatPrintDimensions(spec, orientation)})`;
          const selected = selectedSize === sizeKey;

          return (
            <button
              key={sizeKey}
              type="button"
              className="border border-neutral-200 px-3 py-2 text-[11px] uppercase tracking-wider text-neutral-700 hover:border-neutral-900"
              style={{
                borderColor: selected ? '#000' : undefined,
              }}
              onClick={() => onSelect(sizeKey)}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** @param {{picture: Picture; children: import('react').ReactNode}} */
function PrintDetailInfo({picture, children}) {
  return (
    <div className="md:pt-8">
      <p className="mb-3 text-[10px] uppercase tracking-[0.3em] text-neutral-400">
        The Long Look
      </p>
      <h1 className="mb-4 text-[22px] font-semibold uppercase tracking-[0.1em]">
        {picture.title}
      </h1>
      {picture.artist?.name && (
        <p className="mb-4 text-[12px] text-neutral-500">
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
        <p className="mb-8 text-[12px] leading-relaxed text-neutral-600">
          {picture.description}
        </p>
      )}
      {children}
    </div>
  );
}
