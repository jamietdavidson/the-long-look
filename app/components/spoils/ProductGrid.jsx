import {Link} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import {printPath, printsPath} from '~/lib/paths';

/**
 * @param {{
 *   product: import('~/lib/content-api').PictureCard & {
 *     priceRange: {minVariantPrice: {amount: string; currencyCode: string}};
 *   };
 *   loading?: 'eager' | 'lazy';
 * }}
 */
export function SpoilsProductCard({product, loading = 'lazy'}) {
  const variantUrl = printPath(product.handle);
  const image = product.featuredImage;
  const imageAspect =
    image?.width && image?.height ? image.width / image.height : 0.75;

  return (
    <Link
      to={variantUrl}
      prefetch="intent"
      className="group print-grid-item block w-full h-full"
      style={{'--img-aspect': imageAspect}}
    >
      <div className="print-grid-item-picture">
        <div className="print-frame">
          <div className="print-frame-mat">
            {image ? (
              <div className="print-frame-image-wrap">
                <Image
                  alt={image.altText || product.title}
                  data={image}
                  loading={loading}
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1600px) 33vw, 25vw"
                  className="print-frame-image"
                />
              </div>
            ) : (
              <div className="print-frame-image-wrap print-frame-placeholder" aria-hidden />
            )}
          </div>
        </div>
      </div>
      <div className="print-grid-item-info">
        <h3 className="print-frame-title">{product.title}</h3>
        {product.artistName ? (
          <p className="print-frame-artist">{product.artistName}</p>
        ) : null}
        {Number(product.priceRange.minVariantPrice.amount) > 0 && (
          <p className="print-frame-price">
            From <Money data={product.priceRange.minVariantPrice} withoutTrailingZeros />
          </p>
        )}
      </div>
    </Link>
  );
}

/** @param {{title: string, subtitle?: string, products: Array<import('~/lib/content-api').PictureCard & {priceRange: {minVariantPrice: {amount: string; currencyCode: string}}}>}} */
export function ProductGrid({title, subtitle, products}) {
  return (
    <section className="w-full">
      <div className="text-center mb-12 px-6">
          {subtitle && (
            <p className="text-[10px] uppercase tracking-[0.4em] text-neutral-400 mb-3">{subtitle}</p>
          )}
          <h2 className="text-[18px] md:text-[22px] uppercase tracking-[0.15em] font-semibold text-neutral-900">
            {title}
          </h2>
        </div>
      <div className="print-grid w-full">
          {products.map((product) => (
            <SpoilsProductCard key={product.id} product={product} />
          ))}
        </div>
    </section>
  );
}

export function VideoSection() {
  return (
    <section className="relative w-full h-[60vh] md:h-[80vh] overflow-hidden bg-neutral-900">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-70"
        style={{backgroundImage: 'url(https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1920&q=80)'}}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-white text-center px-6">
        <p className="text-[10px] uppercase tracking-[0.4em] text-white/70 mb-4">The Art of Living</p>
        <h2 className="text-[20px] md:text-[28px] font-light">Curated photography for your space</h2>
        <Link
          to={printsPath()}
          className="mt-8 inline-block border border-white/50 px-8 py-3 text-[10px] uppercase tracking-[0.3em] hover:bg-white hover:text-neutral-900 transition-all duration-300"
        >
          Explore
        </Link>
      </div>
    </section>
  );
}
