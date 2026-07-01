import {ProductCard} from '~/components/ProductGrid';

/**
 * @param {{
 *   products: Array<import('~/lib/content-api').PictureCard & {
 *     priceRange: {minVariantPrice: {amount: string; currencyCode: string}};
 *   }>;
 * }}
 */
export function DisplaysWellWith({products}) {
  if (products.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-lg font-medium text-neutral-900">
        Displays well with
      </h2>
      <div className="grid grid-cols-2 gap-1">
        {products.slice(0, 2).map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            size="compact"
            textAlign="left"
          />
        ))}
      </div>
    </section>
  );
}
