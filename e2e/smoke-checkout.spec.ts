import { expect, test } from "@playwright/test";

import { getEnvOrSkip, loginAs } from "./helpers";

/**
 * Smoke 2 — Logged-in user places an order end-to-end.
 *
 * Requires:
 *   - TEST_USER_EMAIL / TEST_USER_PASSWORD (fallback: seed defaults)
 *   - `pnpm db:seed` so /products has at least one in-stock item.
 *
 * The test gracefully skips when env credentials are missing so CI doesn't
 * fail on machines without a configured Supabase auth user.
 */
test("logged-in user can place a COD order from /products to confirmation", async ({
  page,
}) => {
  const email = getEnvOrSkip("TEST_USER_EMAIL", "customer1@ecokids.test");
  const password = getEnvOrSkip("TEST_USER_PASSWORD", "Test1234!");

  await loginAs(page, email, password);

  // Browse → first product → select size + color → add to cart.
  await page.goto("/products");
  const firstProductLink = page.locator('a[href^="/products/"]').first();
  await expect(firstProductLink).toBeVisible();
  await firstProductLink.click();
  await expect(page).toHaveURL(/\/products\/[^/]+$/);

  await page
    .locator('button[aria-label^="Kích cỡ"]:not([disabled])')
    .first()
    .click();
  await page.locator('button[aria-label^="Màu"]').first().click();
  await page
    .getByRole("button", { name: "Thêm vào giỏ", exact: true })
    .click();

  // Open mini-cart → Thanh toán.
  await page.getByRole("button", { name: /^Giỏ hàng/ }).click();
  await page
    .getByRole("link", { name: "Thanh toán", exact: true })
    .click();
  await expect(page).toHaveURL(/\/checkout$/);

  // Fill the checkout form. If a saved address is preselected, the
  // recipient/phone fields are already populated and the divisions UI is
  // hidden — only fill what's empty.
  const recipient = page.getByLabel("Họ và tên");
  if ((await recipient.inputValue()).trim() === "") {
    await recipient.fill("Người Mua Thử");
  }
  const phone = page.getByLabel("Số điện thoại");
  if ((await phone.inputValue()).trim() === "") {
    await phone.fill("0901234567");
  }

  // When no saved address exists, the VnDivisionsSelect + addressLine show.
  // The selects are native <select> elements with aria-labels.
  const province = page.getByLabel("Tỉnh/Thành phố");
  if (await province.isVisible().catch(() => false)) {
    // Pick the first non-empty option for each cascading select.
    const firstProvince = await province
      .locator('option:not([value=""])')
      .first()
      .getAttribute("value");
    if (firstProvince) await province.selectOption(firstProvince);

    const district = page.getByLabel("Quận/Huyện");
    await expect(district).toBeEnabled();
    const firstDistrict = await district
      .locator('option:not([value=""])')
      .first()
      .getAttribute("value");
    if (firstDistrict) await district.selectOption(firstDistrict);

    const ward = page.getByLabel("Phường/Xã");
    await expect(ward).toBeEnabled();
    const firstWard = await ward
      .locator('option:not([value=""])')
      .first()
      .getAttribute("value");
    if (firstWard) await ward.selectOption(firstWard);

    await page.getByLabel("Số nhà, tên đường").fill("123 Lê Lợi");
  }

  // COD is the default; click anyway to be defensive against future changes.
  await page.getByText("Thanh toán khi nhận hàng (COD)").click();

  await page.getByRole("button", { name: "Đặt hàng", exact: true }).click();

  // Redirect to /order-confirmation/<orderCode>.
  await page.waitForURL(/\/order-confirmation\/ECO-\d{4}-\d{6}/, {
    timeout: 15_000,
  });
  await expect(
    page.getByText("Đặt hàng thành công").first(),
  ).toBeVisible();

  const url = new URL(page.url());
  const orderCode = url.pathname.split("/").pop() ?? "";
  expect(orderCode).toMatch(/^ECO-\d{4}-\d{6}$/);
});
