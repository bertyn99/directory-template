import type { User } from '#auth-utils'

// Admin access — user.role must be 'admin'
export const accessAdmin = defineAbility((user: User) => {
  if (!user || typeof user.role !== 'string') return false
  return user.role === 'admin'
})

// Venue management — owner, admin, or franchise owner can edit
// isOwner is pre-resolved in route handler via userVenues junction table check
// isFranchiseOwner is pre-resolved: franchises.ownerId === user.id AND venues.franchiseId matches
export const editVenue = defineAbility((user: User, isOwner: boolean, isFranchiseOwner: boolean = false) => {
  if (!user || typeof user.role !== 'string') return false
  return isOwner || user.role === 'admin' || isFranchiseOwner
})

// Viewing venue in dashboard uses same ownership check
export const viewDashboardVenue = editVenue

// Franchise management — user owns the franchise and can manage ALL its venues
// isFranchiseOwner is pre-resolved: franchises.ownerId === user.id
export const manageFranchiseVenues = defineAbility((user: User, isFranchiseOwner: boolean) => {
  if (!user || typeof user.role !== 'string') return false
  return isFranchiseOwner || user.role === 'admin'
})

// Premium features — active paid subscription
export const usePremiumFeature = defineAbility((user: User) => {
  if (!user) return false
  return user.hasPaidSubscription === true
})
