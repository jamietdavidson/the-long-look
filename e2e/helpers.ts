import type {Page} from '@playwright/test';

/** Primary page content (excludes cart/search aside panels). */
export function pageMain(page: Page) {
  return page.locator('main.flex-1');
}

export const ROUTES = {
  home: '/',
  prints: '/prints',
  artists: '/artists',
  about: '/about',
} as const;

export function mobileNav(page: Page) {
  return page.locator('[data-slot="sheet-content"]');
}

export function cartDrawer(page: Page) {
  return page.locator('[data-type="cart"] aside');
}
