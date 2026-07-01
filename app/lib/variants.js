import {useLocation} from 'react-router';
import {useMemo} from 'react';
import {getLineItemUrl} from '~/lib/cart';

/**
 * @param {string} handle
 * @param {SelectedOption[]} [selectedOptions]
 * @param {string} [printHandle]
 */
export function useVariantUrl(handle, selectedOptions, printHandle) {
  const {pathname} = useLocation();

  return useMemo(() => {
    const match = /(\/[a-zA-Z]{2}-[a-zA-Z]{2}\/)/g.exec(pathname);
    const localePrefix = match?.[0] ?? '';

    return getLineItemUrl({
      productHandle: handle,
      selectedOptions,
      printHandle,
      localePrefix,
    });
  }, [handle, selectedOptions, printHandle, pathname]);
}

/** @typedef {import('@shopify/hydrogen/storefront-api-types').SelectedOption} SelectedOption */
