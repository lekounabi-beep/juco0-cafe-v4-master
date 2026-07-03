import { test, expect } from "@playwright/test";
import { attachConsoleGuard, assertNoRuntimeErrors } from "./helpers/console";
import { adminCredentials } from "./helpers/env";

test.describe("Admin", () => {
  test("admin login page renders", async ({ page }) => {
    const errors = attachConsoleGuard(page);

    await page.goto("/admin/login");
    await expect(page.getByRole("heading", { name: "Admin Login" }).first()).toBeVisible();
    await expect(page.getByLabel("Username")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();

    assertNoRuntimeErrors(errors);
  });

  test("admin login rejects invalid credentials", async ({ page }) => {
    const errors = attachConsoleGuard(page);

    await page.goto("/admin/login");
    await page.getByLabel("Username").fill("invalid-user");
    await page.getByLabel("Password").fill("invalid-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText(/Wrong credentials|fill in all fields/i)).toBeVisible();

    assertNoRuntimeErrors(errors);
  });

  test("admin can login, open dashboard, and logout", async ({ page }) => {
    const credentials = adminCredentials();
    test.skip(!credentials, "ADMIN_USERNAME and ADMIN_PASSWORD must be set for this test.");

    const errors = attachConsoleGuard(page);
    const { username, password } = credentials!;

    await page.goto("/admin/login");
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/admin/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole("button", { name: "Logout" }).click();
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 20_000 });

    assertNoRuntimeErrors(errors);
  });
});
