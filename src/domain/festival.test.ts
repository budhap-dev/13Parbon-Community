import { festivalStatus, nextFestivalBySeason, seasonMonth } from './festival'
import { festivals } from '@/app/festivals'

describe('seasonMonth', () => {
  it('reads the first month a season names', () => {
    expect(seasonMonth('September or October')).toBe(8)
    expect(seasonMonth('March')).toBe(2)
    expect(seasonMonth('Spring')).toBeNull()
    expect(seasonMonth(undefined)).toBeNull()
  })
})

describe('nextFestivalBySeason', () => {
  it('names the festival whose season comes round soonest', () => {
    expect(nextFestivalBySeason(festivals, new Date('2026-11-02'))?.id).toBe('saraswati-puja')
    expect(nextFestivalBySeason(festivals, new Date('2026-09-15'))?.id).toBe('mahalaya')
  })
})

describe('festivalStatus', () => {
  const now = new Date('2026-09-01T12:00:00')
  const upcoming = [
    { festivalId: 'mahalaya', startsAt: '2026-10-10T14:30:00' },
    { festivalId: 'holi', startsAt: '2027-03-22T11:00:00' },
  ]
  const past = [
    { festivalId: 'boishakhi', startsAt: '2026-04-15T17:00:00' },
    { festivalId: 'saraswati-puja', startsAt: '2025-02-01T10:00:00' },
  ]

  it('says next, dated, held or being arranged', () => {
    expect(festivalStatus('mahalaya', upcoming, past, 'mahalaya', now).kind).toBe('next')
    expect(festivalStatus('holi', upcoming, past, 'mahalaya', now).kind).toBe('set')
    expect(festivalStatus('boishakhi', upcoming, past, 'mahalaya', now)).toEqual({ kind: 'held', startsAt: '2026-04-15T17:00:00' })
    // More than a year ago is not "held" this year.
    expect(festivalStatus('saraswati-puja', upcoming, past, 'mahalaya', now).kind).toBe('arranging')
  })
})
