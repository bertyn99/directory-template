export interface Event {
  id: number
  venueId: number
  name: string
  description: string | null
  startDate: Date | null
  endDate: Date | null
  location: Record<string, unknown> | null
}
