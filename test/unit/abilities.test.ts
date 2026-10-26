import { describe, expect, it } from 'vitest'
import {
  accessAdmin,
  editVenue,
  viewDashboardVenue,
  manageFranchiseVenues,
  usePremiumFeature,
} from '~~/shared/utils/abilities'
import type { User } from '#auth-utils'

// Helper to create mock users
function createUser(overrides: Partial<User> = {}): User {
  return {
    id: 'usr_123',
    username: 'testuser',
    email: 'test@example.com',
    role: 'user',
    onboardingStep: 0,
    ...overrides,
  }
}

const adminUser = createUser({ role: 'admin' })
const regularUser = createUser()
const premiumUser = createUser({ hasPaidSubscription: true })
const freeUser = createUser({ hasPaidSubscription: false })
const userWithoutSubscriptionField = createUser()

// ============================================================================
// accessAdmin
// ============================================================================
describe('accessAdmin', () => {
  it('returns true when user.role is admin', () => {
    expect(accessAdmin(adminUser)).toBe(true)
  })

  it('returns false when user.role is user', () => {
    expect(accessAdmin(regularUser)).toBe(false)
  })

  it('returns false for regular user regardless of subscription status', () => {
    expect(accessAdmin(premiumUser)).toBe(false)
  })
})

// ============================================================================
// editVenue
// ============================================================================
describe('editVenue', () => {
  it('returns true when isOwner is true (regardless of role)', () => {
    expect(editVenue(regularUser, true, false)).toBe(true)
  })

  it('returns true when user is admin and not owner', () => {
    expect(editVenue(adminUser, false, false)).toBe(true)
  })

  it('returns true when isFranchiseOwner is true', () => {
    expect(editVenue(regularUser, false, true)).toBe(true)
  })

  it('returns false when not owner, not admin, not franchise owner', () => {
    expect(editVenue(regularUser, false, false)).toBe(false)
  })

  it('returns true when both isOwner and isFranchiseOwner are true', () => {
    expect(editVenue(regularUser, true, true)).toBe(true)
  })

  it('returns true when admin and owner', () => {
    expect(editVenue(adminUser, true, false)).toBe(true)
  })

  it('defaults isFranchiseOwner to false', () => {
    // 2-arg call: isOwner=false, isFranchiseOwner defaults to false
    expect(editVenue(regularUser, false)).toBe(false)
    expect(editVenue(adminUser, false)).toBe(true) // admin passes even with default
  })

  // Truth table: all 8 combinations of (role=admin, isOwner, isFranchiseOwner)
  describe('truth table', () => {
    const cases: [User, boolean, boolean, boolean][] = [
      // [user, isOwner, isFranchiseOwner, expected]
      [regularUser, false, false, false],
      [regularUser, false, true, true],
      [regularUser, true, false, true],
      [regularUser, true, true, true],
      [adminUser, false, false, true],
      [adminUser, false, true, true],
      [adminUser, true, false, true],
      [adminUser, true, true, true],
    ]

    cases.forEach(([user, isOwner, isFranchiseOwner, expected], i) => {
      it(`case ${i}: role=${user.role}, isOwner=${isOwner}, isFranchiseOwner=${isFranchiseOwner} → ${expected}`, () => {
        expect(editVenue(user, isOwner, isFranchiseOwner)).toBe(expected)
      })
    })
  })
})

// ============================================================================
// viewDashboardVenue
// ============================================================================
describe('viewDashboardVenue', () => {
  it('is the same function as editVenue', () => {
    expect(viewDashboardVenue).toBe(editVenue)
  })

  it('delegates to editVenue correctly for owner', () => {
    expect(viewDashboardVenue(regularUser, true, false)).toBe(true)
  })

  it('delegates to editVenue correctly for non-owner non-admin', () => {
    expect(viewDashboardVenue(regularUser, false, false)).toBe(false)
  })

  it('delegates to editVenue correctly for admin', () => {
    expect(viewDashboardVenue(adminUser, false, false)).toBe(true)
  })

  it('delegates to editVenue correctly for franchise owner', () => {
    expect(viewDashboardVenue(regularUser, false, true)).toBe(true)
  })
})

// ============================================================================
// manageFranchiseVenues
// ============================================================================
describe('manageFranchiseVenues', () => {
  it('returns true when isFranchiseOwner is true', () => {
    expect(manageFranchiseVenues(regularUser, true)).toBe(true)
  })

  it('returns true when user is admin (even if not franchise owner)', () => {
    expect(manageFranchiseVenues(adminUser, false)).toBe(true)
  })

  it('returns false when not franchise owner and not admin', () => {
    expect(manageFranchiseVenues(regularUser, false)).toBe(false)
  })

  it('returns true when admin AND franchise owner', () => {
    expect(manageFranchiseVenues(adminUser, true)).toBe(true)
  })
})

// ============================================================================
// usePremiumFeature
// ============================================================================
describe('usePremiumFeature', () => {
  it('returns true when hasPaidSubscription is true', () => {
    expect(usePremiumFeature(premiumUser)).toBe(true)
  })

  it('returns false when hasPaidSubscription is false', () => {
    expect(usePremiumFeature(freeUser)).toBe(false)
  })

  it('returns false when hasPaidSubscription is undefined', () => {
    // userWithoutSubscriptionField has no hasPaidSubscription set
    expect(usePremiumFeature(userWithoutSubscriptionField)).toBe(false)
  })

  it('uses strict equality — only true (not truthy values) passes', () => {
    const truthyStringUser = createUser({ hasPaidSubscription: 'yes' as unknown as boolean })
    expect(usePremiumFeature(truthyStringUser)).toBe(false)
  })

  it('returns false for admin without subscription', () => {
    const adminNoSub = createUser({ role: 'admin', hasPaidSubscription: false })
    expect(usePremiumFeature(adminNoSub)).toBe(false)
  })
})
