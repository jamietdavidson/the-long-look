import {Link} from 'react-router';
import {ProductGrid} from '~/components/spoils/ProductGrid';
import {mockProductsToCards} from '~/lib/spoils-data';

/** @param {{artist: import('~/lib/artists-data').Artist}} */
export function ArtistProfile({artist}) {
  const products = mockProductsToCards(artist.works);

  return (
    <div className="pt-16">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-10 md:gap-16">
          <div className="md:sticky md:top-24 md:self-start">
            <div className="aspect-square overflow-hidden bg-neutral-100 mb-6">
              <img
                src={artist.portrait}
                alt={artist.name}
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-[18px] uppercase tracking-[0.12em] font-semibold mb-2">{artist.name}</h1>
            <p className="text-[11px] text-neutral-500 mb-4">
              b. {artist.birthYear} · {artist.location}
            </p>
            <a
              href={`https://instagram.com/${artist.instagramHandle.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-neutral-600 hover:text-neutral-900"
            >
              {artist.instagramHandle}
            </a>
          </div>
          <div>
            <p className="text-[13px] text-neutral-600 leading-relaxed mb-12">{artist.bio}</p>
            <ProductGrid title={`Works by ${artist.name}`} products={products} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** @param {{artists: import('~/lib/artists-data').Artist[]}} */
export function ArtistsIndex({artists: artistList}) {
  return (
    <div className="pt-20">
      <div className="text-center py-16 px-6 border-b border-neutral-100">
        <h1 className="text-[22px] md:text-[30px] uppercase tracking-[0.15em] font-semibold">Artists</h1>
      </div>
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {artistList.map((artist) => (
          <Link key={artist.handle} to={`/collections/${artist.handle}`} className="group block">
            <div className="aspect-square overflow-hidden bg-neutral-100 mb-4">
              <img
                src={artist.portrait}
                alt={artist.name}
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
              />
            </div>
            <h2 className="text-[13px] font-medium">{artist.name}</h2>
            <p className="text-[11px] text-neutral-500">{artist.works.length} works</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
