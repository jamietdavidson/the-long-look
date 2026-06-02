import {test, expect} from '@playwright/test';
import {MOCK_CATALOG, cartDrawer, mobileNav, pageMain} from './helpers';

test.use({viewport: {width: 1280, height: 800}});

test.describe('Header Navigation', () => {
  test('clicking New Arrivals loads the New Arrivals collection page', async ({
    page,
  }) => {
    await page.goto('/');
    await page.locator('header nav').getByText('New Arrivals').click();
    await expect(page).toHaveURL(MOCK_CATALOG.collections.newArrivals.path);
    await expect(pageMain(page).locator('h1')).toContainText(
      MOCK_CATALOG.collections.newArrivals.title,
    );
    await expect(pageMain(page).locator('a[href^="/products/"]').first()).toBeVisible();
  });

  test('clicking Best Sellers loads the Best Sellers collection page', async ({
    page,
  }) => {
    await page.goto('/');
    await page.locator('header nav').getByText('Best Sellers').click();
    await expect(page).toHaveURL(MOCK_CATALOG.collections.bestSellers.path);
    await expect(pageMain(page).locator('h1')).toContainText(
      MOCK_CATALOG.collections.bestSellers.title,
    );
  });

  test('clicking Artists loads the Artists index', async ({page}) => {
    await page.goto('/');
    await page.locator('header nav').getByText('Artists').click();
    await expect(page).toHaveURL('/collections/artists');
    await expect(pageMain(page).locator('h1')).toContainText('Artists');
  });

  test('clicking About loads the About page', async ({page}) => {
    await page.goto('/');
    await page.locator('header nav').getByText('About').click();
    await expect(page).toHaveURL('/about');
    await expect(pageMain(page).locator('h1')).toContainText('The Long Look');
  });

  test('clicking the logo navigates to home from another page', async ({page}) => {
    await page.goto('/about');
    await page.locator('header').getByText('The Long Look').first().click();
    await expect(page).toHaveURL('/');
  });

  test('clicking cart button opens the cart drawer', async ({page}) => {
    await page.goto('/');
    await page.locator('[aria-label="Open cart"]').click();
    await expect(cartDrawer(page)).toBeVisible();
    await expect(cartDrawer(page)).toContainText(/added anything yet/);
  });
});

test.describe('Sidebar Navigation', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/');
    await page.locator('[aria-label="Open navigation"]').click();
    await expect(mobileNav(page)).toBeVisible();
  });

  test('opening sidebar shows Collections with catalog categories', async ({page}) => {
    const sheet = mobileNav(page);
    await expect(sheet.getByText('Shop All')).toBeVisible();
    await expect(sheet.getByText('New Arrivals')).toBeVisible();
    await expect(sheet.getByText('Best Sellers')).toBeVisible();
    await expect(sheet.getByText('Beach')).toBeVisible();
    await expect(sheet.getByText('Surf')).toBeVisible();
  });

  test('clicking Shop All navigates to all products', async ({page}) => {
    const sheet = mobileNav(page);
    await sheet.getByText('Shop All').click();
    await expect(page).toHaveURL(MOCK_CATALOG.collections.all);
    await expect(pageMain(page).locator('h1')).toContainText('All Prints');
    await expect(pageMain(page).locator('a[href^="/products/"]').first()).toBeVisible();
  });

  test('clicking New Arrivals in sidebar loads the collection', async ({page}) => {
    const sheet = mobileNav(page);
    await sheet.getByText('New Arrivals').click();
    await expect(page).toHaveURL(MOCK_CATALOG.collections.newArrivals.path);
    await expect(pageMain(page).locator('h1')).toContainText(
      MOCK_CATALOG.collections.newArrivals.title,
    );
  });

  test('clicking Beach in sidebar navigates to Beach collection', async ({page}) => {
    const sheet = mobileNav(page);
    await sheet.getByText('Beach').click();
    await expect(page).toHaveURL(MOCK_CATALOG.collections.beach.path);
    await expect(pageMain(page).locator('h1')).toContainText(
      MOCK_CATALOG.collections.beach.title,
    );
  });

  test('expanding Artists and clicking Brecht Van\'t Hof loads their profile', async ({
    page,
  }) => {
    const sheet = mobileNav(page);
    await sheet.locator('button', {hasText: 'Artists'}).click();
    await sheet.getByText("Brecht Van't Hof").click();
    await expect(page).toHaveURL('/collections/brecht-vant-hof');
    await expect(pageMain(page).locator('h1')).toContainText("Brecht Van't Hof");
  });

  test('clicking About Us in sidebar Info section loads the About page', async ({
    page,
  }) => {
    const sheet = mobileNav(page);
    await sheet.locator('button', {hasText: 'Info'}).click();
    await sheet.getByText('About Us').click();
    await expect(page).toHaveURL('/about');
    await expect(pageMain(page).locator('h1')).toContainText('The Long Look');
  });

  test('sidebar closes after clicking a navigation link', async ({page}) => {
    const sheet = mobileNav(page);
    await sheet.locator('button', {hasText: 'Info'}).click();
    await sheet.getByText('About Us').click();
    await expect(page).toHaveURL('/about');
    await expect(sheet).not.toBeVisible();
  });
});

test.describe('Footer Navigation', () => {
  test('clicking All Prints in footer loads the catalog page', async ({page}) => {
    await page.goto('/');
    await page.locator('footer').getByText('All Prints').click();
    await expect(page).toHaveURL(MOCK_CATALOG.collections.all);
    await expect(pageMain(page).locator('h1')).toContainText('All Prints');
  });

  test('clicking New Arrivals in footer loads the collection page', async ({page}) => {
    await page.goto('/');
    await page.locator('footer').getByText('New Arrivals').click();
    await expect(page).toHaveURL(MOCK_CATALOG.collections.newArrivals.path);
    await expect(pageMain(page).locator('h1')).toContainText(
      MOCK_CATALOG.collections.newArrivals.title,
    );
  });

  test('clicking About Us in footer loads About page with content', async ({page}) => {
    await page.goto('/');
    await page.locator('footer').getByText('About Us').click();
    await expect(page).toHaveURL('/about');
    await expect(pageMain(page)).toContainText('Our Mission');
  });
});
