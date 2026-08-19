import { expect, test, type Page } from "@playwright/test";

const SEED_PASSWORD = "Password123!";

/**
 * Waits for the redirect that follows a successful sign-in. Without it the next
 * navigation races the login request, arrives before the cookie is set, and is
 * bounced to /login.
 */
async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/quotes");
}

test("a customer signs in, requests a quote, and sees the offers", async ({
  page,
}) => {
  await signIn(page, "user@test.com");

  await page.getByRole("link", { name: "New quote" }).first().click();
  await page.waitForURL("/quotes/new");

  // The session supplies these, so they arrive already filled in.
  await expect(page.getByLabel("Full name")).toHaveValue("Ulrich User");
  await expect(page.getByLabel("Email")).toHaveValue("user@test.com");

  await page.getByLabel("Installation address").fill("7 Rue Neuve, Toulouse");
  await page.getByLabel("Monthly consumption (kWh)").fill("500");
  await page.getByLabel("System size (kW)").fill("5");
  await page.getByLabel("Down payment (EUR, optional)").fill("1000");
  await page.getByRole("button", { name: "Get pre-qualification" }).click();

  await page.waitForURL(/\/quotes\/.+/);

  // 5 kW at 1200 EUR each, less the 1000 EUR down payment.
  await expect(page.getByText("6.000,00 €").first()).toBeVisible();
  await expect(page.getByText("5.000,00 €").first()).toBeVisible();

  // 500 kWh with a 5 kW system qualifies for band A at 6.9%.
  await expect(page.getByText("Best available rate")).toBeVisible();

  // Scoped per card: "5 years ..." is a substring of "15 years ...", so an
  // unscoped text match is ambiguous and Playwright refuses it.
  const offers = page.getByRole("listitem");
  await expect(offers).toHaveCount(3);
  await expect(offers.nth(0)).toContainText("5 years");
  await expect(offers.nth(0)).toContainText("6.9% APR");
  await expect(offers.nth(2)).toContainText("15 years");

  // And the new quote appears in the customer's own listing.
  await page.getByRole("link", { name: "My quotes" }).click();
  await page.waitForURL("/quotes");
  await expect(
    page.getByRole("row").filter({ hasText: "5 kW" }),
  ).not.toHaveCount(0);
});

test("the API rejects a down payment above the system price", async ({
  page,
}) => {
  await signIn(page, "user@test.com");
  await page.goto("/quotes/new");

  await page.getByLabel("Installation address").fill("1 Test Street");
  await page.getByLabel("Monthly consumption (kWh)").fill("400");
  await page.getByLabel("System size (kW)").fill("5");
  await page.getByLabel("Down payment (EUR, optional)").fill("99999");
  await page.getByRole("button", { name: "Get pre-qualification" }).click();

  await expect(
    page.getByText("Down payment cannot exceed the system price"),
  ).toBeVisible();
  await expect(page).toHaveURL("/quotes/new");
});

test("a customer never sees another customer's quotes", async ({ page }) => {
  await signIn(page, "user@test.com");

  // Counting rows would couple this test to whatever the others created, so it
  // asserts the property that matters instead: nothing here belongs elsewhere.
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByText("admin@test.com")).toHaveCount(0);
});

test("the admin area is closed to customers and open to admins", async ({
  page,
}) => {
  await signIn(page, "user@test.com");
  await expect(page.getByRole("link", { name: "All quotes" })).toHaveCount(0);

  // Navigating straight there is refused server-side, not merely hidden.
  await page.goto("/admin/quotes");
  await expect(page).toHaveURL("/quotes");

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("/login");

  await signIn(page, "admin@test.com");
  await page.getByRole("link", { name: "All quotes" }).click();
  await page.waitForURL("/admin/quotes");

  // An administrator sees both customers.
  await expect(page.getByText("user@test.com").first()).toBeVisible();
  await expect(page.getByText("admin@test.com").first()).toBeVisible();
});

test("a customer cannot open someone else's quote by id", async ({ page }) => {
  await signIn(page, "user@test.com");

  // seed-quote-2 belongs to the administrator.
  await page.goto("/quotes/seed-quote-2");

  await expect(page.getByText("could not be found")).toBeVisible();
});
