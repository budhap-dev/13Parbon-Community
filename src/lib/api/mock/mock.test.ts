import { testEvents } from '@/test/events'
import { createMockApi } from './index'

const now = () => new Date('2026-09-03T10:00:00')

describe('createMockApi', () => {
  const api = createMockApi({ now, events: testEvents })

  it('lists only public, published, upcoming events in date order', async () => {
    const events = await api.events.listUpcoming()
    expect(events.map((e) => e.slug)).toEqual([
      'mahalaya-cultural-programme-2026',
      'saraswati-puja-2027',
      'holi-2027',
      'boishakhi-programme-2027',
    ])
  })

  it('honours the limit', async () => {
    expect(await api.events.listUpcoming(2)).toHaveLength(2)
  })

  it('lists past events most recent first, and finds events by slug', async () => {
    const past = await api.events.listPast()
    expect(past.map((e) => e.slug)).toEqual(['boishakhi-programme-2026'])
    expect((await api.events.getBySlug('holi-2027'))?.title).toBe('Holi')
    expect(await api.events.getBySlug('draft-picnic')).toBeNull()
    expect(await api.events.getBySlug('committee-meeting')).toBeNull()
    expect(await api.events.getBySlug('nope')).toBeNull()
  })

  it('lists every role for an event, full or not', async () => {
    const roles = await api.volunteering.listRolesForEvent('ev-mahalaya-2026')
    expect(roles.map((r) => r.id)).toEqual(['vr-stage', 'vr-full'])
  })

  it('lists news newest first and finds posts by slug', async () => {
    const posts = await api.news.listPosts()
    expect(posts.map((p) => p.slug)).toEqual([
      'mahalaya-programme-what-to-expect',
      'we-have-a-hall-for-the-year',
      'saraswati-puja-2026-thank-you',
    ])
    expect((await api.news.getPost('saraswati-puja-2026-thank-you'))?.tags).toEqual(['Success stories'])
    expect(await api.news.getPost('nope')).toBeNull()
  })

  it('lists live public announcements, pinned first', async () => {
    const live = await api.news.listAnnouncements()
    expect(live.map((a) => a.id)).toEqual(['an-register', 'an-volunteers'])
  })

  it('lists newsletters newest first', async () => {
    expect((await api.news.listNewsletters()).map((n) => n.id)).toEqual(['nl-3', 'nl-2'])
  })

  it('accepts a valid contact message and rejects an invalid one', async () => {
    const sent = await api.contact.send({ name: 'Rina Sen', email: 'rina@example.com', subject: 'Parking', message: 'Where do we park on the night?' })
    expect(sent.id).toBe('cm-1')
    expect(sent.createdAt).toBe(now().toISOString())
    await expect(api.contact.send({ name: '', email: '', subject: '', message: '' })).rejects.toThrow(/check the form/)
  })

  it('returns the soonest event as next', async () => {
    const next = await api.events.getNext()
    expect(next?.slug).toBe('mahalaya-cultural-programme-2026')
  })

  it('lists the four occasions in the community year', async () => {
    expect((await api.festivals.list()).map((f) => f.id)).toEqual(['boishakhi', 'mahalaya', 'saraswati-puja', 'holi'])
  })

  it('returns only approved media from public albums', async () => {
    const media = await api.gallery.listRecentMedia(10)
    expect(media).toHaveLength(6)
    expect(media.every((m) => m.approved)).toBe(true)
    expect(media.some((m) => m.albumId === 'al-private')).toBe(false)
  })

  it('lists public albums newest first with their approved media and a cover', async () => {
    const albums = await api.gallery.listAlbums()
    expect(albums.map((a) => a.slug)).toEqual(['boishakhi-2026', 'holi-2026', 'saraswati-puja-2026', 'mahalaya-2025'])
    const holi = await api.gallery.getAlbum('holi-2026')
    expect(holi?.media.map((m) => m.id)).toEqual(['m-3'])
    expect(holi?.cover?.id).toBe('m-3')
    expect(await api.gallery.getAlbum('committee-dinner')).toBeNull()
  })

  it('returns only volunteer roles with free slots', async () => {
    const roles = await api.volunteering.listOpenRoles()
    expect(roles.map((r) => r.id)).toEqual(['vr-stage'])
  })

  it('can simulate latency', async () => {
    vi.useFakeTimers()
    const slow = createMockApi({ now, latencyMs: 50, events: testEvents })
    const pending = slow.festivals.list()
    vi.advanceTimersByTime(50)
    await expect(pending).resolves.toHaveLength(4)
    vi.useRealTimers()
  })
})
