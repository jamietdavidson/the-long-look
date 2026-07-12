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

export const SHOPIFY_SIZE_OPTION = 'Size';
export const SHOPIFY_FRAME_OPTION = 'Frame';
export const SHOPIFY_MOUNT_OPTION = 'Mount';

/** Case-insensitive search param lookup — prefers the canonical Shopify option key. */
function getSearchParamValue(searchParams: URLSearchParams, name: string) {
  const exact = searchParams.get(name);
  if (exact) return exact;

  const target = name.toLowerCase();
  for (const [key, value] of searchParams.entries()) {
    if (key.toLowerCase() === target && value) return value;
  }
  return null;
}

/** Remove legacy lowercase `frame` / `mount` / `size` duplicates from the URL. */
export function stripLegacyOptionParams(params: URLSearchParams) {
  for (const key of [...params.keys()]) {
    const lower = key.toLowerCase();
    if (lower === 'frame' && key !== SHOPIFY_FRAME_OPTION) params.delete(key);
    if (lower === 'mount' && key !== SHOPIFY_MOUNT_OPTION) params.delete(key);
    if (lower === 'size' && key !== SHOPIFY_SIZE_OPTION) params.delete(key);
  }
}

/** Write Shopify product option keys and drop legacy lowercase duplicates. */
export function setProductOptionParams(
  params: URLSearchParams,
  options: {frame?: string; mount?: string; size?: string},
) {
  if (options.size) params.set(SHOPIFY_SIZE_OPTION, options.size);
  if (options.frame) params.set(SHOPIFY_FRAME_OPTION, options.frame);
  if (options.mount) params.set(SHOPIFY_MOUNT_OPTION, options.mount);
  stripLegacyOptionParams(params);
}

/**
 * Merge a Shopify `variantUriQuery` with frame/mount overrides using canonical
 * option keys only — keeps `useSelectedOptionInUrlParam` in sync.
 */
export function buildVariantSearchParams(
  variantUriQuery: string,
  overrides: {frame?: string; mount?: string} = {},
) {
  const params = new URLSearchParams(variantUriQuery);
  const frame =
    overrides.frame ??
    getSearchParamValue(params, SHOPIFY_FRAME_OPTION) ??
    'Black';
  const mount =
    overrides.mount ??
    getSearchParamValue(params, SHOPIFY_MOUNT_OPTION) ??
    'Border';
  const reconciled = reconcileIncompatibleFrameMount(frame, mount);
  setProductOptionParams(params, reconciled);
  return params;
}

/** Promote canonical option params and strip legacy lowercase duplicates. */
export function normalizeProductOptionSearchParams(params: URLSearchParams) {
  const frame = getSearchParamValue(params, SHOPIFY_FRAME_OPTION);
  const mount = getSearchParamValue(params, SHOPIFY_MOUNT_OPTION);
  const size = getSearchParamValue(params, SHOPIFY_SIZE_OPTION);
  const before = params.toString();

  if (size) params.set(SHOPIFY_SIZE_OPTION, size);
  if (frame) params.set(SHOPIFY_FRAME_OPTION, frame);
  if (mount) params.set(SHOPIFY_MOUNT_OPTION, mount);
  stripLegacyOptionParams(params);

  return before !== params.toString();
}

export function getResolvedFrameValue(
  variant: {selectedOptions?: Array<{name: string; value: string}>} | null | undefined,
  searchParams: URLSearchParams,
) {
  return (
    getSearchParamValue(searchParams, SHOPIFY_FRAME_OPTION) ??
    getFrameValueFromVariant(variant) ??
    'Black'
  );
}

export function getResolvedMountValue(
  variant: {selectedOptions?: Array<{name: string; value: string}>} | null | undefined,
  searchParams: URLSearchParams,
) {
  return (
    getSearchParamValue(searchParams, SHOPIFY_MOUNT_OPTION) ??
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
