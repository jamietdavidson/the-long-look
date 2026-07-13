import {useLoaderData, Link} from 'react-router';
import {loadAllContentCollections} from '~/lib/content-api';
import {collectionPath} from '~/lib/paths';

/**
 * @param {Route.LoaderArgs} args
 */
export async function loader({context}) {
  const collections = await loadAllContentCollections(context.storefront);
  return {collections};
}

export default function Collections() {
  /** @type {LoaderReturnData} */
  const {collections} = useLoaderData();

  return (
    <div className="collections">
      <h1>Collections</h1>
      <div className="collections-grid">
        {collections.map((collection, index) => (
          <CollectionItem
            key={collection.id}
            collection={collection}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * @param {{
 *   collection: import('~/lib/content-model').Collection;
 *   index: number;
 * }}
 */
function CollectionItem({collection, index}) {
  return (
    <Link
      className="collection-item"
      to={collectionPath(collection.handle)}
      prefetch="intent"
    >
      {collection.coverImage?.url && (
        <img
          alt={collection.coverImage.altText || collection.title}
          src={collection.coverImage.url}
          width={collection.coverImage.width ?? undefined}
          height={collection.coverImage.height ?? undefined}
          loading={index < 3 ? 'eager' : 'lazy'}
        />
      )}
      <h5>{collection.title}</h5>
    </Link>
  );
}

/** @typedef {import('./+types/collections._index').Route} Route */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
