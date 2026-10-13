import { festivalStatus, monthsUntilSeason, nextFestivalBySeason, seasonMonth, seasonMonths } from './festival'
import { festivals } from '@/app/festivals'

describe('seasonMonth', () => {
  it('reads the first month a season names', () => {
    expect(seasonMonth('September or October')).toBe(8)
    expect(seasonMonth('March')).toBe(2)
    expect(seasonMonth('Spring')).toBeNull()
    expect(seasonMonth(undefined)).toBeNull()
  })
})

describe('seasonMonths', () => {
  it('reads every month a season names, in the order it names them', () => {
    expect(seasonMonths('September or October')).toEqual([8, 9])
    expect(seasonMonths('January or February')).toEqual([0, 1])
    expect(seasonMonths('Spring')).toEqual([])
  })
})

describe('monthsUntilSeason', () => {
  it('counts a season as on in any month it names', () => {
    expect(monthsUntilSeason('September or October', new Date('2026-10-13'))).toBe(0)
    expect(monthsUntilSeason('September or October', new Date('2026-11-02'))).toBe(10)
    expect(monthsUntilSeason('Spring', new Date('2026-10-13'))).toBeNull()
  })
})

describe('nextFestivalBySeason', () => {
  it('names a festival in the second month of its season, not eleven months off', () => {
    expect(nextFestivalBySeason(festivals, new Date('2026-10-13'))?.id).toBe('mahalaya')
  })

  it('passes over a festival whose evening this year has been held', () => {
    const past = [{ festivalId: 'boishakhi', startsAt: '2026-04-15T17:00:00' }]
    expect(nextFestivalBySeason(festivals, new Date('2026-04-25'), past)?.id).not.toBe('boishakhi')
    // A year on, it comes round again.
    expect(nextFestivalBySeason(festivals, new Date('2027-04-10'), past)?.id).toBe('boishakhi')
  })

  it('does not count a cancelled evening as held', () => {
    const past = [{ festivalId: 'boishakhi', startsAt: '2026-04-15T17:00:00', status: 'cancelled' }]
    expect(nextFestivalBySeason(festivals, new Date('2026-04-25'), past)?.id).toBe('boishakhi')
  })

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

  it('does not say held for a cancelled evening, or for last year\'s', () => {
    const cancelled = [{ festivalId: 'boishakhi', startsAt: '2026-04-15T17:00:00', status: 'cancelled' }]
    expect(festivalStatus('boishakhi', [], cancelled, undefined, now).kind).toBe('arranging')
    const lastYear = [{ festivalId: 'mahalaya', startsAt: '2025-10-20T14:30:00' }]
    expect(festivalStatus('mahalaya', [], lastYear, undefined, new Date('2026-10-13T12:00:00')).kind).toBe('arranging')
  })
})
