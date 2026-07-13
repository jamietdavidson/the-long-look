import {Heart} from 'lucide-react';
import {useFavoritesStore} from '~/lib/favorites-store';
import {cn} from '~/lib/utils';

/**
 * Toggle favourite for a print — bottom-right overlay on image cards.
 * @param {{productId: string; className?: string; size?: 'sm' | 'md'}}
 */
export function FavoriteButton({productId, className, size = 'md'}) {
  const hasHydrated = useFavoritesStore((state) => state.hasHydrated);
  const isFavorite = useFavoritesStore((state) => state.isFavorite(productId));
  const toggle = useFavoritesStore((state) => state.toggle);

  const favorited = hasHydrated && isFavorite;
  const iconSize = size === 'sm' ? 12 : 14;
  const buttonSize = size === 'sm' ? 'size-7' : 'size-8';

  return (
    <button
      type="button"
      className={cn(
        'group flex items-center justify-center rounded-full bg-white/90 text-neutral-700 backdrop-blur-sm transition-colors hover:bg-white',
        buttonSize,
        favorited && 'text-red-500',
        className,
      )}
      aria-pressed={favorited}
      aria-label={favorited ? 'Remove from favourites' : 'Add to favourites'}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle(productId);
      }}
    >
      <Heart
        size={iconSize}
        strokeWidth={1.75}
        fill={favorited ? 'currentColor' : 'none'}
        className="transition-transform duration-200 ease-out group-hover:scale-125"
        aria-hidden
      />
    </button>
  );
}
