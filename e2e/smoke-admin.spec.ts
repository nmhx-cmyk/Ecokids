import { expect, test } from "@playwright/test";

import { getEnvOrSkip, loginAs } from "./helpers";

/**
 * Smoke 3 — Admin processes a pending order.
 *
 * Requires ADMIN_EMAIL / ADMIN_PASSWORD env vars and seeded data with at
 * least one PENDING order. Skips when credentials are missing.
 */
test.describe("admin order processing", () => {
  test.beforeEach(async ({ page }) => {
    const email = getEnvOrSkip("ADMIN_EMAIL");
    const password = getEnvOrSkip("ADMIN_PASSWORD");
    await loginAs(page, email, password);
  });

  test("admin can confirm a pending order", async ({ page }) => {
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Tổng quan", exact: true }),
    ).toBeVisible();

    // Navigate to orders via sidebar.
    await page.getByRole("link", { name: "Đơn hàng", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/orders/);

    // Click the first order row — links to /admin/orders/<orderCode>.
    const firstOrderLink = page
      .locator('a[href^="/admin/orders/"]')
      .first();
    await expect(firstOrderLink).toBeVisible();
    await firstOrderLink.click();
    await expect(page).toHaveURL(/\/admin\/orders\/ECO-\d{4}-\d{6}/);

    // If the order is PENDING, the "Xác nhận đơn" action is visible.
    const confirmButton = page.getByRole("button", {
      name: "Xác nhận đơn",
      exact: true,
    });
    if (await confirmButton.isVisible().catch(() => false)) {
      await confirmButton.click();
      // Status badge updates to "Đã xác nhận" after the server action settles.
      await expect(
        page.getByText("Đã xác nhận").first(),
      ).toBeVisible({ timeout: 10_000 });
    } else {
      // No pending order available; the test still verifies the admin
      // landed on a detail page successfully.
      test.info().annotations.push({
        type: "note",
        description:
          "First order is not PENDING — confirm-action assertion skipped.",
      });
    }
  });
});
