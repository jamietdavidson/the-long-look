import {printPath, productPath} from '~/lib/paths';
import {
  getFrameValueFromVariant,
  getMountValueFromVariant,
} from '~/lib/print-options';

export const PRINT_HANDLE_CART_ATTRIBUTE = '_print_handle';
export const FRAME_CART_ATTRIBUTE = 'Frame';
export const MOUNT_CART_ATTRIBUTE = 'Mount';
export const ARTIST_CART_ATTRIBUTE = 'Artist';

/**
 * @param {Array<{key: string; value?: string | null}> | null | undefined} attributes
 */
export function getPrintHandleFromCartAttributes(attributes) {
  return attributes?.find((attr) => attr.key === PRINT_HANDLE_CART_ATTRIBUTE)
    ?.value;
}

/**
 * @param {Array<{key: string; value?: string | null}> | null | undefined} attributes
 * @param {string} key
 */
function getAttributeValue(attributes, key) {
  return attributes?.find(
    (attr) => attr.key.toLowerCase() === key.toLowerCase(),
  )?.value;
}

/**
 * @param {{
 *   merchandise: {selectedOptions?: Array<{name: string; value: string}>};
 *   attributes?: Array<{key: string; value?: string | null}> | null;
 * }}
 */
export function getLinePrintOptions(line) {
  const {selectedOptions = []} = line.merchandise;
  const attributes = line.attributes ?? [];

  const fromOption = (name) =>
    selectedOptions.find(
      (option) => option.name.toLowerCase() === name.toLowerCase(),
    )?.value;

  return {
    size: fromOption('size') ?? null,
    frame:
      getFrameValueFromVariant(line.merchandise) ??
      getAttributeValue(attributes, FRAME_CART_ATTRIBUTE) ??
      'Black',
    mount:
      getMountValueFromVariant(line.merchandise) ??
      getAttributeValue(attributes, MOUNT_CART_ATTRIBUTE) ??
      'Border',
  };
}

/**
 * @param {{
 *   merchandise: {product?: {vendor?: string | null}; selectedOptions?: Array<{name: string; value: string}>};
 *   attributes?: Array<{key: string; value?: string | null}> | null;
 * }}
 */
export function getLineArtistName(line) {
  return (
    getAttributeValue(line.attributes, ARTIST_CART_ATTRIBUTE) ??
    line.merchandise?.product?.vendor ??
    null
  );
}

/**
 * @param {{
 *   printHandle?: string | null;
 *   artistName?: string | null;
 *   frame?: string | null;
 *   mount?: string | null;
 *   variant?: {selectedOptions?: Array<{name: string; value: string}>} | null;
 * }}
 */
export function getPrintLineAttributes({
  printHandle,
  artistName,
  frame,
  mount,
  variant,
}) {
  /** @type {Array<{key: string; value: string}>} */
  const attributes = [...(getPrintHandleLineAttributes(printHandle) ?? [])];

  if (artistName) {
    attributes.push({key: ARTIST_CART_ATTRIBUTE, value: artistName});
  }

  if (!getFrameValueFromVariant(variant) && frame) {
    attributes.push({key: FRAME_CART_ATTRIBUTE, value: frame});
  }

  if (!getMountValueFromVariant(variant) && mount) {
    attributes.push({key: MOUNT_CART_ATTRIBUTE, value: mount});
  }

  return attributes.length > 0 ? attributes : undefined;
}

/**
 * @param {{
 *   productHandle: string;
 *   selectedOptions?: import('@shopify/hydrogen/storefront-api-types').SelectedOption[];
 *   printHandle?: string | null;
 *   localePrefix?: string;
 *   attributes?: Array<{key: string; value?: string | null}> | null;
 * }} args
 */
export function getLineItemUrl({
  productHandle,
  selectedOptions,
  printHandle,
  localePrefix = '',
  attributes,
}) {
  const searchParams = new URLSearchParams();
  selectedOptions?.forEach((option) => {
    searchParams.set(option.name, option.value);
  });

  const frameAttr = attributes?.find(
    (attr) => attr.key.toLowerCase() === FRAME_CART_ATTRIBUTE.toLowerCase(),
  )?.value;
  const mountAttr = attributes?.find(
    (attr) => attr.key.toLowerCase() === MOUNT_CART_ATTRIBUTE.toLowerCase(),
  )?.value;

  if (frameAttr && !searchParams.has(FRAME_CART_ATTRIBUTE)) {
    searchParams.set(FRAME_CART_ATTRIBUTE, frameAttr);
  }
  if (mountAttr && !searchParams.has(MOUNT_CART_ATTRIBUTE)) {
    searchParams.set(MOUNT_CART_ATTRIBUTE, mountAttr);
  }

  const base = printHandle
    ? `${localePrefix}${printPath(printHandle)}`
    : `${localePrefix}${productPath(productHandle)}`;
  const searchString = searchParams.toString();

  return searchString ? `${base}?${searchString}` : base;
}

/**
 * @param {string | undefined | null} printHandle
 * @returns {Array<{key: string; value: string}> | undefined}
 */
export function getPrintHandleLineAttributes(printHandle) {
  if (!printHandle) return undefined;

  return [{key: PRINT_HANDLE_CART_ATTRIBUTE, value: printHandle}];
}
