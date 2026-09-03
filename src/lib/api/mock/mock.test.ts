import { createMockApi } from './index'

const now = () => new Date('2026-09-03T10:00:00')

describe('createMockApi', () => {
  const api = createMockApi({ now })

  it('lists only public, published, upcoming events in date order', async () => {
    const events = await api.events.listUpcoming()
    expect(events.map((e) => e.slug)).toEqual([
      'mahalaya-cultural-programme-2026',
      'saraswati-puja-2027',
      'holi-2027',
      'poila-boishakh-cultural-programme-2027',
    ])
  })

  it('honours the limit', async () => {
    expect(await api.events.listUpcoming(2)).toHaveLength(2)
  })

  it('returns the soonest event as next', async () => {
    const next = await api.events.getNext()
    expect(next?.slug).toBe('mahalaya-cultural-programme-2026')
  })

  it('lists the four occasions in the community year', async () => {
    expect((await api.festivals.list()).map((f) => f.id)).toEqual(['poila-boishakh', 'mahalaya', 'saraswati-puja', 'holi'])
  })

  it('returns only approved media from public albums', async () => {
    const media = await api.gallery.listRecentMedia(10)
    expect(media).toHaveLength(6)
    expect(media.every((m) => m.approved)).toBe(true)
    expect(media.some((m) => m.albumId === 'al-private')).toBe(false)
  })

  it('returns only volunteer roles with free slots', async () => {
    const roles = await api.volunteering.listOpenRoles()
    expect(roles.map((r) => r.id)).toEqual(['vr-stage'])
  })

  it('can simulate latency', async () => {
    vi.useFakeTimers()
    const slow = createMockApi({ now, latencyMs: 50 })
    const pending = slow.festivals.list()
    vi.advanceTimersByTime(50)
    await expect(pending).resolves.toHaveLength(4)
    vi.useRealTimers()
  })
})
