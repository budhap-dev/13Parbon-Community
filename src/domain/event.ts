import type { CoverAnimation } from './cover'
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
  /**
   * Where people put their name down to come. A Google Form the committee owns, so the
   * replies land in a sheet they already know how to read. Absent means there is nothing
   * to book, and the page says so rather than showing a button that goes nowhere.
   */
  registrationUrl?: string
  /**
   * Where performers sign up for the stage, which is a separate form with separate
   * questions: what you would like to do, and how long it runs. Absent sends people to
   * the contact page instead.
   */
  performerFormUrl?: string
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
  /**
   * The picture that fronts the event on the home page and its own page.
   *
   * In the bucket like every other photograph, never in the repository — an event cover is
   * usually a picture of last year's evening, with members' faces in it.
   */
  coverImageUrl?: string
  /** How the cover behaves. Absent is still. */
  coverAnimation?: CoverAnimation
  /**
   * The running order: what happens when.
   *
   * "Speakers" is the wrong word for this community — nobody is booked. The stage is filled by
   * members who put their names down, which is what `performerCall` asks for, so this is a
   * programme rather than a line-up.
   */
  programme?: { time: string; what: string }[]
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

/**
 * The parts of an event this site owns.
 *
 * The committee's planner app holds the logistics — tasks, teams, who is bringing the urn. This
 * is front of house: what somebody sees when they arrive wondering what is on. The two overlap
 * only on the title, the date and the venue, so the design screen is not a second copy of the
 * planner so much as the other half of the same evening.
 */
export type EventDraft = {
  title: string
  summary: string
  /** ISO 8601, as a datetime-local input gives it. */
  startsAt: string
  endsAt: string
  venue: string
  venueAddress: string
  coordinates: { lat: number; lon: number } | null
  coverImageUrl: string
  coverAnimation: CoverAnimation
  theme: { bengali: string; bengaliSubtitle: string; english: string }
  programme: { time: string; what: string }[]
  registrationUrl: string
  performerFormUrl: string
  registrationOpen: boolean
  volunteerCall: string
  performerCall: string
  status: EventStatus
  isPublic: boolean
}

export type EventErrors = Partial<Record<'title' | 'summary' | 'startsAt' | 'venue' | 'registrationUrl' | 'coverImageUrl', string>>

const URL_LIKE = /^https?:\/\/\S+$/

export function validateEvent(draft: EventDraft): EventErrors {
  const errors: EventErrors = {}
  if (draft.title.trim().length < 3) errors.title = 'Give the evening a name.'
  if (draft.summary.trim().length < 10) errors.summary = 'A line for somebody deciding whether to come.'
  if (!draft.startsAt) errors.startsAt = 'When does it start?'
  if (draft.endsAt && draft.endsAt <= draft.startsAt) errors.startsAt = 'It cannot finish before it starts.'
  if (draft.venue.trim().length < 2) errors.venue = 'Where is it?'

  // A broken booking link is worse than none: the button still looks like it works.
  if (draft.registrationUrl.trim() && !URL_LIKE.test(draft.registrationUrl.trim())) {
    errors.registrationUrl = 'That does not look like a web address.'
  }
  if (draft.coverImageUrl.trim() && !URL_LIKE.test(draft.coverImageUrl.trim())) {
    errors.coverImageUrl = 'That does not look like a web address.'
  }
  return errors
}

export function isValidEvent(draft: EventDraft): boolean {
  return Object.keys(validateEvent(draft)).length === 0
}

/** The running order with the blank rows dropped, in time order. */
export function tidyProgramme(programme: { time: string; what: string }[]): { time: string; what: string }[] {
  return programme
    .filter((line) => line.what.trim())
    .map((line) => ({ time: line.time.trim(), what: line.what.trim() }))
    .sort((a, b) => a.time.localeCompare(b.time))
}

/**
 * A blank evening.
 *
 * It starts as a draft and not public. Nothing should reach the website because somebody opened
 * a form and was called away — the committee says when it goes up, and has to mean it.
 */
/** Called off. Still has a page, and that page says so. */
export function isCancelled(event: Pick<Event, 'status'>): boolean {
  return event.status === 'cancelled'
}

export function blankEvent(): EventDraft {
  return {
    title: '',
    summary: '',
    startsAt: '',
    endsAt: '',
    venue: '',
    venueAddress: '',
    coordinates: null,
    coverImageUrl: '',
    coverAnimation: 'none',
    theme: { bengali: '', bengaliSubtitle: '', english: '' },
    programme: [],
    registrationUrl: '',
    performerFormUrl: '',
    registrationOpen: false,
    volunteerCall: '',
    performerCall: '',
    status: 'draft',
    isPublic: true,
  }
}

/**
 * Whether an evening has been and gone but is still filed as though it were coming.
 *
 * Not archived automatically: a date passing is not the same as the committee being finished
 * with it, and an event that tidied itself away while somebody was still writing the round-up
 * would be its own small annoyance. The screen offers, and a person decides.
 */
export function readyToArchive(event: Pick<Event, 'startsAt' | 'endsAt' | 'status'>, now: Date): boolean {
  if (event.status === 'past' || event.status === 'draft') return false
  return new Date(event.endsAt ?? event.startsAt) < now
}
