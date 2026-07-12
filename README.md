# The Long Look

A [Hydrogen](https://shopify.dev/docs/custom-storefronts/hydrogen) storefront for The Long Look, deployed on **Shopify Oxygen**.

## Stack

- **Hydrogen** — Shopify's React framework for headless commerce
- **Oxygen** — Shopify's global edge hosting for Hydrogen storefronts
- **React Router 7** — file-based routing
- **Tailwind CSS v4** — styling
- **shadcn/ui** (Radix Nova) — accessible UI primitives in `app/components/ui/`
- **Storefront API** — products, collections, cart, and checkout

## Local development

```bash
npm install
npm run dev
```

Runs at [http://localhost:3002](http://localhost:3002). Link your Shopify store with `shopify hydrogen link` and `shopify hydrogen env pull` before developing.

GraphQL types are generated into `app/types/*.generated.d.ts` (gitignored). `dev` and `build` run codegen automatically; after a fresh clone you can also run `npm run codegen`.

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
  components/           # Storefront UI (header, sidebar, footer, product grid)
  routes/              # Pages (home, collections, products, about, etc.)
  lib/                 # Content API, paths, helpers
  types/               # Generated GraphQL types (npm run codegen)
  graphql/             # Customer account queries
```

## Checkout

Cart and checkout use Shopify's native cart API. Click **Checkout** in the cart drawer to go to Shopify Checkout.

## UI components (shadcn)

shadcn/ui is configured via `components.json`. Add components with:

```bash
npx shadcn@latest add [component-name]
```

Imports use the `~/components/ui/*` alias, for example `~/components/ui/button`.

## Tests

```bash
npm test
```

Playwright tests live in `e2e/` — unit tests for framed-picture sizing (`--project=unit`) and browser flows (`--project=e2e`). `npm test` runs both; e2e tests start the dev server against your linked store.
