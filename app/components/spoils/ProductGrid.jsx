import {Link} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import {useVariantUrl} from '~/lib/variants';

/** @param {{product: import('storefrontapi.generated').ProductItemFragment, loading?: 'eager'|'lazy'}} */
export function SpoilsProductCard({product, loading = 'lazy'}) {
  const variantUrl = useVariantUrl(product.handle);
  const image = product.featuredImage;

  return (
    <Link to={variantUrl} prefetch="intent" className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100 mb-3">
        {image && (
          <Image
            alt={image.altText || product.title}
            aspectRatio="3/4"
            data={image}
            loading={loading}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover group-hover:scale-[1.03] transition-transform duration-700"
          />
        )}
      </div>
      <h3 className="text-[12px] md:text-[13px] font-medium text-neutral-800 mb-1">{product.title}</h3>
      <p className="text-[11px] md:text-[12px] text-neutral-500">
        From <Money data={product.priceRange.minVariantPrice} withoutTrailingZeros />
      </p>
    </Link>
  );
}

/** @param {{title: string, subtitle?: string, products: Array<import('storefrontapi.generated').ProductItemFragment>}} */
export function ProductGrid({title, subtitle, products}) {
  return (
    <section className="py-16 md:py-24 px-6 md:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          {subtitle && (
            <p className="text-[10px] uppercase tracking-[0.4em] text-neutral-400 mb-3">{subtitle}</p>
          )}
          <h2 className="text-[18px] md:text-[22px] uppercase tracking-[0.15em] font-semibold text-neutral-900">
            {title}
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map((product) => (
            <SpoilsProductCard key={product.id} product={product} />
          ))}
        </div>
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
          to="/collections/all"
          className="mt-8 inline-block border border-white/50 px-8 py-3 text-[10px] uppercase tracking-[0.3em] hover:bg-white hover:text-neutral-900 transition-all duration-300"
        >
          Explore
        </Link>
      </div>
    </section>
  );
}
