import {create} from 'zustand';
import {persist} from 'zustand/middleware';

type FavoritesState = {
  handles: string[];
  hasHydrated: boolean;
  setHasHydrated: () => void;
  toggle: (handle: string) => void;
  isFavorite: (handle: string) => boolean;
};

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      handles: [],
      hasHydrated: false,
      setHasHydrated: () => set({hasHydrated: true}),
      toggle: (handle) =>
        set((state) => ({
          handles: state.handles.includes(handle)
            ? state.handles.filter((h) => h !== handle)
            : [...state.handles, handle],
        })),
      isFavorite: (handle) => get().handles.includes(handle),
    }),
    {
      name: 'the-long-look-favourites',
      partialize: (state) => ({handles: state.handles}),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated();
      },
    },
  ),
);
