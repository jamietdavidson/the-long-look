import {Link} from 'react-router';
import {ProductGrid} from '~/components/spoils/ProductGrid';
import {pictureToCard} from '~/lib/content-api';
import {artistPath} from '~/lib/paths';

/**
 * @param {{
 *   artist: {
 *     name: string;
 *     handle: string;
 *     birthYear?: number | null;
 *     location?: string | null;
 *     bio?: string | null;
 *     portrait?: string | {url: string} | null;
 *     instagramHandle?: string | null;
 *     pictures?: import('~/lib/content-model').Picture[];
 *   };
 * }}
 */
export function ArtistProfile({artist}) {
  const products = (artist.pictures ?? []).map(pictureToCard);

  const portraitUrl =
    typeof artist.portrait === 'string'
      ? artist.portrait
      : artist.portrait?.url;

  return (
    <div className="pt-16">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-10 md:gap-16">
          <div className="md:sticky md:top-24 md:self-start">
            {portraitUrl ? (
              <div className="aspect-square overflow-hidden bg-neutral-100 mb-6">
                <img
                  src={portraitUrl}
                  alt={artist.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-square overflow-hidden bg-neutral-100 mb-6 flex items-center justify-center">
                <span className="text-[11px] uppercase tracking-[0.2em] text-neutral-400">
                  {artist.name}
                </span>
              </div>
            )}
            <h1 className="text-[18px] uppercase tracking-[0.12em] font-semibold mb-2">{artist.name}</h1>
            {(artist.birthYear || artist.location) && (
              <p className="text-[11px] text-neutral-500 mb-4">
                {artist.birthYear ? `b. ${artist.birthYear}` : null}
                {artist.birthYear && artist.location ? ' · ' : null}
                {artist.location ?? null}
              </p>
            )}
            {artist.instagramHandle && (
              <a
                href={`https://instagram.com/${artist.instagramHandle.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-neutral-600 hover:text-neutral-900"
              >
                {artist.instagramHandle}
              </a>
            )}
          </div>
          <div>
            {artist.bio && (
              <p className="text-[13px] text-neutral-600 leading-relaxed mb-12">{artist.bio}</p>
            )}
            <ProductGrid title={`Works by ${artist.name}`} products={products} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * @param {{
 *   artists: Array<{
 *     name: string;
 *     handle: string;
 *     portrait?: string | {url: string} | null;
 *     pictures?: import('~/lib/content-model').Picture[];
 *   }>;
 * }}
 */
export function ArtistsIndex({artists: artistList}) {
  return (
    <div className="pt-20">
      <div className="text-center py-16 px-6 border-b border-neutral-100">
        <h1 className="text-[22px] md:text-[30px] uppercase tracking-[0.15em] font-semibold">Artists</h1>
      </div>
      {artistList.length > 0 ? (
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {artistList.map((artist) => {
            const portraitUrl =
              typeof artist.portrait === 'string'
                ? artist.portrait
                : artist.portrait?.url;
            const workCount = artist.pictures?.length ?? 0;

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
                    <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 px-4 text-center">
                      {artist.name}
                    </span>
                  </div>
                )}
                <h2 className="text-[13px] font-medium">{artist.name}</h2>
                <p className="text-[11px] text-neutral-500">{workCount} works</p>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="text-center py-16 text-[12px] text-neutral-500">
          No artists published yet. Add artists in Shopify Admin → Content → Metaobjects.
        </p>
      )}
    </div>
  );
}
