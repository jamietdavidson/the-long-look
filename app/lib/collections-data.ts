import {newArrivals, bestSellers} from '~/lib/mock-data';
import {getAllMockProducts, mockProductsToCards} from '~/lib/spoils-data';

export type MockCollection = {
  id: string;
  handle: string;
  title: string;
  description?: string;
  products: {
    nodes: ReturnType<typeof mockProductsToCards>;
    pageInfo: {
      hasPreviousPage: boolean;
      hasNextPage: boolean;
      startCursor: string | null;
      endCursor: string | null;
    };
  };
};

const allProducts = getAllMockProducts();

/** @param {import('~/lib/types').Product[]} products */
function toConnection(products: import('~/lib/types').Product[]): MockCollection['products'] {
  return {
    nodes: mockProductsToCards(products),
    pageInfo: {
      hasPreviousPage: false,
      hasNextPage: false,
      startCursor: null,
      endCursor: null,
    },
  };
}

const MOCK_COLLECTIONS: Array<{
  handle: string;
  title: string;
  description?: string;
  products: import('~/lib/types').Product[];
}> = [
  {handle: 'new-arrivals', title: 'New Arrivals', products: newArrivals},
  {handle: 'best-sellers', title: 'Best Sellers', products: bestSellers},
  {handle: 'beach', title: 'Beach', products: allProducts.slice(0, 8)},
  {handle: 'surf', title: 'Surf', products: allProducts.slice(2, 10)},
  {handle: 'pool', title: 'Pool', products: allProducts.slice(0, 6)},
  {handle: 'travel', title: 'Travel', products: allProducts.slice(4, 12)},
  {handle: 'vintage', title: 'Vintage', products: allProducts.slice(6, 14)},
  {handle: 'aerial', title: 'Aerial', products: allProducts.slice(8, 16)},
  {
    handle: 'black-and-white',
    title: 'Black & White',
    products: allProducts.slice(0, 8),
  },
  {handle: 'automotive', title: 'Automotive', products: bestSellers},
];

/** @param {string} handle */
export function getMockCollectionByHandle(handle: string): MockCollection | undefined {
  const match = MOCK_COLLECTIONS.find((c) => c.handle === handle);
  if (!match) return undefined;

  return {
    id: `mock-collection-${match.handle}`,
    handle: match.handle,
    title: match.title,
    description: match.description,
    products: toConnection(match.products),
  };
}

/** Navigation list for sidebar/footer (The Long Look demo catalog). */
export function getMockCollectionNavItems() {
  return MOCK_COLLECTIONS.map(({handle, title, products}) => ({
    handle,
    title,
    count: products.length,
  }));
}

export function getAllMockCatalogProducts() {
  return mockProductsToCards(allProducts);
}
