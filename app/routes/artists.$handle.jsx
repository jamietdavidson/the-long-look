import {useLoaderData} from 'react-router';
import {ArtistProfile} from '~/components/ArtistProfile';
import {loadArtistByHandle} from '~/lib/content-api';
import {
  loadArtistIndex,
  loadPrintProductsForArtist,
  productsToPrintCards,
} from '~/lib/print-catalog';

/**
 * @type {Route.MetaFunction}
 */
export const meta = ({data}) => {
  return [{title: `${data?.artist?.name ?? 'Artist'} | The Long Look`}];
};

/**
 * @param {Route.LoaderArgs} args
 */
export async function loader({context, params}) {
  const {handle} = params;

  if (!handle) {
    throw new Response(null, {status: 404});
  }

  const artist = await loadArtistByHandle(context.storefront, handle);
  if (!artist) {
    throw new Response(null, {status: 404});
  }

  const [products, artists] = await Promise.all([
    loadPrintProductsForArtist(context.storefront, handle),
    loadArtistIndex(context.storefront),
  ]);

  const works = productsToPrintCards(products, artists);

  return {
    artist: {
      ...artist,
      works,
    },
  };
}

export default function ArtistRoute() {
  /** @type {LoaderReturnData} */
  const {artist} = useLoaderData();

  return <ArtistProfile artist={artist} />;
}

/** @typedef {import('./+types/artists.$handle').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
