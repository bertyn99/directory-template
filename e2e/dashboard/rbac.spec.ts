import { dashboardTest as test, expect } from '../fixtures/dashboard'

test.describe('Role-Based Access Control', () => {
  test('unauthenticated user redirected from /dashboard', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto('/dashboard')
    await page.waitForURL('/')
    expect(page.url()).toBe('http://localhost:3000/')
    await context.close()
  })

  test('unauthenticated user redirected from /dashboard/venues', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto('/dashboard/venues')
    await page.waitForURL('/')
    expect(page.url()).toBe('http://localhost:3000/')
    await context.close()
  })

  test('unauthenticated user redirected from /dashboard/settings', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto('/dashboard/settings')
    await page.waitForURL('/')
    expect(page.url()).toBe('http://localhost:3000/')
    await context.close()
  })

  test('direct URL access to /dashboard without auth redirects to /', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto('/dashboard')
    await page.waitForURL('/')
    expect(page.url()).toBe('http://localhost:3000/')
    await context.close()
  })

  test('authenticated user can access /dashboard', async ({ loginAs }) => {
    const page = await loginAs('user')
    await page.goto('/dashboard')
    await page.waitForURL('**/dashboard')
    expect(page.url()).toContain('/dashboard')
  })

  test('sidebar shows correct nav items for venue owner (no Franchise link)', async ({ loginAs }) => {
    const page = await loginAs('user')
    await page.goto('/dashboard')
    await page.waitForURL('**/dashboard')
    
    // Check visible links by href
    await expect(page.locator('nav a[href="/dashboard"]')).toBeVisible()
    await expect(page.locator('nav a[href="/dashboard/venues"]')).toBeVisible()
    await expect(page.locator('nav a[href="/dashboard/settings"]')).toBeVisible()
    
    // Check Franchise link is NOT visible
    await expect(page.locator('nav a[href="/dashboard/franchise"]')).toHaveCount(0)
  })

  test('venue owner cannot access another user\'s venue detail page', async ({ loginAs }) => {
    // First login as user to get their venue slug
    const userPage = await loginAs('user')
    await userPage.goto('/dashboard/venues')
    await userPage.waitForURL('**/dashboard/venues')
    
    // Wait for table to load
    await userPage.waitForSelector('tbody tr')
    
    // Click the first row
    await userPage.locator('tbody tr').first().click()
    
    // Wait for navigation to venue detail
    await userPage.waitForURL(/\/dashboard\/venues\/.+/)
    
    const venueUrl = userPage.url()
    const venuePath = new URL(venueUrl).pathname
    
    // Now login as coach and try to access that slug
    const coachPage = await loginAs('coach')
    await coachPage.goto(venuePath)
    
    // Should be redirected or show an error
    // Wait for URL to change away from the venue detail page, or for an error message
    // Usually it redirects to /dashboard/venues or /dashboard
    await coachPage.waitForURL(url => url.pathname !== venuePath, { timeout: 10000 })
    
    // Verify we are not on the venue detail page
    expect(coachPage.url()).not.toContain(venuePath)
  })
})
