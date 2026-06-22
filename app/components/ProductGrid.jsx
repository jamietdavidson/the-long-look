import {Link} from 'react-router';
import {Money} from '@shopify/hydrogen';
import {FramedPicture} from '~/components/FramedPicture';
import {
  FRAMED_PICTURE_IMAGE_SIZES,
  FramedPictureWall,
} from '~/components/FramedPictureWall';
import {printPath, printsPath} from '~/lib/paths';

export const printGridClassName =
  'grid w-full gap-1 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 min-[100rem]:grid-cols-4';

/**
 * @param {{
 *   product: import('~/lib/content-api').PictureCard & {
 *     priceRange: {minVariantPrice: {amount: string; currencyCode: string}};
 *   };
 *   loading?: 'eager' | 'lazy';
 * }}
 */
export function ProductCard({product, loading = 'lazy'}) {
  const variantUrl = printPath(product.handle);

  return (
    <Link
      to={variantUrl}
      prefetch="intent"
      className="block h-full w-full"
    >
      <FramedPictureWall variant="gridCard">
        <div className="flex w-full flex-1 items-center justify-center">
          <FramedPicture
            image={product.featuredImage}
            alt={product.title}
            size="small"
            loading={loading}
            sizes={FRAMED_PICTURE_IMAGE_SIZES.grid}
            equalizePictureArea
          />
        </div>
        <div className="w-full shrink-0 pt-6 text-center">
          <h3 className="mb-[0.2rem] text-[0.8125rem] font-medium leading-snug text-neutral-800 md:text-sm">
            {product.title}
          </h3>
          {product.artistName ? (
            <p className="mb-[0.15rem] text-[0.6875rem] leading-snug text-neutral-500 md:text-xs">
              {product.artistName}
            </p>
          ) : null}
          {Number(product.priceRange.minVariantPrice.amount) > 0 && (
            <p className="m-0 text-[0.6875rem] leading-snug text-neutral-500 md:text-xs">
              From <Money data={product.priceRange.minVariantPrice} withoutTrailingZeros />
            </p>
          )}
        </div>
      </FramedPictureWall>
    </Link>
  );
}

/** @param {{title: string, subtitle?: string, products: Array<import('~/lib/content-api').PictureCard & {priceRange: {minVariantPrice: {amount: string; currencyCode: string}}}>}} */
export function ProductGrid({title, subtitle, products}) {
  return (
    <section className="w-full">
      <div className="mb-12 px-6 text-center">
        {subtitle && (
          <p className="mb-3 text-[10px] uppercase tracking-[0.4em] text-neutral-400">
            {subtitle}
          </p>
        )}
        <h2 className="text-[18px] font-semibold uppercase tracking-[0.15em] text-neutral-900 md:text-[22px]">
          {title}
        </h2>
      </div>
      <div className={printGridClassName}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
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
