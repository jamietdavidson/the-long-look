import {Link} from 'react-router';
import {useState} from 'react';
import {Money} from '@shopify/hydrogen';
import {FavoriteButton} from '~/components/FavoriteButton';
import {FramedPicture} from '~/components/FramedPicture';
import {
  FRAMED_PICTURE_IMAGE_SIZES,
  FramedPictureWall,
} from '~/components/FramedPictureWall';
import {
  FRAMED_PICTURE_CATALOG_DISPLAY_SIZE,
  FRAMED_PICTURE_GRID_CONTAINER_FILL,
} from '~/lib/framed-picture';
import {cn} from '~/lib/utils';
import {type} from '~/lib/typography';
import {printPath, printsPath, artistPath} from '~/lib/paths';

export const printGridClassName =
  'grid w-full gap-1 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 min-[100rem]:grid-cols-4';

/** Three columns max — single column on mobile, three from tablet up. */
export const printGridThreeColumnClassName =
  'grid w-full gap-px grid-cols-1 md:grid-cols-3';

/** Split-layout catalog grid — Shop all, More like this, etc. */
export const printCatalogGridProps = {
  gridClassName: printGridThreeColumnClassName,
  cardLayout: 'split',
};

/** Reduced wall padding for catalog grid cards. */
export const printGridWallClassName = 'px-2 pt-3 pb-2';

/** Minimal inset inside split-layout image wells. */
export const printGridSplitWellClassName = 'p-0';

/** @typedef {'default' | 'compact'} ProductCardSize */
/** @typedef {'integrated' | 'split'} ProductCardLayout */

/**
 * @param {{
 *   product: import('~/lib/content-api').PictureCard & {
 *     priceRange: {minVariantPrice: {amount: string; currencyCode: string}};
 *   };
 *   loading?: 'eager' | 'lazy';
 *   className?: string;
 *   wallClassName?: string;
 *   splitWellClassName?: string;
 *   textAlign?: 'left' | 'center';
 *   showPrice?: boolean;
 *   size?: ProductCardSize;
 *   layout?: ProductCardLayout;
 *   containerFill?: number;
 * }}
 */
export function ProductCard({
  product,
  loading = 'lazy',
  className,
  wallClassName,
  splitWellClassName,
  textAlign = 'center',
  showPrice = true,
  size = 'default',
  layout = 'integrated',
  containerFill = FRAMED_PICTURE_GRID_CONTAINER_FILL,
}) {
  if (layout === 'split') {
    return (
      <SplitProductCard
        product={product}
        loading={loading}
        className={className}
        textAlign={textAlign}
        showPrice={showPrice}
        size={size}
        containerFill={containerFill}
        splitWellClassName={splitWellClassName}
      />
    );
  }

  const variantUrl = printPath(product.handle);
  const isCompact = size === 'compact';
  const [hovered, setHovered] = useState(false);

  return (
    <article
      className={cn('block h-full w-full', className)}
    >
      <div
        className="relative"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <Link to={variantUrl} prefetch="intent" className="block">
          <FramedPictureWall
            variant="gridCard"
            className={cn(isCompact && 'px-3 pt-6 pb-4', wallClassName)}
          >
            <div className="flex w-full flex-1 items-center justify-center">
              <FramedPicture
                image={product.featuredImage}
                alt={product.title}
                size={FRAMED_PICTURE_CATALOG_DISPLAY_SIZE}
                loading={loading}
                sizes={FRAMED_PICTURE_IMAGE_SIZES.grid}
                containerFill={containerFill}
                hovered={hovered}
                interactive
              />
            </div>
          </FramedPictureWall>
        </Link>
        <FavoriteButton
          handle={product.handle}
          className="absolute right-3 bottom-3 z-10"
        />
      </div>
      <div
        className={cn(
          'flex flex-col',
          isCompact ? 'px-2 pt-3 pb-4' : 'px-2.5 pt-3.5 pb-6',
          textAlign === 'center' ? 'items-center text-center' : 'items-start text-left',
        )}
      >
        <ProductCardContent
          product={product}
          showPrice={showPrice}
          size={size}
        />
      </div>
    </article>
  );
}

/**
 * House of Spoils–style card: fixed-aspect image well + caption block below.
 * @param {Omit<Parameters<typeof ProductCard>[0], 'layout' | 'wallClassName'>}
 */
