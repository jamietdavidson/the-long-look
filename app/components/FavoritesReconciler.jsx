import {useEffect} from 'react';
import {useFavoritesStore} from '~/lib/favorites-store';

/**
 * Prunes stale favourites and migrates legacy handle-based entries to product ids.
 * @param {{catalog: Array<{id: string; handle: string}> | null | undefined}}
 */
export function FavoritesReconciler({catalog}) {
  const reconcile = useFavoritesStore((state) => state.reconcile);

  useEffect(() => {
    if (!catalog?.length) return;
    reconcile(catalog);
  }, [catalog, reconcile]);

  return null;
}
