import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 800 } });

test.describe("Header Navigation", () => {
  test("clicking New Arrivals loads the New Arrivals collection page", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("header nav").getByText("New Arrivals").click();
    await expect(page).toHaveURL("/collections/new-arrivals");
    await expect(page.locator("main h1")).toContainText("New Arrivals");
    await expect(page.locator("main")).toContainText("8 products");
  });

  test("clicking Best Sellers loads the Best Sellers collection page", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("header nav").getByText("Best Sellers").click();
    await expect(page).toHaveURL("/collections/best-sellers");
    await expect(page.locator("main h1")).toContainText("Best Sellers");
    await expect(page.locator("main")).toContainText("8 products");
  });

  test("clicking Artists loads the Artists collection page", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("header nav").getByText("Artists").click();
    await expect(page).toHaveURL("/collections/artists");
    await expect(page.locator("main h1")).toContainText("Artists");
  });

  test("clicking About loads the About page", async ({ page }) => {
    await page.goto("/");
    await page.locator("header nav").getByText("About").click();
    await expect(page).toHaveURL("/about");
    await expect(page.locator("main h1")).toContainText("Spoils World");
  });

  test("clicking the logo navigates to home from another page", async ({
    page,
  }) => {
    await page.goto("/about");
    await page.locator("header").getByText("House of Spoils").first().click();
    await expect(page).toHaveURL("/");
  });

  test("clicking cart button opens the cart drawer", async ({ page }) => {
    await page.goto("/");
    await page.locator('[aria-label="Open cart"]').click();
    await expect(page.getByText("Your cart is empty")).toBeVisible();
  });
});

