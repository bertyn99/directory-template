import { test as base, expect, type Page } from "@playwright/test";

/**
 * Auth Fixtures for E2E Testing
 *
 * Provides reusable authenticated page and test user fixtures
 * for testing protected routes and user workflows.
 */

type AuthFixtures = {
  testUser: { email: string; password: string; username: string };
  authenticatedPage: Page;
  unauthenticatedPage: Page;
};

/**
 * Test user fixture
 * Creates a unique test user for each test
 */
export const test = base.extend<AuthFixtures>({
  testUser: async (_fixtures, use) => {
    const timestamp = Date.now();
    const testUser = {
      email: `test-${timestamp}@example.com`,
      password: "TestPassword123",
      username: `testuser${timestamp}`,
    };

    // TODO: Create test user via API or database before test
    // await createTestUser(testUser)

    await use(testUser);

    // TODO: Cleanup after test
    // await deleteTestUser(testUser.email)
  },

  /**
   * Authenticated page fixture
   * Logs in with test user and provides authenticated page context
   */
  authenticatedPage: async ({ page, testUser }, use) => {
    // Navigate to login page
    await page.goto("/auth/login");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Fill login form
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard or home
    await page.waitForURL(/\/(dashboard|venues|categories)/, { timeout: 10000 });

    // Verify we're authenticated (check for user menu or protected element)
    await expect(page).toHaveURL(/\/(dashboard|venues|categories)/);

    await use(page);

    // Cleanup: logout
    try {
      await page.goto("/auth/logout");
    } catch {
      // Logout might not exist, that's ok
    }
  },

  /**
   * Unauthenticated page fixture
   * Ensures user is logged out before test
   */
  unauthenticatedPage: async ({ page }, use) => {
    // Clear all cookies to ensure logged out state
    await page.context().clearCookies();

    // Navigate to home page
    await page.goto("/");

    // Verify we're not authenticated
    // (adjust selector based on your app's auth indicator)
    const loginLink = page.locator('a:has-text("Login")');
    await expect(loginLink).toBeVisible({ timeout: 5000 });

    await use(page);
  },
});

export { expect };
