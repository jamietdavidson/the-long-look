import {test, expect} from '@playwright/test';
import {MOCK_CATALOG, MOCK_SHOP, cartDrawer, pageMain} from './helpers';

test.use({viewport: {width: 1280, height: 800}});

test.describe('Product Detail Page - demo catalog', () => {
  test('clicking a product on homepage navigates to its detail page', async ({page}) => {
    await page.goto('/');
    const firstProduct = page.locator('main a[href^="/products/"]').first();
    const href = await firstProduct.getAttribute('href');
    const path = href?.split('?')[0] ?? '';
    await firstProduct.click();
    await expect(page).toHaveURL(new RegExp(`${path}(/|\\?|$)`));
    await expect(pageMain(page).locator('h1')).toBeVisible();
  });

  test('clicking a product from New Arrivals collection loads detail page', async ({
    page,
  }) => {
    await page.goto(MOCK_CATALOG.collections.newArrivals.path);
    await page
      .locator('main')
      .getByRole('link', {name: /Dreams Are Essentially Silent/i})
      .click();
    await expect(page).toHaveURL('/products/dreams-are-essentially-silent');
    await expect(pageMain(page).locator('h1')).toContainText(
      'Dreams Are Essentially Silent',
    );
  });

  test('clicking a product from an artist page loads the mock product detail', async ({
    page,
  }) => {
    await page.goto('/collections/brecht-vant-hof');
    await pageMain(page).getByRole('link', {name: /Whitewash/i}).click();
    await expect(page).toHaveURL(MOCK_CATALOG.products.whitewash.path);
    await expect(pageMain(page).locator('h1')).toContainText(
      MOCK_CATALOG.products.whitewash.title,
    );
    await expect(pageMain(page)).toContainText('Connect your Shopify store');
  });

  test('shows 404 for an invalid product handle', async ({page}) => {
    await page.goto('/products/this-does-not-exist');
    await expect(page.locator('h2')).toContainText('404');
  });
});

test.describe('Product Detail Page - mock.shop storefront', () => {
  test('clicking Add to cart opens the cart drawer with the product', async ({page}) => {
    await page.goto(MOCK_SHOP.products.menCrewneck.path);
    const addToCart = page.getByRole('button', {name: 'Add to cart'});
    test.skip(
      !(await addToCart.isVisible({timeout: 3000}).catch(() => false)),
      'Requires mock.shop products (npm run dev:e2e)',
    );
    await addToCart.click();
    const cart = cartDrawer(page);
    await expect(cart).toBeVisible();
    await expect(cart.getByText(MOCK_SHOP.products.menCrewneck.title)).toBeVisible();
  });
});
