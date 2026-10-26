import { test, expect } from "./fixtures/auth";

/**
 * Authentication E2E Tests
 *
 * Tests user registration, login, and protected routes
 */

test.describe("Authentication", () => {
  test("user can register with valid credentials", async ({ page, testUser }) => {
    // Navigate to signup page
    await page.goto("/auth/register");

    // Fill registration form
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="username"]', testUser.username);
    await page.fill('input[name="password"]', testUser.password);

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL(/\/(dashboard|venues|categories)/, { timeout: 10000 });

    // Verify we're logged in
    expect(page.url()).toMatch(/\/(dashboard|venues|categories)/);
  });

  test("user cannot register with duplicate email", async ({ page, testUser }) => {
    // First registration
    await page.goto("/auth/register");
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="username"]', testUser.username);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL(/\/(dashboard|venues|categories)/, { timeout: 10000 });

    // Logout
    await page.goto("/auth/logout");

    // Try to register again with same email
    await page.goto("/auth/register");
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="username"]', `${testUser.username}2`);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Should see error message
    const errorMessage = page.locator("text=already exists");
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test("user can login with valid credentials", async ({ page, testUser }) => {
    // Navigate to login page
    await page.goto("/auth/login");

    // Fill login form
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL(/\/(dashboard|venues|categories)/, { timeout: 10000 });

    // Verify we're logged in
    expect(page.url()).toMatch(/\/(dashboard|venues|categories)/);
  });

  test("user cannot login with invalid password", async ({ page, testUser }) => {
    // Navigate to login page
    await page.goto("/auth/login");

    // Fill login form with wrong password
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', "WrongPassword123");

    // Submit form
    await page.click('button[type="submit"]');

    // Should see error message
    const errorMessage = page.locator("text=Invalid email or password");
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    // Should still be on login page
    expect(page.url()).toContain("/auth/login");
  });

  test("authenticated user can access dashboard", async ({
    authenticatedPage: _authenticatedPage,
    page,
  }) => {
    // Navigate to dashboard
    await page.goto("/dashboard");

    // Verify we're on dashboard
    expect(page.url()).toContain("/dashboard");

    // Verify dashboard content is visible
    const dashboardHeading = page.locator("h1");
    await expect(dashboardHeading).toBeVisible();
  });

  test("unauthenticated user cannot access dashboard", async ({
    unauthenticatedPage: _unauthenticatedPage,
    page,
  }) => {
    // Try to navigate to dashboard
    await page.goto("/dashboard");

    // Should be redirected to login
    await page.waitForURL("/auth/login", { timeout: 10000 });

    expect(page.url()).toContain("/auth/login");
  });

  test("user can logout", async ({ authenticatedPage: _authenticatedPage, page }) => {
    // Navigate to logout
    await page.goto("/auth/logout");

    // Should be redirected to login or home
    await page.waitForURL(/\/(auth\/login|)/, { timeout: 10000 });

    // Try to access dashboard
    await page.goto("/dashboard");

    // Should be redirected to login
    await page.waitForURL("/auth/login", { timeout: 10000 });

    expect(page.url()).toContain("/auth/login");
  });
});
