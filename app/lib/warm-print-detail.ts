import {
  preloadShopifyImage,
  captureGridImageSrcFromElement,
  getCachedPrintGridImageSrc,
  type PrintPreviewImage,
} from '~/lib/preload-shopify-image';
import {cachePrintCatalogCard} from '~/lib/print-product-client-cache';
import type {PrintCatalogCard} from '~/lib/print-catalog';

export type {PrintPreviewImage};

export function getPrintLinkState(product: {
  handle: string;
  featuredImage?: PrintPreviewImage | null;
}) {
  return {
    printPreview: {
      handle: product.handle,
      image: product.featuredImage ?? null,
      gridImageSrc: getCachedPrintGridImageSrc(product.handle),
    },
  };
}

/** Warm detail assets and seed the client navigation cache. */
export function warmPrintDetailFromCard(
  product: PrintCatalogCard,
  cardElement?: HTMLElement | null,
) {
  cachePrintCatalogCard(product);
  captureGridImageSrcFromElement(product.handle, cardElement);
  warmPrintDetailImage(product.featuredImage);
}

/** Warm the single detail-sized CDN URL the hero will request. */
export function warmPrintDetailImage(
  featuredImage?: PrintPreviewImage | null,
) {
  preloadShopifyImage(featuredImage?.url, {
    sourceWidth: featuredImage?.width,
    fetchPriority: 'high',
  });
}

export type PrintNavigationPreview = {
  handle: string;
  image: PrintPreviewImage | null;
  gridImageSrc?: string | null;
};

export function getPrintPreviewFromLocationState(
  state: unknown,
): PrintNavigationPreview | null {
  if (!state || typeof state !== 'object') return null;
  const preview = (state as {printPreview?: PrintNavigationPreview})
    .printPreview;
  if (!preview?.handle) return null;
  return preview;
}

/** Resolve the best instant-paint URL for a print handle. */
export function resolvePrintPlaceholderSrc(
  handle: string | undefined,
  locationState?: unknown,
) {
  const fromCache = getCachedPrintGridImageSrc(handle);
  if (fromCache) return fromCache;

  const fromState = getPrintPreviewFromLocationState(locationState);
  if (fromState?.handle === handle && fromState.gridImageSrc) {
    return fromState.gridImageSrc;
  }

  return null;
}
