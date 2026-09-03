import { isUpcoming } from '@/domain/dates'
import type { Event } from '@/domain/event'
import type { ApiClient } from '../types'
import { buildFixtures } from './fixtures'

export type MockApiOptions = {
  /** Clock used to decide what counts as upcoming. */
  now?: () => Date
  /** Simulated network delay in milliseconds. */
  latencyMs?: number
}

function delay<T>(value: T, ms: number): Promise<T> {
  if (ms <= 0) return Promise.resolve(value)
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

export function createMockApi({ now = () => new Date(), latencyMs = 0 }: MockApiOptions = {}): ApiClient {
  const fixtures = buildFixtures()

  const visible = (event: Event) => event.isPublic && event.status !== 'draft' && event.status !== 'cancelled'

  const upcomingEvents = () =>
    fixtures.events
      .filter((event) => visible(event) && event.status === 'published' && isUpcoming(event.startsAt, now()))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))

  const pastEvents = () =>
    fixtures.events
      .filter((event) => visible(event) && !isUpcoming(event.startsAt, now()))
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt))

  return {
    events: {
      listUpcoming: (limit = 10) => delay(upcomingEvents().slice(0, limit), latencyMs),
      listPast: (limit = 10) => delay(pastEvents().slice(0, limit), latencyMs),
      getNext: () => delay(upcomingEvents()[0] ?? null, latencyMs),
      getBySlug: (slug) => delay(fixtures.events.find((e) => e.slug === slug && visible(e)) ?? null, latencyMs),
    },
    festivals: {
      list: () => delay([...fixtures.festivals], latencyMs),
    },
    gallery: {
      listRecentMedia: (limit = 6) => {
        const publicAlbums = new Set(fixtures.albums.filter((a) => a.visibility === 'public').map((a) => a.id))
        return delay(
          fixtures.media.filter((m) => m.approved && publicAlbums.has(m.albumId)).slice(0, limit),
          latencyMs,
        )
      },
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
    volunteering: {
      listOpenRoles: () => delay(fixtures.volunteerRoles.filter((r) => r.filled < r.slots), latencyMs),
      listRolesForEvent: (eventId) => delay(fixtures.volunteerRoles.filter((r) => r.eventId === eventId), latencyMs),
    },
  }
}
