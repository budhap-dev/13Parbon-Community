import type { SupabaseClient } from '@supabase/supabase-js'
import { isUpcoming } from '@/domain/dates'
import { isValidEvent, tidyProgramme, type Event, type EventDraft, type EventStatus } from '@/domain/event'
import type { CoverAnimation } from '@/domain/cover'
import { isAdmin, type Viewer } from '@/domain/household'
import { uniqueSlug } from '@/domain/slug'
import { NotAllowed } from '../mock'
import type { ApiClient } from '../types'
import type { SupabaseConfig } from '../supabase'
import { dataClient } from '@/lib/auth/supabaseAuth'

type EventRow = {
  id: string
  slug: string
  title: string
  summary: string
  starts_at: string
  ends_at: string | null
  venue: string
  venue_address: string | null
  latitude: number | null
  longitude: number | null
  festival_id: string | null
  is_public: boolean
  status: EventStatus
  registration_open: boolean
  registration_url: string | null
  performer_form_url: string | null
  households_registered: number
  cover_image_url: string | null
  cover_animation: CoverAnimation | null
  theme: { bengali: string; bengaliSubtitle?: string; english?: string } | null
  programme: { time: string; what: string }[] | null
  volunteer_call: string | null
  performer_call: string | null
}

/**
 * Absent rather than null throughout, because every screen asks `event.theme ? …`. A null theme
 * is truthy nowhere, but a `{ bengali: '' }` would draw a blank kicker above the title.
 */
export function toEvent(row: EventRow): Event {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    startsAt: row.starts_at,
    venue: row.venue,
    isPublic: row.is_public,
    status: row.status,
    registrationOpen: row.registration_open,
    householdsRegistered: row.households_registered,
    ...(row.ends_at ? { endsAt: row.ends_at } : {}),
    ...(row.venue_address ? { venueAddress: row.venue_address } : {}),
    ...(row.latitude !== null && row.longitude !== null
      ? { coordinates: { lat: row.latitude, lon: row.longitude } }
      : {}),
    ...(row.festival_id ? { festivalId: row.festival_id } : {}),
    ...(row.registration_url ? { registrationUrl: row.registration_url } : {}),
    ...(row.performer_form_url ? { performerFormUrl: row.performer_form_url } : {}),
    ...(row.cover_image_url ? { coverImageUrl: row.cover_image_url } : {}),
    ...(row.cover_animation ? { coverAnimation: row.cover_animation } : {}),
    ...(row.theme?.bengali ? { theme: row.theme } : {}),
    ...(row.programme?.length ? { programme: row.programme } : {}),
    ...(row.volunteer_call ? { volunteerCall: row.volunteer_call } : {}),
    ...(row.performer_call ? { performerCall: row.performer_call } : {}),
  }
}

/** The draft as columns, with the empty strings turned back into absent values. */
export function fromDraft(draft: EventDraft): Record<string, unknown> {
  const text = (value: string) => (value.trim() ? value.trim() : null)
  const programme = tidyProgramme(draft.programme)
  return {
    title: draft.title.trim(),
    summary: draft.summary.trim(),
    starts_at: draft.startsAt,
    ends_at: text(draft.endsAt),
    venue: draft.venue.trim(),
    venue_address: text(draft.venueAddress),
    latitude: draft.coordinates?.lat ?? null,
    longitude: draft.coordinates?.lon ?? null,
    is_public: draft.isPublic,
    status: draft.status,
    registration_open: draft.registrationOpen,
    registration_url: text(draft.registrationUrl),
    performer_form_url: text(draft.performerFormUrl),
    households_registered: draft.householdsRegistered,
    cover_image_url: text(draft.coverImageUrl),
    cover_animation: draft.coverAnimation,
    // An empty theme is absent rather than three empty strings, or the page draws a blank kicker.
    theme: draft.theme.bengali.trim()
      ? {
          bengali: draft.theme.bengali.trim(),
          ...(draft.theme.bengaliSubtitle.trim() ? { bengaliSubtitle: draft.theme.bengaliSubtitle.trim() } : {}),
          ...(draft.theme.english.trim() ? { english: draft.theme.english.trim() } : {}),
        }
      : null,
    programme: programme.length > 0 ? programme : null,
    volunteer_call: text(draft.volunteerCall),
    performer_call: text(draft.performerCall),
  }
}

/** Has a page somebody can open. A cancelled evening counts; a draft does not. */
const reachable = (event: Event) => event.isPublic && event.status !== 'draft'

