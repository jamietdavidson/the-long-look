import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 800 } });

test.describe("Product Detail Page - Navigation from Home", () => {
  test("clicking a product card on homepage navigates to its detail page", async ({
    page,
  }) => {
    await page.goto("/");
    const firstProduct = page
      .locator("main")
      .getByRole("link", { name: /Sip of Summer/i })
      .first();
    await firstProduct.click();
    await expect(page).toHaveURL("/products/sip-of-summer");
    await expect(page.locator("main h1")).toContainText("Sip of Summer");
  });

  test("clicking a Best Sellers product navigates to its detail page", async ({
    page,
  }) => {
    await page.goto("/");
    const product = page
      .locator("main")
      .getByRole("link", { name: /Fleetwood/i })
      .first();
    await product.click();
    await expect(page).toHaveURL("/products/fleetwood");
    await expect(page.locator("main h1")).toContainText("Fleetwood");
  });
});

test.describe("Product Detail Page - Navigation from Collection", () => {
  test("clicking a product from New Arrivals collection loads detail page", async ({
    page,
  }) => {
    await page.goto("/collections/new-arrivals");
    const product = page
      .locator("main")
      .getByRole("link", { name: /Dreams Are Essentially Silent/i });
    await product.click();
    await expect(page).toHaveURL("/products/dreams-are-essentially-silent");
    await expect(page.locator("main h1")).toContainText(
      "Dreams Are Essentially Silent"
    );
  });

  test("clicking a product from Best Sellers collection loads detail page", async ({
    page,
  }) => {
    await page.goto("/collections/best-sellers");
    const product = page
      .locator("main")
      .getByRole("link", { name: /Horsepower/i });
    await product.click();
    await expect(page).toHaveURL("/products/horsepower");
    await expect(page.locator("main h1")).toContainText("Horsepower");
  });
});

test.describe("Product Detail Page - Navigation from Artist Page", () => {
  test("clicking a product from Brecht Van't Hof's page loads detail page", async ({
    page,
  }) => {
    await page.goto("/collections/brecht-vant-hof");
    const product = page
      .locator("main")
      .getByRole("link", { name: /Whitewash/i });
    await product.click();
    await expect(page).toHaveURL("/products/whitewash");
    await expect(page.locator("main h1")).toContainText("Whitewash");
  });

  test("clicking a product from Davide de Martis' page loads detail page", async ({
    page,
  }) => {
    await page.goto("/collections/davide-de-martis");
    const product = page
      .locator("main")
      .getByRole("link", { name: /Fontelina/i });
    await product.click();
    await expect(page).toHaveURL("/products/fontelina");
    await expect(page.locator("main h1")).toContainText("Fontelina");
  });

  test("clicking a product from Alex Lau's page loads detail page", async ({
    page,
  }) => {
    await page.goto("/collections/alex-lau");
    const product = page
      .locator("main")
      .getByRole("link", { name: /Bondi Aerial/i });
    await product.click();
    await expect(page).toHaveURL("/products/bondi-aerial");
    await expect(page.locator("main h1")).toContainText("Bondi Aerial");
  });

  test("clicking a product from Tommy Murch's page loads detail page", async ({
    page,
  }) => {
    await page.goto("/collections/tommy-murch");
    const product = page
      .locator("main")
      .getByRole("link", { name: /PCH Cruiser/i });
    await product.click();
    await expect(page).toHaveURL("/products/pch-cruiser");
    await expect(page.locator("main h1")).toContainText("PCH Cruiser");
  });
});

