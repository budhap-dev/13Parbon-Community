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
  /**
   * The theme the committee has set for the programme. Written in Bengali, with a plain
   * English rendering so it reads to everyone: nobody has to be Bengali to come.
   */
  theme?: {
    bengali: string
    /** The second half, where the theme has one. */
    bengaliSubtitle?: string
    english?: string
  }
  /** A plain request for helpers, shown with registration. No slots: people mention it when they register. */
  volunteerCall?: string
  status: EventStatus
}
