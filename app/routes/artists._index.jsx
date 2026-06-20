import {useLoaderData} from 'react-router';
import {ArtistsIndex} from '~/components/spoils/ArtistProfile';
import {loadArtistsIndex} from '~/lib/content-api';

/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return [{title: 'Artists | The Long Look'}];
};

/**
 * @param {Route.LoaderArgs} args
 */
export async function loader({context}) {
  const artistList = await loadArtistsIndex(context.storefront);
  return {artists: artistList};
}

export default function ArtistsRoute() {
  /** @type {LoaderReturnData} */
  const {artists: artistList} = useLoaderData();

  return <ArtistsIndex artists={artistList} />;
}

/** @typedef {import('./+types/artists._index').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
