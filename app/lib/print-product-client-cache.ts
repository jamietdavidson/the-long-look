import type {PrintCatalogCard} from '~/lib/print-catalog';
import {
  FRAMED_PICTURE_DEFAULT_NAMED_SIZE,
  FRAMED_PICTURE_SIZES,
  getFramedPictureSpecFromVariant,
  type FramedPictureSizeSpec,
} from '~/lib/framed-picture';
import {
  DEFAULT_FRAME_OPTIONS,
  DEFAULT_MOUNT_OPTIONS,
} from '~/lib/print-options';

const catalogCardsByHandle = new Map<string, PrintCatalogCard>();

export function cachePrintCatalogCard(product: PrintCatalogCard) {
  if (!product?.handle) return;
  catalogCardsByHandle.set(product.handle, product);
}

export function cachePrintCatalogCards(products: PrintCatalogCard[]) {
  for (const product of products) {
    cachePrintCatalogCard(product);
  }
}

export function getCachedPrintCatalogCard(handle: string | undefined) {
  if (!handle) return null;
  return catalogCardsByHandle.get(handle) ?? null;
}

/** Minimal product shape for instant detail paint from the grid cache. */
export function buildPreviewProduct(card: PrintCatalogCard) {
  return {
    id: card.id,
    title: card.title,
    handle: card.handle,
    vendor: card.artistName ?? card.artistHandle ?? '',
    description: null,
    featuredImage: card.featuredImage,
    priceRange: card.priceRange,
    selectedOrFirstAvailableVariant: card.catalogDisplayVariant ?? null,
    adjacentVariants: [],
    options: [],
    catalogDisplayVariant: card.catalogDisplayVariant ?? null,
  };
}

export function getDetailPreviewFramedSpec(
  card: PrintCatalogCard,
): FramedPictureSizeSpec {
  if (card.catalogDisplayVariant) {
    return getFramedPictureSpecFromVariant(
      card.catalogDisplayVariant,
      FRAMED_PICTURE_DEFAULT_NAMED_SIZE,
      {
        frame: DEFAULT_FRAME_OPTIONS[0],
        mount: DEFAULT_MOUNT_OPTIONS[0],
      },
    );
  }

  return {
    ...FRAMED_PICTURE_SIZES[FRAMED_PICTURE_DEFAULT_NAMED_SIZE],
    referencePadding:
      FRAMED_PICTURE_SIZES[FRAMED_PICTURE_DEFAULT_NAMED_SIZE].padding,
    referenceFrame:
      FRAMED_PICTURE_SIZES[FRAMED_PICTURE_DEFAULT_NAMED_SIZE].frame,
  };
}

export function isPromise<T>(value: unknown): value is Promise<T> {
  return (
    value != null &&
    typeof value === 'object' &&
    typeof (value as Promise<T>).then === 'function'
  );
}
