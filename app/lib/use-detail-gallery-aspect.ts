import {useSyncExternalStore} from 'react';
import {
  FRAMED_PICTURE_DETAIL_GALLERY_DESKTOP_BREAKPOINT_PX,
  FRAMED_PICTURE_DETAIL_GALLERY_SSR_ASPECT_RATIO,
  getDetailGalleryContainerAspectRatio,
} from '~/lib/framed-picture';

function subscribe(onStoreChange: () => void) {
  window.addEventListener('resize', onStoreChange);

  const desktopQuery = window.matchMedia(
    `(min-width: ${FRAMED_PICTURE_DETAIL_GALLERY_DESKTOP_BREAKPOINT_PX}px)`,
  );
  desktopQuery.addEventListener('change', onStoreChange);

  return () => {
    window.removeEventListener('resize', onStoreChange);
    desktopQuery.removeEventListener('change', onStoreChange);
  };
}

/** Detail gallery height/width ratio — synced to Tailwind layout, no DOM measure pass. */
export function useDetailGalleryContainerAspectRatio() {
  return useSyncExternalStore(
    subscribe,
    getDetailGalleryContainerAspectRatio,
    () => FRAMED_PICTURE_DETAIL_GALLERY_SSR_ASPECT_RATIO,
  );
}
