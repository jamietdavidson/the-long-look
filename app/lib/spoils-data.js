import {newArrivals, bestSellers} from '~/lib/mock-data';
import {artists, getArtistByHandle} from '~/lib/artists-data';

export {artists, getArtistByHandle};

/** @returns {import('~/lib/types').Product[]} */
export function getAllMockProducts() {
  return [...newArrivals, ...bestSellers, ...artists.flatMap((a) => a.works)];
}

/** @param {string} handle */
export function getMockProductByHandle(handle) {
  return getAllMockProducts().find((p) => p.handle === handle);
}

/** @param {import('~/lib/types').Product} product */
export function mockProductToCard(product) {
  const image = product.images?.edges?.[0]?.node;
  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    priceRange: product.priceRange,
    featuredImage: image
      ? {
          id: image.url,
          url: image.url,
          altText: image.altText,
          width: image.width,
          height: image.height,
        }
      : null,
  };
}

/** @param {import('~/lib/types').Product[]} products */
export function mockProductsToCards(products) {
  return products.map(mockProductToCard);
}
