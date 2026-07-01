import {printPath, productPath} from '~/lib/paths';

export const PRINT_HANDLE_CART_ATTRIBUTE = '_print_handle';

/**
 * @param {Array<{key: string; value?: string | null}> | null | undefined} attributes
 */
export function getPrintHandleFromCartAttributes(attributes) {
  return attributes?.find((attr) => attr.key === PRINT_HANDLE_CART_ATTRIBUTE)
    ?.value;
}

/**
 * @param {{
 *   productHandle: string;
 *   selectedOptions?: import('@shopify/hydrogen/storefront-api-types').SelectedOption[];
 *   printHandle?: string | null;
 *   localePrefix?: string;
 * }} args
 */
export function getLineItemUrl({
  productHandle,
  selectedOptions,
  printHandle,
  localePrefix = '',
}) {
  const searchParams = new URLSearchParams();
  selectedOptions?.forEach((option) => {
    searchParams.set(option.name, option.value);
  });

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
