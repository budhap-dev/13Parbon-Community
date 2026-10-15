import { festivalStatus, heldThisYear, monthsUntilSeason, seasonMonth, seasonMonths } from './festival'

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

describe('heldThisYear', () => {
  const past = [{ festivalId: 'boishakhi', startsAt: '2026-04-15T17:00:00' }]

  it('counts an evening from the last six months as this year\'s', () => {
    expect(heldThisYear('boishakhi', past, new Date('2026-04-25'))?.startsAt).toBe('2026-04-15T17:00:00')
    // A year on, it is coming round again.
    expect(heldThisYear('boishakhi', past, new Date('2027-04-10'))).toBeUndefined()
  })

  it('does not count a cancelled evening as held', () => {
    expect(heldThisYear('boishakhi', [{ ...past[0], status: 'cancelled' }], new Date('2026-04-25'))).toBeUndefined()
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
