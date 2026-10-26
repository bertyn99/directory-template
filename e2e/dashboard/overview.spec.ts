import { dashboardTest as test, expect } from '../fixtures/dashboard'

test.describe('Dashboard Overview', () => {
  test('page loads with stat cards visible', async ({ loginAs }) => {
    const page = await loginAs('user')
    
    // Mock the stats API to ensure we have data and not the empty state
    await page.route('/api/users/stats', async route => {
      await route.fulfill({
        json: {
          data: {
            totalVenues: 5,
            avgRating: 4.2,
            totalReviews: 12,
            upcomingEvents: 3,
            recentReviews: [],
            reviewsOverTime: []
          }
        }
      })
    })

    await page.goto('/dashboard', { waitUntil: 'networkidle' })

    // Check page title
    await expect(page.locator('h1', { hasText: 'Tableau de bord' })).toBeVisible()

    // Check stat cards labels
    await expect(page.locator('text=Venues total')).toBeVisible()
    await expect(page.locator('text=Note moyenne')).toBeVisible()
    await expect(page.locator('text=Avis total')).toBeVisible()
    await expect(page.locator('text=Événements à venir')).toBeVisible()
  })

  test('stat cards show numeric values', async ({ loginAs }) => {
    const page = await loginAs('user')
    
    // Mock the stats API with specific numeric values
    await page.route('/api/users/stats', async route => {
      await route.fulfill({
        json: {
          data: {
            totalVenues: 42,
            avgRating: 4.8,
            totalReviews: 156,
            upcomingEvents: 7,
            recentReviews: [],
            reviewsOverTime: []
          }
        }
      })
    })

    await page.goto('/dashboard', { waitUntil: 'networkidle' })

    // Verify the mocked numeric values are displayed
    await expect(page.locator('text=42')).toBeVisible()
    await expect(page.locator('text=4.8')).toBeVisible()
    await expect(page.locator('text=156')).toBeVisible()
    await expect(page.locator('text=7')).toBeVisible()
  })

  test('chart is rendered', async ({ loginAs }) => {
    const page = await loginAs('user')
    
    // Mock the stats API with chart data
    await page.route('/api/users/stats', async route => {
      await route.fulfill({
        json: {
          data: {
            totalVenues: 1,
            avgRating: 5,
            totalReviews: 1,
            upcomingEvents: 0,
            recentReviews: [],
            reviewsOverTime: [
              { month: 'Jan', reviews: 10 },
              { month: 'Feb', reviews: 20 }
            ]
          }
        }
      })
    })

    await page.goto('/dashboard', { waitUntil: 'networkidle' })

    // Check if SVG or Canvas is rendered for the chart
    await expect(page.locator('svg, canvas').first()).toBeVisible()
  })

  test('quick action button navigates to venues page', async ({ loginAs }) => {
    const page = await loginAs('user')
    
    // Mock the stats API so the page renders the quick actions
    await page.route('/api/users/stats', async route => {
      await route.fulfill({
        json: {
          data: {
            totalVenues: 1,
            avgRating: 5,
            totalReviews: 1,
            upcomingEvents: 0,
            recentReviews: [],
            reviewsOverTime: []
          }
        }
      })
    })

    await page.goto('/dashboard', { waitUntil: 'networkidle' })

    // Find the "Ajouter un venue" button (rendered as an <a> tag by Nuxt UI)
    const addVenueBtn = page.locator('a', { hasText: 'Ajouter un venue' }).first()
    await expect(addVenueBtn).toBeVisible()
    
    await addVenueBtn.click()
    
    // Wait for navigation to the venues page
    await page.waitForURL(/.*\/dashboard\/venues.*/)
    expect(page.url()).toContain('/dashboard/venues')
  })

  test('unauthenticated user is redirected away from /dashboard', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' })
    
    // Should be redirected to home (/) by the auth middleware
    await page.waitForURL(url => url.pathname === '/')
    expect(page.url()).not.toContain('/dashboard')
  })
})
