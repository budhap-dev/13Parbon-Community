import { isUpcoming } from '@/domain/dates'
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

  const upcomingEvents = () =>
    fixtures.events
      .filter((event) => event.isPublic && event.status === 'published' && isUpcoming(event.startsAt, now()))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))

  return {
    events: {
      listUpcoming: (limit = 10) => delay(upcomingEvents().slice(0, limit), latencyMs),
      getNext: () => delay(upcomingEvents()[0] ?? null, latencyMs),
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
    volunteering: {
      listOpenRoles: () => delay(fixtures.volunteerRoles.filter((r) => r.filled < r.slots), latencyMs),
    },
  }
}