test.describe("Product Detail Page - Content", () => {
  test("displays product title and price", async ({ page }) => {
    await page.goto("/products/sip-of-summer");
    await expect(page.locator("main h1")).toContainText("Sip of Summer");
    await expect(page.locator("main")).toContainText("$295");
  });

  test("displays product description", async ({ page }) => {
    await page.goto("/products/sip-of-summer");
    await expect(page.locator("main")).toContainText(
      "A vibrant capture of summer poolside leisure"
    );
  });

  test("displays product image", async ({ page }) => {
    await page.goto("/products/sip-of-summer");
    const img = page.locator("main img").first();
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute("alt", /Sip of Summer/i);
  });

  test("displays size options", async ({ page }) => {
    await page.goto("/products/sip-of-summer");
    await expect(page.locator("main")).toContainText("Size");
    await expect(page.locator("main").getByText("16x20")).toBeVisible();
    await expect(page.locator("main").getByText("20x30")).toBeVisible();
    await expect(page.locator("main").getByText("24x36")).toBeVisible();
    await expect(page.locator("main").getByText("30x40")).toBeVisible();
    await expect(page.locator("main").getByText("40x60")).toBeVisible();
  });

  test("displays frame options", async ({ page }) => {
    await page.goto("/products/sip-of-summer");
    await expect(page.locator("main")).toContainText("Frame");
    await expect(page.locator("main").getByText("No Frame")).toBeVisible();
    await expect(
      page.locator("main").getByText("White", { exact: true })
    ).toBeVisible();
    await expect(
      page.locator("main").getByText("Black", { exact: true })
    ).toBeVisible();
    await expect(page.locator("main").getByText("Natural Wood")).toBeVisible();
  });

  test("displays product details bullet points", async ({ page }) => {
    await page.goto("/products/sip-of-summer");
    await expect(page.locator("main")).toContainText(
      "Museum-quality fine art print"
    );
    await expect(page.locator("main")).toContainText(
      "Archival inks on premium paper"
    );
    await expect(page.locator("main")).toContainText(
      "Ready to hang with included hardware"
    );
    await expect(page.locator("main")).toContainText(
      "Free shipping on orders over $200"
    );
  });

  test("displays You May Also Like section with related products", async ({
    page,
  }) => {
    await page.goto("/products/sip-of-summer");
    await expect(page.locator("main")).toContainText("You May Also Like");
    const relatedLinks = page.locator(
      'main section:last-child a[href^="/products/"]'
    );
    await expect(relatedLinks).toHaveCount(4);
  });

  test("artist product page shows correct price", async ({ page }) => {
    await page.goto("/products/whitewash");
    await expect(page.locator("main h1")).toContainText("Whitewash");
    await expect(page.locator("main")).toContainText("$165");
  });

  test("shows Product not found for invalid handle", async ({ page }) => {
    await page.goto("/products/this-does-not-exist");
    await expect(page.locator("main h1")).toContainText("Product not found");
  });
});

test.describe("Product Detail Page - Quantity & Add to Cart", () => {
  test("quantity starts at 1", async ({ page }) => {
    await page.goto("/products/sip-of-summer");
    const qty = page.locator("main").getByText("1", { exact: true });
    await expect(qty).toBeVisible();
  });

  test("clicking + increases quantity", async ({ page }) => {
    await page.goto("/products/sip-of-summer");
    await page.locator('[aria-label="Increase quantity"]').click();
    await page.locator('[aria-label="Increase quantity"]').click();
    const qtyDisplay = page
      .locator("main")
      .locator("span.text-center", { hasText: "3" });
    await expect(qtyDisplay).toBeVisible();
  });

  test("clicking - decreases quantity but not below 1", async ({ page }) => {
    await page.goto("/products/sip-of-summer");
    await page.locator('[aria-label="Increase quantity"]').click();
    await page.locator('[aria-label="Decrease quantity"]').click();
    await page.locator('[aria-label="Decrease quantity"]').click();
    const qtyDisplay = page
      .locator("main")
      .locator("span.text-center", { hasText: "1" });
    await expect(qtyDisplay).toBeVisible();
  });

  test("clicking Add to Cart adds product to cart and opens drawer", async ({
    page,
  }) => {
    await page.goto("/products/sip-of-summer");
    await page.locator("main").getByText("Add to Cart").click();
    const cart = page.locator('[data-slot="sheet-content"]');
    await expect(cart).toBeVisible();
    await expect(cart.getByText("Sip of Summer")).toBeVisible();
    await expect(cart.getByText("Subtotal")).toBeVisible();
    await expect(cart.getByText("$295").first()).toBeVisible();
  });

  test("adding quantity 2 shows correct quantity in cart", async ({
    page,
  }) => {
    await page.goto("/products/fleetwood");
    await page.locator('[aria-label="Increase quantity"]').click();
    await page.locator("main").getByText("Add to Cart").click();
    await expect(
      page.locator('[data-slot="sheet-content"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-slot="sheet-content"]').getByText("Fleetwood")
    ).toBeVisible();
    const cartQty = page
      .locator('[data-slot="sheet-content"]')
      .locator("span.text-center", { hasText: "2" });
    await expect(cartQty).toBeVisible();
  });
});

test.describe("Product Detail Page - Related Products Navigation", () => {
  test("clicking a related product navigates to that product's detail page", async ({
    page,
  }) => {
    await page.goto("/products/sip-of-summer");
    const relatedSection = page.locator("main section").last();
    const firstRelated = relatedSection.locator('a[href^="/products/"]').first();
    const href = await firstRelated.getAttribute("href");
    await firstRelated.click();
    await expect(page).toHaveURL(href!);
    await expect(page.locator("main h1")).not.toContainText("Sip of Summer");
    await expect(page.locator("main h1")).not.toContainText("Product not found");
  });
});
