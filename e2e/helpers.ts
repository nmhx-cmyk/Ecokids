import { expect, test, type Page } from "@playwright/test";

/**
 * Fills the login form on /login and submits. Caller controls navigation
 * before/after — this helper only handles the form interaction.
 */
export async function loginAs(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page
    .getByRole("textbox", { name: "Mật khẩu", exact: true })
    .fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  // The action shows a sonner toast on success and pushes to redirectTo.
  await expect(page).not.toHaveURL(/\/login(\?|$)/, { timeout: 10_000 });
}

/**
 * Waits for a sonner toast containing the given text.
 */
export async function waitForToast(page: Page, text: string): Promise<void> {
  await expect(page.getByText(text).first()).toBeVisible({ timeout: 10_000 });
}

/**
 * Returns an env var, or calls test.skip() when it's missing so CI doesn't
 * fail without the optional credentials configured. Must be called from
 * inside a test body or beforeEach.
 */
export function getEnvOrSkip(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    test.skip(true, `Missing env var ${name}; skipping smoke test.`);
    return "";
  }
  return value;
}
