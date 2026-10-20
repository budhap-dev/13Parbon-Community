import { describe, expect, it } from 'vitest'
import { defaultSettings } from '@/app/defaults'
import {
  blankNewsflash,
  newsflashesUp,
  newsflashProblems,
  newsflashState,
  readNewsflashes,
  stillClosed,
  tidyNewsflashes,
  tooManyAt,
  type Newsflash,
} from './newsflash'
import { mergeSettings } from './settings'

const flash = (over: Partial<Newsflash>): Newsflash => ({
  ...blankNewsflash(new Date('2026-10-20T09:00:00Z')),
  tag: 'New feature',
  headline: 'The Bengali calendar is here',
  from: '2026-10-20T09:00:00.000Z',
  until: '2026-11-03T09:00:00.000Z',
  ...over,
})

describe('tidying a newsflash for saving', () => {
  it('names it from its headline and the day it goes up, and keeps that name', () => {
    const [saved] = tidyNewsflashes([flash({})])
    expect(saved.id).toBe('the-bengali-calendar-is-here-20261020')
    expect(tidyNewsflashes([{ ...saved, headline: 'Now with 1434' }])[0].id).toBe(saved.id)
  })

  it('numbers two with the same name rather than merging them', () => {
    const ids = tidyNewsflashes([flash({}), flash({})]).map((row) => row.id)
    expect(ids).toEqual(['the-bengali-calendar-is-here-20261020', 'the-bengali-calendar-is-here-20261020-2'])
  })

  it('leaves out a row with no kind, no headline, or no proper days', () => {
    expect(tidyNewsflashes([flash({ tag: ' ' })])).toEqual([])
    expect(tidyNewsflashes([flash({ headline: '', headlineBn: '' })])).toEqual([])
    expect(tidyNewsflashes([flash({ until: '' })])).toEqual([])
    expect(tidyNewsflashes([flash({ until: '2026-10-20T09:00:00.000Z' })])).toEqual([])
  })

  it('keeps a Bengali headline on its own', () => {
    expect(tidyNewsflashes([flash({ headline: '', headlineBn: 'বাংলা ক্যালেন্ডার এসে গেছে!' })])).toHaveLength(1)
  })

  it('links only to a page on this site, and drops the button words with no link', () => {
    expect(tidyNewsflashes([flash({ to: '/calendar', button: 'See the calendar' })])[0]).toMatchObject({ to: '/calendar', button: 'See the calendar' })
    expect(tidyNewsflashes([flash({ to: 'https://example.com', button: 'Go' })])[0]).toMatchObject({ to: '', button: '' })
    expect(tidyNewsflashes([flash({ to: '//example.com' })])[0].to).toBe('')
    expect(tidyNewsflashes([flash({ to: 'javascript:alert(1)' })])[0].to).toBe('')
  })

  it('falls back to gold, closable and not first for anything it does not know', () => {
    const [saved] = tidyNewsflashes([{ ...flash({}), colour: 'purple' as never, animation: 'spin' as never, closable: undefined, first: 'yes' as never }])
    expect(saved).toMatchObject({ colour: 'gold', animation: 'drop', closable: true, first: false })
  })

  it('reads nothing that is not a list, and nothing that is not a row', () => {
    expect(readNewsflashes('a string')).toBeNull()
    expect(readNewsflashes([null, 'x', flash({})])).toHaveLength(1)
  })

  it('starts empty and survives the settings row', () => {
    expect(defaultSettings.newsflashes).toEqual([])
    const merged = mergeSettings({ newsflashes: [flash({})] }, defaultSettings)
    expect(merged.newsflashes[0].headline).toBe('The Bengali calendar is here')
    expect(mergeSettings({}, defaultSettings).newsflashes).toEqual([])
  })
})

describe('which are up', () => {
  const at = new Date('2026-10-24T12:00:00Z')

  it('is up from the moment it goes up until just before it comes down', () => {
    const one = flash({})
    expect(newsflashesUp([one], new Date('2026-10-20T09:00:00Z'))).toHaveLength(1)
    expect(newsflashesUp([one], new Date('2026-11-03T09:00:00Z'))).toHaveLength(0)
    expect(newsflashState(one, new Date('2026-10-19T09:00:00Z'))).toBe('waiting')
    expect(newsflashState(one, at)).toBe('up')
    expect(newsflashState(one, new Date('2026-12-01T09:00:00Z'))).toBe('over')
  })

  it('puts the ones marked first ahead, then the earliest to go up', () => {
    const rows = tidyNewsflashes([
      flash({ headline: 'Calendar' }),
      flash({ headline: 'Down on Saturday', from: '2026-10-23T09:00:00.000Z' }),
      flash({ headline: 'Venue change', from: '2026-10-24T09:00:00.000Z', first: true }),
    ])
    expect(newsflashesUp(rows, at).map((row) => row.headline)).toEqual(['Venue change', 'Calendar', 'Down on Saturday'])
  })

  it('draws three at most, even from a list that somehow holds four', () => {
    const rows = tidyNewsflashes([1, 2, 3, 4].map((n) => flash({ headline: `Flash ${n}` })))
    expect(newsflashesUp(rows, at)).toHaveLength(3)
  })

  it('leaves out one this visitor closed, unless it cannot be closed', () => {
    const [open, stays] = tidyNewsflashes([flash({ headline: 'Calendar' }), flash({ headline: 'Maintenance', closable: false })])
    expect(newsflashesUp([open, stays], at, [open.id, stays.id]).map((row) => row.headline)).toEqual(['Maintenance'])
  })

  it('forgets closed ones that are no longer in the list', () => {
    const rows = tidyNewsflashes([flash({})])
    expect(stillClosed(['gone', rows[0].id, rows[0].id], rows)).toEqual([rows[0].id])
  })
})

describe('the limit of three at once', () => {
  it('finds the moment a fourth would go up beside three others', () => {
    const rows = tidyNewsflashes([
      flash({ headline: 'One' }),
      flash({ headline: 'Two' }),
      flash({ headline: 'Three' }),
      flash({ headline: 'Four', from: '2026-10-25T18:00:00.000Z' }),
    ])
    expect(tooManyAt(rows)).toBe('2026-10-25T18:00:00.000Z')
  })

  it('lets a fourth go up once one of the three has come down', () => {
    const rows = tidyNewsflashes([
      flash({ headline: 'One', until: '2026-10-25T18:00:00.000Z' }),
      flash({ headline: 'Two' }),
      flash({ headline: 'Three' }),
      flash({ headline: 'Four', from: '2026-10-25T18:00:00.000Z' }),
    ])
    expect(tooManyAt(rows)).toBeNull()
  })
})

describe('what the portal says about an unfinished one', () => {
  it('names each thing missing', () => {
    expect(newsflashProblems(flash({}))).toEqual([])
    expect(newsflashProblems(flash({ tag: '', headline: '', to: 'calendar', until: '2026-10-01T00:00:00.000Z' }))).toEqual([
      'Say what kind it is, in English.',
      'Give it a headline, in Bengali or English.',
      'It has to come down after it goes up.',
      'The link has to be a page on this site, starting with /, such as /calendar.',
    ])
  })
})
