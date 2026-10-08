import { describe, expect, it } from 'vitest'
import { defaultSettings } from '@/app/defaults'
import { buildFixtures } from '@/lib/api/mock/fixtures'
import { buildPlayFixtures } from '@/lib/api/mock/play-fixtures'
import { buildPortalFixtures } from '@/lib/api/mock/portal-fixtures'
import { buildSearchIndex, searchIndex, type SearchSources } from './searchIndex'

const site = buildFixtures()
const portal = buildPortalFixtures()
const play = buildPlayFixtures()

const sources: SearchSources = {
  screens: [
    { label: 'People', to: '/admin/people' },
    { label: 'Events', to: '/admin/events' },
  ],
  households: portal.households,
  events: site.events,
  posts: site.posts,
  notices: site.announcements,
  albums: site.albums,
  messages: portal.messages,
  feedback: portal.feedback,
  polls: play.polls,
  quizzes: play.quizzes,
  settings: defaultSettings,
  now: new Date('2026-09-03T10:00:00'),
}
const index = buildSearchIndex(sources)
const find = (query: string, perGroup?: number) => searchIndex(index, query, perGroup)
const group = (query: string, label: string) => find(query).find((g) => g.label === label)

describe('the committee search', () => {
  it('finds a household by somebody in it, and goes straight to that household', () => {
    const households = group('mira', 'Households')
    expect(households?.items.map((item) => item.title)).toEqual(['The Sens'])
    expect(households?.items[0].to).toBe('/admin/people?open=hh-sen')
  })

  it('wants every word, so "das ruma" is Ruma in the Dases and not every Das', () => {
    expect(group('das ruma', 'Households')?.items.map((item) => item.title)).toEqual(['The Dases'])
  })

  it('takes no notice of capitals or accents', () => {
    expect(group('DÁS RÚMA', 'Households')?.items.map((item) => item.title)).toEqual(['The Dases'])
  })

  it('finds a message by what it says, not only by its subject', () => {
    const messages = group('learning for three years', 'Messages')
    expect(messages?.items.map((item) => item.to)).toEqual(['/admin/messages?open=cm-2'])
  })

  it('opens writing and notices on their own screens', () => {
    const post = site.posts[0]
    expect(group(post.title, 'Writing')?.items[0].to).toBe(`/admin/writing?open=${post.id}`)
    const notice = site.announcements[0]
    expect(group(notice.title, 'Noticeboard')?.items[0].to).toBe(`/admin/notices?open=${notice.id}`)
  })

  it('finds a festival under the section that edits it', () => {
    const settings = group('holi', 'On the public pages')
    expect(settings?.items).toContainEqual(
      expect.objectContaining({ title: 'Holi', detail: 'The year’s festivals', to: '/admin/content?section=festivals' }),
    )
  })

  it('finds a section by its own name', () => {
    expect(group('questions people ask', 'On the public pages')?.items[0]).toMatchObject({
      title: 'Questions people ask',
      to: '/admin/content?section=faq',
    })
  })

  it('finds a question people ask by its answer', () => {
    const { question, answer } = defaultSettings.faq[0]
    const words = answer.split(/\s+/).slice(0, 4).join(' ')
    expect(group(words, 'On the public pages')?.items.map((item) => item.title)).toContain(question)
  })

  it('puts a title that starts with the search ahead of one that only mentions it', () => {
    const base = site.events[0]
    const evenings = buildSearchIndex({
      ...sources,
      events: [
        { ...base, id: 'ev-songs', title: 'An afternoon of songs', summary: 'Ahead of Holi, in the hall.' },
        { ...base, id: 'ev-colours', title: 'Colours for Holi', summary: '' },
        { ...base, id: 'ev-holi', title: 'Holi in the park', summary: '' },
      ],
    })
    const order = searchIndex(evenings, 'holi').find((g) => g.label === 'Evenings')?.items.map((item) => item.title)
    expect(order).toEqual(['Holi in the park', 'Colours for Holi', 'An afternoon of songs'])
  })

  it('shows a few of each kind and says how many more there are', () => {
    const households = find('the', 2).find((g) => g.label === 'Households')
    expect(households?.items).toHaveLength(2)
    expect(households?.more).toBe(portal.households.length - 2)
  })

  it('lists the screens when nothing has been typed, and only the screens', () => {
    expect(find('   ').map((g) => g.label)).toEqual(['Screens'])
    expect(find('').flatMap((g) => g.items.map((item) => item.title))).toEqual(['People', 'Events'])
  })

  it('says nothing at all when nothing matches', () => {
    expect(find('zzzzqx')).toEqual([])
  })

  it('goes without a list that has not loaded yet', () => {
    const early = buildSearchIndex({ ...sources, households: undefined, messages: undefined })
    expect(searchIndex(early, 'ruma').map((g) => g.label)).not.toContain('Households')
  })
})
