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

/** Shown when explaining that full bleed and unframed cannot be combined. */
export const FRAME_MOUNT_CONFLICT_MESSAGE =
  'Full bleed and unframed prints are not available together. Selecting one will switch the other option.';

const EXCLUDED_FRAME_PATTERN = /natural|wood/i;

/** @param {string} value */
export function isNoFrameOption(value) {
  const normalized = value.toLowerCase().trim();
  return normalized.includes('no frame') || normalized.includes('unframed');
}

/** @param {string} value */
export function isFullBleedMountOption(value) {
  return resolveMountFromOption(value) === 'fullBleed';
}

/**
 * Resolve an incompatible no-frame + full-bleed pair (defaults to Border mount).
 * @param {string} frame
 * @param {string} mount
 */
export function reconcileIncompatibleFrameMount(frame, mount) {
  if (isNoFrameOption(frame) && isFullBleedMountOption(mount)) {
    return {frame, mount: DEFAULT_MOUNT_OPTIONS[0]};
  }
  return {frame, mount};
}

/**
 * @param {string} frame
 * @param {string} currentMount
 */
export function applyFrameSelection(frame, currentMount) {
  if (isNoFrameOption(frame) && isFullBleedMountOption(currentMount)) {
    return {frame, mount: DEFAULT_MOUNT_OPTIONS[0]};
  }
  return {frame, mount: currentMount};
}

/**
 * @param {string} mount
 * @param {string} currentFrame
 */
export function applyMountSelection(mount, currentFrame) {
  if (isFullBleedMountOption(mount) && isNoFrameOption(currentFrame)) {
    return {frame: DEFAULT_FRAME_OPTIONS[0], mount};
  }
  return {frame: currentFrame, mount};
}

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

/** Case-insensitive search param lookup (Shopify uses `Frame`, links may use `frame`). */
function getSearchParamValue(searchParams: URLSearchParams, name: string) {
  const target = name.toLowerCase();
  for (const [key, value] of searchParams.entries()) {
    if (key.toLowerCase() === target && value) return value;
  }
  return null;
}

export function getResolvedFrameValue(
  variant: {selectedOptions?: Array<{name: string; value: string}>} | null | undefined,
  searchParams: URLSearchParams,
) {
  return (
    getSearchParamValue(searchParams, 'frame') ??
    getFrameValueFromVariant(variant) ??
    'Black'
  );
}

export function getResolvedMountValue(
  variant: {selectedOptions?: Array<{name: string; value: string}>} | null | undefined,
  searchParams: URLSearchParams,
) {
  return (
    getSearchParamValue(searchParams, 'mount') ??
    getMountValueFromVariant(variant) ??
    'Border'
  );
}

/** URL overrides win; incompatible no-frame + full-bleed pairs are reconciled. */
export function getResolvedFrameAndMount(
  variant: {selectedOptions?: Array<{name: string; value: string}>} | null | undefined,
  searchParams: URLSearchParams,
) {
  const frame = getResolvedFrameValue(variant, searchParams);
  const mount = getResolvedMountValue(variant, searchParams);
  return reconcileIncompatibleFrameMount(frame, mount);
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

  let options = hasSize
    ? selected
    : [
        ...selected,
        {
          name: 'Size',
          value: formatPrintSizeShopifyLabel(
            FRAMED_PICTURE_SIZES[FRAMED_PICTURE_DEFAULT_NAMED_SIZE],
          ),
        },
      ];

  const frameOption = options.find(
    (option) => option.name?.toLowerCase() === 'frame',
  );
  const mountOption = options.find(
    (option) => option.name?.toLowerCase() === 'mount',
  );

  if (frameOption?.value && mountOption?.value) {
    const reconciled = reconcileIncompatibleFrameMount(
      frameOption.value,
      mountOption.value,
    );

    if (reconciled.mount !== mountOption.value) {
      options = options.map((option) =>
        option.name?.toLowerCase() === 'mount'
          ? {...option, value: reconciled.mount}
          : option,
      );
    }
  }

  return options;
}