function SplitProductCard({
  product,
  loading = 'lazy',
  className,
  textAlign = 'center',
  showPrice = true,
  size = 'default',
  containerFill,
  splitWellClassName = printGridSplitWellClassName,
}) {
  const variantUrl = printPath(product.handle);
  const isCompact = size === 'compact';
  const [hovered, setHovered] = useState(false);

  return (
    <article className={cn('block h-full bg-white', className)}>
      <div
        className="relative"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <Link
          to={variantUrl}
          prefetch="intent"
          className="block"
        >
          <div
            className={cn(
              '@container flex aspect-8/9 items-center justify-center bg-[#ececea]',
              splitWellClassName,
            )}
          >
            <div className="flex size-full min-h-0 min-w-0 items-center justify-center">
              <FramedPicture
                image={product.featuredImage}
                alt={product.title}
                size={FRAMED_PICTURE_CATALOG_DISPLAY_SIZE}
                loading={loading}
                sizes={FRAMED_PICTURE_IMAGE_SIZES.grid}
                containerFill={containerFill}
                hovered={hovered}
                interactive
              />
            </div>
          </div>
        </Link>
        <FavoriteButton
          handle={product.handle}
          className="absolute right-3 bottom-3 z-10"
        />
      </div>
      <div
        className={cn(
          'flex flex-col',
          isCompact ? 'px-2 pt-3 pb-4' : 'px-2.5 pt-3.5 pb-6',
          textAlign === 'center' ? 'items-center text-center' : 'items-start text-left',
        )}
      >
        <ProductCardContent
          product={product}
          showPrice={showPrice}
          size={size}
        />
      </div>
    </article>
  );
}

/**
 * @param {{
 *   product: import('~/lib/content-api').PictureCard & {
 *     priceRange: {minVariantPrice: {amount: string; currencyCode: string}};
 *   };
 *   showPrice?: boolean;
 *   size?: ProductCardSize;
 * }}
 */
function ProductCardContent({product, showPrice = true, size = 'default'}) {
  const isCompact = size === 'compact';

  return (
    <>
      <h3
        className={cn(
          'mb-[0.2rem] font-medium leading-snug text-neutral-800',
          isCompact
            ? type.body.sm
            : cn(type.body.lg, 'md:text-body-xl'),
        )}
      >
        <Link
          to={printPath(product.handle)}
          prefetch="intent"
          className="hover:text-neutral-950"
        >
          {product.title}
        </Link>
      </h3>
      {product.artistName ? (
        <p
          className={cn(
            'mb-[0.15rem] leading-snug text-neutral-500',
            isCompact ? type.body.xs : cn(type.body.sm, 'md:text-body-md'),
          )}
        >
          {product.artistHandle ? (
            <Link
              to={artistPath(product.artistHandle)}
              prefetch="intent"
              className="underline underline-offset-2 transition-colors hover:text-neutral-800"
            >
              {product.artistName}
            </Link>
          ) : (
            product.artistName
          )}
        </p>
      ) : null}
      {showPrice && Number(product.priceRange.minVariantPrice.amount) > 0 ? (
        <div
          className={cn(
            'inline-flex items-baseline gap-1 whitespace-nowrap leading-snug text-neutral-500',
            isCompact ? type.body.xs : cn(type.body.sm, 'md:text-body-md'),
          )}
        >
          <span>From</span>
          <Money
            data={product.priceRange.minVariantPrice}
            withoutTrailingZeros
          />
        </div>
      ) : null}
    </>
  );
}

/** @param {{title?: string, products: Array<import('~/lib/content-api').PictureCard & {priceRange: {minVariantPrice: {amount: string; currencyCode: string}}}>, gridClassName?: string, cardLayout?: ProductCardLayout, cardSize?: ProductCardSize, containerFill?: number, wallClassName?: string, splitWellClassName?: string, emptyMessage?: string, eagerCount?: number}} */
export function ProductGrid({
  title,
  products,
  gridClassName = printGridClassName,
  cardLayout = 'integrated',
  cardSize = 'default',
  containerFill = FRAMED_PICTURE_GRID_CONTAINER_FILL,
  wallClassName = printGridWallClassName,
  splitWellClassName = printGridSplitWellClassName,
  emptyMessage,
  eagerCount,
}) {
  return (
    <section className="w-full">
      {title ? (
        <div className="flex items-center justify-center px-6 py-8 text-center md:py-10">
          <h2 className={cn(type.title.sm, 'text-neutral-900')}>
            {title}
          </h2>
        </div>
      ) : null}
      {products.length === 0 && emptyMessage ? (
        <p className={cn(type.body.md, 'px-6 text-center text-neutral-500')}>{emptyMessage}</p>
      ) : (
        <div className={gridClassName}>
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              size={cardSize}
              layout={cardLayout}
              loading={eagerCount != null && index < eagerCount ? 'eager' : undefined}
              containerFill={containerFill}
              wallClassName={wallClassName}
              splitWellClassName={splitWellClassName}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function VideoSection() {
  return (
    <section className="relative h-[60vh] w-full overflow-hidden bg-neutral-900 md:h-[80vh]">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-70"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1920&q=80)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center text-white">
        <h2 className={cn(type.title.sm, 'font-light text-white md:text-title-lg-lg')}>
          Curated photography for your space
        </h2>
        <Link
          to={printsPath()}
          className={cn(type.cta, 'mt-8 inline-block border border-white/50 px-8 py-3 transition-all duration-300 hover:bg-white hover:text-neutral-900')}
        >
          Explore
        </Link>
      </div>
    </section>
  );
}

export {
  FRAMED_PICTURE_CATALOG_DISPLAY_SIZE,
  FRAMED_PICTURE_GRID_CONTAINER_FILL,
};
