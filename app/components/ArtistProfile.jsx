import {Link} from 'react-router';
import {ProductGrid, printCatalogGridProps} from '~/components/ProductGrid';
import {artistPath} from '~/lib/paths';
import {cn} from '~/lib/utils';
import {type} from '~/lib/typography';

/**
 * @param {{
 *   artist: import('~/lib/content-model').Artist & {
 *     works?: Array<import('~/lib/print-catalog').PrintCatalogCard>;
 *   };
 * }}
 */
export function ArtistProfile({artist}) {
  const products = artist.works ?? [];

  const portraitUrl =
    typeof artist.portrait === 'string'
      ? artist.portrait
      : artist.portrait?.url;

  return (
    <>
      <section className="border-b border-neutral-100">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-10 px-6 py-12 md:grid-cols-[minmax(0,400px)_1fr] md:gap-20 md:px-12 md:py-16">
          <div className="w-full max-w-sm md:max-w-none">
            {portraitUrl ? (
              <div className="aspect-square overflow-hidden bg-neutral-100">
                <img
                  src={portraitUrl}
                  alt={artist.name}
                  className="size-full object-cover"
                />
              </div>
            ) : (
              <div className="flex aspect-square items-center justify-center overflow-hidden bg-neutral-100">
                <span className={cn(type.overline.sm, 'px-4 text-center text-neutral-400')}>
                  {artist.name}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center md:py-4">
            <h1 className={cn(type.title.md, 'mb-3')}>
              {artist.name}
            </h1>
            {(artist.birthYear || artist.location) && (
              <p className={cn(type.body.md, 'mb-4 text-neutral-500')}>
                {artist.birthYear ? `b. ${artist.birthYear}` : null}
                {artist.birthYear && artist.location ? ' · ' : null}
                {artist.location ?? null}
              </p>
            )}
            {artist.bio ? (
              <p className={cn(type.body.xl, 'max-w-3xl text-neutral-600')}>
                {artist.bio}
              </p>
            ) : null}
            {artist.instagramHandle ? (
              <a
                href={`https://instagram.com/${artist.instagramHandle.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(type.body.md, 'mt-6 text-neutral-600 hover:text-neutral-900')}
              >
                {artist.instagramHandle}
              </a>
            ) : null}
          </div>
        </div>
      </section>

      {products.length > 0 ? (
        <ProductGrid products={products} {...printCatalogGridProps} />
      ) : (
        <p className={cn(type.body.md, 'px-6 py-16 text-center text-neutral-500')}>
          No works for sale yet.
        </p>
      )}
    </>
  );
}

/**
 * @param {{
 *   artists: Array<{
 *     name: string;
 *     handle: string;
 *     portrait?: string | {url: string} | null;
 *     works?: Array<import('~/lib/print-catalog').PrintCatalogCard>;
 *   }>;
 * }}
 */
export function ArtistsIndex({artists: artistList}) {
  return (
    <>
      <div className="text-center py-16 px-6 border-b border-neutral-100">
        <h1 className={type.title.md}>Artists</h1>
      </div>
      {artistList.length > 0 ? (
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {artistList.map((artist) => {
            const portraitUrl =
              typeof artist.portrait === 'string'
                ? artist.portrait
                : artist.portrait?.url;
            const workCount = artist.works?.length ?? 0;

            return (
              <Link key={artist.handle} to={artistPath(artist.handle)} className="group block">
                {portraitUrl ? (
                  <div className="aspect-square overflow-hidden bg-neutral-100 mb-4">
                    <img
                      src={portraitUrl}
                      alt={artist.name}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                    />
                  </div>
                ) : (
                  <div className="aspect-square overflow-hidden bg-neutral-100 mb-4 flex items-center justify-center">
                    <span className={cn(type.overline.xs, 'px-4 text-center text-neutral-400')}>
                      {artist.name}
                    </span>
                  </div>
                )}
                <h2 className={cn(type.body.lg, 'font-medium')}>{artist.name}</h2>
                <p className={cn(type.body.sm, 'text-neutral-500')}>{workCount} works</p>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className={cn(type.body.md, 'text-center py-16 text-neutral-500')}>
          No artists published yet. Add artists in Shopify Admin → Content → Metaobjects.
        </p>
      )}
    </>
  );
}
