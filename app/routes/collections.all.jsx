import {redirect} from 'react-router';
import {printsPath} from '~/lib/paths';

/** @param {Route.LoaderArgs} */
export async function loader() {
  throw redirect(printsPath());
}

export default function CollectionsAllRedirect() {
  return null;
}

/** @typedef {import('./+types/collections.all').Route} Route */
