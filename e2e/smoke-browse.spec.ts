import { expect, test } from "@playwright/test";

/**
 * Smoke 1 — Anonymous browse + add to cart (happy path).
 *
 * Data dependency: requires `pnpm db:seed` so the home page renders the
 * "Sản phẩm bán chạy" section with at least one product that has stock,
 * sizes, and colors.
 */
test("anonymous user can browse home page and add a product to cart", async ({
  page,
}) => {
  await page.goto("/");

  // Hero copy
  await expect(
    page.getByText("Thời trang trẻ em an toàn, dễ thương cho mọi ngày"),
  ).toBeVisible();

  // Best sellers section is rendered
  const bestSellers = page.getByRole("heading", {
    name: "Sản phẩm bán chạy",
  });
  await expect(bestSellers).toBeVisible();

  // Pick the first product link inside the best sellers section.
  // ProductCard wraps its image+title in an <a href="/products/[slug]">.
  const bestSellersSection = bestSellers.locator(
    "xpath=ancestor::section[1]",
  );
  const firstProductLink = bestSellersSection
    .locator('a[href^="/products/"]')
    .first();
  await expect(firstProductLink).toBeVisible();
  await firstProductLink.click();

  // On detail page — product name renders as an h1 in ProductInfo.
  await expect(page).toHaveURL(/\/products\/[^/]+$/);
  const productHeading = page.getByRole("heading", { level: 1 });
  await expect(productHeading).toBeVisible();

  // Pick first enabled size button (some sizes may be out of stock).
  const sizeButton = page
    .locator('button[aria-label^="Kích cỡ"]:not([disabled])')
    .first();
  await expect(sizeButton).toBeVisible();
  await sizeButton.click();

  // Pick first color swatch.
  const colorButton = page.locator('button[aria-label^="Màu"]').first();
  await expect(colorButton).toBeVisible();
  await colorButton.click();

  // Add to cart.
  await page
    .getByRole("button", { name: "Thêm vào giỏ", exact: true })
    .click();

  // Cart badge — the CartButton renders a span with the qty next to the icon.
  const cartTrigger = page.getByRole("button", { name: /^Giỏ hàng/ });
  await expect(cartTrigger).toBeVisible();
  await expect(cartTrigger).toHaveAccessibleName(/Giỏ hàng \(1 sản phẩm\)/);

  // Open the mini-cart and confirm it shows the line item header.
  await cartTrigger.click();
  await expect(page.getByText("Giỏ hàng (1)").first()).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Thanh toán", exact: true }),
  ).toBeVisible();
});
