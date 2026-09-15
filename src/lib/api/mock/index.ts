import { isUpcoming } from '@/domain/dates'
import { isValidContact, type ContactMessage } from '@/domain/contact'
import type { Event } from '@/domain/event'
import type { AlbumWithMedia } from '@/domain/gallery'
import { directoryEntry, isAdmin, isMember } from '@/domain/household'
import type { ApiClient } from '../types'
import { buildFixtures } from './fixtures'
import { buildPortalFixtures } from './portal-fixtures'

export type MockApiOptions = {
  /** Clock used to decide what counts as upcoming. */
  now?: () => Date
  /** Simulated network delay in milliseconds. */
  latencyMs?: number
  /**
   * Events to serve instead of the ones the site ships. Tests use this so the suite does
   * not break every time the committee adds something to the calendar or takes it away.
   */
  events?: Event[]
}

function delay<T>(value: T, ms: number): Promise<T> {
  if (ms <= 0) return Promise.resolve(value)
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

/**
 * What the database says when somebody writes something they are not allowed to write.
 * Postgres raises; this rejects. A read that is not allowed comes back empty instead, which
 * is also what row level security does — a policy hides rows, it does not announce them.
 */
export class NotAllowed extends Error {
  constructor(what: string) {
    super(`Not allowed: ${what}`)
    this.name = 'NotAllowed'
  }
}

export function createMockApi({ now = () => new Date(), latencyMs = 0, events }: MockApiOptions = {}): ApiClient {
  const fixtures = buildFixtures()
  const allEvents = events ?? fixtures.events
  const portal = buildPortalFixtures()

  const visible = (event: Event) => event.isPublic && event.status !== 'draft' && event.status !== 'cancelled'

  const upcomingEvents = () =>
    allEvents
      .filter((event) => visible(event) && event.status === 'published' && isUpcoming(event.startsAt, now()))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))

  const pastEvents = () =>
    allEvents
      .filter((event) => visible(event) && !isUpcoming(event.startsAt, now()))
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt))

  const sentMessages: ContactMessage[] = []

  /**
   * A handful taken at random rather than the first few. Without it the home page shows the
   * same faces to everybody for as long as an album is the newest one, and the rest of the
   * evening is never seen. Drawn per fetch: React Query holds the answer, so the page is
   * steady while it is being read and different on the next visit.
   */
  const someOf = <T,>(items: T[], count: number): T[] => {
    const pool = [...items]
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
    return pool.slice(0, count)
  }

  const withMedia = (album: (typeof fixtures.albums)[number]): AlbumWithMedia => {
    const media = fixtures.media.filter((m) => m.albumId === album.id && m.approved)
    /**
     * A different photograph fronts the album each time the gallery is fetched, so one face
     * is not the whole of an evening every time somebody visits. It is picked per fetch
     * rather than per render: React Query holds the answer, so the cover stays put while a
     * page is being read and is different on the next visit.
     */
    const cover = media.length > 0 ? media[Math.floor(Math.random() * media.length)] : undefined
    return { ...album, media, cover }
  }
  const publicAlbums = () =>
    fixtures.albums
      .filter((a) => a.visibility === 'public')
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .map(withMedia)

  return {
    delivers: false,
    events: {
      listUpcoming: (limit = 10) => delay(upcomingEvents().slice(0, limit), latencyMs),
      listPast: (limit = 10) => delay(pastEvents().slice(0, limit), latencyMs),
      getNext: () => delay(upcomingEvents()[0] ?? null, latencyMs),
      getBySlug: (slug) => delay(allEvents.find((e) => e.slug === slug && visible(e)) ?? null, latencyMs),
    },
    festivals: {
      list: () => delay([...fixtures.festivals], latencyMs),
    },
    gallery: {
      listRecentMedia: (limit = 6) => delay(someOf(publicAlbums().flatMap((a) => a.media), limit), latencyMs),
      listAlbums: () => delay(publicAlbums(), latencyMs),
      getAlbum: (slug) => delay(publicAlbums().find((a) => a.slug === slug) ?? null, latencyMs),
    },
    news: {
      listPosts: (limit = 20) =>
        delay([...fixtures.posts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, limit), latencyMs),
      getPost: (slug) => delay(fixtures.posts.find((p) => p.slug === slug) ?? null, latencyMs),
      listAnnouncements: () => {
        const at = now().toISOString()
        const live = fixtures.announcements.filter(
          (a) => a.audience === 'public' && a.publishAt <= at && (!a.expiresAt || a.expiresAt > at),
        )
        live.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.publishAt.localeCompare(a.publishAt))
        return delay(live, latencyMs)
      },
      listNewsletters: () => delay([...fixtures.newsletters].sort((a, b) => b.issuedOn.localeCompare(a.issuedOn)), latencyMs),
    },
    contact: {
      send: (input) => {
        if (!isValidContact(input)) return Promise.reject(new Error('Please check the form and try again.'))
        const message: ContactMessage = { ...input, id: `cm-${sentMessages.length + 1}`, createdAt: now().toISOString() }
        sentMessages.push(message)
        return delay(message, latencyMs)
      },
      listMessages: (viewer) =>
        delay(
          isAdmin(viewer)
            ? [...portal.messages, ...sentMessages].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            : [],
          latencyMs,
        ),
      markHandled: (id, viewer) => {
        if (!isAdmin(viewer)) return Promise.reject(new NotAllowed('only the committee can handle a message'))
        const message = [...portal.messages, ...sentMessages].find((m) => m.id === id)
        if (!message) return Promise.reject(new NotAllowed('no such message'))
        message.handledBy = viewer.householdId
        return delay(message, latencyMs)
      },
    },
    // Every rule below has a policy in supabase/portal.sql that says the same thing, and a
    // block in supabase/verify.sql that proves the database agrees. Three enforcers, one set
    // of rules: if these three ever disagree, the database is the one telling the truth.
    portal: {
      identify: (email) => {
        const match = portal.households.find((h) => h.googleEmail?.toLowerCase() === email.toLowerCase())
        return delay(match ? { id: match.id, name: match.name, role: match.role } : null, latencyMs)
      },
      // Not found and not allowed are the same answer on purpose. Telling somebody a
      // household exists but is not theirs is itself a fact about a household.
      getHousehold: (id, viewer) => {
        const household = portal.households.find((h) => h.id === id) ?? null
        if (!household) return delay(null, latencyMs)
        const mine = viewer?.householdId === household.id
        return delay(mine || isAdmin(viewer) ? household : null, latencyMs)
      },
      listHouseholds: (viewer) =>
        delay(
          isAdmin(viewer) ? [...portal.households].sort((a, b) => a.name.localeCompare(b.name)) : [],
          latencyMs,
        ),
      // Masked here rather than in the page. `directoryEntry` drops everything the household
      // did not agree to share, and every name of every person in it.
      listDirectory: (viewer) =>
        delay(
          isMember(viewer)
            ? portal.households
                .filter((h) => h.membership.status === 'active')
                .map(directoryEntry)
                .filter((entry) => entry !== null)
                .sort((a, b) => a.name.localeCompare(b.name))
            : [],
          latencyMs,
        ),
      listDocuments: (viewer) =>
        delay(
          isMember(viewer) ? [...portal.documents].sort((a, b) => b.addedOn.localeCompare(a.addedOn)) : [],
          latencyMs,
        ),
      listRegistrationsForHousehold: (householdId, viewer) => {
        if (viewer?.householdId !== householdId && !isAdmin(viewer)) return delay([], latencyMs)
        return delay(
          portal.registrations
            .filter((r) => r.householdId === householdId)
            .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt)),
          latencyMs,
        )
      },
      listRegistrationsForEvent: (eventId, viewer) =>
        delay(
          isAdmin(viewer)
            ? portal.registrations
                .filter((r) => r.eventId === eventId)
                .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt))
            : [],
          latencyMs,
        ),
      listSignInAttempts: (viewer) =>
        delay(
          isAdmin(viewer)
            ? [...portal.signInAttempts].sort((a, b) => b.lastTriedAt.localeCompare(a.lastTriedAt))
            : [],
          latencyMs,
        ),
    },
    // Empty here on purpose: recording is withAuditTrail's job, wrapped around the outside.
    audit: { list: () => delay([], latencyMs) },
    volunteering: {
      listOpenRoles: () => delay(fixtures.volunteerRoles.filter((r) => r.filled < r.slots), latencyMs),
      listRolesForEvent: (eventId) => delay(fixtures.volunteerRoles.filter((r) => r.eventId === eventId), latencyMs),
    },
  }
}
