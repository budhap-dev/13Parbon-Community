import { describe, expect, it } from 'vitest'
import type { Event } from './event'
import { photosAwaited } from './gallery'
import { heroEvent, mergeSettings, readHeroCard } from './settings'
import { purposeParts } from './siteContent'
import { defaultSettings } from '@/app/defaults'

const evening = (id: string, status: Event['status'] = 'published') => ({ id, status }) as Event

describe('the card at the top of the home page', () => {
  const next = evening('mahalaya')
  const upcoming = [next, evening('durga'), evening('draft', 'draft')]

  it('shows the next evening, a chosen one, or none', () => {
    expect(heroEvent({ show: 'next', eventId: '' }, next, upcoming)?.id).toBe('mahalaya')
    expect(heroEvent({ show: 'chosen', eventId: 'durga' }, next, upcoming)?.id).toBe('durga')
    expect(heroEvent({ show: 'none', eventId: '' }, next, upcoming)).toBeNull()
  })

  it('shows nothing rather than another evening once the chosen one is gone', () => {
    expect(heroEvent({ show: 'chosen', eventId: 'gone' }, next, upcoming)).toBeNull()
    expect(heroEvent({ show: 'chosen', eventId: 'draft' }, next, upcoming)).toBeNull()
  })

  it('shows nothing with nothing on the website, and never guesses', () => {
    expect(heroEvent({ show: 'next', eventId: '' }, null, [])).toBeNull()
  })

  it('reads a saved choice, and falls back to the next evening when there is none', () => {
    expect(readHeroCard({ show: 'chosen', eventId: 'durga' })).toEqual({ show: 'chosen', eventId: 'durga' })
    expect(readHeroCard({ show: 'sometimes' })).toBeNull()
    expect(mergeSettings({}, defaultSettings).heroCard).toEqual({ show: 'next', eventId: '' })
    expect(mergeSettings({ heroCard: { show: 'none' } }, defaultSettings).heroCard).toEqual({ show: 'none', eventId: '' })
  })
})

describe('photographs coming soon', () => {
  const albums = [{ festivalId: 'boishakhi', publishedAt: '2026-04-20T12:00:00' }]

  it('until an album from the festival is published after the evening', () => {
    expect(photosAwaited('mahalaya', '2026-10-10T14:30:00', albums)).toBe(true)
    expect(photosAwaited('boishakhi', '2026-04-15T17:00:00', albums)).toBe(false)
    // Last year's album is not this year's photographs.
    expect(photosAwaited('boishakhi', '2027-04-15T17:00:00', albums)).toBe(true)
  })
})

describe('the mission and vision', () => {
  it('splits by the headings the committee wrote', () => {
    expect(purposeParts('Mission: Keep it going. Vision: A home for Bengal.')).toEqual([
      { label: 'Mission', text: 'Keep it going.' },
      { label: 'Vision', text: 'A home for Bengal.' },
    ])
    expect(purposeParts('Our mission – songs\nOur vision: more')).toEqual([
      { label: 'Our mission', text: 'songs' },
      { label: 'Our vision', text: 'more' },
    ])
  })

  it('leaves a statement with no headings as it was typed', () => {
    expect(purposeParts('We keep the mission alive: songs and food.')).toEqual([{ text: 'We keep the mission alive: songs and food.' }])
  })
})
