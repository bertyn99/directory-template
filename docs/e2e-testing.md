# E2E Testing Guide

## Quick Start

### 1. Install Dependencies
Playwright is already installed (`@playwright/test@^1.48.0`).

### 2. Run E2E Tests
```bash
# Run all tests
pnpm exec playwright test

# Run tests in headed mode (see browser)
pnpm exec playwright test --headed

# Run specific test file
pnpm exec playwright test e2e/auth.spec.ts

# Run tests matching pattern
pnpm exec playwright test --grep "login"

# Debug mode (step through tests)
pnpm exec playwright test --debug
```

### 3. View Test Results
```bash
# Open HTML report
pnpm exec playwright show-report
```

---

## Project Structure

```
e2e/
  fixtures/
    auth.ts                    # Auth fixtures (testUser, authenticatedPage)
    test-user-helper.ts        # API helpers for test user management
  auth.spec.ts                 # Example auth tests
playwright.config.ts           # Playwright configuration
```

---

## Fixtures

### `testUser` Fixture
Provides a unique test user for each test.

```typescript
import { test } from './fixtures/auth'

test('user can register', async ({ testUser }) => {
  // testUser = { email: 'test-1234567890@example.com', password: '...', username: '...' }
  console.log(testUser.email)
})
```

**Features:**
- ✅ Unique email per test (timestamp-based)
- ✅ Unique username per test
- ✅ Pre-defined password: `TestPassword123`
- ✅ Automatic cleanup after test (TODO: implement)

### `authenticatedPage` Fixture
Logs in with test user and provides authenticated page context.

```typescript
import { test } from './fixtures/auth'

test('authenticated user can access dashboard', async ({ authenticatedPage, page }) => {
  // User is already logged in
  await page.goto('/dashboard')
  
  // Verify dashboard is visible
  await expect(page.locator('h1')).toBeVisible()
})
```

**Features:**
- ✅ Automatic login with test user
- ✅ Waits for redirect to dashboard/venues/styles
- ✅ Verifies authentication succeeded
- ✅ Automatic logout after test

### `unauthenticatedPage` Fixture
Ensures user is logged out before test.

```typescript
import { test } from './fixtures/auth'

test('unauthenticated user cannot access dashboard', async ({ unauthenticatedPage, page }) => {
  // User is logged out
  await page.goto('/dashboard')
  
  // Should redirect to login
  await page.waitForURL('/auth/login')
})
```

**Features:**
- ✅ Clears all cookies
- ✅ Verifies login link is visible
- ✅ Ensures clean unauthenticated state

---

## Test User Helper API

### `createTestUser(baseURL, user)`
Create a test user via API.

```typescript
import { createTestUser } from './fixtures/test-user-helper'

const user = await createTestUser('http://localhost:3000', {
  email: 'test@example.com',
  password: 'TestPassword123',
  username: 'testuser'
})

console.log(user.id) // User ID
```

### `loginTestUser(baseURL, email, password)`
Login test user and get session cookie.

```typescript
import { loginTestUser } from './fixtures/test-user-helper'

const sessionCookie = await loginTestUser(
  'http://localhost:3000',
  'test@example.com',
  'TestPassword123'
)

// Use cookie in subsequent requests
await page.context().addCookies([
  { name: 'auth', value: sessionCookie, url: 'http://localhost:3000' }
])
```

### `deleteTestUser(baseURL, userId, authToken?)`
Delete a test user via API.

```typescript
import { deleteTestUser } from './fixtures/test-user-helper'

await deleteTestUser('http://localhost:3000', userId)
```

### `getTestUser(baseURL, email, authToken?)`
Get test user by email via API.

```typescript
import { getTestUser } from './fixtures/test-user-helper'

const user = await getTestUser('http://localhost:3000', 'test@example.com')
```

### `logoutTestUser(baseURL, sessionCookie)`
Logout test user.

```typescript
import { logoutTestUser } from './fixtures/test-user-helper'

await logoutTestUser('http://localhost:3000', sessionCookie)
```

---

## Example Tests

### Test Registration
```typescript
import { test, expect } from './fixtures/auth'

test('user can register with valid credentials', async ({ page, testUser }) => {
  await page.goto('/auth/register')
  
  await page.fill('input[name="email"]', testUser.email)
  await page.fill('input[name="username"]', testUser.username)
  await page.fill('input[name="password"]', testUser.password)
  
  await page.click('button[type="submit"]')
  
  // Wait for redirect
  await page.waitForURL(/\/(dashboard|venues|styles)/, { timeout: 10000 })
  
  expect(page.url()).toMatch(/\/(dashboard|venues|styles)/)
})
```

### Test Login
```typescript
import { test, expect } from './fixtures/auth'

test('user can login with valid credentials', async ({ page, testUser }) => {
  await page.goto('/auth/login')
  
  await page.fill('input[type="email"]', testUser.email)
  await page.fill('input[type="password"]', testUser.password)
  
  await page.click('button[type="submit"]')
  
  await page.waitForURL(/\/(dashboard|venues|styles)/, { timeout: 10000 })
  
  expect(page.url()).toMatch(/\/(dashboard|venues|styles)/)
})
```

