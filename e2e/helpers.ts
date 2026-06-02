import type {Page} from '@playwright/test';

/** Primary page content (excludes cart/search aside panels). */
export function pageMain(page: Page) {
  return page.locator('main.flex-1');
}

/** The Long Look demo catalog (local mock data — works with any storefront). */
export const MOCK_CATALOG = {
  collections: {
    all: '/collections/all',
    newArrivals: {path: '/collections/new-arrivals', title: 'New Arrivals'},
    bestSellers: {path: '/collections/best-sellers', title: 'Best Sellers'},
    beach: {path: '/collections/beach', title: 'Beach'},
    surf: {path: '/collections/surf', title: 'Surf'},
  },
  products: {
    sipOfSummer: {path: '/products/sip-of-summer', title: 'Sip of Summer'},
    fleetwood: {path: '/products/fleetwood', title: 'Fleetwood'},
    whitewash: {path: '/products/whitewash', title: 'Whitewash'},
  },
} as const;

/** mock.shop storefront handles (only when running `npm run dev:e2e`). */
export const MOCK_SHOP = {
  collections: {
    featured: {path: '/collections/featured', title: 'Featured'},
    men: {path: '/collections/men', title: 'Men'},
  },
  products: {
    menTShirt: {path: '/products/men-t-shirt', title: "Men's T-shirt"},
    menCrewneck: {path: '/products/men-crewneck', title: "Men's Crewneck"},
    hoodie: {path: '/products/hoodie-old', title: 'Hoodie'},
  },
} as const;

export function mobileNav(page: Page) {
  return page.locator('[data-slot="sheet-content"]');
}

export function cartDrawer(page: Page) {
  return page.locator('[data-type="cart"] aside');
}
