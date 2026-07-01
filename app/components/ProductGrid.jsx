import {Link} from 'react-router';
import {useState} from 'react';
import {Money} from '@shopify/hydrogen';
import {FramedPicture} from '~/components/FramedPicture';
import {
  FRAMED_PICTURE_IMAGE_SIZES,
  FramedPictureWall,
} from '~/components/FramedPictureWall';
import {FRAMED_PICTURE_GRID_CONTAINER_FILL} from '~/lib/framed-picture';
import {cn} from '~/lib/utils';
import {printPath, printsPath} from '~/lib/paths';

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
  containerFill,
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
    <Link
      to={variantUrl}
      prefetch="intent"
      className={cn('block h-full w-full', className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <FramedPictureWall
        variant="gridCard"
        className={cn(isCompact && 'px-3 pt-6 pb-4', wallClassName)}
      >
        <div className="flex w-full flex-1 items-center justify-center">
          <FramedPicture
            image={product.featuredImage}
            alt={product.title}
            size="small"
            loading={loading}
            sizes={FRAMED_PICTURE_IMAGE_SIZES.grid}
            equalizePictureArea
            containerFill={containerFill}
            hovered={hovered}
            interactive
          />
        </div>
        <ProductCardContent
          product={product}
          showPrice={showPrice}
          size={size}
        />
      </FramedPictureWall>
    </Link>
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
      <Link
        to={variantUrl}
        prefetch="intent"
        className="block"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
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
              size="small"
              loading={loading}
              sizes={FRAMED_PICTURE_IMAGE_SIZES.grid}
              equalizePictureArea
              containerFill={containerFill}
              hovered={hovered}
              interactive
            />
          </div>
        </div>
      </Link>
      <Link
        to={variantUrl}
        prefetch="intent"
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
      </Link>
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
            ? 'text-[0.6875rem] md:text-xs'
            : 'text-[0.8125rem] md:text-sm',
        )}
      >
        {product.title}
      </h3>
      {product.artistName ? (
        <p
          className={cn(
            'mb-[0.15rem] leading-snug text-neutral-500',
            isCompact ? 'text-[0.625rem]' : 'text-[0.6875rem] md:text-xs',
          )}
        >
          {product.artistName}
        </p>
      ) : null}
      {showPrice && Number(product.priceRange.minVariantPrice.amount) > 0 ? (
        <p
          className={cn(
            'm-0 leading-snug text-neutral-500',
            isCompact ? 'text-[0.625rem]' : 'text-[0.6875rem] md:text-xs',
          )}
        >
          From{' '}
          <Money
            data={product.priceRange.minVariantPrice}
            withoutTrailingZeros
          />
        </p>
      ) : null}
    </>
  );
}

/** @param {{title?: string, subtitle?: string, products: Array<import('~/lib/content-api').PictureCard & {priceRange: {minVariantPrice: {amount: string; currencyCode: string}}}>, gridClassName?: string, cardLayout?: ProductCardLayout, cardSize?: ProductCardSize, containerFill?: number, wallClassName?: string, splitWellClassName?: string, emptyMessage?: string, eagerCount?: number}} */
export function ProductGrid({
  title,
  subtitle,
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
      {title || subtitle ? (
        <div className="mb-12 px-6 text-center">
          {subtitle ? (
            <p className="mb-3 text-[10px] uppercase tracking-[0.4em] text-neutral-400">
              {subtitle}
            </p>
          ) : null}
          {title ? (
            <h2 className="text-[18px] font-semibold uppercase tracking-[0.15em] text-neutral-900 md:text-[22px]">
              {title}
            </h2>
          ) : null}
        </div>
      ) : null}
      {products.length === 0 && emptyMessage ? (
        <p className="px-6 text-center text-[12px] text-neutral-500">{emptyMessage}</p>
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
        <p className="mb-4 text-[10px] uppercase tracking-[0.4em] text-white/70">
          The Art of Living
        </p>
        <h2 className="text-[20px] font-light md:text-[28px]">
          Curated photography for your space
        </h2>
        <Link
          to={printsPath()}
          className="mt-8 inline-block border border-white/50 px-8 py-3 text-[10px] uppercase tracking-[0.3em] transition-all duration-300 hover:bg-white hover:text-neutral-900"
        >
          Explore
        </Link>
      </div>
    </section>
  );
}

export {FRAMED_PICTURE_GRID_CONTAINER_FILL};
