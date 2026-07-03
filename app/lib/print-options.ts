import type {FrameColor, FramedPictureNamedSize} from '~/lib/framed-picture';
import {
  formatPrintSizeShopifyLabel,
  FRAMED_PICTURE_DEFAULT_NAMED_SIZE,
  FRAMED_PICTURE_SIZES,
  getFramedSizeFromVariant,
  resolveFrameColorFromOption,
  resolveMountFromOption,
  resolveNamedFramedPictureSize,
} from '~/lib/framed-picture';
import {getSelectedProductOptions} from '@shopify/hydrogen';

export const DEFAULT_FRAME_OPTIONS = [
  'Black',
  'White',
  'No Frame',
] as const;

export const DEFAULT_MOUNT_OPTIONS = ['Border', 'Full Bleed'] as const;

const EXCLUDED_FRAME_PATTERN = /natural|wood/i;

/** @param {string} name */
export function isExcludedFrameOption(name) {
  return EXCLUDED_FRAME_PATTERN.test(name);
}

export type DefaultFrameOption = (typeof DEFAULT_FRAME_OPTIONS)[number];
export type DefaultMountOption = (typeof DEFAULT_MOUNT_OPTIONS)[number];

/** @param {{selectedOptions?: Array<{name: string; value: string}>} | null | undefined} variant */
export function getFrameValueFromVariant(variant) {
  return (
    variant?.selectedOptions?.find(
      (option) => option.name.toLowerCase() === 'frame',
    )?.value ?? null
  );
}

/** @param {{selectedOptions?: Array<{name: string; value: string}>} | null | undefined} variant */
export function getMountValueFromVariant(variant) {
  return (
    variant?.selectedOptions?.find(
      (option) => option.name.toLowerCase() === 'mount',
    )?.value ?? null
  );
}

export function getResolvedFrameValue(
  variant: {selectedOptions?: Array<{name: string; value: string}>} | null | undefined,
  searchParams: URLSearchParams,
) {
  return getFrameValueFromVariant(variant) ?? searchParams.get('frame') ?? 'Black';
}

export function getResolvedMountValue(
  variant: {selectedOptions?: Array<{name: string; value: string}>} | null | undefined,
  searchParams: URLSearchParams,
) {
  return (
    getMountValueFromVariant(variant) ??
    searchParams.get('mount') ??
    'Border'
  );
}

export function frameValueToColor(value: string): FrameColor {
  return resolveFrameColorFromOption(value);
}

export function mountValueToStyle(value: string) {
  return resolveMountFromOption(value);
}

/** Read a named print size from `?Size=` (or `?size=`) URL params. */
export function getFramedSizeFromSearchParams(
  searchParams: URLSearchParams,
): FramedPictureNamedSize | undefined {
  for (const [key, value] of searchParams.entries()) {
    if (key.toLowerCase() !== 'size' || !value) continue;

    const named = resolveNamedFramedPictureSize(value);
    if (named) return named;
  }

  return undefined;
}

/** URL size wins when set; otherwise variant; otherwise Large. */
export function getResolvedFramedSize(
  variant:
    | {
        selectedOptions?: Array<{name: string; value: string}>;
        title?: string | null;
      }
    | null
    | undefined,
  searchParams: URLSearchParams,
): FramedPictureNamedSize {
  return (
    getFramedSizeFromSearchParams(searchParams) ??
    getFramedSizeFromVariant(variant ?? {}) ??
    FRAMED_PICTURE_DEFAULT_NAMED_SIZE
  );
}

/** Selected product options for print detail — defaults Size to Large. */
export function getPrintDetailSelectedOptions(request: Request) {
  const selected = getSelectedProductOptions(request);
  const hasSize = selected.some(
    (option) => option.name?.toLowerCase() === 'size' && option.value,
  );

  if (!hasSize) {
    return [
      ...selected,
      {
        name: 'Size',
        value: formatPrintSizeShopifyLabel(
          FRAMED_PICTURE_SIZES[FRAMED_PICTURE_DEFAULT_NAMED_SIZE],
        ),
      },
    ];
  }

  return selected;
}
