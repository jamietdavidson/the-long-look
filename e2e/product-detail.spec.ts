import {test, expect} from '@playwright/test';
import {ROUTES, pageMain} from './helpers';

test.use({viewport: {width: 1280, height: 800}});

test.describe('Print and product pages', () => {
  test('shows 404 for an invalid print handle', async ({page}) => {
    await page.goto('/prints/this-does-not-exist');
    await expect(page.locator('h2')).toContainText('404');
  });

  test('shows 404 for an invalid product handle', async ({page}) => {
    await page.goto('/products/this-does-not-exist');
    await expect(page.locator('h2')).toContainText('404');
  });

  test('prints index renders empty state or catalog grid', async ({page}) => {
    await page.goto(ROUTES.prints);
    await expect(pageMain(page).locator('h1')).toContainText('Prints');
  });

  test('artists index renders empty state or artist grid', async ({page}) => {
    await page.goto(ROUTES.artists);
    await expect(pageMain(page).locator('h1')).toContainText('Artists');
  });
});