### Test Protected Route
```typescript
import { test, expect } from './fixtures/auth'

test('authenticated user can access dashboard', async ({ authenticatedPage, page }) => {
  await page.goto('/dashboard')
  
  expect(page.url()).toContain('/dashboard')
  
  const heading = page.locator('h1')
  await expect(heading).toBeVisible()
})
```

### Test Unauthenticated Access
```typescript
import { test, expect } from './fixtures/auth'

test('unauthenticated user cannot access dashboard', async ({ unauthenticatedPage, page }) => {
  await page.goto('/dashboard')
  
  await page.waitForURL('/auth/login', { timeout: 10000 })
  
  expect(page.url()).toContain('/auth/login')
})
```

---

## Best Practices

### 1. Use Fixtures for Setup/Teardown
```typescript
// ✅ GOOD: Use fixtures for common setup
test('user can access profile', async ({ authenticatedPage, page }) => {
  await page.goto('/profile')
})

// ❌ BAD: Manual login in every test
test('user can access profile', async ({ page }) => {
  await page.goto('/auth/login')
  // ... manual login code ...
})
```

### 2. Wait for Navigation
```typescript
// ✅ GOOD: Wait for URL change
await page.click('button[type="submit"]')
await page.waitForURL(/\/(dashboard|venues)/, { timeout: 10000 })

// ❌ BAD: No wait
await page.click('button[type="submit"]')
await page.goto('/dashboard')
```

### 3. Use Selectors Consistently
```typescript
// ✅ GOOD: Semantic selectors
await page.fill('input[type="email"]', email)
await page.click('button[type="submit"]')

// ❌ BAD: Fragile selectors
await page.fill('input:first-of-type', email)
await page.click('button:nth-child(3)')
```

### 4. Add Timeouts for Async Operations
```typescript
// ✅ GOOD: Explicit timeout
await page.waitForURL('/dashboard', { timeout: 10000 })

// ❌ BAD: Default timeout (30s)
await page.waitForURL('/dashboard')
```

### 5. Test Error Cases
```typescript
// ✅ GOOD: Test both success and failure
test('user cannot login with invalid password', async ({ page, testUser }) => {
  await page.goto('/auth/login')
  await page.fill('input[type="email"]', testUser.email)
  await page.fill('input[type="password"]', 'WrongPassword')
  await page.click('button[type="submit"]')
  
  const error = page.locator('text=Invalid email or password')
  await expect(error).toBeVisible()
})
```

---

## Debugging

### Run Tests in Headed Mode
```bash
pnpm exec playwright test --headed
```

### Debug Specific Test
```bash
pnpm exec playwright test e2e/auth.spec.ts --debug
```

### View Test Traces
```bash
pnpm exec playwright show-report
```

### Print Debug Info
```typescript
test('debug example', async ({ page }) => {
  console.log('Current URL:', page.url())
  console.log('Page title:', await page.title())
  
  // Take screenshot
  await page.screenshot({ path: 'debug.png' })
})
```

---

## CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm build
      - run: pnpm exec playwright install
      - run: pnpm exec playwright test
      
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Troubleshooting

### Tests Timeout
**Problem**: Tests hang or timeout.

**Solution**:
1. Increase timeout: `await page.waitForURL(..., { timeout: 20000 })`
2. Check if dev server is running: `pnpm dev`
3. Check browser console for errors: `page.on('console', msg => console.log(msg))`

### Flaky Tests
**Problem**: Tests pass sometimes, fail other times.

**Solution**:
1. Add explicit waits: `await page.waitForLoadState('networkidle')`
2. Use `waitForURL` instead of `goto` for redirects
3. Increase timeout for slow operations
4. Use `test.slow()` to triple timeout for specific tests

### Session Not Persisting
**Problem**: User logs in but session is lost.

**Solution**:
1. Check if cookies are being set: `await page.context().cookies()`
2. Verify cookie name in `runtimeConfig.cookie`
3. Check if `setUserSession()` is being called in login endpoint

### Test User Not Created
**Problem**: `createTestUser()` fails.

**Solution**:
1. Verify signup endpoint exists: `POST /api/auth/signup`
2. Check if test user already exists (duplicate email)
3. Verify password meets requirements (8+ chars)
4. Check server logs for errors

---

## References

- **Playwright Docs**: https://playwright.dev/docs/intro
- **Playwright Test API**: https://playwright.dev/docs/api/class-test
- **Fixtures**: https://playwright.dev/docs/test-fixtures
- **Best Practices**: https://playwright.dev/docs/best-practices
- **Debugging**: https://playwright.dev/docs/debug

---

## Next Steps

1. ✅ Run `pnpm exec playwright test` to verify setup
2. ✅ Implement test user creation API in `createTestUser()` helper
3. ✅ Implement test user deletion API in `deleteTestUser()` helper
4. ✅ Add more test cases for venues, styles, and other features
5. ✅ Set up CI/CD integration (GitHub Actions, etc.)
6. ✅ Configure test database (separate from production)