test.describe("Sidebar Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.locator('[aria-label="Open navigation"]').click();
    await expect(
      page.locator('[data-slot="sheet-content"]')
    ).toBeVisible();
  });

  test("opening sidebar shows Collections expanded with all categories", async ({
    page,
  }) => {
    const sheet = page.locator('[data-slot="sheet-content"]');
    await expect(sheet.getByText("Shop All")).toBeVisible();
    await expect(sheet.getByText("New Arrivals")).toBeVisible();
    await expect(sheet.getByText("Best Sellers")).toBeVisible();
    await expect(sheet.getByText("Beach")).toBeVisible();
    await expect(sheet.getByText("Pool")).toBeVisible();
    await expect(sheet.getByText("Travel")).toBeVisible();
    await expect(sheet.getByText("Vintage")).toBeVisible();
    await expect(sheet.getByText("Aerial")).toBeVisible();
    await expect(sheet.getByText("Black & White")).toBeVisible();
    await expect(sheet.getByText("Automotive")).toBeVisible();
  });

  test("clicking Shop All navigates to all collections and loads products", async ({
    page,
  }) => {
    const sheet = page.locator('[data-slot="sheet-content"]');
    await sheet.getByText("Shop All").click();
    await expect(page).toHaveURL("/collections/all");
    await expect(page.locator("main h1")).toContainText("All Prints");
    await expect(page.locator("main")).toContainText("16 products");
  });

  test("clicking New Arrivals in sidebar loads the collection with products", async ({
    page,
  }) => {
    const sheet = page.locator('[data-slot="sheet-content"]');
    await sheet.getByText("New Arrivals").click();
    await expect(page).toHaveURL("/collections/new-arrivals");
    await expect(page.locator("main h1")).toContainText("New Arrivals");
    await expect(page.locator("main")).toContainText("8 products");
  });

  test("clicking Best Sellers in sidebar loads the collection with products", async ({
    page,
  }) => {
    const sheet = page.locator('[data-slot="sheet-content"]');
    await sheet.getByText("Best Sellers").click();
    await expect(page).toHaveURL("/collections/best-sellers");
    await expect(page.locator("main h1")).toContainText("Best Sellers");
    await expect(page.locator("main")).toContainText("8 products");
  });

  test("clicking Beach in sidebar navigates to Beach collection", async ({
    page,
  }) => {
    const sheet = page.locator('[data-slot="sheet-content"]');
    await sheet.getByText("Beach").click();
    await expect(page).toHaveURL("/collections/beach");
    await expect(page.locator("main h1")).toBeVisible();
  });

  test("clicking Surf in sidebar navigates to Surf collection", async ({
    page,
  }) => {
    const sheet = page.locator('[data-slot="sheet-content"]');
    await sheet.getByText("Surf", { exact: true }).click();
    await expect(page).toHaveURL("/collections/surf");
  });

  test("clicking Pool in sidebar navigates to Pool collection", async ({
    page,
  }) => {
    const sheet = page.locator('[data-slot="sheet-content"]');
    await sheet.getByText("Pool").click();
    await expect(page).toHaveURL("/collections/pool");
  });

  test("clicking Travel in sidebar navigates to Travel collection", async ({
    page,
  }) => {
    const sheet = page.locator('[data-slot="sheet-content"]');
    await sheet.getByText("Travel").click();
    await expect(page).toHaveURL("/collections/travel");
  });

  test("clicking Vintage in sidebar navigates to Vintage collection", async ({
    page,
  }) => {
    const sheet = page.locator('[data-slot="sheet-content"]');
    await sheet.getByText("Vintage").click();
    await expect(page).toHaveURL("/collections/vintage");
  });

  test("clicking Aerial in sidebar navigates to Aerial collection", async ({
    page,
  }) => {
    const sheet = page.locator('[data-slot="sheet-content"]');
    await sheet.getByText("Aerial").click();
    await expect(page).toHaveURL("/collections/aerial");
  });

  test("clicking Automotive in sidebar navigates to Automotive collection", async ({
    page,
  }) => {
    const sheet = page.locator('[data-slot="sheet-content"]');
    await sheet.getByText("Automotive").click();
    await expect(page).toHaveURL("/collections/automotive");
  });

  test("clicking Black & White in sidebar navigates to that collection", async ({
    page,
  }) => {
    const sheet = page.locator('[data-slot="sheet-content"]');
    await sheet.getByText("Black & White").click();
    await expect(page).toHaveURL("/collections/black-and-white");
  });

  test("expanding Artists and clicking Brecht Van't Hof loads their unique profile", async ({
    page,
  }) => {
    const sheet = page.locator('[data-slot="sheet-content"]');
    await sheet.locator("button", { hasText: "Artists" }).click();
    await expect(sheet.getByText("Brecht Van't Hof")).toBeVisible();
    await sheet.getByText("Brecht Van't Hof").click();
    await expect(page).toHaveURL("/collections/brecht-vant-hof");
    await expect(page.locator("main h1")).toContainText("Brecht Van't Hof");
    await expect(page.locator("main")).toContainText("b. United States, 1992");
    await expect(page.locator("main")).toContainText("LA-based lifestyle");
    await expect(page.locator("main")).toContainText("4 works available");
  });

  test("expanding Artists and clicking Davide de Martis loads their unique profile", async ({
    page,
  }) => {
    const sheet = page.locator('[data-slot="sheet-content"]');
    await sheet.locator("button", { hasText: "Artists" }).click();
    await sheet.getByText("Davide de Martis").click();
    await expect(page).toHaveURL("/collections/davide-de-martis");
    await expect(page.locator("main h1")).toContainText("Davide de Martis");
    await expect(page.locator("main")).toContainText("b. Italy, 1988");
    await expect(page.locator("main")).toContainText("Italian photographer");
    await expect(page.locator("main")).toContainText("3 works available");
  });

  test("expanding Artists and clicking Alex Lau loads their unique profile", async ({
    page,
  }) => {
    const sheet = page.locator('[data-slot="sheet-content"]');
    await sheet.locator("button", { hasText: "Artists" }).click();
    await sheet.getByText("Alex Lau").click();
    await expect(page).toHaveURL("/collections/alex-lau");
    await expect(page.locator("main h1")).toContainText("Alex Lau");
    await expect(page.locator("main")).toContainText("b. Australia, 1995");
    await expect(page.locator("main")).toContainText("Sydney-based aerial");
    await expect(page.locator("main")).toContainText("2 works available");
  });

  test("expanding Artists and clicking Tommy Murch loads their unique profile", async ({
    page,
  }) => {
    const sheet = page.locator('[data-slot="sheet-content"]');
    await sheet.locator("button", { hasText: "Artists" }).click();
    await sheet.getByText("Tommy Murch").click();
    await expect(page).toHaveURL("/collections/tommy-murch");
    await expect(page.locator("main h1")).toContainText("Tommy Murch");
    await expect(page.locator("main")).toContainText("b. United States, 1990");
    await expect(page.locator("main")).toContainText("California-born");
    await expect(page.locator("main")).toContainText("3 works available");
  });

  test("expanding Artists and clicking View All Artists loads the artists index", async ({
    page,
  }) => {
    const sheet = page.locator('[data-slot="sheet-content"]');
    await sheet.locator("button", { hasText: "Artists" }).click();
    await sheet.getByText("View All Artists →").click();
    await expect(page).toHaveURL("/collections/artists");
    await expect(page.locator("main h1")).toContainText("Artists");
    await expect(page.locator("main")).toContainText("Brecht Van't Hof");
    await expect(page.locator("main")).toContainText("Davide de Martis");
    await expect(page.locator("main")).toContainText("Alex Lau");
    await expect(page.locator("main")).toContainText("Tommy Murch");
  });

  test("Info section expands when clicked to reveal info links", async ({
    page,
  }) => {
    const sheet = page.locator('[data-slot="sheet-content"]');
    await sheet.locator("button", { hasText: "Info" }).click();
    await expect(sheet.getByText("About Us")).toBeVisible();
    await expect(sheet.getByText("Shipping & Returns")).toBeVisible();
    await expect(sheet.getByText("FAQ")).toBeVisible();
    await expect(sheet.getByText("Contact")).toBeVisible();
    await expect(sheet.getByText("Privacy Policy")).toBeVisible();
    await expect(sheet.getByText("Terms of Service")).toBeVisible();
  });

  test("clicking About Us in sidebar Info section loads the About page", async ({
    page,
  }) => {
    const sheet = page.locator('[data-slot="sheet-content"]');
    await sheet.locator("button", { hasText: "Info" }).click();
    await sheet.getByText("About Us").click();
    await expect(page).toHaveURL("/about");
    await expect(page.locator("main h1")).toContainText("Spoils World");
    await expect(page.locator("main")).toContainText(
      "House of Spoils curates stunning photography"
    );
  });

  test("clicking Shipping & Returns in sidebar Info section loads the Shipping page", async ({
    page,
  }) => {
    const sheet = page.locator('[data-slot="sheet-content"]');
    await sheet.locator("button", { hasText: "Info" }).click();
    await sheet.getByText("Shipping & Returns").click();
    await expect(page).toHaveURL("/shipping");
    await expect(page.locator("main h1")).toContainText("Shipping & Returns");
    await expect(page.locator("main")).toContainText(
      "5–7 business days"
    );
  });

  test("clicking FAQ in sidebar Info section loads the FAQ page", async ({
    page,
  }) => {
    const sheet = page.locator('[data-slot="sheet-content"]');
    await sheet.locator("button", { hasText: "Info" }).click();
    await sheet.getByText("FAQ").click();
    await expect(page).toHaveURL("/faq");
    await expect(page.locator("main h1")).toContainText(
      "Frequently Asked Questions"
    );
    await expect(page.locator("main")).toContainText(
      "How long does shipping take?"
    );
  });

  test("clicking Contact in sidebar Info section loads the Contact page", async ({
    page,
  }) => {
    const sheet = page.locator('[data-slot="sheet-content"]');
    await sheet.locator("button", { hasText: "Info" }).click();
    await sheet.getByText("Contact").click();
    await expect(page).toHaveURL("/contact");
    await expect(page.locator("main h1")).toContainText("Contact");
    await expect(page.locator('main input[type="email"]')).toBeVisible();
  });

  test("multiple sections can be expanded simultaneously", async ({
    page,
  }) => {
    const sheet = page.locator('[data-slot="sheet-content"]');
    await expect(sheet.getByText("Shop All")).toBeVisible();
    await sheet.locator("button", { hasText: "Artists" }).click();
    await expect(sheet.getByText("Brecht Van't Hof")).toBeVisible();
    await expect(sheet.getByText("Shop All")).toBeVisible();
    await sheet.locator("button", { hasText: "Info" }).click();
    await expect(sheet.getByText("About Us")).toBeVisible();
    await expect(sheet.getByText("Shop All")).toBeVisible();
    await expect(sheet.getByText("Brecht Van't Hof")).toBeVisible();
  });

  test("sidebar closes after clicking a navigation link", async ({
    page,
  }) => {
    const sheet = page.locator('[data-slot="sheet-content"]');
    await sheet.locator("button", { hasText: "Info" }).click();
    await sheet.getByText("About Us").click();
    await expect(page).toHaveURL("/about");
    await expect(sheet).not.toBeVisible();
  });
});

