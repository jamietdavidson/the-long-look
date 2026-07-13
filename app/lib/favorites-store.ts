import {create} from 'zustand';
import {persist} from 'zustand/middleware';

export type FavoriteCatalogRef = {
  id: string;
  handle: string;
};

type PersistedFavoritesV0 = {
  handles?: string[];
};

type PersistedFavoritesV1 = {
  ids?: string[];
  legacyHandles?: string[];
};

type FavoritesState = {
  ids: string[];
  /** Handles saved before the id-based store; cleared after catalog reconcile. */
  legacyHandles: string[];
  hasHydrated: boolean;
  hasReconciled: boolean;
  setHasHydrated: () => void;
  toggle: (id: string) => void;
  isFavorite: (id: string) => boolean;
  reconcile: (catalog: FavoriteCatalogRef[]) => void;
};

function favoriteIdsEqual(a: string[], b: string[]) {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

function reconcileFavoriteIds(
  ids: string[],
  legacyHandles: string[],
  catalog: FavoriteCatalogRef[],
) {
  const byHandle = new Map(catalog.map((product) => [product.handle, product.id]));
  const validIds = new Set(catalog.map((product) => product.id));
  const migratedIds = legacyHandles
    .map((handle) => byHandle.get(handle))
    .filter((id): id is string => Boolean(id));

  const seen = new Set<string>();
  const nextIds: string[] = [];

  for (const id of [...ids, ...migratedIds]) {
    if (!seen.has(id) && validIds.has(id)) {
      seen.add(id);
      nextIds.push(id);
    }
  }

  return nextIds;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      ids: [],
      legacyHandles: [],
      hasHydrated: false,
      hasReconciled: false,
      setHasHydrated: () => set({hasHydrated: true}),
      toggle: (id) =>
        set((state) => ({
          ids: state.ids.includes(id)
            ? state.ids.filter((favoriteId) => favoriteId !== id)
            : [...state.ids, id],
        })),
      isFavorite: (id) => get().ids.includes(id),
      reconcile: (catalog) => {
        if (catalog.length === 0) return;

        const state = get();
        const nextIds = reconcileFavoriteIds(
          state.ids,
          state.legacyHandles,
          catalog,
        );
        const idsChanged = !favoriteIdsEqual(nextIds, state.ids);
        const legacyChanged = state.legacyHandles.length > 0;

        if (idsChanged || legacyChanged || !state.hasReconciled) {
          set({
            ids: nextIds,
            legacyHandles: [],
            hasReconciled: true,
          });
        }
      },
    }),
    {
      name: 'the-long-look-favourites',
      version: 1,
      migrate: (persistedState, version) => {
        if (version >= 1) {
          const persisted = persistedState as PersistedFavoritesV1;
          return {
            ids: persisted.ids ?? [],
            legacyHandles: persisted.legacyHandles ?? [],
          };
        }

        const persisted = persistedState as PersistedFavoritesV0;
        return {
          ids: [],
          legacyHandles: persisted.handles ?? [],
        };
      },
      partialize: (state) => ({
        ids: state.ids,
        legacyHandles: state.legacyHandles,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated();
      },
    },
  ),
);
