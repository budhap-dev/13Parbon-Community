import { describe, expect, it } from 'vitest'
import { hasPaid, membershipYearOf, stillToPay, yearLabel, yearsFor } from './payments'
import type { Household } from './household'

const household = (name: string, extra: Partial<Household> = {}) =>
  ({
    name,
    memberSince: '2020-06-01',
    membership: { status: 'active', paidTo: null },
    payments: [],
    ...extra,
  }) as Pick<Household, 'name' | 'memberSince' | 'membership' | 'payments'>

describe('the membership year', () => {
  it('runs from 1 April to 31 March', () => {
    expect(membershipYearOf(new Date('2027-03-31T23:00:00'))).toBe(2026)
    expect(membershipYearOf(new Date('2026-04-01T00:30:00'))).toBe(2026)
    expect(membershipYearOf(new Date('2026-03-31T12:00:00'))).toBe(2025)
    expect(membershipYearOf(new Date('2026-10-31T12:00:00'))).toBe(2026)
  })

  it('is written the way a treasurer writes it', () => {
    expect(yearLabel(2026)).toBe('2026–27')
    expect(yearLabel(2099)).toBe('2099–00')
  })
})

describe('who is still to pay', () => {
  it('is every active household without this year ticked, by name', () => {
    const list = [
      household('The Sens', { payments: [{ year: 2026, paidOn: '2026-04-12' }] }),
      household('The Roys', { payments: [{ year: 2025, paidOn: '2025-04-12' }] }),
      household('The Palits', { membership: { status: 'lapsed', paidTo: null } }),
      household('The Ghoshes'),
      // A database the table has not reached: nothing recorded, so not paid.
      household('The Dases', { payments: undefined }),
    ]
    expect(stillToPay(list, 2026).map((h) => h.name)).toEqual(['The Dases', 'The Ghoshes', 'The Roys'])
    expect(hasPaid(list[0], 2026)).toBe(true)
    expect(hasPaid(list[0], 2025)).toBe(false)
  })
})

describe('the years on a household’s record', () => {
  it('goes back five years at most, and not before they joined', () => {
    expect(yearsFor(household('The Sens', { memberSince: '2015-01-01' }), 2026)).toEqual([2026, 2025, 2024, 2023, 2022])
    // Joined in March 2025, which is the 2024–25 year.
    expect(yearsFor(household('The Roys', { memberSince: '2025-03-20' }), 2026)).toEqual([2026, 2025, 2024])
    expect(yearsFor(household('The Ghoshes', { memberSince: '2026-09-01' }), 2026)).toEqual([2026])
  })

  it('never hides a payment somebody recorded', () => {
    const old = household('The Mitras', { memberSince: '2026-09-01', payments: [{ year: 2019, paidOn: '2019-05-01' }] })
    expect(yearsFor(old, 2026)).toEqual([2026, 2019])
  })
})