test.describe("Footer Navigation", () => {
  test("clicking All Prints in footer loads the collection page", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("footer").getByText("All Prints").click();
    await expect(page).toHaveURL("/collections/all");
    await expect(page.locator("main h1")).toContainText("All Prints");
    await expect(page.locator("main")).toContainText("16 products");
  });

  test("clicking New Arrivals in footer loads the collection page", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("footer").getByText("New Arrivals").click();
    await expect(page).toHaveURL("/collections/new-arrivals");
    await expect(page.locator("main h1")).toContainText("New Arrivals");
  });

  test("clicking Best Sellers in footer loads the collection page", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("footer").getByText("Best Sellers").click();
    await expect(page).toHaveURL("/collections/best-sellers");
    await expect(page.locator("main h1")).toContainText("Best Sellers");
  });

  test("clicking Artists in footer loads the artists page", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("footer").getByText("Artists", { exact: true }).click();
    await expect(page).toHaveURL("/collections/artists");
    await expect(page.locator("main h1")).toContainText("Artists");
  });

  test("clicking About Us in footer loads About page with content", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("footer").getByText("About Us").click();
    await expect(page).toHaveURL("/about");
    await expect(page.locator("main h1")).toContainText("Spoils World");
    await expect(page.locator("main")).toContainText("Our Mission");
  });

  test("clicking Shipping & Returns in footer loads Shipping page", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("footer").getByText("Shipping & Returns").click();
    await expect(page).toHaveURL("/shipping");
    await expect(page.locator("main h1")).toContainText("Shipping & Returns");
    await expect(page.locator("main")).toContainText("Returns & Exchanges");
  });

  test("clicking FAQ in footer loads FAQ page with questions", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("footer").getByText("FAQ").click();
    await expect(page).toHaveURL("/faq");
    await expect(page.locator("main h1")).toContainText(
      "Frequently Asked Questions"
    );
    await expect(
      page.locator("main").getByText("What sizes are available?")
    ).toBeVisible();
  });

  test("clicking Contact in footer loads Contact page with form", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("footer").getByText("Contact").click();
    await expect(page).toHaveURL("/contact");
    await expect(page.locator("main h1")).toContainText("Contact");
    await expect(page.locator("main form")).toBeVisible();
  });

  test("clicking Privacy Policy in footer loads Privacy page", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("footer").getByText("Privacy Policy").click();
    await expect(page).toHaveURL("/privacy");
    await expect(page.locator("main h1")).toContainText("Privacy Policy");
    await expect(page.locator("main")).toContainText(
      "Information We Collect"
    );
  });

  test("clicking Terms of Service in footer loads Terms page", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator("footer").getByText("Terms of Service").click();
    await expect(page).toHaveURL("/terms");
    await expect(page.locator("main h1")).toContainText("Terms of Service");
    await expect(page.locator("main")).toContainText("Intellectual Property");
  });
});
