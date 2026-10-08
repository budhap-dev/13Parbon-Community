import { describe, expect, it } from 'vitest'
import {
  blankSponsor,
  groupByLevel,
  namesInASentence,
  readSponsors,
  sponsoredByLead,
  sponsorsOf,
  sponsorsOnShow,
  tidySponsors,
  whyNotShown,
  type Sponsor,
} from './sponsors'

const sponsor = (over: Partial<Sponsor> = {}): Sponsor => ({ ...blankSponsor(), id: 'x', name: 'Spice Route', ...over })

describe('tidying the list', () => {
  it('drops a row with no name and keeps the order given', () => {
    const rows = tidySponsors([sponsor({ name: 'B' }), sponsor({ name: '  ' }), sponsor({ name: 'A' })])
    expect(rows.map((s) => s.name)).toEqual(['B', 'A'])
  })

  it('keeps an id it was given and makes one from the name otherwise', () => {
    const [kept, made] = tidySponsors([sponsor({ id: 'old-name', name: 'New Name' }), sponsor({ id: '', name: 'Ma Durga Stores' })])
    expect(kept.id).toBe('old-name')
    expect(made.id).toBe('ma-durga-stores')
  })

  it('never gives two sponsors the same id', () => {
    const ids = tidySponsors([sponsor({ id: '', name: 'Sen' }), sponsor({ id: '', name: 'Sen' })]).map((s) => s.id)
    expect(new Set(ids).size).toBe(2)
  })

  it('keeps only https for a website, because it ends up in an href', () => {
    const [https, http, script] = tidySponsors([
      sponsor({ href: 'https://example.org' }),
      sponsor({ href: 'http://example.org' }),
      sponsor({ href: 'javascript:alert(1)' }),
    ])
    expect(https.href).toBe('https://example.org')
    expect(http.href).toBe('')
    expect(script.href).toBe('')
  })

  it('adds the https a website written as www. or a bare domain was missing', () => {
    const links = tidySponsors([
      sponsor({ href: 'www.rajsweets.co.uk' }),
      sponsor({ href: 'rajsweets.co.uk/menu' }),
      sponsor({ href: 'raj sweets' }),
    ]).map((s) => s.href)
    expect(links).toEqual(['https://www.rajsweets.co.uk', 'https://rajsweets.co.uk/menu', ''])
  })

  it('keeps a logo this site serves or one over https, and nothing else', () => {
    const logos = tidySponsors([
      sponsor({ logo: 'https://photos.13parbon.org.uk/full/logo.jpg' }),
      sponsor({ logo: '/images/logo.jpg' }),
      sponsor({ logo: '//evil.example/logo.jpg' }),
      sponsor({ logo: 'data:image/svg+xml,<svg/>' }),
    ]).map((s) => s.logo)
    expect(logos).toEqual(['https://photos.13parbon.org.uk/full/logo.jpg', '/images/logo.jpg', '', ''])
  })

  it('forgets a level it does not know and a festival named twice', () => {
    const [row] = tidySponsors([{ ...sponsor(), level: 'platinum' as never, festivalIds: ['durga', 'durga', ' ', 'holi'] }])
    expect(row.level).toBe('')
    expect(row.festivalIds).toEqual(['durga', 'holi'])
  })

  it('does not let a business carry an agreement it never needed', () => {
    expect(tidySponsors([sponsor({ person: false, agreed: true })])[0].agreed).toBe(false)
  })
})

describe('reading what was saved', () => {
  it('answers null for something that was never a list, so the default stands', () => {
    expect(readSponsors('nonsense')).toBeNull()
    expect(readSponsors(undefined)).toBeNull()
  })

  it('takes an empty list as an answer', () => {
    expect(readSponsors([])).toEqual([])
  })

  it('skips rows that are not objects', () => {
    expect(readSponsors([null, 'x', [1], { name: 'Kept' }])?.map((s) => s.name)).toEqual(['Kept'])
  })
})

describe('what the public sees', () => {
  it('leaves out a hidden sponsor', () => {
    expect(sponsorsOnShow([sponsor({ shown: false })])).toEqual([])
    expect(whyNotShown(sponsor({ shown: false }))).toBe('Hidden')
  })

  it('never names a person or a family until they have said yes', () => {
    const waiting = sponsor({ person: true, agreed: false })
    expect(sponsorsOnShow([waiting])).toEqual([])
    expect(whyNotShown(waiting)).toMatch(/agreement/)
    expect(sponsorsOnShow([sponsor({ person: true, agreed: true })])).toHaveLength(1)
  })

  it('groups gold, silver, friend, then the rest, leaving out empty groups', () => {
    const groups = groupByLevel([
      sponsor({ id: 'a', name: 'A', level: '' }),
      sponsor({ id: 'b', name: 'B', level: 'friend' }),
      sponsor({ id: 'c', name: 'C', level: 'gold' }),
      sponsor({ id: 'd', name: 'D', level: 'gold', shown: false }),
    ])
    expect(groups.map((g) => [g.level, g.sponsors.map((s) => s.name)])).toEqual([
      ['gold', ['C']],
      ['friend', ['B']],
      ['', ['A']],
    ])
  })

  it('finds who helps put on a festival, on show only', () => {
    const list = [
      sponsor({ id: 'a', name: 'A', festivalIds: ['durga'] }),
      sponsor({ id: 'b', name: 'B', festivalIds: ['durga'], shown: false }),
      sponsor({ id: 'c', name: 'C', festivalIds: ['holi'] }),
    ]
    expect(sponsorsOf('durga', list).map((s) => s.name)).toEqual(['A'])
    expect(sponsorsOf(undefined, list)).toEqual([])
  })

  it('says one sponsor and several the way a sentence would', () => {
    expect(`${sponsoredByLead(1)} ${namesInASentence(['A'])}`).toBe('Sponsored by A')
    expect(`${sponsoredByLead(2)} ${namesInASentence(['A', 'B'])}`).toBe('Co-sponsored by A and B')
    expect(namesInASentence(['A', 'B', 'C'])).toBe('A, B and C')
  })
})
