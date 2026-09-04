import { isUpcoming } from '@/domain/dates'
import { isValidContact, type ContactMessage } from '@/domain/contact'
import type { Event } from '@/domain/event'
import type { AlbumWithMedia } from '@/domain/gallery'
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

  const withMedia = (album: (typeof fixtures.albums)[number]): AlbumWithMedia => {
    const media = fixtures.media.filter((m) => m.albumId === album.id && m.approved)
    return { ...album, media, cover: media[0] }
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
      listRecentMedia: (limit = 6) => delay(publicAlbums().flatMap((a) => a.media).slice(0, limit), latencyMs),
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
      listMessages: () =>
        delay(
          [...portal.messages, ...sentMessages].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
          latencyMs,
        ),
    },
    portal: {
      getHousehold: (id) => delay(portal.households.find((h) => h.id === id) ?? null, latencyMs),
      listHouseholds: () => delay([...portal.households].sort((a, b) => a.name.localeCompare(b.name)), latencyMs),
      listDirectory: () =>
        delay(
          portal.households.filter((h) => h.listedInDirectory).sort((a, b) => a.name.localeCompare(b.name)),
          latencyMs,
        ),
      listDocuments: () => delay([...portal.documents].sort((a, b) => b.addedOn.localeCompare(a.addedOn)), latencyMs),
      listRegistrationsForHousehold: (householdId) =>
        delay(
          portal.registrations
            .filter((r) => r.householdId === householdId)
            .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt)),
          latencyMs,
        ),
      listRegistrationsForEvent: (eventId) =>
        delay(
          portal.registrations
            .filter((r) => r.eventId === eventId)
            .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt)),
          latencyMs,
        ),
      listSignInAttempts: () =>
        delay([...portal.signInAttempts].sort((a, b) => b.lastTriedAt.localeCompare(a.lastTriedAt)), latencyMs),
    },
    volunteering: {
      listOpenRoles: () => delay(fixtures.volunteerRoles.filter((r) => r.filled < r.slots), latencyMs),
      listRolesForEvent: (eventId) => delay(fixtures.volunteerRoles.filter((r) => r.eventId === eventId), latencyMs),
    },
  }
}
