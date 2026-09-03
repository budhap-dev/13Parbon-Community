export type EventStatus = 'draft' | 'published' | 'cancelled' | 'past'

export type Event = {
  id: string
  slug: string
  title: string
  summary: string
  /** ISO 8601 timestamp */
  startsAt: string
  /** ISO 8601 timestamp */
  endsAt?: string
  venue: string
  /** Links the event to one of the community's festivals, if it is one. */
  festivalId?: string
  isPublic: boolean
  registrationOpen: boolean
  householdsRegistered: number
  status: EventStatus
}
