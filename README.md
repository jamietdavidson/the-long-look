# House of Spoils

A [Hydrogen](https://shopify.dev/docs/custom-storefronts/hydrogen) storefront for House of Spoils, deployed on **Shopify Oxygen**.

## Stack

- **Hydrogen** — Shopify's React framework for headless commerce
- **Oxygen** — Shopify's global edge hosting for Hydrogen storefronts
- **React Router 7** — file-based routing
- **Tailwind CSS v4** — styling
- **Storefront API** — products, collections, cart, and checkout

## Local development

```bash
npm install
npm run dev
```

Runs at [http://localhost:3001](http://localhost:3001) using Shopify's mock store by default.

## Connect your Shopify store

1. Log in to Shopify CLI:
   ```bash
   npx shopify auth login
   ```

2. Link this project to your store:
   ```bash
   npx shopify hydrogen link
   ```

3. Pull environment variables:
   ```bash
   npx shopify hydrogen env pull
   ```

4. Restart the dev server.

## Deploy to Oxygen

```bash
npx shopify hydrogen deploy
```

This builds the storefront and deploys it to Shopify Oxygen. Your store will be accessible from your Shopify admin under **Sales channels → Headless**.

## Project structure

```
app/
  components/spoils/   # House of Spoils UI (header, sidebar, footer, product grid)
  routes/              # Pages (home, collections, products, about, etc.)
  lib/                 # Mock data, artist profiles, helpers
```

## Checkout

Cart and checkout use Shopify's native cart API. Click **Checkout** in the cart drawer to go to Shopify Checkout.

## Tests

```bash
npm run test:unit   # Jest component tests
npm run test:e2e    # Playwright navigation tests (requires dev server on :3001)
```
