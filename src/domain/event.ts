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
  /** Street or postcode, where the venue name alone would not find it. */
  venueAddress?: string
  /**
   * Where the venue is, for the map on the event page. It lives on the event rather than in
   * the site config because we do not always meet in the same hall.
   */
  coordinates?: { lat: number; lon: number }
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
  /**
   * The call for performers. Coming to an event and being on the stage at one are two
   * different things to put your name down for, and the second needs asking for out loud:
   * the programme only exists because members offer to fill it.
   */
  performerCall?: string
  status: EventStatus
}