/** Actually going ahead. What "the next event" means, and what a countdown counts to. */
const goingAhead = (event: Event) => reachable(event) && event.status === 'published'

/**
 * Events, against the real database.
 *
 * The policies decide which rows come back — a visitor is handed the published public ones —
 * and the filtering here is about *which list* an evening belongs in, which is a question about
 * its date and status rather than about who is asking.
 */
export function eventMethods(getClient: () => Promise<SupabaseClient>, now = () => new Date()): ApiClient['events'] {
  const table = (client: SupabaseClient) => client.schema('portal').from('events')

  const refuse = (message: string, error: { code?: string; message: string } | null): never => {
    if (error?.code === '23505') throw new NotAllowed('there is already an evening with that name')
    if (error?.code === '42501') throw new NotAllowed(message)
    throw new Error(error?.message ?? message)
  }

  const all = async (): Promise<Event[]> => {
    const { data } = await table(await getClient()).select('*').order('starts_at', { ascending: false })
    return ((data ?? []) as EventRow[]).map(toEvent)
  }

  const reread = async (id: string): Promise<Event> => {
    const { data } = await table(await getClient()).select('*').eq('id', id).maybeSingle()
    if (!data) throw new NotAllowed('no such event')
    return toEvent(data as EventRow)
  }

  return {
    // Cancelled evenings stay in the list until their date has passed, marked as cancelled.
    // Quietly dropping one is indistinguishable from never having announced it.
    listUpcoming: async (limit = 10) =>
      (await all())
        .filter((e) => reachable(e) && e.status !== 'past' && isUpcoming(e.startsAt, now()))
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
        .slice(0, limit),

    listPast: async (limit = 10) =>
      (await all())
        .filter((e) => reachable(e) && !isUpcoming(e.startsAt, now()))
        .slice(0, limit),

    // The next one that is actually happening: a countdown to a cancelled evening is cruel.
    getNext: async () =>
      (await all())
        .filter((e) => goingAhead(e) && e.status !== 'past' && isUpcoming(e.startsAt, now()))
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0] ?? null,

    getBySlug: async (slug) => {
      const { data } = await table(await getClient()).select('*').eq('slug', slug).maybeSingle()
      const event = data ? toEvent(data as EventRow) : null
      // A draft reaching this by its address is not a published evening. The policy already
      // refuses it to anybody but the committee; this is so an admin previewing one does not
      // see it answer as though it were up.
      return event && reachable(event) ? event : null
    },

    // Presentation, not protection: the policies already hide drafts. This keeps the contract's
    // promise of an empty list rather than the published ones.
    listAll: async (viewer: Viewer) => (isAdmin(viewer) ? all() : []),

    create: async (draft: EventDraft) => {
      if (!isValidEvent(draft)) throw new NotAllowed('that event is not ready')
      const client = await getClient()
      const { data: taken } = await table(client).select('slug')
      const slug = uniqueSlug(draft.title, ((taken ?? []) as { slug: string }[]).map((e) => e.slug), 'event')
      const { data, error } = await table(client)
        .insert({
          ...fromDraft(draft),
          slug,
          // Whatever the form said. A new evening is nobody's business until it is finished.
          status: 'draft',
        })
        .select('*')
        .single()
      if (error || !data) refuse('only the committee can do that', error)
      return toEvent(data as EventRow)
    },

    save: async (id: string, draft: EventDraft) => {
      if (!isValidEvent(draft)) throw new NotAllowed('that event is not ready')
      const { error, data } = await table(await getClient()).update(fromDraft(draft)).eq('id', id).select('id').maybeSingle()
      if (error) refuse('only the committee can do that', error)
      if (!data) throw new NotAllowed('no such event')
      return reread(id)
    },

    /*
     * Filed as past, not deleted, and not automatic on the date: a date passing is not the same
     * as the committee being finished with it, and an evening that tidied itself away while
     * somebody was writing the round-up would be its own small annoyance.
     */
    archive: async (id: string) => {
      const { error, data } = await table(await getClient()).update({ status: 'past' }).eq('id', id).select('id').maybeSingle()
      if (error) refuse('only the committee can do that', error)
      if (!data) throw new NotAllowed('no such event')
      return reread(id)
    },
  }
}

export function withSupabaseEvents(base: ApiClient, config: SupabaseConfig): ApiClient {
  return { ...base, events: eventMethods(() => dataClient(config)) }
}
