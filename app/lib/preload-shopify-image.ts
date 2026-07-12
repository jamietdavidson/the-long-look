export type PrintPreviewImage = {
  id?: string;
  url: string;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
};

const preloadedUrls = new Set<string>();
const gridImageSrcByHandle = new Map<string, string>();

/** Typical grid card width @2x — used when currentSrc is unavailable. */
export const PRINT_GRID_IMAGE_WIDTH = 800;

/** Detail hero — ~50vw @2x, capped. */
export const PRINT_DETAIL_IMAGE_WIDTH_MAX = 1400;

/**
 * Shopify CDN URL with width only (no height/crop).
 * Matches our custom Hydrogen loader so grid and detail share cache keys.
 */
export function buildShopifyWidthUrl(
  src: string,
  width: number,
  sourceWidth?: number | null,
) {
  const capped =
    sourceWidth && sourceWidth > 0
      ? Math.min(Math.round(width), Math.round(sourceWidth))
      : Math.round(width);

  try {
    const url = new URL(src);
    url.searchParams.delete('height');
    url.searchParams.delete('crop');
    url.searchParams.set('width', String(Math.max(1, capped)));
    return url.toString();
  } catch {
    const separator = src.includes('?') ? '&' : '?';
    const cleaned = src
      .replace(/([?&])height=\d+/g, '$1')
      .replace(/([?&])crop=[^&]+/g, '$1')
      .replace(/[?&]$/, '')
      .replace(/\?&/, '?');
    return `${cleaned}${cleaned.includes('?') ? '&' : '?'}width=${Math.max(1, capped)}`;
  }
}

/** Hydrogen Image loader that ignores height/crop so cache keys stay stable. */
export function shopifyWidthOnlyLoader({
  src,
  width,
}: {
  src?: string;
  width?: number | string;
  height?: number | string;
  crop?: string;
}) {
  if (!src) return '';
  const parsed =
    typeof width === 'string' ? Number.parseFloat(width) : (width ?? 0);
  if (!parsed || Number.isNaN(parsed)) return src;
  return buildShopifyWidthUrl(src, parsed);
}

export function getPrintDetailImageWidth(
  image?: Pick<PrintPreviewImage, 'width'> | null,
) {
  if (typeof window === 'undefined') {
    return Math.min(PRINT_DETAIL_IMAGE_WIDTH_MAX, image?.width ?? PRINT_DETAIL_IMAGE_WIDTH_MAX);
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const isMobile = window.innerWidth < 768;
  const cssWidth = isMobile ? window.innerWidth : window.innerWidth * 0.5;
  const target = Math.round(cssWidth * dpr);
  const capped = Math.min(PRINT_DETAIL_IMAGE_WIDTH_MAX, Math.max(640, target));

  if (image?.width && image.width > 0) {
    return Math.min(capped, image.width);
  }

  return capped;
}

export function getPrintGridImageWidth(
  image?: Pick<PrintPreviewImage, 'width'> | null,
) {
  if (typeof window === 'undefined') {
    return Math.min(PRINT_GRID_IMAGE_WIDTH, image?.width ?? PRINT_GRID_IMAGE_WIDTH);
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  let cssWidth = w * 0.25;
  if (w <= 768) cssWidth = w;
  else if (w <= 1024) cssWidth = w * 0.5;
  else if (w <= 1600) cssWidth = w * 0.33;

  const target = Math.round(cssWidth * dpr);
  const capped = Math.min(1200, Math.max(400, target));

  if (image?.width && image.width > 0) {
    return Math.min(capped, image.width);
  }

  return capped;
}

export function cachePrintGridImageSrc(
  handle: string | undefined,
  src: string | null | undefined,
) {
  if (!handle || !src) return;
  gridImageSrcByHandle.set(handle, src);
}

export function getCachedPrintGridImageSrc(handle: string | undefined) {
  if (!handle) return null;
  return gridImageSrcByHandle.get(handle) ?? null;
}

/**
 * Capture the grid card's actual rendered img URL (browser-selected srcSet candidate).
 */
export function captureGridImageSrcFromElement(
  handle: string | undefined,
  element: HTMLElement | null | undefined,
) {
  if (!handle || !element) return null;
  const img = element.querySelector('img');
  const src = img?.currentSrc || img?.getAttribute('src');
  if (!src) return null;
  cachePrintGridImageSrc(handle, src);
  return src;
}

/**
 * Warm one detail-sized URL that matches the hero loader contract.
 */
export function preloadShopifyImage(
  url: string | null | undefined,
  options?: {
    width?: number;
    sourceWidth?: number | null;
    fetchPriority?: 'high' | 'low' | 'auto';
  },
) {
  if (!url) return;

  const width = options?.width ?? getPrintDetailImageWidth({width: options?.sourceWidth});
  const preloadUrl = buildShopifyWidthUrl(url, width, options?.sourceWidth);

  if (preloadedUrls.has(preloadUrl)) return;
  preloadedUrls.add(preloadUrl);

  const image = new Image();
  image.decoding = 'async';
  image.fetchPriority = options?.fetchPriority ?? 'high';
  image.src = preloadUrl;
}

/** Decode a Shopify image URL; resolves when the bitmap is ready to paint. */
export function decodeShopifyImageUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.fetchPriority = 'high';
    image.onload = () => {
      const done = () => resolve(url);
      if (typeof image.decode === 'function') {
        image.decode().then(done).catch(done);
      } else {
        done();
      }
    };
    image.onerror = () => reject(new Error(`Failed to load ${url}`));
    image.src = url;
  });
}
