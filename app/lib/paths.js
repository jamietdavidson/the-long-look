/**
 * Canonical storefront URL helpers.
 *
 * /prints      — picture catalog & detail pages
 * /artists     — artist index & profiles
 * /collections — curated content collections (+ Shopify collections)
 * /products    — Shopify products (checkout)
 */

/** @param {string} handle */
export function printPath(handle) {
  return `/prints/${handle}`;
}

export function printsPath() {
  return '/prints';
}

/** @param {string} handle */
export function artistPath(handle) {
  return `/artists/${handle}`;
}

export function artistsPath() {
  return '/artists';
}

/** @param {string} handle */
export function collectionPath(handle) {
  return `/collections/${handle}`;
}

export function collectionsPath() {
  return '/collections';
}

/** @param {string} handle */
export function productPath(handle) {
  return `/products/${handle}`;
}
