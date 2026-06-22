import {test, expect} from '@playwright/test';
import {ROUTES, cartDrawer, mobileNav, pageMain} from './helpers';

test.use({viewport: {width: 1280, height: 800}});

test.describe('Header Navigation', () => {
  test('clicking Shop All loads the prints catalog page', async ({page}) => {
    await page.goto(ROUTES.home);
    await page.locator('header nav').getByText('Shop All').click();
    await expect(page).toHaveURL(ROUTES.prints);
    await expect(pageMain(page).locator('h1')).toContainText('All Prints');
  });

  test('clicking Artists loads the Artists index', async ({page}) => {
    await page.goto(ROUTES.home);
    await page.locator('header nav').getByText('Artists').click();
    await expect(page).toHaveURL(ROUTES.artists);
    await expect(pageMain(page).locator('h1')).toContainText('Artists');
  });

  test('clicking the logo navigates to home from another page', async ({page}) => {
    await page.goto(ROUTES.about);
    await page.locator('header').getByText('The Long Look').first().click();
    await expect(page).toHaveURL(ROUTES.home);
  });

  test('clicking cart button opens the cart drawer', async ({page}) => {
    await page.goto(ROUTES.home);
    await page.locator('[aria-label="Open cart"]').click();
    await expect(cartDrawer(page)).toBeVisible();
    await expect(cartDrawer(page)).toContainText(/added anything yet/);
  });
});

test.describe('Sidebar Navigation', () => {
  test.beforeEach(async ({page}) => {
    await page.goto(ROUTES.home);
    await page.locator('[aria-label="Open navigation"]').click();
    await expect(mobileNav(page)).toBeVisible();
  });

  test('opening sidebar shows Shop All link', async ({page}) => {
    const sheet = mobileNav(page);
    await expect(sheet.getByText('Shop All')).toBeVisible();
    await expect(sheet.getByText('View All Artists')).toBeVisible();
  });

  test('clicking Shop All navigates to all prints', async ({page}) => {
    const sheet = mobileNav(page);
    await sheet.getByText('Shop All').click();
    await expect(page).toHaveURL(ROUTES.prints);
    await expect(pageMain(page).locator('h1')).toContainText('All Prints');
  });

  test('sidebar closes after clicking a navigation link', async ({page}) => {
    const sheet = mobileNav(page);
    await sheet.getByText('Shop All').click();
    await expect(page).toHaveURL(ROUTES.prints);
    await expect(sheet).not.toBeVisible();
  });
});

test.describe('Footer Navigation', () => {
  test('clicking All Prints in footer loads the catalog page', async ({page}) => {
    await page.goto(ROUTES.home);
    await page.locator('footer').getByText('All Prints').click();
    await expect(page).toHaveURL(ROUTES.prints);
    await expect(pageMain(page).locator('h1')).toContainText('All Prints');
  });

  test('clicking Artists in footer loads the artists index', async ({page}) => {
    await page.goto(ROUTES.home);
    await page.locator('footer').getByText('Artists').click();
    await expect(page).toHaveURL(ROUTES.artists);
    await expect(pageMain(page).locator('h1')).toContainText('Artists');
  });

  test('clicking About Us in footer loads About page with content', async ({page}) => {
    await page.goto(ROUTES.home);
    await page.locator('footer').getByText('About Us').click();
    await expect(page).toHaveURL(ROUTES.about);
    await expect(pageMain(page)).toContainText('Our Mission');
  });
});

test.describe('Legacy URL redirects', () => {
  test('/collections/all redirects to /prints', async ({page}) => {
    await page.goto('/collections/all');
    await expect(page).toHaveURL(ROUTES.prints);
  });

  test('/collections/artists redirects to /artists', async ({page}) => {
    await page.goto('/collections/artists');
    await expect(page).toHaveURL(ROUTES.artists);
  });
});
