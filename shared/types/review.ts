export interface Review {
  id: number
  venueId: number
  rating: number
  comment: string | null
  reviewerName: string | null
  createdAt: Date | null
}
