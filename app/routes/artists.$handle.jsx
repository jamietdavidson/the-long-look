import {useLoaderData} from 'react-router';
import {ArtistProfile} from '~/components/spoils/ArtistProfile';
import {loadArtistByHandle, loadPicturesForArtist} from '~/lib/content-api';

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

  const pictures = await loadPicturesForArtist(context.storefront, handle);
  return {
    artist: {
      ...artist,
      pictures,
      works: pictures,
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
